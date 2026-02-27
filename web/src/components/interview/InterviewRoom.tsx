"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import {
  ParticipantsAudio,
  ParticipantView,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";
import type { Call } from "@stream-io/video-client";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { CustomEventPayload, InterviewPhase } from "@/types/interview";
import InterviewHeader from "./InterviewHeader";
import InterviewControls from "./InterviewControls";
import TranscriptPanel, { type TranscriptEntry } from "./TranscriptPanel";
import BodyLanguageIndicator from "./BodyLanguageIndicator";
import AvatarCanvas from "@/components/avatar/AvatarCanvas";
import { useAvatarEvents } from "@/components/avatar/useAvatarEvents";
import CodeEditor from "@/components/editor/CodeEditor";
import MCQCard, { type MCQQuestion } from "./MCQCard";
import { CameraOff } from "lucide-react";

interface InterviewRoomProps {
  call: Call;
  interviewId: Id<"interviews"> | null;
  onLeave: () => void;
  onReportGenerated?: () => void;
}

interface CodingChallenge {
  title: string;
  description: string;
  language: string;
  starter_code: string;
}

interface CodeEvaluation {
  passed: boolean;
  feedback: string;
  score: number;
}

type SuspiciousSignal = {
  category: "posture" | "fidgeting" | "eye_contact";
  severity: number;
  description: string;
};

function signalFromBody(posture: number, fidgeting: number, eyeContact: number) {
  const signals: SuspiciousSignal[] = [];
  if (posture < 35) {
    signals.push({
      category: "posture",
      severity: Math.min(10, Math.round((40 - posture) / 4)),
      description: "Low posture score detected; candidate may be repeatedly looking away.",
    });
  }
  if (fidgeting > 75) {
    signals.push({
      category: "fidgeting",
      severity: Math.min(10, Math.round((fidgeting - 60) / 4)),
      description: "High movement variance detected; excessive fidgeting observed.",
    });
  }
  if (eyeContact < 30) {
    signals.push({
      category: "eye_contact",
      severity: Math.min(10, Math.round((35 - eyeContact) / 3)),
      description: "Very low eye-contact score detected for a prolonged window.",
    });
  }
  return signals;
}

function InterviewRoom({ call, interviewId, onLeave, onReportGenerated }: InterviewRoomProps) {
  const { useLocalParticipant, useParticipants } = useCallStateHooks();
  const localParticipant = useLocalParticipant();
  const participants = useParticipants();
  const remoteParticipants = participants.filter(
    (participant) => participant.userId !== localParticipant?.userId
  );
  const avatar = useAvatarEvents(call);

  const addTranscript = useMutation(api.transcripts.add);
  const addScore = useMutation(api.scores.add);
  const addCodeSubmission = useMutation(api.codeSubmissions.add);
  const updatePhase = useMutation(api.interviews.updatePhase);
  const createReport = useMutation(api.reports.create);
  const addBodySnapshot = useMutation(api.bodyLanguageSnapshots.add);
  const addCheatingIncident = useMutation(api.cheatingIncidents.add);

  const [phase, setPhase] = useState<InterviewPhase>("intro");
  const [connectionQuality] = useState<"good" | "moderate" | "poor">("good");
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([]);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [codingChallenge, setCodingChallenge] = useState<CodingChallenge | null>(null);
  const [codeEvaluation, setCodeEvaluation] = useState<CodeEvaluation | null>(null);
  const [mcqQueue, setMcqQueue] = useState<MCQQuestion[]>([]);

  const [bodyLanguage, setBodyLanguage] = useState<{
    posture: number | null;
    fidgeting: number | null;
    eyeContact: number | null;
  }>({
    posture: null,
    fidgeting: null,
    eyeContact: null,
  });

  const recentIncidentRef = useRef<Record<string, number>>({});
  const transcriptEntriesRef = useRef<TranscriptEntry[]>([]);
  const phaseRef = useRef<InterviewPhase>("intro");
  const pendingTtsDurationRef = useRef<number | null>(null);
  const speakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistTranscript = useCallback(
    async (speaker: string, content: string, phaseValue: string) => {
      if (!interviewId || !content.trim()) return;
      try {
        await addTranscript({
          interviewId,
          speaker,
          content: content.trim(),
          phase: phaseValue,
        });
      } catch (err) {
        console.warn("Failed to persist transcript event:", err);
      }
    },
    [addTranscript, interviewId]
  );

  useEffect(() => {
    if (!call) return;

    const unsub = call.on("custom", (event: { custom: Record<string, unknown> }) => {
      const data = event.custom as unknown as CustomEventPayload;
      if (!data || !data.type) return;

      switch (data.type) {
        case "interview_phase": {
          phaseRef.current = data.phase;
          setPhase(data.phase);
          if (data.phase === "coding") setShowCodeEditor(true);
          if (interviewId) {
            void updatePhase({ interviewId, phase: data.phase }).catch((err) => {
              console.warn("Failed to persist phase transition:", err);
            });
          }
          break;
        }

        case "speech_transcription": {
          const entry: TranscriptEntry = {
            id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            speaker: data.speaker,
            text: data.text,
            timestamp: Date.now(),
          };
          setTranscriptEntries((prev) => {
            const next = [...prev.slice(-199), entry];
            transcriptEntriesRef.current = next;
            return next;
          });
          void persistTranscript(data.speaker, data.text, phaseRef.current);

          if (data.speaker === "agent") {
            avatar.setIsSpeaking(true);
            if (speakingTimeoutRef.current) {
              clearTimeout(speakingTimeoutRef.current);
            }
            const ttsDuration = pendingTtsDurationRef.current;
            pendingTtsDurationRef.current = null;
            const duration = ttsDuration ?? Math.max(data.text.length * 60, 800);
            speakingTimeoutRef.current = setTimeout(() => {
              avatar.setIsSpeaking(false);
              speakingTimeoutRef.current = null;
            }, duration);
          }
          break;
        }

        case "tts_audio_info": {
          const durationMs = data.duration_ms as number;
          if (avatar.isSpeaking && speakingTimeoutRef.current) {
            clearTimeout(speakingTimeoutRef.current);
            speakingTimeoutRef.current = setTimeout(() => {
              avatar.setIsSpeaking(false);
              speakingTimeoutRef.current = null;
            }, durationMs);
          } else {
            pendingTtsDurationRef.current = durationMs;
          }
          break;
        }

        case "coding_challenge":
          setCodingChallenge({
            title: data.title,
            description: data.description,
            language: data.language,
            starter_code: data.starter_code,
          });
          setShowCodeEditor(true);
          break;

        case "code_evaluation":
          setCodeEvaluation({
            passed: data.passed,
            feedback: data.feedback,
            score: data.score,
          });
          break;

        case "mcq_question": {
          const mcq: MCQQuestion = {
            id: data.id,
            question: data.question,
            options: data.options,
            correctIndex: data.correct_index,
          };
          setMcqQueue((prev) => [...prev, mcq]);
          break;
        }

        case "score_update":
          if (interviewId) {
            void addScore({
              interviewId,
              dimension: data.dimension,
              score: data.score,
              feedback: data.feedback,
            }).catch((err) => {
              console.warn("Failed to persist score:", err);
            });
          }
          break;

        case "body_language": {
          const posture = Math.round(data.posture * 100);
          const fidgeting = Math.round(data.fidgeting * 100);
          const eyeContact = Math.round(data.eye_contact * 100);
          setBodyLanguage({ posture, fidgeting, eyeContact });

          if (!interviewId) break;

          const signals = signalFromBody(posture, fidgeting, eyeContact);
          const now = Date.now();
          const notes =
            signals.length > 0
              ? signals.map((signal) => signal.description).join(" | ")
              : undefined;

          void addBodySnapshot({
            interviewId,
            postureScore: posture,
            fidgetingLevel: fidgeting,
            eyeContactScore: eyeContact,
            isSuspicious: signals.length > 0,
            notes,
            timestamp: now,
          }).catch((err) => {
            console.warn("Failed to persist body-language snapshot:", err);
          });

          if (signals.length === 0) break;

          const recentCandidateLine =
            [...transcriptEntriesRef.current]
              .reverse()
              .find((entry) => entry.speaker === "candidate")?.text ?? undefined;

          for (const signal of signals) {
            const lastSeen = recentIncidentRef.current[signal.category] ?? 0;
            if (now - lastSeen < 30_000) continue;
            recentIncidentRef.current[signal.category] = now;

            void addCheatingIncident({
              interviewId,
              category: signal.category,
              severity: signal.severity,
              description: signal.description,
              transcriptSnippet: recentCandidateLine,
              postureScore: posture,
              fidgetingLevel: fidgeting,
              eyeContactScore: eyeContact,
              phase: phaseRef.current,
              timestamp: now,
            }).catch((err) => {
              console.warn("Failed to persist cheating incident:", err);
            });
          }
          break;
        }

        case "final_report":
          if (interviewId) {
            const summary =
              data.strengths.length > 0
                ? `Candidate showed strengths in ${data.strengths.join(", ")}.`
                : "Interview completed.";

            createReport({
              interviewId,
              overallScore: data.overall_score,
              recommendation: data.recommendation,
              summary,
              strengths: data.strengths,
              improvements: data.improvements,
            })
              .then(() => {
                onReportGenerated?.();
              })
              .catch((err) => {
                console.warn("Failed to persist final report:", err);
              });
          }
          break;
      }
    });

    return () => {
      unsub();
    };
  }, [
    addBodySnapshot,
    addCheatingIncident,
    addScore,
    avatar,
    call,
    createReport,
    interviewId,
    onReportGenerated,
    persistTranscript,
    updatePhase,
  ]);

  const handleTogglePanel = useCallback(() => {
    setShowCodeEditor((prev) => !prev);
  }, []);

  const handleCodeSubmit = useCallback(
    (submission: { code: string; language: string; challengeTitle: string }) => {
      call?.sendCustomEvent({
        type: "code_submission",
        ...submission,
      });

      if (!interviewId) return;
      void addCodeSubmission({
        interviewId,
        challengeTitle: submission.challengeTitle,
        language: submission.language,
        code: submission.code,
      }).catch((err) => {
        console.warn("Failed to persist code submission:", err);
      });
    },
    [addCodeSubmission, call, interviewId]
  );

  const handleMCQAnswer = useCallback(
    (mcq: MCQQuestion, selectedIndex: number, isCorrect: boolean) => {
      call?.sendCustomEvent({
        type: "mcq_answer",
        question_id: mcq.id,
        selected_index: selectedIndex,
        is_correct: isCorrect,
      });
    },
    [call]
  );

  const handleActionComplete = useCallback(() => {
    avatar.setAction(null);
  }, [avatar]);

  return (
    <div className="flex h-screen flex-col bg-background">
      <InterviewHeader phase={phase} connectionQuality={connectionQuality} />

      <div className="flex flex-1 overflow-hidden">
        {/* Render remote participant audio tracks (including the interviewer agent). */}
        <ParticipantsAudio participants={remoteParticipants} />

        {/* Left side: Avatar + User Video side-by-side (optimized for agent vision of face + coding) */}
        <main className="flex flex-1 gap-3 p-3" style={{ flex: "0 0 55%" }}>
          {/* Avatar section - compact */}
          <div
            className="relative flex items-center justify-center overflow-hidden rounded-lg bg-[#181818]"
            style={{ flex: "0 0 25%" }}
          >
            {/* Ambient radial glow behind avatar */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(232,184,138,0.08)_0%,transparent_70%)]" />
            <AvatarCanvas
              expression={avatar.expression}
              intensity={avatar.intensity}
              isSpeaking={avatar.isSpeaking}
              action={avatar.action}
              actionIntensity={avatar.actionIntensity}
              onActionComplete={handleActionComplete}
            />
          </div>

          {/* User Video section - larger for agent to see face clearly */}
          <div className="relative flex-1 overflow-hidden rounded-lg bg-zinc-950">
            {/* Subtle gradient border overlay */}
            <div className="pointer-events-none absolute inset-0 z-[1] rounded-lg ring-1 ring-inset ring-white/[0.06]" />

            {localParticipant ? (
              <div className="h-full w-full">
                <ParticipantView
                  participant={localParticipant}
                  trackType="videoTrack"
                  className="h-full w-full"
                />
              </div>
            ) : (
              <div className="glass-card flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-zinc-500">
                  <CameraOff className="h-8 w-8" />
                  <p className="text-sm">Camera not available</p>
                </div>
              </div>
            )}

            {/* Body language indicator - component has built-in positioning */}
            <BodyLanguageIndicator
              posture={bodyLanguage.posture}
              fidgeting={bodyLanguage.fidgeting}
              eyeContact={bodyLanguage.eyeContact}
            />
          </div>
        </main>

        {/* Right side: Code editor - larger for agent to read code clearly */}
        <aside className="flex flex-col" style={{ flex: "0 0 45%" }}>
          <AnimatePresence mode="wait">
            {showCodeEditor ? (
              <motion.div
                key="code-editor"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="flex h-full flex-col"
              >
                <CodeEditor
                  challenge={codingChallenge}
                  onSubmit={handleCodeSubmit}
                  evaluation={codeEvaluation}
                />
              </motion.div>
            ) : (
              <motion.div
                key="transcript"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex h-full flex-col"
              >
                {/* MCQ cards stacked above transcript */}
                {mcqQueue.length > 0 && (
                  <div className="flex flex-col gap-3 overflow-y-auto p-3 pb-0">
                    {mcqQueue.map((mcq) => (
                      <MCQCard
                        key={mcq.id}
                        mcq={mcq}
                        onAnswer={(idx, correct) => handleMCQAnswer(mcq, idx, correct)}
                      />
                    ))}
                  </div>
                )}
                <div className="min-h-0 flex-1">
                  <TranscriptPanel transcriptEntries={transcriptEntries} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </div>

      <InterviewControls
        showCodeEditor={showCodeEditor}
        onTogglePanel={handleTogglePanel}
        onEndInterview={onLeave}
      />
    </div>
  );
}

export default InterviewRoom;
