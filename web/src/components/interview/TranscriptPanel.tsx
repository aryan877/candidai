"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Speaker } from "@/types/interview";

export interface TranscriptEntry {
  id: string;
  speaker: Speaker | "system";
  text: string;
  timestamp: number;
}

interface TranscriptPanelProps {
  transcriptEntries: TranscriptEntry[];
}

export default function TranscriptPanel({
  transcriptEntries,
}: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [transcriptEntries]);

  return (
    <div className="flex h-full flex-col border-l border-[#2a2a2a] bg-[#181818]">
      {/* Top accent line */}
      <div className="h-px w-full bg-[#2a2a2a]" />

      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[#2a2a2a] bg-[#1e1e1e] px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-200">
          Live Transcript
        </h2>
        <span className="ml-auto rounded-full bg-[#252525] px-2.5 py-0.5 text-xs font-medium text-zinc-400">
          {transcriptEntries.length}
        </span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="scrollbar-thin flex-1 overflow-y-auto px-3 py-2"
      >
        {transcriptEntries.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="rounded-lg border border-[#2a2a2a] bg-[#1e1e1e] px-5 py-4 text-center">
              <p className="text-sm text-zinc-600">
                Transcript will appear here...
              </p>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            <div className="space-y-2">
              {transcriptEntries.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <EntryBubble entry={entry} />
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function EntryBubble({ entry }: { entry: TranscriptEntry }) {
  const time = new Date(entry.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const isAgent = entry.speaker === "agent" || entry.speaker === "system";

  return (
    <div
      className={`rounded-lg px-3 py-2 ${
        isAgent
          ? "border border-[#2a2a2a] bg-[#1e1e1e] border-l-2 border-l-zinc-500"
          : "border-l-2 border-l-zinc-600 bg-[#1a1a1a]"
      }`}
    >
      <div className="mb-1 flex items-center gap-1.5">
        {isAgent ? (
          <Bot className="h-3.5 w-3.5 text-zinc-400" />
        ) : (
          <User className="h-3.5 w-3.5 text-zinc-500" />
        )}
        <span
          className={`text-xs font-semibold ${
            isAgent ? "text-zinc-300" : "text-zinc-400"
          }`}
        >
          {isAgent ? "Interviewer" : "Candidate"}
        </span>
        <span className="ml-auto text-[10px] text-zinc-600">{time}</span>
      </div>
      <div className="prose-sm prose-invert max-w-none text-sm leading-relaxed text-zinc-300 [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-zinc-200 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-zinc-200 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:text-zinc-300 [&_strong]:text-zinc-200 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5 [&_code]:rounded [&_code]:bg-[#252525] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_code]:text-zinc-300 [&_p]:my-1">
        <ReactMarkdown>{entry.text}</ReactMarkdown>
      </div>
    </div>
  );
}
