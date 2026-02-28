"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Editor, { type Monaco, loader } from "@monaco-editor/react";
import {
  Send,
  ChevronDown,
  ChevronUp,
  Code2,
  FileCode,
  Loader2,
  GripHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import CodeOutput from "./CodeOutput";

// Configure Monaco to load workers from CDN explicitly
loader.init().then((monaco) => {
  monaco.editor.defineTheme("candidai-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#1a1a2e",
      "editor.lineHighlightBackground": "#1f1f3a",
      "editorLineNumber.foreground": "#555577",
      "editorLineNumber.activeForeground": "#8888aa",
    },
  });
});

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

interface CodeEditorProps {
  challenge: CodingChallenge | null;
  onSubmit: (submission: {
    code: string;
    language: string;
    challengeTitle: string;
  }) => void;
  evaluation: CodeEvaluation | null;
}

const LANG_ICONS: Record<string, string> = {
  python: "🐍",
  javascript: "JS",
  typescript: "TS",
  java: "☕",
  cpp: "C++",
  c: "C",
  go: "Go",
  rust: "🦀",
};

export default function CodeEditor({
  challenge,
  onSubmit,
  evaluation,
}: CodeEditorProps) {
  const [code, setCode] = useState(challenge?.starter_code ?? "");
  const [descriptionOpen, setDescriptionOpen] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [descHeight, setDescHeight] = useState(180);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset code when challenge changes
  useEffect(() => {
    if (challenge?.starter_code) {
      setCode(challenge.starter_code);
    }
  }, [challenge?.starter_code]);

  // Reset submitting state when evaluation arrives
  useEffect(() => {
    if (evaluation) setSubmitting(false);
  }, [evaluation]);

  const handleSubmit = useCallback(() => {
    if (!challenge || submitting) return;
    setSubmitting(true);
    onSubmit({
      code,
      language: challenge.language,
      challengeTitle: challenge.title,
    });
  }, [challenge, code, onSubmit, submitting]);

  // Define theme BEFORE editor mounts
  const handleBeforeMount = useCallback((monaco: Monaco) => {
    monaco.editor.defineTheme("candidai-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#1a1a2e",
        "editor.foreground": "#d4d4d4",
        "editor.lineHighlightBackground": "#1f1f3a",
        "editor.selectionBackground": "#264f78",
        "editorLineNumber.foreground": "#555577",
        "editorLineNumber.activeForeground": "#8888aa",
        "editorBracketMatch.border": "#ff7f00",
        "editorBracketMatch.background": "#3a3a5a",
      },
    });
  }, []);

  // Drag to resize description panel
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;

    const startY = e.clientY;
    const startHeight = descHeight;

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = ev.clientY - startY;
      const containerH = containerRef.current?.getBoundingClientRect().height ?? 600;
      const newHeight = Math.max(60, Math.min(containerH * 0.6, startHeight + delta));
      setDescHeight(newHeight);
    };

    const onUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [descHeight]);

  if (!challenge) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 border-l border-white/[0.06] bg-zinc-950/80 text-zinc-500">
        <Code2 className="h-10 w-10 text-zinc-700" />
        <p className="text-sm">Waiting for coding challenge...</p>
      </div>
    );
  }

  const langIcon = LANG_ICONS[challenge.language.toLowerCase()] ?? "📄";

  return (
    <div ref={containerRef} className="flex h-full flex-col border-l border-white/[0.06] bg-[#1a1a2e]">
      {/* ── Challenge header ── */}
      <div className="shrink-0 border-b border-white/[0.06] bg-white/[0.02]">
        <button
          onClick={() => setDescriptionOpen((v) => !v)}
          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
        >
          <FileCode className="h-4 w-4 shrink-0 text-zinc-400" />
          <span className="flex-1 truncate text-sm font-semibold text-zinc-100">
            {challenge.title}
          </span>
          <span className="rounded-md bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-400">
            {langIcon} {challenge.language}
          </span>
          {descriptionOpen ? (
            <ChevronUp className="h-3.5 w-3.5 text-zinc-500" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
          )}
        </button>
      </div>

      {/* ── Resizable description panel ── */}
      {descriptionOpen && (
        <>
          <div
            className="scrollbar-thin shrink-0 overflow-y-auto border-b border-white/[0.04] bg-zinc-950/60 px-4 py-3"
            style={{ height: descHeight }}
          >
            <p className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-zinc-400">
              {challenge.description}
            </p>
          </div>

          {/* ── Drag handle ── */}
          <div
            onMouseDown={handleDragStart}
            className="group flex h-2 shrink-0 cursor-row-resize items-center justify-center border-b border-white/[0.06] bg-white/[0.02] transition-colors hover:bg-white/[0.06]"
          >
            <GripHorizontal className="h-3 w-3 text-zinc-600 transition-colors group-hover:text-zinc-400" />
          </div>
        </>
      )}

      {/* ── Monaco editor ── */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={challenge.language.toLowerCase()}
          value={code}
          onChange={(value) => setCode(value ?? "")}
          theme="candidai-dark"
          beforeMount={handleBeforeMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace",
            fontLigatures: true,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            padding: { top: 16, bottom: 16 },
            renderLineHighlight: "gutter",
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true, indentation: true },
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            suggestOnTriggerCharacters: true,
            tabSize: 2,
            detectIndentation: true,
          }}
          loading={
            <div className="flex h-full items-center justify-center bg-[#1a1a2e]">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
            </div>
          }
        />
      </div>

      {/* ── Evaluation output ── */}
      {evaluation && <CodeOutput evaluation={evaluation} />}

      {/* ── Bottom toolbar ── */}
      <div className="flex shrink-0 items-center justify-between border-t border-white/[0.06] bg-white/[0.02] px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[12px] font-medium text-zinc-400">
            Agent analyzing your code live
          </span>
        </div>

        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={submitting}
          className="hidden gap-1.5 bg-white px-4 font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          {submitting ? "Evaluating..." : "Submit"}
        </Button>
      </div>
    </div>
  );
}
