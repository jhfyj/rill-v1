import { useState } from "react";
import { adminLogin } from "../lib/api";

interface AdminLoginProps {
  onSuccess: () => void;
}

export function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const ok = await adminLogin(password);
      if (ok) {
        onSuccess();
      } else {
        setError("Incorrect password. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fbfaf7]">
      <div className="w-full max-w-sm rounded-2xl border border-black/[0.08] bg-white p-10 shadow-glass">
        {/* Logo / title */}
        <div className="mb-8 text-center">
          <span className="font-title text-3xl text-brand-900">Rill</span>
          <p className="mt-1 font-body text-sm text-ink-muted">Admin Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block font-body text-xs uppercase tracking-[0.12em] text-ink-muted"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              className="w-full rounded-xl border border-black/15 bg-surface px-4 py-3 font-body text-sm text-ink outline-none transition focus:border-[#5160c8] focus:ring-2 focus:ring-[#5160c8]/20"
              placeholder="Enter admin password"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-2.5 font-body text-xs text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-xl bg-[#5160c8] px-6 py-3 font-body text-sm font-medium text-white transition hover:bg-[#3d4eb8] disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;
