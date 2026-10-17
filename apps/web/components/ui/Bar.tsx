export function Bar({
  value,
  max,
  kind = "health",
  thick,
  slim,
  label,
  text,
}: {
  value: number;
  max: number;
  kind?: "health" | "energy" | "exp" | "enemy";
  thick?: boolean;
  slim?: boolean;
  label: string;
  text?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div
      className={`bar ${kind === "health" ? "" : kind} ${thick ? "thick" : ""} ${slim ? "slim" : ""}`}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
    >
      <div className="ghost" style={{ width: `${pct}%` }} />
      <div className="fill" style={{ width: `${pct}%` }} />
      {text !== undefined && <span className="text">{text}</span>}
    </div>
  );
}
