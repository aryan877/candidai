"use client";

import { Activity, Zap, Eye, Loader2 } from "lucide-react";

interface BodyLanguageIndicatorProps {
  posture: number | null;
  fidgeting: number | null;
  eyeContact: number | null;
}

function scoreColor(score: number): string {
  if (score < 40) return "text-red-400";
  if (score < 70) return "text-yellow-400";
  return "text-emerald-400";
}

function strokeColor(score: number): string {
  if (score < 40) return "#f87171";
  if (score < 70) return "#facc15";
  return "#34d399";
}

function CircularProgress({
  score,
  icon,
  label,
}: {
  score: number | null;
  icon: React.ReactNode;
  label: string;
}) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;

  if (score === null) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative flex h-10 w-10 items-center justify-center">
          <svg className="h-10 w-10 -rotate-90" viewBox="0 0 40 40">
            <circle
              cx="20"
              cy="20"
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="3"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {icon}
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-zinc-500">{label}</span>
          <span className="text-[10px] text-zinc-600">--</span>
        </div>
      </div>
    );
  }

  const offset = circumference - (Math.min(score, 100) / 100) * circumference;

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex h-10 w-10 items-center justify-center">
        <svg className="h-10 w-10 -rotate-90" viewBox="0 0 40 40">
          <circle
            cx="20"
            cy="20"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="3"
          />
          <circle
            cx="20"
            cy="20"
            r={radius}
            fill="none"
            stroke={strokeColor(score)}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] text-zinc-500">{label}</span>
        <span className={`text-sm font-bold ${scoreColor(score)}`}>
          {Math.round(score)}
        </span>
      </div>
    </div>
  );
}

export default function BodyLanguageIndicator({
  posture,
  fidgeting,
  eyeContact,
}: BodyLanguageIndicatorProps) {
  const isAnalyzing = posture === null && fidgeting === null && eyeContact === null;

  return (
    <div className="glass-card absolute right-3 top-3 z-10 flex flex-col gap-0 rounded-xl p-3">
      <span className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        Body Language
        {isAnalyzing && (
          <Loader2 className="h-2.5 w-2.5 animate-spin text-zinc-500" />
        )}
      </span>

      {isAnalyzing ? (
        <span className="text-[11px] text-zinc-600">Analyzing...</span>
      ) : (
        <>
          <CircularProgress
            score={posture}
            icon={<Activity className="h-3.5 w-3.5 text-zinc-300" />}
            label="Posture"
          />

          <div className="my-1.5 h-px w-full bg-white/[0.06]" />

          <CircularProgress
            score={fidgeting !== null ? 100 - fidgeting : null}
            icon={<Zap className="h-3.5 w-3.5 text-zinc-300" />}
            label="Engagement"
          />

          <div className="my-1.5 h-px w-full bg-white/[0.06]" />

          <CircularProgress
            score={eyeContact}
            icon={<Eye className="h-3.5 w-3.5 text-zinc-300" />}
            label="Eye Contact"
          />
        </>
      )}
    </div>
  );
}
