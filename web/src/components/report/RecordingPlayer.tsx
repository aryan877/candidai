"use client";

import { Video } from "lucide-react";

interface RecordingPlayerProps {
  recordingUrl: string | null;
  startTime?: number;
}

export default function RecordingPlayer({
  recordingUrl,
}: RecordingPlayerProps) {
  if (!recordingUrl) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-slate-800 bg-slate-900">
        <div className="text-center">
          <Video className="mx-auto h-10 w-10 text-slate-600" />
          <p className="mt-2 text-sm text-slate-500">
            No recording available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 shadow-lg">
      <video
        src={recordingUrl}
        controls
        className="h-auto w-full bg-black"
      >
        Your browser does not support the video element.
      </video>
    </div>
  );
}
