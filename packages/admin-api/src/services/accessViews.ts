import {
  findUsersByDepartments,
  getProject,
  getTool,
  getToolDepartmentTags,
  getUserByEmail,
  listActiveIndividualGrantsForTool,
  listActiveIndividualGrantsForUser,
  listActiveProjectGrantsForProject,
  listActiveProjectGrantsForTool,
  listMembersForProject,
  listProjectCodesForUser,
  listTools,
  resolveEffectivePermission,
  type Db,
} from "@mcp-access/core";

/** Backs GET /tools/:name/access — "who can use this tool, and why". */
export async function getToolAccessView(db: Db, toolName: string) {
  const tool = getTool(db, toolName);
  if (!tool) return undefined;

  const departmentTags = getToolDepartmentTags(db, toolName);
  const usersViaDepartment = findUsersByDepartments(db, departmentTags);

  const individualGrants = listActiveIndividualGrantsForTool(db, toolName);
  const projectGrants = listActiveProjectGrantsForTool(db, toolName).map((grant) => ({
    ...grant,
    project: getProject(db, grant.project_code),
    memberCount: listMembersForProject(db, grant.project_code).length,
  }));

  return { tool, departmentTags, usersViaDepartment, individualGrants, projectGrants };
}

/** Backs GET /users/:email/access — user's department, project memberships, and every tool's effective permission. */
export async function getUserAccessView(db: Db, email: string) {
  const user = getUserByEmail(db, email);
  if (!user) return undefined;

  const projectCodes = listProjectCodesForUser(db, email);
  const projects = projectCodes.map((code) => getProject(db, code)).filter(Boolean);

  const tools = listTools(db);
  const permissions = [];
  for (const tool of tools) {
    const result = await resolveEffectivePermission({ db }, user, tool.name);
    permissions.push({ tool: tool.name, ...result });
  }

  return { user, projects, permissions };
}

/** Backs GET /projects/:code/access — members and tools granted to the project. */
export function getProjectAccessView(db: Db, code: string) {
  const project = getProject(db, code);
  if (!project) return undefined;

  const members = listMembersForProject(db, code).map((member) => ({
    ...member,
    user: getUserByEmail(db, member.user_email),
    individualGrants: listActiveIndividualGrantsForUser(db, member.user_email),
  }));

  const toolGrants = listActiveProjectGrantsForProject(db, code);

  return { project, members, toolGrants };
}
