"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { InterviewPhase } from "@/types/interview";
import { PHASE_LABELS, PHASE_COLORS } from "@/lib/constants";

interface InterviewHeaderProps {
  phase: InterviewPhase;
  connectionQuality: "good" | "moderate" | "poor";
}

export default function InterviewHeader({
  phase,
  connectionQuality,
}: InterviewHeaderProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(elapsed / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (elapsed % 60).toString().padStart(2, "0");

  const qualityColor = {
    good: "bg-emerald-500",
    moderate: "bg-yellow-500",
    poor: "bg-red-500",
  }[connectionQuality];

  return (
    <header className="glass glass-border flex items-center justify-between px-5 py-3">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold text-white">
          Inter<span className="text-zinc-400">Vue</span>
        </h1>
      </div>

      <div className="inline-flex rounded-lg px-3 py-1">
        <span className="font-mono text-xl font-bold tabular-nums text-zinc-100">
          {minutes}:{seconds}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Badge
          className="animate-pulse-glow text-xs font-medium text-white shadow-lg"
          style={{ backgroundColor: PHASE_COLORS[phase] }}
        >
          {PHASE_LABELS[phase]}
        </Badge>
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <div
              className={`h-2.5 w-2.5 rounded-full ${qualityColor}`}
              title={`Connection: ${connectionQuality}`}
            />
            {connectionQuality === "good" && (
              <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/40" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
