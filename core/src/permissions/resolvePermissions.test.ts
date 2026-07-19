import { test } from "node:test";
import assert from "node:assert/strict";
import { openDb } from "../db/client.js";
import { migrate } from "../db/migrate.js";
import { upsertUser } from "../models/users.js";
import { upsertTool, setToolDepartmentTags } from "../models/tools.js";
import { grantToolToUser, revokeIndividualGrant } from "../models/grants.js";
import { createProject } from "../models/projects.js";
import { addProjectMember } from "../models/projectMembers.js";
import { grantToolToProject, revokeProjectGrant } from "../models/projectGrants.js";
import { resolveEffectivePermission } from "./resolvePermissions.js";

function freshDb() {
  const db = openDb(":memory:");
  migrate(db);
  return db;
}

test("department tag match allows access", async () => {
  const db = freshDb();
  upsertUser(db, { email: "a@x.com", name: "A", department: "engineering" });
  upsertTool(db, { name: "deploy_status" });
  setToolDepartmentTags(db, "deploy_status", ["engineering"]);

  const result = await resolveEffectivePermission({ db }, { email: "a@x.com", department: "engineering" }, "deploy_status");
  assert.equal(result.allowed, true);
  assert.equal(result.reason, "department");
});

test("no department match, no grants -> denied", async () => {
  const db = freshDb();
  upsertUser(db, { email: "a@x.com", name: "A", department: "hr" });
  upsertTool(db, { name: "deploy_status" });
  setToolDepartmentTags(db, "deploy_status", ["engineering"]);

  const result = await resolveEffectivePermission({ db }, { email: "a@x.com", department: "hr" }, "deploy_status");
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "none");
});

test("untagged tool defaults to deny even with a department", async () => {
  const db = freshDb();
  upsertUser(db, { email: "a@x.com", name: "A", department: "engineering" });
  upsertTool(db, { name: "new_tool" });

  const result = await resolveEffectivePermission({ db }, { email: "a@x.com", department: "engineering" }, "new_tool");
  assert.equal(result.allowed, false);
});

test("individual grant allows access, and revoking it removes access", async () => {
  const db = freshDb();
  upsertUser(db, { email: "a@x.com", name: "A", department: "hr" });
  upsertTool(db, { name: "budget_lookup" });
  setToolDepartmentTags(db, "budget_lookup", ["finance"]);

  const before = await resolveEffectivePermission({ db }, { email: "a@x.com", department: "hr" }, "budget_lookup");
  assert.equal(before.allowed, false);

  const grant = grantToolToUser(db, { userEmail: "a@x.com", toolName: "budget_lookup", grantedBy: "admin@x.com" });
  const afterGrant = await resolveEffectivePermission({ db }, { email: "a@x.com", department: "hr" }, "budget_lookup");
  assert.equal(afterGrant.allowed, true);
  assert.equal(afterGrant.reason, "individual");

  revokeIndividualGrant(db, grant.id, "admin@x.com");
  const afterRevoke = await resolveEffectivePermission({ db }, { email: "a@x.com", department: "hr" }, "budget_lookup");
  assert.equal(afterRevoke.allowed, false);
});

test("project grant allows access for members, not for non-members", async () => {
  const db = freshDb();
  upsertUser(db, { email: "member@x.com", name: "Member", department: "hr" });
  upsertUser(db, { email: "outsider@x.com", name: "Outsider", department: "hr" });
  upsertTool(db, { name: "expense_report" });
  setToolDepartmentTags(db, "expense_report", ["finance"]);

  createProject(db, { code: "PROJ-1", name: "Project One" });
  addProjectMember(db, { projectCode: "PROJ-1", userEmail: "member@x.com", addedBy: "admin@x.com" });
  const grant = grantToolToProject(db, { projectCode: "PROJ-1", toolName: "expense_report", grantedBy: "admin@x.com" });

  const memberResult = await resolveEffectivePermission({ db }, { email: "member@x.com", department: "hr" }, "expense_report");
  assert.equal(memberResult.allowed, true);
  assert.equal(memberResult.reason, "project");
  assert.equal(memberResult.matchedProjectCode, "PROJ-1");

  const outsiderResult = await resolveEffectivePermission({ db }, { email: "outsider@x.com", department: "hr" }, "expense_report");
  assert.equal(outsiderResult.allowed, false);

  revokeProjectGrant(db, grant.id, "admin@x.com");
  const afterRevoke = await resolveEffectivePermission({ db }, { email: "member@x.com", department: "hr" }, "expense_report");
  assert.equal(afterRevoke.allowed, false);
});

test("department match is case- and whitespace-insensitive (real SSO data may not match admin-typed tags exactly)", async () => {
  const db = freshDb();
  upsertUser(db, { email: "sso@x.com", name: "SSO User", department: "Engineering " });
  upsertTool(db, { name: "deploy_status" });
  setToolDepartmentTags(db, "deploy_status", ["engineering"]);

  const result = await resolveEffectivePermission({ db }, { email: "sso@x.com", department: "Engineering " }, "deploy_status");
  assert.equal(result.allowed, true);
  assert.equal(result.reason, "department");
});

test("a tool can require any one of multiple department tags", async () => {
  const db = freshDb();
  upsertTool(db, { name: "shared_tool" });
  setToolDepartmentTags(db, "shared_tool", ["engineering", "finance"]);
  upsertUser(db, { email: "fin@x.com", name: "Fin", department: "finance" });

  const result = await resolveEffectivePermission({ db }, { email: "fin@x.com", department: "finance" }, "shared_tool");
  assert.equal(result.allowed, true);
  assert.equal(result.reason, "department");
});
