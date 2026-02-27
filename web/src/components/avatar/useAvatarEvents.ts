"use client";

import { useEffect, useState } from "react";
import type { Call } from "@stream-io/video-client";

export function useAvatarEvents(call: Call | undefined) {
  const [expression, setExpression] = useState("neutral");
  const [intensity, setIntensity] = useState(0.8);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [action, setAction] = useState<string | null>(null);
  const [actionIntensity, setActionIntensity] = useState(0.7);

  useEffect(() => {
    if (!call) return;

    const unsub = call.on("custom", (event: { custom: Record<string, unknown> }) => {
      const { type, ...data } = event.custom;

      if (type === "avatar_expression") {
        setExpression(data.expression as string);
        setIntensity((data.intensity as number) ?? 0.8);
      }

      if (type === "avatar_action") {
        setAction(data.action as string);
        setActionIntensity((data.intensity as number) ?? 0.7);
      }
    });

    return () => {
      unsub();
    };
  }, [call]);

  return {
    expression,
    intensity,
    isSpeaking,
    setIsSpeaking,
    action,
    setAction,
    actionIntensity,
  };
}
