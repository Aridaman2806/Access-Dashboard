/**
 * End-to-end proof that the gateway actually enforces access, without
 * touching the org's real MCP server or agent builder platform. Spins up the
 * bundled mock upstream + the gateway pointed at it, seeds a handful of
 * grants directly via packages/core, then plays the role of the agent
 * builder platform: connects to the gateway's MCP endpoint with simulated
 * SSO identity headers and asserts each access scenario end-to-end.
 *
 * Run with: npm run verify:e2e
 */
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  addProjectMember,
  createProject,
  grantToolToProject,
  grantToolToUser,
  migrate,
  openDb,
  revokeIndividualGrant,
  setToolDepartmentTags,
  upsertTool,
  type Db,
} from "@mcp-access/core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const MOCK_PORT = 4091;
const GATEWAY_PORT = 4092;
const SHARED_SECRET = "e2e-test-secret";
const DB_PATH = path.join(ROOT, "scripts", ".e2e-data", "test.sqlite");

const children: ChildProcess[] = [];
let passed = 0;
let failed = 0;

function log(message: string) {
  console.log(message);
}

function ok(description: string, condition: boolean) {
  if (condition) {
    passed++;
    log(`  \x1b[32m✔\x1b[0m ${description}`);
  } else {
    failed++;
    log(`  \x1b[31m✘\x1b[0m ${description}`);
  }
}

async function waitForHealth(url: string, timeoutMs = 15000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function spawnService(name: string, cwd: string, env: Record<string, string>): ChildProcess {
  const child = spawn("npx", ["tsx", "src/index.ts"], {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  });
  child.stdout?.on("data", (d) => process.env.E2E_VERBOSE && log(`[${name}] ${d}`.trimEnd()));
  child.stderr?.on("data", (d) => log(`[${name}:err] ${d}`.toString().trimEnd()));
  children.push(child);
  return child;
}

function stopAll() {
  for (const child of children) {
    if (child.killed || !child.pid) continue;
    // spawn() was called with shell:true (needed to resolve "npx" on
    // Windows), which means child.kill() only kills the shell wrapper, not
    // the actual tsx/node process underneath it -- leaving orphaned
    // mock-server/gateway processes still listening on their ports. Kill
    // the whole process tree explicitly instead.
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      child.kill();
    }
  }
}

interface Identity {
  email: string;
  name: string;
  department?: string;
}

async function connectAs(identity: Identity): Promise<Client> {
  const client = new Client({ name: "sim-agent-builder", version: "1.0.0" }, { capabilities: {} });
  const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${GATEWAY_PORT}/mcp`), {
    requestInit: {
      headers: {
        "X-Gateway-Auth": SHARED_SECRET,
        "X-User-Email": identity.email,
        "X-User-Name": identity.name,
        ...(identity.department ? { "X-User-Department": identity.department } : {}),
      },
    },
  });
  await client.connect(transport);
  return client;
}

function seed(db: Db) {
  const tags: Record<string, string[]> = {
    code_search: ["engineering"],
    deploy_status: ["engineering"],
    budget_lookup: ["finance"],
    expense_report: ["finance"],
    employee_lookup: ["hr"],
    leave_balance: ["hr"],
  };
  for (const [name, deptTags] of Object.entries(tags)) {
    upsertTool(db, { name, description: `mock tool ${name}` });
    setToolDepartmentTags(db, name, deptTags);
  }

  createProject(db, { code: "PROJ-TEST", name: "E2E Test Project" });
  addProjectMember(db, { projectCode: "PROJ-TEST", userEmail: "projmember@test.com", addedBy: "seed-script" });
  grantToolToProject(db, { projectCode: "PROJ-TEST", toolName: "budget_lookup", grantedBy: "seed-script" });

  const soloGrant = grantToolToUser(db, { userEmail: "solo@test.com", toolName: "leave_balance", grantedBy: "seed-script" });
  return { soloGrant };
}

async function main() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  for (const f of fs.existsSync(path.dirname(DB_PATH)) ? fs.readdirSync(path.dirname(DB_PATH)) : []) {
    fs.rmSync(path.join(path.dirname(DB_PATH), f), { force: true });
  }

  log("Starting mock upstream MCP server...");
  spawnService("mock", path.join(ROOT, "apps", "mock-mcp-server"), { PORT: String(MOCK_PORT) });
  await waitForHealth(`http://localhost:${MOCK_PORT}/health`);

  log("Starting gateway (enforce mode)...");
  spawnService("gateway", path.join(ROOT, "packages", "gateway"), {
    PORT: String(GATEWAY_PORT),
    DB_PATH,
    GATEWAY_SHARED_SECRET: SHARED_SECRET,
    GATEWAY_ENFORCE_MODE: "enforce",
    UPSTREAM_MCP_SERVER_URL: `http://localhost:${MOCK_PORT}/mcp`,
  });
  await waitForHealth(`http://localhost:${GATEWAY_PORT}/health`);

  log("Seeding department tags, a project grant, and an individual grant...");
  const db = openDb(DB_PATH);
  migrate(db);
  const { soloGrant } = seed(db);

  log("\nRunning scenarios:\n");

  // 1. Department match: engineering user sees only engineering tools and can call one.
  {
    const client = await connectAs({ email: "eng@test.com", name: "Eng User", department: "engineering" });
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    ok("department match: eng user sees exactly code_search + deploy_status", JSON.stringify(names) === JSON.stringify(["code_search", "deploy_status"]));

    const result = await client.callTool({ name: "deploy_status", arguments: { service: "checkout-api" } });
    ok("department match: eng user's callTool(deploy_status) succeeds", result.isError !== true);
    await client.close();
  }

  // 2. Department mismatch: same eng user cannot call or see a finance tool.
  {
    const client = await connectAs({ email: "eng@test.com", name: "Eng User", department: "engineering" });
    const result = await client.callTool({ name: "budget_lookup", arguments: { department: "finance" } });
    ok("no access: eng user's callTool(budget_lookup) is rejected", result.isError === true);
    await client.close();
  }

  // 3. No access at all: unmatched department, no grants -> empty tools/list.
  {
    const client = await connectAs({ email: "rando@test.com", name: "Rando User", department: "marketing" });
    const { tools } = await client.listTools();
    ok("no access: user with unmatched department + no grants sees zero tools", tools.length === 0);
    await client.close();
  }

  // 4. Project grant: a project member (wrong department) still gets access via the project.
  {
    const client = await connectAs({ email: "projmember@test.com", name: "Proj Member", department: "marketing" });
    const { tools } = await client.listTools();
    ok("project grant: project member sees budget_lookup despite mismatched department", tools.some((t) => t.name === "budget_lookup"));

    const result = await client.callTool({ name: "budget_lookup", arguments: { department: "finance" } });
    ok("project grant: project member's callTool(budget_lookup) succeeds", result.isError !== true);
    await client.close();
  }

  // 5. Individual grant, then revoke removes access.
  {
    const before = await connectAs({ email: "solo@test.com", name: "Solo User", department: "marketing" });
    const { tools: toolsBefore } = await before.listTools();
    ok("individual grant: solo user sees leave_balance before revoke", toolsBefore.some((t) => t.name === "leave_balance"));
    await before.close();

    revokeIndividualGrant(db, soloGrant.id, "seed-script");

    const after = await connectAs({ email: "solo@test.com", name: "Solo User", department: "marketing" });
    const { tools: toolsAfter } = await after.listTools();
    ok("individual grant: solo user no longer sees leave_balance after revoke", !toolsAfter.some((t) => t.name === "leave_balance"));
    await after.close();
  }

  // 6. Trust boundary: missing/invalid shared secret is rejected before any identity logic runs.
  {
    const client = new Client({ name: "sim-agent-builder-badauth", version: "1.0.0" }, { capabilities: {} });
    const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${GATEWAY_PORT}/mcp`), {
      requestInit: { headers: { "X-Gateway-Auth": "wrong-secret", "X-User-Email": "x@test.com", "X-User-Name": "X" } },
    });
    let rejected = false;
    try {
      await client.connect(transport);
      await client.listTools();
    } catch {
      rejected = true;
    }
    ok("trust boundary: request with a bad X-Gateway-Auth secret is rejected", rejected);
  }

  log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(stopAll);
