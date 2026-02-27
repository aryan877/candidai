"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  StreamCall,
  StreamVideo,
  StreamVideoClient,
  User,
} from "@stream-io/video-react-sdk";
import { useAction, useMutation, useQuery } from "convex/react";
import { Loader2, Video, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import InterviewRoom from "@/components/interview/InterviewRoom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CallState = "loading" | "lobby" | "joining" | "joined" | "left" | "error";
type EndingState = "idle" | "generating" | "done";

export default function InterviewPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const callId = params.id as string;
  const interviewType = (searchParams.get("type") ?? "full") as
    | "technical"
    | "behavioral"
    | "system-design"
    | "full";
  const inviteToken = searchParams.get("invite") ?? undefined;

  const viewer = useQuery(api.users.viewerOptional);
  const ensureForCall = useMutation(api.interviews.ensureForCall);
  const updateStatus = useMutation(api.interviews.updateStatus);

  const [state, setState] = useState<CallState>("loading");
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [endingState, setEndingState] = useState<EndingState>("idle");

  const generateReport = useAction(api.reports.generateReport);

  const interviewIdRef = useRef<Id<"interviews"> | null>(null);
  const leftRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const endingRef = useRef(false);

  useEffect(() => {
    if (viewer === undefined) return;
    if (!viewer) {
      router.replace("/sign-in");
      return;
    }
    setState("lobby");
  }, [router, viewer]);

  const handleJoin = useCallback(async () => {
    try {
      setState("joining");
      setError(null);

      const interviewId = await ensureForCall({
        callId,
        type: interviewType,
        inviteToken,
      });
      interviewIdRef.current = interviewId;

      const tokenRes = await fetch("/api/stream-token", {
        method: "POST",
      });
      if (!tokenRes.ok) {
        const body = await tokenRes.json().catch(() => ({ error: "Token failed" }));
        throw new Error(body.error ?? "Failed to fetch Stream token");
      }

      const { token, userId, userName } = await tokenRes.json();
      const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
      if (!apiKey) {
        throw new Error("NEXT_PUBLIC_STREAM_API_KEY is missing");
      }

      const user: User = { id: userId, name: userName, type: "authenticated" };
      const videoClient = StreamVideoClient.getOrCreateInstance({
        apiKey,
        user,
        token,
      });

      const videoCall = videoClient.call("default", callId);
      await videoCall.join({ create: true });

      // Publish camera + mic so the agent can see/hear the candidate
      await videoCall.camera.enable();
      await videoCall.microphone.enable();

      setClient(videoClient);
      setCall(videoCall);
      setState("joined");

      try {
        await fetch("/api/connect-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callId,
            callType: "default",
          }),
        });
      } catch (agentErr) {
        console.warn("Agent connection failed (agent may be down):", agentErr);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to join interview";
      setError(message);
      setState("error");
    }
  }, [callId, ensureForCall, interviewType, inviteToken]);

  // Auto-reconnect if SFU connection drops
  useEffect(() => {
    if (!call || state !== "joined") return;

    const checkConnection = async () => {
      try {
        const participants = call.state.participants;
        if (participants && participants.length > 0) {
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
        }
      } catch {
        console.warn("Connection check failed, attempting auto-reconnect");
        reconnectTimeoutRef.current = setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    };

    const interval = setInterval(checkConnection, 5000);
    return () => {
      clearInterval(interval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [call, state]);

  /** Disconnect from the call and redirect to report page. */
  const disconnectAndRedirect = useCallback(async () => {
    if (leftRef.current) return;
    leftRef.current = true;
    try {
      if (interviewIdRef.current) {
        await updateStatus({
          interviewId: interviewIdRef.current,
          status: "completed",
        });
      }
      if (call) await call.leave();
      if (client) await client.disconnectUser();
    } catch (err) {
      console.error("Leave error:", err);
    } finally {
      setCall(null);
      setClient(null);
      setState("left");
      router.push(`/report/${callId}`);
    }
  }, [call, callId, client, router, updateStatus]);

  /** Called when InterviewRoom persists the agent's final_report to Convex. */
  const handleReportGenerated = useCallback(() => {
    // no-op — we generate the report ourselves on end now
  }, []);

  /** Triggered when user confirms "End Interview" in the dialog. */
  const handleEndInterview = useCallback(async () => {
    if (endingRef.current) return;
    endingRef.current = true;

    setEndingState("generating");

    // Generate report immediately from existing scores — no waiting for agent
    try {
      if (interviewIdRef.current) {
        await generateReport({
          interviewId: interviewIdRef.current,
        });
      }
    } catch (err) {
      console.warn("Report creation failed:", err);
    }

    setEndingState("done");
    setTimeout(() => {
      void disconnectAndRedirect();
    }, 1000);
  }, [generateReport, disconnectAndRedirect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (leftRef.current || (!call && !client)) return;
      leftRef.current = true;
      if (call) void call.leave().catch(() => {});
      if (client) void client.disconnectUser().catch(() => {});
    };
  }, [call, client]);

  /* ---------- Full-screen ending modal overlay ---------- */
  const renderEndingModal = () => {
    if (endingState === "idle") return null;

    const config: Record<string, { icon: React.ReactNode; title: string; subtitle: string }> = {
      generating: {
        icon: <Loader2 className="h-8 w-8 animate-spin text-blue-400" />,
        title: "Generating your interview report...",
        subtitle: "The AI interviewer is analyzing your performance",
      },
      done: {
        icon: <CheckCircle2 className="h-8 w-8 text-emerald-400" />,
        title: "Report ready! Redirecting...",
        subtitle: "Taking you to your interview report",
      },
    };
    const current = config[endingState];

    if (!current) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#2a2a2a] bg-[#181818] p-10 shadow-2xl">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#2a2a2a] bg-[#1e1e1e]">
            {current.icon}
          </div>
          <h2 className="text-xl font-bold text-white">{current.title}</h2>
          <p className="text-sm text-zinc-500">{current.subtitle}</p>
        </div>
      </div>
    );
  };

  /* ---------- Loading state ---------- */
  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  /* ---------- Left / ended state ---------- */
  if (state === "left") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-96 border-[#2a2a2a] bg-[#181818]">
          <CardContent className="pt-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#2a2a2a] bg-[#1e1e1e]">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-white">
              Interview Complete
            </h2>
            <p className="mb-6 text-sm text-zinc-500">Session has been saved successfully.</p>
            <div className="flex justify-center gap-3">
              <Button
                onClick={() => router.push(`/report/${callId}`)}
                className="bg-white font-medium text-zinc-900 hover:bg-zinc-200"
              >
                View Report
              </Button>
              <Button onClick={() => router.push("/dashboard")} variant="outline" className="border-[#2a2a2a] text-zinc-400 hover:bg-[#1e1e1e] hover:text-zinc-200">
                Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---------- Error state ---------- */
  if (state === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-96 border-[#2a2a2a] bg-[#181818]">
          <CardContent className="pt-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-red-500/20 bg-red-500/5">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-red-400">Connection Error</h2>
            <p className="mb-6 text-sm text-zinc-500">{error}</p>
            <div className="flex justify-center gap-3">
              <Button
                onClick={handleJoin}
                className="bg-white font-medium text-zinc-900 hover:bg-zinc-200"
              >
                Retry
              </Button>
              <Button onClick={() => router.push("/dashboard")} variant="outline" className="border-[#2a2a2a] text-zinc-400 hover:bg-[#1e1e1e] hover:text-zinc-200">
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---------- Lobby state ---------- */
  if (state === "lobby") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-[480px] border-[#2a2a2a] bg-[#181818]">
          <CardHeader>
            <CardTitle className="text-center text-lg font-bold text-white">Ready to Start?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-[#2a2a2a] bg-[#1e1e1e]">
              <Video className="h-12 w-12 text-zinc-600" />
            </div>
            <p className="text-center text-sm text-zinc-500">
              Check your microphone and camera before joining.
            </p>
            <div className="flex justify-center gap-3">
              <Button
                onClick={() => router.push("/dashboard")}
                variant="ghost"
                className="text-zinc-500 hover:bg-[#1e1e1e] hover:text-zinc-300"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleJoin}
                size="lg"
                className="bg-white px-8 font-semibold text-zinc-900 transition-colors hover:bg-zinc-200"
              >
                Join Interview
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---------- Joining state ---------- */
  if (state === "joining") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-zinc-500" />
          <p className="text-sm text-zinc-500">Connecting to interview...</p>
        </div>
      </div>
    );
  }

  /* ---------- Joined state ---------- */
  return (
    <>
      {renderEndingModal()}
      <StreamVideo client={client!}>
        <StreamCall call={call!}>
          <InterviewRoom
            call={call}
            interviewId={interviewIdRef.current}
            onLeave={handleEndInterview}
            onReportGenerated={handleReportGenerated}
          />
        </StreamCall>
      </StreamVideo>
    </>
  );
}
