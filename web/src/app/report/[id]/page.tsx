"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import ReportDashboard from "@/components/report/ReportDashboard";

export default function ReportPage() {
  const params = useParams();
  const callId = params.id as string;

  const report = useQuery(api.reports.getByCallId, { callId });
  const scores = useQuery(api.scores.getByCallId, { callId });
  const transcripts = useQuery(api.transcripts.getByCallId, { callId });
  const codeSubmissions = useQuery(api.codeSubmissions.getByCallId, { callId });
  const cheatingIncidents = useQuery(api.cheatingIncidents.getByCallId, { callId });

  const timeline = useMemo(() => {
    const scoreEvents = (scores ?? []).map((score) => ({
      type: "score" as const,
      timestamp: score.createdAt,
      data: {
        dimension: score.dimension,
        score: score.score,
      },
    }));

    const codeEvents = (codeSubmissions ?? []).map((submission) => ({
      type: "code_submission" as const,
      timestamp: submission.createdAt,
      data: {
        challengeTitle: submission.challengeTitle,
        language: submission.language,
      },
    }));

    const integrityEvents = (cheatingIncidents ?? []).map((incident) => ({
      type: "note" as const,
      timestamp: incident.timestamp,
      data: {
        note: incident.description,
        score: incident.severity,
        phase: incident.phase,
      },
    }));

    return [...scoreEvents, ...codeEvents, ...integrityEvents].sort(
      (a, b) => a.timestamp - b.timestamp
    );
  }, [cheatingIncidents, codeSubmissions, scores]);

  if (
    report === undefined ||
    scores === undefined ||
    transcripts === undefined ||
    codeSubmissions === undefined ||
    cheatingIncidents === undefined
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (report === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#181818] px-8 py-10 text-center">
          <h2 className="mb-2 text-xl font-semibold text-white">Report Not Found</h2>
          <p className="text-zinc-400">This interview report is not available yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ReportDashboard
        overallScore={report.overallScore}
        recommendation={report.recommendation as any}
        summary={report.summary}
        strengths={report.strengths}
        improvements={report.improvements}
        scores={(scores ?? []).map((s) => ({
          dimension: s.dimension as any,
          score: s.score,
        }))}
        transcripts={(transcripts ?? []).map((t, i) => ({
          id: t._id ?? `t-${i}`,
          speaker: t.speaker as any,
          text: t.content,
          timestamp: t.timestamp,
        }))}
        codeSubmissions={(codeSubmissions ?? []).map((submission) => ({
          code: submission.code,
          language: submission.language,
          challengeTitle: submission.challengeTitle,
        }))}
        cheatingIncidents={cheatingIncidents ?? []}
        timeline={timeline}
        recordingUrl={null}
      />
    </div>
  );
}
