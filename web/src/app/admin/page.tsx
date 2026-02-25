"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { Loader2, ShieldAlert, Eye, Activity, BarChart3, Radio, AlertTriangle } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { INTERVIEW_TYPE_LABELS } from "@/lib/constants";

function severityClass(severity: number) {
  if (severity <= 3) return "bg-emerald-500/10 text-emerald-400";
  if (severity <= 6) return "bg-amber-500/10 text-amber-400";
  return "bg-red-500/10 text-red-400";
}

export default function AdminPage() {
  const viewer = useQuery(api.users.viewerOptional);
  const overview = useQuery(
    api.interviews.adminOverview,
    viewer?.role === "admin" ? { limit: 120 } : "skip"
  );
  const markReviewed = useMutation(api.cheatingIncidents.markReviewed);

  if (viewer === undefined || overview === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!viewer || viewer.role !== "admin") {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#181818] p-10 text-center animate-fade-in-up">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5">
            <ShieldAlert className="h-7 w-7 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-zinc-100">Admin access required</h1>
          <p className="mt-2 text-sm text-zinc-500">
            This page is only available to interviewer/admin users.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] px-6 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-[#252525] hover:text-zinc-100"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8 animate-fade-in">
          {/* Header */}
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white">
              Admin <span className="text-zinc-400">Ops</span>
            </h1>
            <p className="mt-2 max-w-lg text-zinc-500">
              Monitor sessions, flag suspicious behavior, and audit interview outcomes.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-3 stagger-children">
            <div className="rounded-xl border border-[#2a2a2a] bg-[#181818] p-6 transition-colors hover:border-[#3a3a3a]">
              <div className="flex items-center gap-2 text-zinc-500">
                <BarChart3 className="h-4 w-4" />
                <span className="text-sm font-medium">Total Interviews</span>
              </div>
              <p className="mt-3 text-3xl font-bold text-zinc-100">{overview.stats.totalInterviews}</p>
            </div>
            <div className="rounded-xl border border-[#2a2a2a] bg-[#181818] p-6 transition-colors hover:border-[#3a3a3a]">
              <div className="flex items-center gap-2 text-zinc-500">
                <Radio className="h-4 w-4" />
                <span className="text-sm font-medium">Active Interviews</span>
              </div>
              <p className="mt-3 text-3xl font-bold text-zinc-100">
                {overview.stats.activeInterviews}
              </p>
            </div>
            <div className="rounded-xl border border-[#2a2a2a] bg-[#181818] p-6 transition-colors hover:border-[#3a3a3a]">
              <div className="flex items-center gap-2 text-zinc-500">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Cheat Incidents</span>
              </div>
              <p className="mt-3 text-3xl font-bold text-zinc-100">
                {overview.stats.totalIncidents}
              </p>
            </div>
          </div>

          {/* Interview Rows */}
          <div className="space-y-4 stagger-children">
            {overview.rows.map((row) => (
              <div key={row.interview._id} className="rounded-xl border border-[#2a2a2a] bg-[#181818] p-6 transition-colors hover:border-[#3a3a3a]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-100">
                      {INTERVIEW_TYPE_LABELS[row.interview.type] ?? row.interview.type}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">
                      {new Date(row.interview.createdAt).toLocaleString()}
                      <span className="mx-1.5 text-zinc-700">|</span>
                      interviewer: {row.creator?.name ?? row.creator?.email ?? "unknown"}
                      <span className="mx-1.5 text-zinc-700">|</span>
                      candidate: {row.candidate?.name ??
                        row.candidate?.email ??
                        row.interview.candidateEmail ??
                        "pending"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="rounded-full border border-[#2a2a2a] bg-[#1e1e1e] px-3 py-1 text-xs font-semibold tracking-wide uppercase text-zinc-300">
                      {row.interview.status}
                    </span>
                    <Link
                      href={`/interview/${row.interview.callId}?invite=${row.interview.inviteToken}&type=${row.interview.type}`}
                      className="rounded-lg border border-[#2a2a2a] bg-[#1e1e1e] px-3.5 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-[#252525] hover:text-zinc-200"
                    >
                      Open Session
                    </Link>
                    <Link
                      href={`/report/${row.interview.callId}`}
                      className="rounded-lg border border-[#2a2a2a] bg-[#1e1e1e] px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-[#252525] hover:text-zinc-100"
                    >
                      Open Report
                    </Link>
                  </div>
                </div>

                {/* Incident Details */}
                <div className="mt-5 grid gap-4 sm:grid-cols-[240px_1fr]">
                  <div className="rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] p-4 text-sm">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Activity className="h-4 w-4 text-zinc-500" />
                      <span className="font-medium">{row.incidentCount} incident(s)</span>
                    </div>
                    {row.latestIncident ? (
                      <p className="mt-2 text-xs text-zinc-500">
                        Last at {new Date(row.latestIncident.timestamp).toLocaleTimeString()}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-zinc-600">No incidents flagged.</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] p-4">
                    {row.latestIncident ? (
                      <>
                        <p className="text-sm font-semibold text-zinc-200">
                          {row.latestIncident.category}
                        </p>
                        <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                          {row.latestIncident.description}
                        </p>
                        {row.latestIncident.transcriptSnippet && (
                          <p className="mt-3 rounded-lg border border-[#2a2a2a] bg-[#111111] p-3 text-xs leading-relaxed text-zinc-500 italic">
                            &ldquo;{row.latestIncident.transcriptSnippet}&rdquo;
                          </p>
                        )}
                        <div className="mt-4 flex flex-wrap items-center gap-2.5">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${severityClass(row.latestIncident.severity)}`}
                          >
                            Severity {row.latestIncident.severity}/10
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              row.latestIncident.reviewed
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            {row.latestIncident.reviewed ? "Reviewed" : "Pending review"}
                          </span>
                          {!row.latestIncident.reviewed && (
                            <button
                              onClick={() =>
                                markReviewed({
                                  incidentId: row.latestIncident!._id,
                                  reviewed: true,
                                })
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a2a2a] bg-[#1e1e1e] px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-[#252525] hover:text-zinc-100"
                            >
                              <Eye className="h-3.5 w-3.5 text-zinc-500" />
                              Mark reviewed
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-zinc-600">
                        No suspicious events detected for this interview.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
