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
      // Hard navigation to ensure the edge cookie is read by middleware
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
          className="block text-xs font-medium text-gray-400 mb-1.5"
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
          className="w-full px-3 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-100 font-mono placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-colors"
          placeholder="Enter username"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-xs font-medium text-gray-400 mb-1.5"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-100 font-mono placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-colors"
          placeholder="Enter password"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-sm font-medium text-white rounded-lg transition-colors cursor-pointer"
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
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
              TC
            </div>
          </div>
          <h1 className="text-xl font-semibold text-gray-100 tracking-tight font-mono">
            TPMO Copilot
          </h1>
          <p className="text-xs text-gray-500 mt-1">Sign in to continue</p>
        </div>

        {/* Form wrapped in Suspense for useSearchParams */}
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
