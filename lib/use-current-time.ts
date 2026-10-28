"use client";
import { useEffect, useState } from "react";

// Re-render time-based controls at the same cadence and clean up on unmount.
export function useCurrentTime(intervalMilliseconds = 15_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMilliseconds);
    return () => clearInterval(timer);
  }, [intervalMilliseconds]);
  return now;
}
