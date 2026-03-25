import type { Player } from "@/lib/schemas";

/** All session data needed for achievement calculation */
export type AchievementSession = {
  id: string;
  played_at: string;
  game_id: string;
  winner_id: string;
  players: string[]; // all player IDs in this session
};

export type Achievement = {
  id: string;
  emoji: string;
  name: string;
  description: string;
  earnedAt: string | null; // ISO date string or null if not earned
};

const ACHIEVEMENT_DEFS: {
  id: string;
  emoji: string;
  name: string;
  description: string;
  check: (sessions: AchievementSession[], playerId: string) => string | null;
}[] = [
  {
    id: "op_dreef",
    emoji: "🔥",
    name: "Op dreef",
    description: "3 overwinningen op rij",
    check(sessions, playerId) {
      return findFirstStreakDate(sessions, playerId, 3);
    },
  },
  {
    id: "onstopbaar",
    emoji: "💪",
    name: "Onstopbaar",
    description: "5 overwinningen op rij",
    check(sessions, playerId) {
      return findFirstStreakDate(sessions, playerId, 5);
    },
  },
  {
    id: "legende",
    emoji: "👑",
    name: "Legende",
    description: "10 overwinningen op rij",
    check(sessions, playerId) {
      return findFirstStreakDate(sessions, playerId, 10);
    },
  },
  {
    id: "stamgast",
    emoji: "🏠",
    name: "Stamgast",
    description: "50× hetzelfde spel gespeeld",
    check(sessions, playerId) {
      // Count sessions per game where player participated
      const gameCounts = new Map<string, { count: number; lastDate: string }>();
      for (const s of sessions) {
        if (!s.players.includes(playerId)) continue;
        const entry = gameCounts.get(s.game_id);
        if (!entry) {
          gameCounts.set(s.game_id, { count: 1, lastDate: s.played_at });
        } else {
          entry.count++;
          if (s.played_at > entry.lastDate) entry.lastDate = s.played_at;
        }
      }
      for (const { count, lastDate } of gameCounts.values()) {
        if (count >= 50) return lastDate;
      }
      return null;
    },
  },
  {
    id: "ontdekker",
    emoji: "🗺️",
    name: "Ontdekker",
    description: "10 verschillende spellen gespeeld",
    check(sessions, playerId) {
      const games = new Set<string>();
      const sorted = [...sessions].sort((a, b) =>
        a.played_at.localeCompare(b.played_at)
      );
      for (const s of sorted) {
        if (!s.players.includes(playerId)) continue;
        games.add(s.game_id);
        if (games.size >= 10) return s.played_at;
      }
      return null;
    },
  },
  {
    id: "marathonspeler",
    emoji: "🏃",
    name: "Marathonspeler",
    description: "5 spellen op één dag gespeeld",
    check(sessions, playerId) {
      const byDay = new Map<string, string[]>();
      for (const s of sessions) {
        if (!s.players.includes(playerId)) continue;
        const day = s.played_at.slice(0, 10);
        const arr = byDay.get(day) ?? [];
        arr.push(s.played_at);
        byDay.set(day, arr);
      }
      let earliest: string | null = null;
      for (const dates of byDay.values()) {
        if (dates.length >= 5) {
          const maxDate = dates.reduce((a, b) => (a > b ? a : b));
          if (!earliest || maxDate < earliest) earliest = maxDate;
        }
      }
      return earliest;
    },
  },
  {
    id: "weekkampioen",
    emoji: "📅",
    name: "Weekkampioen",
    description: "Meeste wins in een kalenderweek",
    check(sessions, playerId) {
      // Group sessions by ISO week
      const winsByWeek = new Map<string, Map<string, number>>();
      for (const s of sessions) {
        const week = getISOWeek(s.played_at);
        if (!winsByWeek.has(week)) winsByWeek.set(week, new Map());
        const weekMap = winsByWeek.get(week)!;
        weekMap.set(s.winner_id, (weekMap.get(s.winner_id) ?? 0) + 1);
      }
      let earliest: string | null = null;
      for (const [week, weekMap] of winsByWeek.entries()) {
        const playerWins = weekMap.get(playerId) ?? 0;
        if (playerWins === 0) continue;
        let isMax = true;
        for (const [pid, wins] of weekMap.entries()) {
          if (pid !== playerId && wins >= playerWins) {
            isMax = false;
            break;
          }
        }
        if (isMax) {
          // Find the last session in that week for this player as winner
          const weekSessions = sessions.filter(
            (s) => getISOWeek(s.played_at) === week && s.winner_id === playerId
          );
          const lastDate = weekSessions.reduce(
            (max, s) => (s.played_at > max ? s.played_at : max),
            ""
          );
          if (!earliest || lastDate < earliest) earliest = lastDate;
        }
      }
      return earliest;
    },
  },
  {
    id: "comeback_kid",
    emoji: "🦸",
    name: "Comeback kid",
    description: "Gewonnen na 3× verlies op rij",
    check(sessions, playerId) {
      // Sorted ascending by played_at
      const sorted = [...sessions]
        .filter((s) => s.players.includes(playerId))
        .sort((a, b) => a.played_at.localeCompare(b.played_at));
      let losses = 0;
      for (const s of sorted) {
        if (s.winner_id !== playerId) {
          losses++;
        } else {
          if (losses >= 3) return s.played_at;
          losses = 0;
        }
      }
      return null;
    },
  },
];

/** Find date when a consecutive win streak of `n` was first reached (oldest) */
function findFirstStreakDate(
  sessions: AchievementSession[],
  playerId: string,
  n: number
): string | null {
  const sorted = [...sessions].sort((a, b) =>
    a.played_at.localeCompare(b.played_at)
  );
  let streak = 0;
  let result: string | null = null;
  let streakStart = 0;
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    if (!s) continue;
    if (s.winner_id === playerId) {
      if (streak === 0) streakStart = i;
      streak++;
      if (streak >= n && !result) {
        result = s.played_at;
      }
    } else {
      streak = 0;
    }
  }
  return result;
}

/** Get ISO week string like "2025-W12" */
function getISOWeek(isoDate: string): string {
  const date = new Date(isoDate);
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, "0")}`;
}

/** Calculate all achievements for a player */
export function calculateAchievements(
  sessions: AchievementSession[],
  playerId: string
): Achievement[] {
  return ACHIEVEMENT_DEFS.map((def) => ({
    id: def.id,
    emoji: def.emoji,
    name: def.name,
    description: def.description,
    earnedAt: def.check(sessions, playerId),
  }));
}

/** Result for all players */
export type PlayerAchievements = {
  player: Player;
  achievements: Achievement[];
  earnedCount: number;
};
