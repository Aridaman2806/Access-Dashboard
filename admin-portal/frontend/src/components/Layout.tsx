import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.js";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const navGroups: { label: string; items: NavItem[] }[] = [
  { label: "Overview", items: [{ to: "/", label: "Dashboard", end: true }] },
  {
    label: "Manage",
    items: [
      { to: "/tools", label: "Tool Registry" },
      { to: "/users", label: "User Access" },
      { to: "/projects", label: "Projects" },
    ],
  },
  {
    label: "Browse",
    items: [
      { to: "/views/tool", label: "Tool View" },
      { to: "/views/user", label: "User View" },
      { to: "/views/project", label: "Project View" },
    ],
  },
  { label: "History", items: [{ to: "/audit-log", label: "Audit Log" }] },
];

export function Layout() {
  const { email, logout } = useAuth();

  return (
    <div className="flex min-h-svh bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <aside className="flex w-56 shrink-0 flex-col border-r border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-6">
          <h1 className="text-lg font-semibold">MCP Access</h1>
          <p className="text-xs text-neutral-500">Access management portal</p>
        </div>
        <nav className="flex flex-1 flex-col gap-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="mb-1 px-3 text-xs font-semibold tracking-wide text-neutral-400 uppercase dark:text-neutral-600">
                {group.label}
              </div>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `rounded px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                          : "text-neutral-600 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-4 border-t border-neutral-200 pt-4 text-sm dark:border-neutral-800">
          <div className="mb-2 truncate text-neutral-500">{email}</div>
          <button
            onClick={() => void logout()}
            className="w-full rounded border border-neutral-300 px-3 py-1.5 text-sm transition-colors hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-x-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
