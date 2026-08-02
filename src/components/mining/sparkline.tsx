type SparklineProps = {
  values: number[];
  color: string;
  height?: number;
  className?: string;
  grid?: boolean;
};

export function Sparkline({
  values,
  color,
  height = 60,
  className,
  grid = true,
}: SparklineProps) {
  const width = 200;
  const step = width / Math.max(1, values.length - 1);
  const points = values.map((v, i) => `${(i * step).toFixed(2)},${(height - v * height).toFixed(2)}`);
  const line = `M ${points.join(" L ")}`;
  const area = `${line} L ${width},${height} L 0,${height} Z`;
  const gradientId = `spark-${color.replace(/[^a-z]/gi, "")}-${values.length}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      style={{ width: "100%", height }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {grid &&
        [0.25, 0.5, 0.75].map((g) => (
          <line
            key={g}
            x1="0"
            x2={width}
            y1={height * g}
            y2={height * g}
            stroke="var(--grid-line)"
            strokeWidth="0.5"
          />
        ))}
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{
          filter: `drop-shadow(0 0 6px ${color})`,
          strokeDasharray: 1200,
          animation: "draw 2.4s ease-out forwards",
        }}
      />
    </svg>
  );
}