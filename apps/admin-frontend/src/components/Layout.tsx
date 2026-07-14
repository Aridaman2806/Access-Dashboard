import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.js";

const navItems = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/tools", label: "Tool Registry" },
  { to: "/users", label: "User Access" },
  { to: "/projects", label: "Projects" },
  { to: "/views/tool", label: "Tool View" },
  { to: "/views/user", label: "User View" },
  { to: "/views/project", label: "Project View" },
  { to: "/audit-log", label: "Audit Log" },
];

export function Layout() {
  const { email, logout } = useAuth();

  return (
    <div className="flex min-h-svh bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <aside className="w-56 shrink-0 border-r border-neutral-200 p-4 dark:border-neutral-800">
        <h1 className="mb-6 text-lg font-semibold">MCP Access</h1>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded px-3 py-2 text-sm ${
                  isActive
                    ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                    : "text-neutral-600 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-8 border-t border-neutral-200 pt-4 text-sm dark:border-neutral-800">
          <div className="mb-2 truncate text-neutral-500">{email}</div>
          <button
            onClick={() => void logout()}
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
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
