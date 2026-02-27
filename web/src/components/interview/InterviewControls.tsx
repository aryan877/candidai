"use client";

import { useState } from "react";
import { useCallStateHooks } from "@stream-io/video-react-sdk";
import {
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Monitor,
  MonitorOff,
  Columns2,
  PhoneOff,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface InterviewControlsProps {
  showCodeEditor: boolean;
  onTogglePanel: () => void;
  onEndInterview: () => void;
}

export default function InterviewControls({
  showCodeEditor,
  onTogglePanel,
  onEndInterview,
}: InterviewControlsProps) {
  const { useMicrophoneState, useCameraState, useScreenShareState } = useCallStateHooks();
  const { microphone, isMute: isMicMuted } = useMicrophoneState();
  const { camera, isMute: isCamMuted } = useCameraState();
  const { screenShare, isMute: isScreenShareOff } = useScreenShareState();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div
      className="flex items-center justify-center gap-4 border-t border-[#2a2a2a] bg-[#181818] px-6 py-3"
      role="toolbar"
      aria-label="Interview controls"
    >
      {/* Mic button */}
      <div className="group flex flex-col items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => microphone.toggle()}
          className={
            isMicMuted
              ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300"
              : "bg-[#1e1e1e] text-zinc-300 hover:bg-[#252525] hover:text-white"
          }
          aria-label={isMicMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {isMicMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
        <span className="text-[10px] text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100">
          Mic
        </span>
      </div>

      {/* Camera button */}
      <div className="group flex flex-col items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => camera.toggle()}
          className={
            isCamMuted
              ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300"
              : "bg-[#1e1e1e] text-zinc-300 hover:bg-[#252525] hover:text-white"
          }
          aria-label={isCamMuted ? "Turn on camera" : "Turn off camera"}
        >
          {isCamMuted ? (
            <CameraOff className="h-5 w-5" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
        </Button>
        <span className="text-[10px] text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100">
          Camera
        </span>
      </div>

      {/* Screen share button */}
      <div className="group flex flex-col items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => screenShare.toggle()}
          className={
            !isScreenShareOff
              ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 hover:text-emerald-300"
              : "bg-[#1e1e1e] text-zinc-300 hover:bg-[#252525] hover:text-white"
          }
          aria-label={!isScreenShareOff ? "Stop screen share" : "Share screen"}
        >
          {!isScreenShareOff ? (
            <Monitor className="h-5 w-5" />
          ) : (
            <MonitorOff className="h-5 w-5" />
          )}
        </Button>
        <span className="text-[10px] text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100">
          Screen
        </span>
      </div>

      {/* Code editor toggle */}
      <div className="group flex flex-col items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onTogglePanel}
          className={
            showCodeEditor
              ? "bg-[#252525] text-white hover:bg-[#2a2a2a]"
              : "text-zinc-500 hover:bg-[#1e1e1e] hover:text-zinc-300"
          }
          aria-label={showCodeEditor ? "Show transcript" : "Show code editor"}
        >
          <Columns2 className="h-5 w-5" />
        </Button>
        <span className="text-[10px] text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100">
          Panel
        </span>
      </div>

      {/* Separator */}
      <div className="mx-1 h-8 w-px bg-[#2a2a2a]" aria-hidden="true" />

      {/* Reconnect button */}
      <div className="group flex flex-col items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.location.reload()}
          className="text-zinc-400 hover:bg-[#1e1e1e] hover:text-zinc-300"
          aria-label="Reconnect to agent"
        >
          <RotateCw className="h-5 w-5" />
        </Button>
        <span className="text-[10px] text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100">
          Reconnect
        </span>
      </div>

      {/* Separator */}
      <div className="mx-1 h-8 w-px bg-[#2a2a2a]" aria-hidden="true" />

      {/* End interview button */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogTrigger asChild>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5 bg-red-600 font-medium text-white transition-colors hover:bg-red-500"
          >
            <PhoneOff className="h-4 w-4" />
            End
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Interview?</DialogTitle>
            <DialogDescription>
              This will end the interview session. The AI interviewer will
              generate a performance report based on the session.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmOpen(false);
                onEndInterview();
              }}
            >
              End Interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
