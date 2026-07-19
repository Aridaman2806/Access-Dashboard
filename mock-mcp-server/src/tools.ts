import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

function textResult(payload: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
}

/**
 * A handful of trivial, offline tools spread across a few fake departments
 * (engineering / finance / hr) purely by naming convention — this server has
 * no concept of department tags itself. Tagging happens in the access
 * management portal's own tool registry, which is what makes department-match
 * vs grant-based access actually distinguishable in end-to-end tests.
 */
export function registerTools(server: McpServer): void {
  server.registerTool(
    "code_search",
    {
      title: "Code Search",
      description: "Search the (fake) codebase for a query string.",
      inputSchema: { query: z.string().min(1) },
    },
    async ({ query }: { query: string }) =>
      textResult({ query, matches: [`src/foo.ts:12: // TODO ${query}`, `src/bar.ts:88: function ${query}Handler() {}`] }),
  );

  server.registerTool(
    "deploy_status",
    {
      title: "Deploy Status",
      description: "Get the (fake) deployment status of a service.",
      inputSchema: { service: z.string().min(1) },
    },
    async ({ service }: { service: string }) =>
      textResult({ service, status: "healthy", version: "1.4.2", lastDeployedAt: new Date().toISOString() }),
  );

  server.registerTool(
    "budget_lookup",
    {
      title: "Budget Lookup",
      description: "Look up the (fake) remaining budget for a department.",
      inputSchema: { department: z.string().min(1) },
    },
    async ({ department }: { department: string }) =>
      textResult({ department, remainingBudgetUsd: 128500, fiscalYear: 2026 }),
  );

  server.registerTool(
    "expense_report",
    {
      title: "Expense Report",
      description: "Get a (fake) summarized expense report for a month.",
      inputSchema: { month: z.string().min(1) },
    },
    async ({ month }: { month: string }) =>
      textResult({ month, totalUsd: 42310.5, topCategory: "travel" }),
  );

  server.registerTool(
    "employee_lookup",
    {
      title: "Employee Lookup",
      description: "Look up (fake) employee directory info by email.",
      inputSchema: { email: z.string().email() },
      // Demonstrates admin-portal's best-effort tag auto-detection on sync
      // (core/src/mcp/toolTags.ts) -- `_meta` is the MCP spec's one open
      // extension field that survives the SDK client's response validation.
      _meta: { tags: ["hc"] },
    },
    async ({ email }: { email: string }) =>
      textResult({ email, name: "Jordan Rivera", title: "Senior Analyst", department: "hr" }),
  );

  server.registerTool(
    "leave_balance",
    {
      title: "Leave Balance",
      description: "Get (fake) remaining leave balance for an employee.",
      inputSchema: { email: z.string().email() },
    },
    async ({ email }: { email: string }) => textResult({ email, remainingDays: 12.5, year: 2026 }),
  );

  server.registerTool(
    "incident_report",
    {
      title: "Incident Report",
      description: "Get the (fake) status of an incident.",
      inputSchema: { incidentId: z.string().min(1) },
    },
    async ({ incidentId }: { incidentId: string }) =>
      textResult({ incidentId, severity: "P2", status: "resolved", summary: `Incident ${incidentId} mitigated; postmortem pending.` }),
  );

  server.registerTool(
    "invoice_lookup",
    {
      title: "Invoice Lookup",
      description: "Look up a (fake) invoice by ID.",
      inputSchema: { invoiceId: z.string().min(1) },
    },
    async ({ invoiceId }: { invoiceId: string }) =>
      textResult({ invoiceId, amountUsd: 4820.0, status: "paid", dueDate: "2026-06-30" }),
  );

  server.registerTool(
    "org_chart",
    {
      title: "Org Chart",
      description: "Look up (fake) reporting-line info by email.",
      inputSchema: { email: z.string().email() },
    },
    async ({ email }: { email: string }) =>
      textResult({ email, manager: "Priya Nandakumar", directReports: 3, team: "Platform" }),
  );

  server.registerTool(
    "ticket_status",
    {
      title: "Ticket Status",
      description: "Get the (fake) status of a support ticket.",
      inputSchema: { ticketId: z.string().min(1) },
    },
    async ({ ticketId }: { ticketId: string }) =>
      textResult({ ticketId, status: "in_progress", assignee: "support-queue-2", updatedAt: new Date().toISOString() }),
  );
}
