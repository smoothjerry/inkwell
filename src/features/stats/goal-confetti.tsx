import { useEffect, useState } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import { useProgressStore } from "./progress-store";

const PIECES = 28;
const DURATION_MS = 1200;
const COLORS = ["var(--fg)", "var(--success)", "var(--streak)", "var(--fg-muted)"];

/** A piece's flight, spread evenly by index so no randomness is needed. */
function pieceStyle(index: number) {
  const angle = Math.PI * (0.15 + (0.7 * index) / (PIECES - 1));
  const distance = 60 + ((index * 37) % 70);
  return {
    "--dx": `${Math.round(Math.cos(angle) * distance)}px`,
    "--dy": `${-Math.round(Math.sin(angle) * distance)}px`,
    "--spin": `${(index % 2 === 0 ? 1 : -1) * (180 + ((index * 53) % 360))}deg`,
    background: COLORS[index % COLORS.length],
    animationDelay: `${(index % 5) * 20}ms`,
  };
}

/**
 * One short confetti burst when the weekly goal is first reached. It is
 * positioned by its parent, and renders nothing when celebrations are off.
 */
export function GoalConfetti() {
  const celebrationCount = useProgressStore((state) => state.celebrationCount);
  const celebrations = useSettingsStore((state) => state.celebrations);
  const [activeBurst, setActiveBurst] = useState(0);

  useEffect(() => {
    if (celebrationCount === 0) {
      return;
    }
    setActiveBurst(celebrationCount);
    const timer = setTimeout(() => setActiveBurst(0), DURATION_MS);
    return () => clearTimeout(timer);
  }, [celebrationCount]);

  if (activeBurst === 0 || !celebrations) {
    return null;
  }

  return (
    <div key={activeBurst} className="absolute inset-0" aria-hidden="true">
      {Array.from({ length: PIECES }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length decorative list.
        <span key={index} className="confetti-piece" style={pieceStyle(index)} />
      ))}
    </div>
  );
}
