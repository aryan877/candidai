"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";

export interface MCQQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

interface MCQCardProps {
  mcq: MCQQuestion;
  onAnswer: (selectedIndex: number, isCorrect: boolean) => void;
}

export default function MCQCard({ mcq, onAnswer }: MCQCardProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const answered = selectedIndex !== null;

  const handleSelect = (index: number) => {
    if (answered) return;
    setSelectedIndex(index);
    onAnswer(index, index === mcq.correctIndex);
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#2a2a2a] bg-[#181818] p-5">
      <h3 className="text-sm font-semibold text-white">{mcq.question}</h3>

      <div className="flex flex-col gap-2">
        {mcq.options.map((option, i) => {
          let borderClass = "border-[#2a2a2a] hover:border-zinc-600";
          let bgClass = "bg-[#1e1e1e] hover:bg-[#252525]";
          let textClass = "text-zinc-300";
          let icon = null;

          if (answered) {
            if (i === mcq.correctIndex) {
              borderClass = "border-emerald-500/50";
              bgClass = "bg-emerald-500/10";
              textClass = "text-emerald-400";
              icon = <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />;
            } else if (i === selectedIndex) {
              borderClass = "border-red-500/50";
              bgClass = "bg-red-500/10";
              textClass = "text-red-400";
              icon = <XCircle className="h-4 w-4 shrink-0 text-red-400" />;
            } else {
              bgClass = "bg-[#1e1e1e] opacity-50";
              textClass = "text-zinc-500";
            }
          }

          return (
            <motion.button
              key={i}
              whileTap={answered ? undefined : { scale: 0.98 }}
              onClick={() => handleSelect(i)}
              disabled={answered}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${borderClass} ${bgClass} ${textClass} ${answered ? "cursor-default" : "cursor-pointer"}`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-medium">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{option}</span>
              {icon}
            </motion.button>
          );
        })}
      </div>

      {answered && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-xs font-medium ${selectedIndex === mcq.correctIndex ? "text-emerald-400" : "text-red-400"}`}
        >
          {selectedIndex === mcq.correctIndex ? "Correct!" : `Incorrect — the answer is ${String.fromCharCode(65 + mcq.correctIndex)}.`}
        </motion.p>
      )}
    </div>
  );
}
