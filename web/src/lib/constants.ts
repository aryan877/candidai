import type { AvatarExpression, InterviewPhase, ScoreDimension } from "@/types/interview";

export const EXPRESSIONS: AvatarExpression[] = [
  "neutral",
  "smile",
  "thinking",
  "surprised",
  "nodding",
  "concerned",
  "encouraging",
  "listening",
  "impressed",
  "questioning",
];

export const PHASES: InterviewPhase[] = [
  "intro",
  "behavioral",
  "technical",
  "coding",
  "wrapup",
];

export const DIMENSIONS: ScoreDimension[] = [
  "communication",
  "problem-solving",
  "technical-knowledge",
  "code-quality",
  "behavioral",
];

export const PHASE_COLORS: Record<InterviewPhase, string> = {
  intro: "#71717a",
  behavioral: "#a1a1aa",
  technical: "#52525b",
  coding: "#71717a",
  wrapup: "#3f3f46",
};

export const PHASE_LABELS: Record<InterviewPhase, string> = {
  intro: "Introduction",
  behavioral: "Behavioral",
  technical: "Technical Q&A",
  coding: "Coding Challenge",
  wrapup: "Wrap Up",
};

export const DIMENSION_LABELS: Record<ScoreDimension, string> = {
  communication: "Communication",
  "problem-solving": "Problem Solving",
  "technical-knowledge": "Technical Knowledge",
  "code-quality": "Code Quality",
  behavioral: "Behavioral Fit",
};

export const INTERVIEW_TYPE_LABELS: Record<string, string> = {
  technical: "Technical Interview",
  behavioral: "Behavioral Interview",
  "system-design": "System Design",
  full: "Full Loop Interview",
};
