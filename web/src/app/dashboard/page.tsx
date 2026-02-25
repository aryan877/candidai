"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { Plus, Clock, ShieldCheck, Copy, LogOut, Loader2, BarChart3, Users, CheckCircle2, Radio } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";
import { INTERVIEW_TYPE_LABELS } from "@/lib/constants";
import type { InterviewType } from "@/types/interview";

const interviewTypes: Array<{
  id: InterviewType;
  label: string;
  description: string;
}> = [
  {
    id: "technical",
    label: "Technical",
    description: "Data structures, algorithms, and systems fundamentals",
  },
  {
    id: "behavioral",
    label: "Behavioral",
    description: "Experience and communication-focused questions",
  },
  {
    id: "system-design",
    label: "System Design",
    description: "Architecture, tradeoffs, and scalability",
  },
  {
    id: "full",
    label: "Full Loop",
    description: "Complete interview run with coding and wrap-up",
  },
];

function statusClass(status: string) {
  if (status === "completed") return "bg-emerald-500/10 text-emerald-400";
  if (status === "active") return "bg-blue-500/10 text-blue-400 animate-pulse";
  if (status === "cancelled") return "bg-red-500/10 text-red-400";
  return "bg-zinc-800 text-zinc-400";
}

export default function DashboardPage() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const viewer = useQuery(api.users.viewerOptional);
  const interviews = useQuery(api.interviews.listMine);
  const createInvite = useMutation(api.interviews.createInvite);

  const [showDialog, setShowDialog] = useState(false);
  const [candidateEmail, setCandidateEmail] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = viewer?.role === "admin";
  const sortedInterviews = useMemo(
    () => (interviews ?? []).slice().sort((a, b) => b.createdAt - a.createdAt),
    [interviews]
  );

  const handleCreate = async (type: InterviewType) => {
    setIsCreating(true);
    setError(null);
    try {
      const invite = await createInvite({
        type,
        candidateEmail: candidateEmail.trim() || undefined,
      });
      const relativeUrl = `/interview/${invite.callId}?invite=${invite.inviteToken}&type=${type}`;
      const absoluteUrl =
        typeof window === "undefined"
          ? relativeUrl
          : `${window.location.origin}${relativeUrl}`;
      setShareUrl(absoluteUrl);

      if (!isAdmin) {
        router.push(relativeUrl);
      }
      setShowDialog(false);
      setCandidateEmail("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create interview invite.";
      setError(message);
    } finally {
      setIsCreating(false);
    }
  };

  if (viewer === undefined || interviews === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  const totalCount = sortedInterviews.length;
  const activeCount = sortedInterviews.filter((i) => i.status === "active").length;
  const completedCount = sortedInterviews.filter((i) => i.status === "completed").length;

  return (
    <div className="min-h-screen">
      <div className="px-6 py-12">
        <div className="mx-auto max-w-6xl space-y-10 animate-fade-in">
          {/* Header */}
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-white">
                Dashboard
              </h1>
              <p className="mt-2 max-w-lg text-zinc-500">
                {isAdmin
                  ? "Create interview invites, monitor sessions, and review anti-cheat events."
                  : "Create interview sessions and review your previous runs."}
              </p>
              {viewer?.email && (
                <p className="mt-1 text-sm text-zinc-600">
                  Signed in as {viewer.email}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {isAdmin && (
                <button
                  onClick={() => router.push("/admin")}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#2a2a2a] bg-[#181818] px-4 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-[#1e1e1e] hover:text-zinc-200"
                >
                  <ShieldCheck className="h-4 w-4 text-zinc-500" />
                  Admin Panel
                </button>
              )}
              <button
                onClick={() => setShowDialog(true)}
                className="group inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
              >
                <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                New Interview
              </button>
              <button
                onClick={() => signOut()}
                className="inline-flex items-center gap-2 rounded-xl border border-[#2a2a2a] bg-[#181818] px-4 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-[#1e1e1e] hover:text-zinc-200"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>

          {/* Share URL Banner */}
          {shareUrl && (
            <div className="relative overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#181818] p-5 animate-fade-in-up">
              <p className="text-sm font-semibold text-zinc-200">Interview URL generated</p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <code className="block flex-1 overflow-x-auto rounded-lg border border-[#2a2a2a] bg-[#111111] px-4 py-2.5 text-xs font-mono text-zinc-300 scrollbar-thin">
                  {shareUrl}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(shareUrl)}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#2a2a2a] bg-[#1e1e1e] px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-[#252525] hover:text-zinc-100"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
              </div>
            </div>
          )}

          {/* Create Dialog Modal */}
          {showDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm animate-fade-in">
              <div className="w-full max-w-xl rounded-2xl border border-[#2a2a2a] bg-[#181818] p-8 animate-fade-in-up">
                <h2 className="mb-1 text-2xl font-bold text-white">Create Interview</h2>
                <p className="mb-6 text-sm text-zinc-500">
                  Choose interview type and generate a shareable invite link.
                </p>

                <label className="mb-2 block text-sm font-medium text-zinc-400">
                  Candidate email <span className="text-zinc-600">(optional)</span>
                </label>
                <input
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  placeholder="candidate@company.com"
                  className="mb-6 w-full rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 transition focus:border-zinc-500 focus:bg-[#222222]"
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  {interviewTypes.map((type) => (
                    <button
                      key={type.id}
                      disabled={isCreating}
                      onClick={() => handleCreate(type.id)}
                      className="rounded-xl border border-[#2a2a2a] bg-[#181818] p-5 text-left transition-colors hover:border-[#3a3a3a] hover:bg-[#1e1e1e] disabled:opacity-50 group"
                    >
                      <div className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">{type.label}</div>
                      <div className="mt-1 text-xs leading-relaxed text-zinc-600 group-hover:text-zinc-400 transition-colors">{type.description}</div>
                    </button>
                  ))}
                </div>

                {error && (
                  <p className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-400">{error}</p>
                )}

                <button
                  onClick={() => setShowDialog(false)}
                  className="mt-6 w-full rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] py-3 text-sm text-zinc-500 transition-colors hover:bg-[#252525] hover:text-zinc-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 stagger-children">
            <div className="rounded-xl border border-[#2a2a2a] bg-[#181818] p-5 transition-colors hover:border-[#3a3a3a]">
              <div className="flex items-center gap-2 text-zinc-500">
                <BarChart3 className="h-4 w-4" />
                <span className="text-sm font-medium">Total</span>
              </div>
              <p className="mt-3 text-3xl font-bold text-zinc-100">{totalCount}</p>
            </div>
            <div className="rounded-xl border border-[#2a2a2a] bg-[#181818] p-5 transition-colors hover:border-[#3a3a3a]">
              <div className="flex items-center gap-2 text-zinc-500">
                <Radio className="h-4 w-4" />
                <span className="text-sm font-medium">Active</span>
              </div>
              <p className="mt-3 text-3xl font-bold text-zinc-100">{activeCount}</p>
            </div>
            <div className="rounded-xl border border-[#2a2a2a] bg-[#181818] p-5 transition-colors hover:border-[#3a3a3a]">
              <div className="flex items-center gap-2 text-zinc-500">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Completed</span>
              </div>
              <p className="mt-3 text-3xl font-bold text-zinc-100">{completedCount}</p>
            </div>
            <div className="rounded-xl border border-[#2a2a2a] bg-[#181818] p-5 transition-colors hover:border-[#3a3a3a]">
              <div className="flex items-center gap-2 text-zinc-500">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">Candidates</span>
              </div>
              <p className="mt-3 text-3xl font-bold text-zinc-100">{totalCount}</p>
            </div>
          </div>

          {/* Past Interviews */}
          <div>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-zinc-100">Past Interviews</h2>
              <span className="text-sm text-zinc-600">{sortedInterviews.length} total</span>
            </div>
            {sortedInterviews.length === 0 ? (
              <div className="rounded-xl border border-[#2a2a2a] bg-[#181818] p-16 text-center animate-fade-in-up">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#2a2a2a] bg-[#1e1e1e]">
                  <Clock className="h-7 w-7 text-zinc-500" />
                </div>
                <p className="text-lg font-medium text-zinc-200">No interviews yet</p>
                <p className="mt-2 text-sm text-zinc-600">
                  Create your first interview to see results here.
                </p>
                <button
                  onClick={() => setShowDialog(true)}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
                >
                  <Plus className="h-4 w-4" />
                  Create Interview
                </button>
              </div>
            ) : (
              <div className="space-y-3 stagger-children">
                {sortedInterviews.map((interview) => (
                  <div
                    key={interview._id}
                    className="flex flex-col gap-4 rounded-xl border border-[#2a2a2a] bg-[#181818] px-6 py-5 transition-colors hover:border-[#3a3a3a] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-100">
                        {INTERVIEW_TYPE_LABELS[interview.type] ?? interview.type}
                      </p>
                      <p className="mt-1 text-xs text-zinc-600">
                        {new Date(interview.createdAt).toLocaleString()}
                        <span className="mx-1.5 text-zinc-700">|</span>
                        <code className="rounded bg-[#1e1e1e] px-1.5 py-0.5 text-zinc-500">{interview.callId}</code>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase ${statusClass(interview.status)}`}
                      >
                        {interview.status}
                      </span>
                      <Link
                        href={`/interview/${interview.callId}?invite=${interview.inviteToken}&type=${interview.type}`}
                        className="rounded-lg border border-[#2a2a2a] bg-[#1e1e1e] px-3.5 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-[#252525] hover:text-zinc-200"
                      >
                        Open
                      </Link>
                      <Link
                        href={`/report/${interview.callId}`}
                        className="rounded-lg border border-[#2a2a2a] bg-[#1e1e1e] px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-[#252525] hover:text-zinc-100"
                      >
                        Report
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
