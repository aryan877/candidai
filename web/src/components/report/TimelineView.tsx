"use client";

import { useState } from "react";
import { PHASE_LABELS } from "@/lib/constants";
import type { InterviewPhase } from "@/types/interview";

interface TimelineEvent {
  type: "phase_transition" | "score" | "code_submission" | "note";
  timestamp: number;
  data: Record<string, unknown>;
}

interface TimelineViewProps {
  events: TimelineEvent[];
}

const eventColors: Record<string, string> = {
  phase_transition: "#71717a",
  score: "#a1a1aa",
  code_submission: "#d4d4d8",
  note: "#52525b",
};

export default function TimelineView({ events }: TimelineViewProps) {
  const [hoveredEvent, setHoveredEvent] = useState<TimelineEvent | null>(null);

  if (events.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-zinc-600">
        No timeline events recorded
      </div>
    );
  }

  const startTime = events[0].timestamp;
  const endTime = events[events.length - 1].timestamp;
  const duration = endTime - startTime || 1;

  return (
    <div className="overflow-x-auto py-4">
      <div className="relative mx-4 min-w-[500px]">
        {/* Timeline bar */}
        <div className="h-2 rounded-full bg-[#2a2a2a]" />

        {/* Event dots */}
        {events.map((event, idx) => {
          const left =
            ((event.timestamp - startTime) / duration) * 100;

          return (
            <div
              key={idx}
              className="absolute -top-1.5 -translate-x-1/2 cursor-pointer"
              style={{ left: `${Math.min(Math.max(left, 1), 99)}%` }}
              onMouseEnter={() => setHoveredEvent(event)}
              onMouseLeave={() => setHoveredEvent(null)}
            >
              <div
                className="h-5 w-5 rounded-full border-2 border-background transition-all hover:scale-125"
                style={{
                  backgroundColor: eventColors[event.type] ?? "#52525b",
                }}
              />

              {hoveredEvent === event && (
                <div className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[#2a2a2a] bg-[#1e1e1e] px-3 py-2 text-xs text-zinc-200 shadow-lg">
                  <div className="font-semibold capitalize">
                    {event.type.replace("_", " ")}
                  </div>
                  <div className="text-zinc-500">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </div>
                  {typeof event.data.phase === "string" && (
                    <div className="text-zinc-300">
                      {PHASE_LABELS[event.data.phase as InterviewPhase] ??
                        event.data.phase}
                    </div>
                  )}
                  {event.data.score !== undefined && (
                    <div className="text-zinc-300">
                      Score: {String(event.data.score)}
                    </div>
                  )}
                  {typeof event.data.note === "string" && (
                    <div className="max-w-xs whitespace-normal text-zinc-300">
                      {event.data.note}
                    </div>
                  )}
                  {typeof event.data.challengeTitle === "string" && (
                    <div className="max-w-xs whitespace-normal text-zinc-300">
                      {event.data.challengeTitle}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Time labels */}
        <div className="mt-3 flex justify-between text-xs text-zinc-600">
          <span>{new Date(startTime).toLocaleTimeString()}</span>
          <span>{new Date(endTime).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}
