"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const INPUT_STYLE: React.CSSProperties = {
  background: "var(--bg-base)",
  border: "1px solid var(--border)",
  color: "var(--text-1)",
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-base)" }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div
              className="w-8 h-8 rounded flex items-center justify-center font-bold text-sm"
              style={{ background: "rgba(77,217,230,0.10)", border: "1px solid var(--border-bright)", color: "var(--data)" }}
            >
              A
            </div>
            <span className="font-semibold text-lg" style={{ color: "var(--text-1)" }}>ABA Intelligence</span>
          </div>
          <p className="text-sm" style={{ color: "var(--text-3)" }}>CST Academy Sourcing Platform</p>
        </div>

        {/* Auth-disabled notice */}
        <div
          className="rounded-xl mb-4 px-4 py-3 mono text-[10.5px]"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--warning)" }}
        >
          <div className="tracking-[0.18em] text-[9px] mb-1" style={{ color: "var(--warning)" }}>
            AUTH DISABLED
          </div>
          <p style={{ color: "var(--text-2)" }}>
            The dashboard is currently open — sign-in is not enforced. Visit any URL directly.
          </p>
          <Link
            href="/"
            className="inline-block mt-2 mono text-[10px] tracking-[0.15em]"
            style={{ color: "var(--data)" }}
          >
            CONTINUE TO INTEL FEED →
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-xl p-8" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <h1 className="font-semibold text-xl mb-6" style={{ color: "var(--text-1)" }}>Sign in</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm mb-1.5" style={{ color: "var(--text-3)" }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={INPUT_STYLE}
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5" style={{ color: "var(--text-3)" }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={INPUT_STYLE}
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-sm" style={{ color: "var(--critical)" }}>{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg font-medium text-sm transition-opacity disabled:opacity-50"
              style={{
                background: "var(--bg-base)",
                border: "1px solid var(--border-bright)",
                color: "var(--data)",
              }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
