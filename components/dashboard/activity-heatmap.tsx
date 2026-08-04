"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { ActivityWeek } from "@/lib/activity";

type ActivityData = { weeks: ActivityWeek[]; maxCount: number; totalSessions: number };

/** Niveau 0-4 → achtergrond, van leeg tot vol coral — zelfde color-mix-truc als de badge-tiers. */
const LEVEL_BG = [
  "var(--color-chart-bar-muted)",
  "color-mix(in srgb, var(--color-coral) 25%, var(--card))",
  "color-mix(in srgb, var(--color-coral) 50%, var(--card))",
  "color-mix(in srgb, var(--color-coral) 75%, var(--card))",
  "var(--color-coral)",
];

// Alleen Ma/Wo/Vr een label, net als GitHub — elke rij labelen wordt te druk op dit formaat.
const WEEKDAY_LABELS = ["", "Ma", "", "Wo", "", "Vr", ""];

/** Datumtekst voor de tooltip; midden-op-de-dag zodat de tijdzone niet naar de vorige dag afrondt. */
function dayLabel(dateKey: string): string {
  return format(new Date(`${dateKey}T12:00:00`), "d MMMM", { locale: nl });
}

export function ActivityHeatmap() {
  const [data, setData] = useState<ActivityData | null>(null);

  useEffect(() => {
    fetch("/api/stats/activity")
      .then((r) => r.json())
      .then((d: ActivityData) => setData(d))
      .catch(() => null);
  }, []);

  if (!data) {
    return (
      <div className="rounded-3xl p-4 border" style={{ backgroundColor: "var(--card)" }}>
        <h2 className="font-extrabold text-base mb-3">🔥 Activiteit</h2>
        <div
          className="h-32 flex items-center justify-center text-sm font-semibold"
          style={{ color: "var(--muted-foreground)" }}
        >
          Laden...
        </div>
      </div>
    );
  }

  const { weeks, totalSessions } = data;
  if (totalSessions === 0) return null;

  // Maandlabel boven de week-kolom die de 1e van die maand bevat — elke maand valt in
  // precies één week van dit raster, dus geen ontdubbeling nodig.
  const monthLabels = weeks.map((week) => {
    const firstOfMonth = week.find((d) => d.date.endsWith("-01"));
    return firstOfMonth
      ? format(new Date(`${firstOfMonth.date}T12:00:00`), "MMM", { locale: nl })
      : null;
  });

  return (
    <div className="rounded-3xl p-4 border space-y-3" style={{ backgroundColor: "var(--card)" }}>
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <h2 className="font-extrabold text-base">🔥 Activiteit</h2>
        <span className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
          {totalSessions} {totalSessions === 1 ? "potje" : "potjes"} in het afgelopen jaar
        </span>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="inline-flex gap-[3px]">
          <div className="flex flex-col gap-[3px] mr-1 flex-shrink-0">
            <div className="h-3" />
            {WEEKDAY_LABELS.map((label, i) => (
              <div
                key={i}
                className="w-5 h-3 text-[10px] font-semibold leading-3"
                style={{ color: "var(--muted-foreground)" }}
              >
                {label}
              </div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={week[0]?.date ?? wi} className="flex flex-col gap-[3px]">
              <div
                className="h-3 text-[10px] font-semibold whitespace-nowrap leading-3"
                style={{ color: "var(--muted-foreground)" }}
              >
                {monthLabels[wi] ?? ""}
              </div>
              {week.map((day) => (
                <div
                  key={day.date}
                  title={day.isFuture ? undefined : `${day.count} ${day.count === 1 ? "potje" : "potjes"} op ${dayLabel(day.date)}`}
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: day.isFuture ? "transparent" : LEVEL_BG[day.level] }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div
        className="flex items-center justify-end gap-1 text-[10px] font-semibold"
        style={{ color: "var(--muted-foreground)" }}
      >
        <span>Minder</span>
        {LEVEL_BG.map((bg, i) => (
          <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: bg }} />
        ))}
        <span>Meer</span>
      </div>
    </div>
  );
}
