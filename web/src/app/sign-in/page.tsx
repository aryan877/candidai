import Link from "next/link";
import { SignInForm } from "@/components/auth/SignInForm";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen">
      {/* Left branding panel — hidden on mobile */}
      <div className="relative hidden w-1/2 items-center justify-center overflow-hidden border-r border-[#2a2a2a] bg-[#141414] md:flex">
        {/* Dot grid overlay */}
        <div className="absolute inset-0 bg-grid-dots opacity-20" />

        {/* Branding content */}
        <div className="relative z-10 flex flex-col items-center text-center animate-fade-in">
          <h2 className="text-5xl font-bold tracking-tight">
            <span className="text-white">Candid</span>
            <span className="text-zinc-500">AI</span>
          </h2>
          <p className="mt-4 text-lg font-medium text-zinc-400">
            AI-Powered Technical Interviews
          </p>
          <div className="mt-8 h-px w-48 bg-[#2a2a2a]" />
          <p className="mt-8 max-w-xs text-sm leading-relaxed text-zinc-600">
            Practice with an AI interviewer that evaluates your communication,
            problem-solving, and coding skills in real time.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex w-full items-center justify-center px-6 py-12 md:w-1/2">
        <div className="w-full max-w-md animate-fade-in-up">
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#181818] p-8">
            {/* Header */}
            <div className="mb-8">
              {/* Mobile-only logo */}
              <div className="mb-4 md:hidden">
                <span className="text-2xl font-bold tracking-tight">
                  <span className="text-white">Inter</span>
                  <span className="text-zinc-500">Vue</span>
                </span>
              </div>
              <h1 className="text-2xl font-semibold text-white">
                Welcome back
              </h1>
              <p className="mt-2 text-sm text-zinc-500">
                Sign in to continue to your dashboard.
              </p>
            </div>

            {/* Auth form */}
            <SignInForm />

            {/* Admin hint */}
            <p className="mt-6 text-center text-xs text-zinc-600">
              Admin account defaults to{" "}
              <code className="rounded bg-[#1e1e1e] px-1.5 py-0.5 text-zinc-400 border border-[#2a2a2a]">
                admin@candidai.dev
              </code>
            </p>

            {/* Back link */}
            <div className="mt-4 text-center">
              <Link
                href="/"
                className="text-sm text-zinc-600 transition-colors hover:text-zinc-300"
              >
                &larr; Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
