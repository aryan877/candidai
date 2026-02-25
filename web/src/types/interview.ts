// Interview phases matching agent's transition_phase() tool
export type InterviewPhase =
  | "intro"
  | "behavioral"
  | "technical"
  | "coding"
  | "wrapup";

export type InterviewStatus =
  | "waiting"
  | "active"
  | "completed"
  | "cancelled";

export type InterviewType =
  | "technical"
  | "behavioral"
  | "system-design"
  | "full";

export type ScoreDimension =
  | "communication"
  | "problem-solving"
  | "technical-knowledge"
  | "code-quality"
  | "behavioral";

export type Recommendation =
  | "strong_yes"
  | "yes"
  | "maybe"
  | "no"
  | "strong_no";

// 10 expressions matching agent's set_expression() tool
export type AvatarExpression =
  | "neutral"
  | "smile"
  | "thinking"
  | "surprised"
  | "nodding"
  | "concerned"
  | "encouraging"
  | "listening"
  | "impressed"
  | "questioning";

export type Speaker = "agent" | "candidate";

// Custom event payloads sent by the agent via send_custom_event()
export interface AvatarExpressionEvent {
  type: "avatar_expression";
  expression: AvatarExpression;
  intensity: number;
}

export interface AvatarActionEvent {
  type: "avatar_action";
  action: "nod" | "raise_eyebrows";
  speed?: string;
  intensity?: number;
}

export interface BodyLanguageEvent {
  type: "body_language";
  posture: number;
  fidgeting: number;
  eye_contact: number;
}

export interface InterviewPhaseEvent {
  type: "interview_phase";
  phase: InterviewPhase;
}

export interface ScoreUpdateEvent {
  type: "score_update";
  dimension: ScoreDimension;
  score: number;
  feedback: string;
}

export interface CodingChallengeEvent {
  type: "coding_challenge";
  title: string;
  description: string;
  language: string;
  starter_code: string;
}

export interface CodeEvaluationEvent {
  type: "code_evaluation";
  passed: boolean;
  feedback: string;
  score: number;
}

export interface FinalReportEvent {
  type: "final_report";
  overall_score: number;
  recommendation: Recommendation;
  strengths: string[];
  improvements: string[];
}

export interface SpeechTranscriptionEvent {
  type: "speech_transcription";
  text: string;
  speaker: Speaker;
}

export interface TTSAudioInfoEvent {
  type: "tts_audio_info";
  duration_ms: number;
}

export interface MCQQuestionEvent {
  type: "mcq_question";
  id: string;
  question: string;
  options: string[];
  correct_index: number;
}

// Code submission sent from frontend → agent
export interface CodeSubmissionEvent {
  type: "code_submission";
  code: string;
  language: string;
  challengeTitle: string;
}

// MCQ answer sent from frontend → agent
export interface MCQAnswerEvent {
  type: "mcq_answer";
  question_id: string;
  selected_index: number;
  is_correct: boolean;
}

export type CustomEventPayload =
  | AvatarExpressionEvent
  | AvatarActionEvent
  | BodyLanguageEvent
  | InterviewPhaseEvent
  | ScoreUpdateEvent
  | CodingChallengeEvent
  | CodeEvaluationEvent
  | FinalReportEvent
  | SpeechTranscriptionEvent
  | TTSAudioInfoEvent
  | MCQQuestionEvent;
