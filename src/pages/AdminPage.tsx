import { useEffect, useState } from "react";
import { checkAdminSession } from "../lib/api";
import { AdminLogin } from "./AdminLogin";
import { AdminDashboard } from "./AdminDashboard";

type AuthState = "loading" | "unauthenticated" | "authenticated";

export function AdminPage() {
  const [authState, setAuthState] = useState<AuthState>("loading");

  useEffect(() => {
    checkAdminSession().then((ok) => {
      setAuthState(ok ? "authenticated" : "unauthenticated");
    });
  }, []);

  if (authState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbfaf7]">
        <p className="font-body text-sm text-ink-muted">Loading…</p>
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return <AdminLogin onSuccess={() => setAuthState("authenticated")} />;
  }

  return <AdminDashboard onLogout={() => setAuthState("unauthenticated")} />;
}

export default AdminPage;
