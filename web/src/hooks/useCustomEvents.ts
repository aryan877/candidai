"use client";

import { useEffect, useState, useCallback } from "react";
import type { Call } from "@stream-io/video-react-sdk";

export function useCustomEvents<T = unknown>(
  call: Call | undefined,
  eventType: string
) {
  const [latestEvent, setLatestEvent] = useState<T | null>(null);
  const [events, setEvents] = useState<T[]>([]);

  const handleCustomEvent = useCallback(
    (event: { custom: Record<string, unknown> }) => {
      const payload = event.custom;
      if (payload && payload.type === eventType) {
        setLatestEvent(payload as T);
        setEvents((prev) => [...prev, payload as T]);
      }
    },
    [eventType]
  );

  useEffect(() => {
    if (!call) return;

    const unsubscribe = call.on("custom", handleCustomEvent);

    return () => {
      unsubscribe();
    };
  }, [call, handleCustomEvent]);

  const clearEvents = useCallback(() => {
    setLatestEvent(null);
    setEvents([]);
  }, []);

  return { latestEvent, events, clearEvents };
}
