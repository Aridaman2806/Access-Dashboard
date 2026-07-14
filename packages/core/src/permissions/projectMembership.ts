import type { Db } from "../db/client.js";
import { listProjectCodesForUser } from "../models/projectMembers.js";

/**
 * Resolves which project codes a user belongs to. DB-backed by default;
 * swap this interface for a call to an external HR/directory API later
 * without touching resolvePermissions or anything upstream of it.
 */
export interface ProjectMembershipProvider {
  getProjectCodesForUser(userEmail: string): string[] | Promise<string[]>;
}

export function createDbProjectMembershipProvider(db: Db): ProjectMembershipProvider {
  return {
    getProjectCodesForUser(userEmail: string) {
      return listProjectCodesForUser(db, userEmail);
    },
  };
}
