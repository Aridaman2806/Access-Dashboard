import { Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.js";
import { Button } from "./ui.js";

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-svh bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
        <h1 className="text-lg font-semibold">Mock Agent Builder</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-neutral-500">
            {user?.name} — {user?.email}
          </span>
          <Button variant="secondary" onClick={() => void logout()}>
            Log out
          </Button>
        </div>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
