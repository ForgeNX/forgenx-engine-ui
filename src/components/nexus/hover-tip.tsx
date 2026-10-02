import { useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

// A hover label that follows the pointer, styled to match the rest of Nexus: a
// browser's own tooltip (the title attribute) cannot be styled at all.
//
//   const tip = useHoverTip();
//   <button {...tip.bind("Click to copy")}>...</button>
//   {tip.node}
export function useHoverTip(): { bind: (text: string) => object; node: ReactNode } {
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const bind = (text: string) => ({
    onMouseMove: (e: MouseEvent) => setTip({ text, x: e.clientX, y: e.clientY }),
    onMouseLeave: () => setTip(null),
  });
  const node = tip
    ? createPortal(
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 rounded-md border px-2 py-1 font-mono text-[0.68rem] font-semibold whitespace-nowrap text-white shadow-lg"
          style={{
            left: tip.x + 14,
            top: tip.y + 16,
            background: "color-mix(in oklab, var(--neon-cyan) 10%, #02050d)",
            borderColor: "color-mix(in oklab, var(--neon-cyan) 60%, transparent)",
          }}
        >
          {tip.text}
        </div>,
        document.body,
      )
    : null;
  return { bind, node };
}
