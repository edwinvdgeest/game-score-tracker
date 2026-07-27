interface WrappedStatProps {
  icon: string;
  label: string;
  value: string;
  detail?: string;
}

/** Eén cijfer op de jaarkaart. */
export function WrappedStat({ icon, label, value, detail }: WrappedStatProps) {
  return (
    <div
      className="rounded-2xl p-3"
      style={{ backgroundColor: "color-mix(in srgb, var(--muted) 60%, var(--card))" }}
    >
      <div
        className="text-xs font-bold uppercase tracking-wide"
        style={{ color: "var(--muted-foreground)" }}
      >
        {icon} {label}
      </div>
      <div className="font-black text-lg mt-0.5 leading-tight">{value}</div>
      {detail && (
        <div
          className="text-xs font-semibold"
          style={{ color: "var(--muted-foreground)" }}
        >
          {detail}
        </div>
      )}
    </div>
  );
}
