"use client";

import { CheckCircle, ArrowUpRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type {
  Recommendation,
  ScoreDimension,
  Speaker,
} from "@/types/interview";
import ScoreRadar from "./ScoreRadar";
import TimelineView from "./TimelineView";
import RecordingPlayer from "./RecordingPlayer";

interface TranscriptEntry {
  id: string;
  speaker: Speaker | "system";
  text: string;
  timestamp: number;
}

interface CodeSubmission {
  code: string;
  language: string;
  challengeTitle: string;
}

interface CheatingIncident {
  _id: string;
  category: string;
  severity: number;
  description: string;
  transcriptSnippet?: string;
  phase?: string;
  reviewed: boolean;
  timestamp: number;
}

interface TimelineEvent {
  type: "phase_transition" | "score" | "code_submission" | "note";
  timestamp: number;
  data: Record<string, unknown>;
}

interface ReportDashboardProps {
  overallScore: number;
  recommendation: Recommendation;
  summary: string;
  strengths: string[];
  improvements: string[];
  scores: { dimension: ScoreDimension; score: number }[];
  transcripts: TranscriptEntry[];
  codeSubmissions: CodeSubmission[];
  cheatingIncidents: CheatingIncident[];
  timeline: TimelineEvent[];
  recordingUrl: string | null;
}

const recommendationConfig: Record<
  Recommendation,
  { label: string; className: string }
> = {
  strong_yes: {
    label: "Strong Yes",
    className: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  },
  yes: {
    label: "Yes",
    className: "bg-green-500/10 text-green-400 border border-green-500/20",
  },
  maybe: {
    label: "Maybe",
    className: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  },
  no: {
    label: "No",
    className: "bg-red-500/10 text-red-400 border border-red-500/20",
  },
  strong_no: {
    label: "Strong No",
    className: "bg-red-500/10 text-red-400 border border-red-500/20",
  },
};

export default function ReportDashboard({
  overallScore,
  recommendation,
  summary,
  strengths,
  improvements,
  scores,
  transcripts,
  codeSubmissions,
  cheatingIncidents,
  timeline,
  recordingUrl,
}: ReportDashboardProps) {
  const recConfig = recommendationConfig[recommendation];
  const circumference = 2 * Math.PI * 54;
  const scoreOffset =
    circumference - (overallScore / 10) * circumference;

  return (
    <div className="min-h-screen bg-background p-6 text-zinc-100">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header with overall score */}
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#181818] p-6 animate-fade-in">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            {/* Circular score */}
            <div className="relative flex h-32 w-32 items-center justify-center">
              <svg className="-rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="#2a2a2a"
                  strokeWidth="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke={
                    overallScore >= 8
                      ? "#34d399"
                      : overallScore >= 6
                        ? "#facc15"
                        : "#f87171"
                  }
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={scoreOffset}
                  strokeLinecap="round"
                />
              </svg>
              <span
                className={`absolute text-3xl font-bold ${
                  overallScore >= 8
                    ? "text-emerald-400"
                    : overallScore >= 6
                      ? "text-yellow-400"
                      : "text-red-400"
                }`}
              >
                {overallScore}
              </span>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="mb-2 flex items-center justify-center gap-3 sm:justify-start">
                <h1 className="text-2xl font-bold text-white">Interview Report</h1>
                <Badge className={recConfig.className}>{recConfig.label}</Badge>
              </div>
              <div className="rounded-lg border border-[#2a2a2a] bg-[#1e1e1e] px-4 py-3 mt-2">
                <p className="text-sm leading-relaxed text-zinc-400">{summary}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Strengths + Improvements + Radar */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="rounded-xl border border-[#2a2a2a] bg-[#181818] border-l-2 border-l-emerald-500/40 animate-fade-in-up">
              <Card className="bg-transparent border-0 shadow-none">
                <CardHeader>
                  <CardTitle className="text-base text-emerald-400">Strengths</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        <span className="text-zinc-300">{s}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="rounded-xl border border-[#2a2a2a] bg-[#181818] border-l-2 border-l-amber-500/40 animate-fade-in-up">
              <Card className="bg-transparent border-0 shadow-none">
                <CardHeader>
                  <CardTitle className="text-base text-amber-400">
                    Areas for Improvement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {improvements.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
                        <span className="text-zinc-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="rounded-xl border border-[#2a2a2a] bg-[#181818] animate-fade-in-up">
            <Card className="bg-transparent border-0 shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Score Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ScoreRadar scores={scores} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Detailed tabs */}
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="w-full justify-start rounded-xl border border-[#2a2a2a] bg-[#181818] p-1">
            <TabsTrigger value="timeline" className="data-[state=active]:bg-[#252525] data-[state=active]:text-zinc-100 rounded-lg transition-all">Timeline</TabsTrigger>
            <TabsTrigger value="transcript" className="data-[state=active]:bg-[#252525] data-[state=active]:text-zinc-100 rounded-lg transition-all">Transcript</TabsTrigger>
            <TabsTrigger value="code" className="data-[state=active]:bg-[#252525] data-[state=active]:text-zinc-100 rounded-lg transition-all">Code Submissions</TabsTrigger>
            <TabsTrigger value="integrity" className="data-[state=active]:bg-[#252525] data-[state=active]:text-zinc-100 rounded-lg transition-all">Integrity</TabsTrigger>
            <TabsTrigger value="recording" className="data-[state=active]:bg-[#252525] data-[state=active]:text-zinc-100 rounded-lg transition-all">Recording</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline">
            <div className="rounded-xl border border-[#2a2a2a] bg-[#181818]">
              <Card className="bg-transparent border-0 shadow-none">
                <CardContent className="pt-6">
                  <TimelineView events={timeline} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="transcript">
            <div className="rounded-xl border border-[#2a2a2a] bg-[#181818]">
              <Card className="bg-transparent border-0 shadow-none">
                <CardContent className="pt-6">
                  <div className="max-h-96 space-y-2 overflow-y-auto scrollbar-thin">
                    {transcripts.length === 0 ? (
                      <p className="text-sm text-zinc-600">
                        No transcript available
                      </p>
                    ) : (
                      transcripts.map((entry) => (
                        <div
                          key={entry.id}
                          className={`rounded-lg border border-[#2a2a2a] bg-[#1e1e1e] px-3 py-2 ${
                            entry.speaker === "agent"
                              ? "border-l-2 border-l-zinc-500/40"
                              : "border-l-2 border-l-zinc-600/40"
                          }`}
                        >
                          <div className="mb-0.5 flex items-center gap-2">
                            <span
                              className={`text-xs font-medium ${
                                entry.speaker === "agent"
                                  ? "text-zinc-300"
                                  : "text-zinc-400"
                              }`}
                            >
                              {entry.speaker === "agent"
                                ? "Interviewer"
                                : "Candidate"}
                            </span>
                            <span className="text-xs text-zinc-600">
                              {new Date(entry.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-400">{entry.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="code">
            <div className="rounded-xl border border-[#2a2a2a] bg-[#181818]">
              <Card className="bg-transparent border-0 shadow-none">
                <CardContent className="pt-6">
                  {codeSubmissions.length === 0 ? (
                    <p className="text-sm text-zinc-600">
                      No code submissions
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {codeSubmissions.map((sub, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-[#2a2a2a] bg-[#1e1e1e] p-4"
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <span className="text-sm font-semibold text-zinc-200">
                              {sub.challengeTitle}
                            </span>
                            <Badge variant="secondary">{sub.language}</Badge>
                          </div>
                          <pre className="overflow-x-auto rounded-md bg-[#111111] p-3 text-xs text-zinc-400 scrollbar-thin">
                            <code>{sub.code}</code>
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="integrity">
            <div className="rounded-xl border border-[#2a2a2a] bg-[#181818]">
              <Card className="bg-transparent border-0 shadow-none">
                <CardContent className="pt-6">
                  {cheatingIncidents.length === 0 ? (
                    <p className="text-sm text-zinc-600">
                      No suspicious activity was flagged.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {cheatingIncidents.map((incident) => (
                        <div
                          key={incident._id}
                          className="rounded-lg border border-[#2a2a2a] bg-[#1e1e1e] p-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-zinc-200">
                              {incident.category}
                            </span>
                            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400 border border-amber-500/20">
                              Severity {incident.severity}/10
                            </span>
                            <span className="text-xs text-zinc-600">
                              {new Date(incident.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-zinc-400">{incident.description}</p>
                          {incident.transcriptSnippet && (
                            <p className="mt-2 rounded-md bg-[#111111] px-2 py-1 text-xs text-zinc-500">
                              &ldquo;{incident.transcriptSnippet}&rdquo;
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="recording">
            <div className="rounded-xl border border-[#2a2a2a] bg-[#181818]">
              <Card className="bg-transparent border-0 shadow-none">
                <CardContent className="pt-6">
                  <RecordingPlayer recordingUrl={recordingUrl} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
