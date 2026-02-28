"use client";

import { motion } from "framer-motion";
import { CheckCircle, XCircle, TrendingUp } from "lucide-react";

interface CodeEvaluation {
  passed: boolean;
  feedback: string;
  score: number;
}

interface CodeOutputProps {
  evaluation: CodeEvaluation;
}

export default function CodeOutput({ evaluation }: CodeOutputProps) {
  const passed = evaluation.passed;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="overflow-hidden border-t border-white/[0.06]"
    >
      <div className={`px-4 py-3 ${passed ? "bg-emerald-500/[0.04]" : "bg-red-500/[0.04]"}`}>
        {/* Status row */}
        <div className="mb-2 flex items-center gap-2">
          {passed ? (
            <CheckCircle className="h-4.5 w-4.5 text-emerald-400" />
          ) : (
            <XCircle className="h-4.5 w-4.5 text-red-400" />
          )}
          <span
            className={`text-sm font-semibold ${passed ? "text-emerald-400" : "text-red-400"}`}
          >
            {passed ? "All Tests Passed" : "Needs Improvement"}
          </span>

          <div className="ml-auto flex items-center gap-1.5">
            <TrendingUp className={`h-3.5 w-3.5 ${passed ? "text-emerald-500" : "text-red-500"}`} />
            <span
              className={`rounded-md px-2 py-0.5 font-mono text-sm font-bold ${
                passed
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-red-500/15 text-red-300"
              }`}
            >
              {evaluation.score}/10
            </span>
          </div>
        </div>

        {/* Feedback */}
        <div className="scrollbar-thin max-h-32 overflow-y-auto">
          <p className="text-[13px] leading-relaxed text-zinc-400">
            {evaluation.feedback}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
