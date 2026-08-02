/**
 * Purpose-built animated SVG icons for the stat pills.
 * Each one carries its own motion: electric pulse, heartbeat, ticking hands…
 */

type IconProps = { color: string; className?: string };

const base = "size-5 shrink-0";

/** Lightning bolt with a charge racing along its outline. */
export function BoltIcon({ color, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className ?? ""}`} aria-hidden="true">
      <path
        d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"
        fill={`color-mix(in oklab, ${color} 18%, transparent)`}
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinejoin="round"
        pathLength={100}
        style={{
          strokeDasharray: "18 82",
          filter: `drop-shadow(0 0 6px ${color})`,
          animation: "charge 1.8s linear infinite",
        }}
      />
    </svg>
  );
}

/** Two workers, the second fading in and out as the fleet breathes. */
export function WorkersIcon({ color, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className ?? ""}`} aria-hidden="true" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round">
      <circle cx="9" cy="8" r="3.2" style={{ animation: "breathe 2.6s ease-in-out infinite", transformOrigin: "9px 8px" }} />
      <path d="M3.2 20a5.8 5.8 0 0 1 11.6 0" />
      <g style={{ animation: "fade-cycle 2.6s ease-in-out infinite" }}>
        <circle cx="17" cy="9" r="2.6" />
        <path d="M14.4 19.4A4.8 4.8 0 0 1 21.6 19.4" />
      </g>
    </svg>
  );
}

/** Isometric block that rotates and settles, like a found block dropping in. */
export function BlockIcon({ color, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className ?? ""}`} aria-hidden="true" fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round">
      <g style={{ animation: "block-tumble 4.2s ease-in-out infinite", transformOrigin: "12px 12px" }}>
        <path d="M12 2.8 20.5 7.4v9.2L12 21.2 3.5 16.6V7.4Z" />
        <path d="M12 12 20.5 7.4M12 12v9.2M12 12 3.5 7.4" opacity="0.6" />
      </g>
    </svg>
  );
}

/** Share graph with a packet relayed between the nodes. */
export function SharesIcon({ color, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className ?? ""}`} aria-hidden="true" fill="none" stroke={color} strokeWidth="1.6">
      <path d="M8.5 10.5 15.5 6.8M8.5 13.5 15.5 17.2" opacity="0.7" />
      <circle cx="18" cy="5.5" r="2.4" />
      <circle cx="18" cy="18.5" r="2.4" />
      <circle cx="6" cy="12" r="2.6" style={{ animation: "breathe 1.6s ease-in-out infinite", transformOrigin: "6px 12px" }} />
      <circle r="1.15" fill={color} stroke="none" style={{ animation: "share-relay 2.2s ease-in-out infinite" }}>
        <animateMotion dur="2.2s" repeatCount="indefinite" path="M6 12 L18 5.5 L6 12 L18 18.5 L6 12" />
      </circle>
    </svg>
  );
}

/** Heart that actually beats, on a double-thump rhythm. */
export function HeartIcon({ color, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className ?? ""}`} aria-hidden="true">
      <path
        d="M12 20.5S3.5 15.2 3.5 9.4A4.9 4.9 0 0 1 12 6.2a4.9 4.9 0 0 1 8.5 3.2c0 5.8-8.5 11.1-8.5 11.1Z"
        fill={`color-mix(in oklab, ${color} 22%, transparent)`}
        stroke={color}
        strokeWidth="1.6"
        style={{
          animation: "heartbeat 1.4s ease-in-out infinite",
          transformOrigin: "12px 13px",
          filter: `drop-shadow(0 0 5px color-mix(in oklab, ${color} 60%, transparent))`,
        }}
      />
    </svg>
  );
}

/** Clock with hands that sweep, minute fast, hour slow. */
export function ClockIcon({ color, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className ?? ""}`} aria-hidden="true" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" opacity="0.85" />
      <line x1="12" y1="12" x2="12" y2="7.2" style={{ animation: "spin 12s linear infinite", transformOrigin: "12px 12px" }} />
      <line x1="12" y1="12" x2="15.6" y2="12" strokeWidth="1.3" opacity="0.8" style={{ animation: "spin 48s linear infinite", transformOrigin: "12px 12px" }} />
      <circle cx="12" cy="12" r="1" fill={color} stroke="none" />
    </svg>
  );
}