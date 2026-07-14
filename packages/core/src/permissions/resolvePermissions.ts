import type { Db } from "../db/client.js";
import { getToolDepartmentTags } from "../models/tools.js";
import { hasActiveIndividualGrant } from "../models/grants.js";
import { hasActiveProjectGrant } from "../models/projectGrants.js";
import type { PermissionResult } from "../types.js";
import { createDbProjectMembershipProvider, type ProjectMembershipProvider } from "./projectMembership.js";

export interface ResolvePermissionDeps {
  db: Db;
  /** Defaults to the DB-backed provider; override in tests or once project membership moves external. */
  membershipProvider?: ProjectMembershipProvider;
}

/**
 * Single source of truth for "can this user use this tool", shared by the
 * gateway (enforcement) and admin-api (effective-permissions previews).
 *
 * allowed = department_tag_match OR active_individual_grant OR active_project_grant
 *
 * Revoking in the admin portal only clears grants created there — it cannot
 * remove access derived from a department-tag match, by design (confirmed
 * additive-only model for MVP).
 */
export async function resolveEffectivePermission(
  deps: ResolvePermissionDeps,
  user: { email: string; department?: string | null },
  toolName: string,
): Promise<PermissionResult> {
  const { db } = deps;
  const membershipProvider = deps.membershipProvider ?? createDbProjectMembershipProvider(db);

  if (user.department) {
    const requiredTags = getToolDepartmentTags(db, toolName);
    if (requiredTags.includes(user.department)) {
      return { allowed: true, reason: "department" };
    }
  }

  if (hasActiveIndividualGrant(db, user.email, toolName)) {
    return { allowed: true, reason: "individual" };
  }

  const projectCodes = await membershipProvider.getProjectCodesForUser(user.email);
  for (const projectCode of projectCodes) {
    if (hasActiveProjectGrant(db, projectCode, toolName)) {
      return { allowed: true, reason: "project", matchedProjectCode: projectCode };
    }
  }

  return { allowed: false, reason: "none" };
}
