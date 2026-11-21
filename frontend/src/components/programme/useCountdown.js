import { useEffect, useState } from "react";

const split = (ms) => {
  const t = Math.max(0, ms);
  return {
    days: Math.floor(t / 86400000),
    hours: Math.floor((t / 3600000) % 24),
    minutes: Math.floor((t / 60000) % 60),
    seconds: Math.floor((t / 1000) % 60),
    done: ms <= 0,
  };
};

/** Live time remaining until `target`; ticks every `everyMs` (default 1s). */
export const useCountdown = (target, everyMs = 1000) => {
  const [left, setLeft] = useState(() => split(target - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setLeft(split(target - Date.now())), everyMs);
    return () => clearInterval(id);
  }, [target, everyMs]);
  return left;
};

export const pad = (n) => String(n).padStart(2, "0");
