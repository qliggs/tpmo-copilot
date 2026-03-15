"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

// ---------------------------------------------------------------------------
// Login Form (needs useSearchParams, requires Suspense boundary)
// ---------------------------------------------------------------------------

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/chat";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (result?.ok) {
      window.location.href = callbackUrl;
      return;
    } else {
      setError("Invalid username or password");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="username"
          className="block text-xs font-medium text-arctic-muted mb-1.5"
        >
          Username
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoFocus
          className="w-full px-3 py-2.5 bg-graphite-900 border border-white/[0.07] rounded-lg text-sm text-slate-100 font-mono placeholder-arctic-dim focus:outline-none focus:border-arctic-muted/40 focus:ring-1 focus:ring-arctic-muted/20 transition-colors"
          placeholder="Enter username"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-xs font-medium text-arctic-muted mb-1.5"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2.5 bg-graphite-900 border border-white/[0.07] rounded-lg text-sm text-slate-100 font-mono placeholder-arctic-dim focus:outline-none focus:border-arctic-muted/40 focus:ring-1 focus:ring-arctic-muted/20 transition-colors"
          placeholder="Enter password"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-arctic hover:bg-white text-graphite-950 disabled:bg-graphite-800 disabled:text-arctic-dim disabled:cursor-not-allowed text-sm font-medium rounded-lg transition-colors cursor-pointer"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-graphite-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-arctic text-xs font-bold text-graphite-950">
              TC
            </div>
          </div>
          <h1 className="text-xl font-semibold text-slate-100 tracking-tight font-mono">
            TPMO Copilot
          </h1>
          <p className="text-xs text-arctic-dim mt-1">Sign in to continue</p>
        </div>

        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
