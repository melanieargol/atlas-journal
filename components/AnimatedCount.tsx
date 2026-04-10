"use client";

import { useEffect, useState } from "react";

export function AnimatedCount({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    const totalFrames = 20;
    const nextValue = Math.max(0, value);

    const interval = window.setInterval(() => {
      frame += 1;
      const progress = frame / totalFrames;
      setDisplayValue(Math.round(nextValue * progress));

      if (frame >= totalFrames) {
        window.clearInterval(interval);
        setDisplayValue(nextValue);
      }
    }, 24);

    return () => window.clearInterval(interval);
  }, [value]);

  return <>{displayValue}{suffix}</>;
}
