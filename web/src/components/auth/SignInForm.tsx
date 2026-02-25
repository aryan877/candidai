"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";

type AuthMode = "signIn" | "signUp";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const nextPath = useMemo(() => searchParams.get("next") || "/dashboard", [searchParams]);

  const [mode, setMode] = useState<AuthMode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(nextPath);
    }
  }, [isAuthenticated, nextPath, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { signingIn } = await signIn("password", {
        flow: mode,
        email: email.trim().toLowerCase(),
        password,
      });

      if (!signingIn) {
        setError("Authentication requires another step.");
        return;
      }
      router.push(nextPath);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Email field */}
      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-sm font-medium text-zinc-400"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-[#2a2a2a] bg-[#1e1e1e] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30"
          placeholder="you@example.com"
        />
      </div>

      {/* Password field */}
      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-sm font-medium text-zinc-400"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-lg border border-[#2a2a2a] bg-[#1e1e1e] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30"
          placeholder="Enter your password"
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-lg bg-white py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading
          ? mode === "signIn"
            ? "Signing in..."
            : "Creating account..."
          : mode === "signIn"
            ? "Sign In"
            : "Create Account"}
      </button>

      {/* Separator */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[#2a2a2a]" />
        <span className="text-xs text-zinc-600">or</span>
        <div className="h-px flex-1 bg-[#2a2a2a]" />
      </div>

      {/* Toggle mode button */}
      <button
        type="button"
        disabled={isLoading}
        onClick={() => setMode((prev) => (prev === "signIn" ? "signUp" : "signIn"))}
        className="w-full rounded-lg border border-[#2a2a2a] bg-[#181818] py-2.5 text-sm text-zinc-400 transition-colors hover:bg-[#1e1e1e] hover:text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {mode === "signIn"
          ? "Need an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
