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
}
