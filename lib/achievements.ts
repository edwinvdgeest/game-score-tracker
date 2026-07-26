import type { Player } from "@/lib/schemas";

/** All session data needed for achievement calculation */
export type AchievementSession = {
  id: string;
  played_at: string;
  game_id: string;
  winner_id: string | null;
  starter_id: string | null;
  marathon_id: string | null;
  duration_minutes: number | null;
  game_category: string | null;
  game_difficulty: number | null;
  lowest_score_wins: boolean;
  players: string[]; // all player IDs in this session
  scores: Record<string, number | null>; // player ID → score
};

/** Extra context that can't be derived from the sessions themselves */
export type AchievementContext = {
  guestPlayerIds?: string[];
};

export type AchievementCategory =
  | "wins"
  | "streaks"
  | "games"
  | "time"
  | "social"
  | "marathon"
  | "special";

export type AchievementTier = "bronze" | "silver" | "gold";

export type Achievement = {
  id: string;
  emoji: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  earnedAt: string | null; // ISO date string or null if not earned
};

/** Display order + labels for the badge groups */
export const ACHIEVEMENT_CATEGORIES: {
  id: AchievementCategory;
  label: string;
  emoji: string;
}[] = [
  { id: "wins", label: "Overwinningen", emoji: "🏆" },
  { id: "streaks", label: "Reeksen", emoji: "🔥" },
  { id: "games", label: "Spellen", emoji: "🎲" },
  { id: "time", label: "Tijd & trouw", emoji: "🕒" },
  { id: "social", label: "Sociaal", emoji: "🤝" },
  { id: "marathon", label: "Marathon", emoji: "🏁" },
  { id: "special", label: "Speciaal", emoji: "✨" },
];

const ACHIEVEMENT_DEFS: {
  id: string;
  emoji: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  check: (
    sessions: AchievementSession[],
    playerId: string,
    ctx: AchievementContext
  ) => string | null;
}[] = [
  // ---------------------------------------------------------------- wins
  {
    id: "eerste_winst",
    emoji: "🥇",
    name: "Eerste bloed",
    description: "Je allereerste overwinning",
    category: "wins",
    tier: "bronze",
    check(sessions, playerId) {
      return nthWinDate(sessions, playerId, 1);
    },
  },
  {
    id: "tien_wins",
    emoji: "🏅",
    name: "Tien op de teller",
    description: "10 overwinningen",
    category: "wins",
    tier: "bronze",
    check(sessions, playerId) {
      return nthWinDate(sessions, playerId, 10);
    },
  },
  {
    id: "kwart_eeuw",
    emoji: "🎖️",
    name: "Kwart eeuw",
    description: "25 overwinningen",
    category: "wins",
    tier: "silver",
    check(sessions, playerId) {
      return nthWinDate(sessions, playerId, 25);
    },
  },
  {
    id: "halve_eeuw",
    emoji: "🏆",
    name: "Halve eeuw",
    description: "50 overwinningen",
    category: "wins",
    tier: "silver",
    check(sessions, playerId) {
      return nthWinDate(sessions, playerId, 50);
    },
  },
  {
    id: "centurion",
    emoji: "💯",
    name: "Centurion",
    description: "100 overwinningen",
    category: "wins",
    tier: "gold",
    check(sessions, playerId) {
      return nthWinDate(sessions, playerId, 100);
    },
  },

  // ------------------------------------------------------------- streaks
  {
    id: "op_dreef",
    emoji: "🔥",
    name: "Op dreef",
    description: "3 overwinningen op rij",
    category: "streaks",
    tier: "bronze",
    check(sessions, playerId) {
      return findFirstStreakDate(sessions, playerId, 3);
    },
  },
  {
    id: "onstopbaar",
    emoji: "💪",
    name: "Onstopbaar",
    description: "5 overwinningen op rij",
    category: "streaks",
    tier: "silver",
    check(sessions, playerId) {
      return findFirstStreakDate(sessions, playerId, 5);
    },
  },
  {
    id: "legende",
    emoji: "👑",
    name: "Legende",
    description: "10 overwinningen op rij",
    category: "streaks",
    tier: "gold",
    check(sessions, playerId) {
      return findFirstStreakDate(sessions, playerId, 10);
    },
  },
  {
    id: "huisbaas",
    emoji: "🛡️",
    name: "Huisbaas",
    description: "5 keer op rij gewonnen bij hetzelfde spel",
    category: "streaks",
    tier: "silver",
    check(sessions, playerId) {
      const byGame = new Map<string, AchievementSession[]>();
      for (const s of playerSessions(sessions, playerId)) {
        const arr = byGame.get(s.game_id) ?? [];
        arr.push(s);
        byGame.set(s.game_id, arr);
      }
      let earliest: string | null = null;
      for (const gameSessions of byGame.values()) {
        let streak = 0;
        for (const s of gameSessions) {
          if (s.winner_id === playerId) {
            streak++;
            if (streak >= 5) {
              if (!earliest || s.played_at < earliest) earliest = s.played_at;
              break;
            }
          } else {
            streak = 0;
          }
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
    category: "streaks",
    tier: "bronze",
    check(sessions, playerId) {
      // Sorted ascending by played_at
      const sorted = playerSessions(sessions, playerId);
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
  {
    id: "weekkampioen",
    emoji: "📅",
    name: "Weekkampioen",
    description: "Meeste wins in een kalenderweek",
    category: "streaks",
    tier: "silver",
    check(sessions, playerId) {
      return findPeriodChampionDate(sessions, playerId, getISOWeek, 1);
    },
  },
  {
    id: "maandkampioen",
    emoji: "🗓️",
    name: "Maandkampioen",
    description: "Meeste wins in een kalendermaand (min. 5)",
    category: "streaks",
    tier: "gold",
    check(sessions, playerId) {
      return findPeriodChampionDate(sessions, playerId, getMonthKey, 5);
    },
  },

  // --------------------------------------------------------------- games
  {
    id: "ontdekker",
    emoji: "🗺️",
    name: "Ontdekker",
    description: "10 verschillende spellen gespeeld",
    category: "games",
    tier: "bronze",
    check(sessions, playerId) {
      return nthDistinctDate(playerSessions(sessions, playerId), (s) => s.game_id, 10);
    },
  },
  {
    id: "verzamelaar",
    emoji: "🧭",
    name: "Verzamelaar",
    description: "25 verschillende spellen gespeeld",
    category: "games",
    tier: "silver",
    check(sessions, playerId) {
      return nthDistinctDate(playerSessions(sessions, playerId), (s) => s.game_id, 25);
    },
  },
  {
    id: "veelspeler",
    emoji: "🎲",
    name: "Veelspeler",
    description: "100 potjes gespeeld",
    category: "games",
    tier: "silver",
    check(sessions, playerId) {
      const played = playerSessions(sessions, playerId);
      return played[99]?.played_at ?? null;
    },
  },
  {
    id: "spelfanaat",
    emoji: "🎰",
    name: "Spelfanaat",
    description: "250 potjes gespeeld",
    category: "games",
    tier: "gold",
    check(sessions, playerId) {
      const played = playerSessions(sessions, playerId);
      return played[249]?.played_at ?? null;
    },
  },
  {
    id: "stamgast",
    emoji: "🏠",
    name: "Stamgast",
    description: "50× hetzelfde spel gespeeld",
    category: "games",
    tier: "gold",
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
    id: "alleskunner",
    emoji: "🌈",
    name: "Alleskunner",
    description: "Gewonnen in 4 verschillende categorieën",
    category: "games",
    tier: "silver",
    check(sessions, playerId) {
      return nthDistinctDate(
        winSessions(sessions, playerId).filter((s) => s.game_category),
        (s) => s.game_category ?? "",
        4
      );
    },
  },
  {
    id: "denksporter",
    emoji: "🧠",
    name: "Denksporter",
    description: "10 wins bij zware spellen (4+ sterren)",
    category: "games",
    tier: "silver",
    check(sessions, playerId) {
      return nthMatchDate(
        winSessions(sessions, playerId),
        (s) => (s.game_difficulty ?? 0) >= 4,
        10
      );
    },
  },
  {
    id: "omdenker",
    emoji: "⛳",
    name: "Omdenker",
    description: "Gewonnen bij een spel waar de laagste score wint",
    category: "games",
    tier: "bronze",
    check(sessions, playerId) {
      return nthMatchDate(winSessions(sessions, playerId), (s) => s.lowest_score_wins, 1);
    },
  },

  // ---------------------------------------------------------------- time
  {
    id: "nachtbraker",
    emoji: "🌙",
    name: "Nachtbraker",
    description: "Gewonnen na 23:00",
    category: "time",
    tier: "bronze",
    check(sessions, playerId) {
      return nthMatchDate(
        winSessions(sessions, playerId),
        (s) => localParts(s.played_at).hour >= 23,
        1
      );
    },
  },
  {
    id: "vroege_vogel",
    emoji: "🌅",
    name: "Vroege vogel",
    description: "Een potje gespeeld voor 09:00",
    category: "time",
    tier: "bronze",
    check(sessions, playerId) {
      return nthMatchDate(
        playerSessions(sessions, playerId),
        (s) => localParts(s.played_at).hour < 9,
        1
      );
    },
  },
  {
    id: "weekendwarrior",
    emoji: "🎉",
    name: "Weekendwarrior",
    description: "15 overwinningen in het weekend",
    category: "time",
    tier: "silver",
    check(sessions, playerId) {
      return nthMatchDate(
        winSessions(sessions, playerId),
        (s) => {
          const wd = localParts(s.played_at).weekday;
          return wd === 0 || wd === 6;
        },
        15
      );
    },
  },
  {
    id: "trouwe_speler",
    emoji: "📆",
    name: "Trouwe speler",
    description: "4 weken op rij gespeeld",
    category: "time",
    tier: "silver",
    check(sessions, playerId) {
      // Laatste sessie per weeknummer, daarna zoeken naar 4 opeenvolgende weken
      const lastPerWeek = new Map<number, string>();
      for (const s of playerSessions(sessions, playerId)) {
        const week = weekIndex(s.played_at);
        const current = lastPerWeek.get(week);
        if (!current || s.played_at > current) lastPerWeek.set(week, s.played_at);
      }
      const weeks = [...lastPerWeek.keys()].sort((a, b) => a - b);
      let run = 0;
      let prev: number | null = null;
      for (const w of weeks) {
        run = prev !== null && w === prev + 1 ? run + 1 : 1;
        prev = w;
        if (run >= 4) return lastPerWeek.get(w) ?? null;
      }
      return null;
    },
  },
  {
    id: "oud_en_nieuw",
    emoji: "🎆",
    name: "Oud & nieuw",
    description: "Gespeeld op 31 december of 1 januari",
    category: "time",
    tier: "bronze",
    check(sessions, playerId) {
      return nthMatchDate(
        playerSessions(sessions, playerId),
        (s) => {
          const { month, day } = localParts(s.played_at);
          return (month === 12 && day === 31) || (month === 1 && day === 1);
        },
        1
      );
    },
  },
  {
    id: "kerstkampioen",
    emoji: "🎄",
    name: "Kerstkampioen",
    description: "Gewonnen tijdens de kerstdagen (24–26 dec)",
    category: "time",
    tier: "bronze",
    check(sessions, playerId) {
      return nthMatchDate(
        winSessions(sessions, playerId),
        (s) => {
          const { month, day } = localParts(s.played_at);
          return month === 12 && day >= 24 && day <= 26;
        },
        1
      );
    },
  },

  // -------------------------------------------------------------- social
  {
    id: "gastheer",
    emoji: "🎪",
    name: "Gastheer",
    description: "Met 5 verschillende gastspelers gespeeld",
    category: "social",
    tier: "silver",
    check(sessions, playerId, ctx) {
      const guests = new Set(ctx.guestPlayerIds ?? []);
      if (guests.size === 0) return null;
      const seen = new Set<string>();
      for (const s of playerSessions(sessions, playerId)) {
        for (const pid of s.players) {
          if (pid !== playerId && guests.has(pid)) seen.add(pid);
        }
        if (seen.size >= 5) return s.played_at;
      }
      return null;
    },
  },
  {
    id: "rivaal",
    emoji: "🥊",
    name: "Aartsrivaal",
    description: "50 potjes tegen dezelfde tegenstander",
    category: "social",
    tier: "silver",
    check(sessions, playerId) {
      const counts = new Map<string, number>();
      for (const s of playerSessions(sessions, playerId)) {
        for (const pid of s.players) {
          if (pid === playerId) continue;
          const next = (counts.get(pid) ?? 0) + 1;
          counts.set(pid, next);
          if (next >= 50) return s.played_at;
        }
      }
      return null;
    },
  },
  {
    id: "diplomaat",
    emoji: "🤝",
    name: "Diplomaat",
    description: "5 keer gelijkspel meegemaakt",
    category: "social",
    tier: "bronze",
    check(sessions, playerId) {
      return nthMatchDate(
        playerSessions(sessions, playerId),
        (s) => s.winner_id === null,
        5
      );
    },
  },
  {
    id: "openingszet",
    emoji: "🎬",
    name: "Openingszet",
    description: "10 wins als startspeler",
    category: "social",
    tier: "bronze",
    check(sessions, playerId) {
      return nthMatchDate(
        winSessions(sessions, playerId),
        (s) => s.starter_id === playerId,
        10
      );
    },
  },
  {
    id: "underdog",
    emoji: "🐢",
    name: "Underdog",
    description: "25 wins terwijl iemand anders begon",
    category: "social",
    tier: "silver",
    check(sessions, playerId) {
      return nthMatchDate(
        winSessions(sessions, playerId),
        (s) => s.starter_id !== null && s.starter_id !== playerId,
        25
      );
    },
  },

  // ------------------------------------------------------------ marathon
  {
    id: "marathonspeler",
    emoji: "🏃",
    name: "Marathonspeler",
    description: "5 spellen op één dag gespeeld",
    category: "marathon",
    tier: "bronze",
    check(sessions, playerId) {
      return findNthOnSingleDayDate(sessions, playerId, 5);
    },
  },
  {
    id: "ijzeren_man",
    emoji: "🦾",
    name: "IJzeren man",
    description: "10 potjes op één dag gespeeld",
    category: "marathon",
    tier: "gold",
    check(sessions, playerId) {
      return findNthOnSingleDayDate(sessions, playerId, 10);
    },
  },
  {
    id: "marathonwinnaar",
    emoji: "🏁",
    name: "Marathonwinnaar",
    description: "Een marathon met minstens 3 potjes gewonnen",
    category: "marathon",
    tier: "silver",
    check(sessions, playerId) {
      const byMarathon = new Map<string, AchievementSession[]>();
      for (const s of sessions) {
        if (!s.marathon_id) continue;
        const arr = byMarathon.get(s.marathon_id) ?? [];
        arr.push(s);
        byMarathon.set(s.marathon_id, arr);
      }
      let earliest: string | null = null;
      for (const marathonSessions of byMarathon.values()) {
        if (marathonSessions.length < 3) continue;
        if (!marathonSessions.some((s) => s.players.includes(playerId))) continue;
        const wins = new Map<string, number>();
        for (const s of marathonSessions) {
          if (!s.winner_id) continue;
          wins.set(s.winner_id, (wins.get(s.winner_id) ?? 0) + 1);
        }
        const mine = wins.get(playerId) ?? 0;
        if (mine === 0) continue;
        const beatsEveryone = [...wins.entries()].every(
          ([pid, count]) => pid === playerId || count < mine
        );
        if (!beatsEveryone) continue;
        const lastDate = marathonSessions.reduce(
          (max, s) => (s.played_at > max ? s.played_at : max),
          ""
        );
        if (!earliest || lastDate < earliest) earliest = lastDate;
      }
      return earliest;
    },
  },
  {
    id: "uithoudingsvermogen",
    emoji: "⏳",
    name: "Uithoudingsvermogen",
    description: "3 uur spellen op één dag",
    category: "marathon",
    tier: "silver",
    check(sessions, playerId) {
      const byDay = new Map<string, AchievementSession[]>();
      for (const s of playerSessions(sessions, playerId)) {
        if (!s.duration_minutes) continue;
        const day = localDayKey(s.played_at);
        const arr = byDay.get(day) ?? [];
        arr.push(s);
        byDay.set(day, arr);
      }
      let earliest: string | null = null;
      for (const daySessions of byDay.values()) {
        let total = 0;
        for (const s of daySessions) {
          total += s.duration_minutes ?? 0;
          if (total >= 180) {
            if (!earliest || s.played_at < earliest) earliest = s.played_at;
            break;
          }
        }
      }
      return earliest;
    },
  },
  {
    id: "snelle_winst",
    emoji: "⚡",
    name: "Bliksemsnel",
    description: "Gewonnen in 15 minuten of minder",
    category: "marathon",
    tier: "bronze",
    check(sessions, playerId) {
      return nthMatchDate(
        winSessions(sessions, playerId),
        (s) => s.duration_minutes !== null && s.duration_minutes <= 15,
        1
      );
    },
  },
  {
    id: "lange_zit",
    emoji: "🛋️",
    name: "Lange zit",
    description: "Gewonnen bij een potje van 90 minuten of langer",
    category: "marathon",
    tier: "bronze",
    check(sessions, playerId) {
      return nthMatchDate(
        winSessions(sessions, playerId),
        (s) => s.duration_minutes !== null && s.duration_minutes >= 90,
        1
      );
    },
  },

  // ------------------------------------------------------------- special
  {
    id: "nipte_winst",
    emoji: "😅",
    name: "Fotofinish",
    description: "Gewonnen met 1 punt verschil",
    category: "special",
    tier: "bronze",
    check(sessions, playerId) {
      return nthMatchDate(
        winSessions(sessions, playerId),
        (s) => {
          const margin = winMargin(s, playerId);
          return margin === 1;
        },
        1
      );
    },
  },
  {
    id: "dominant",
    emoji: "💥",
    name: "Afgedroogd",
    description: "Gewonnen met minstens het dubbele van de nummer 2",
    category: "special",
    tier: "silver",
    check(sessions, playerId) {
      return nthMatchDate(
        winSessions(sessions, playerId),
        (s) => {
          if (s.lowest_score_wins) return false;
          const own = s.scores[playerId];
          const runnerUp = bestOpponentScore(s, playerId);
          if (own === null || own === undefined || runnerUp === null) return false;
          return runnerUp > 0 && own >= runnerUp * 2;
        },
        1
      );
    },
  },
  {
    id: "recordbreker",
    emoji: "📈",
    name: "Recordbreker",
    description: "Houdt de hoogste score ooit bij een spel",
    category: "special",
    tier: "gold",
    check(sessions, playerId) {
      // Alle scores per spel verzamelen (alleen spellen waar hoogste score wint)
      const byGame = new Map<
        string,
        {
          entries: { playerId: string; score: number; playedAt: string }[];
          sessionIds: Set<string>;
        }
      >();
      for (const s of sessions) {
        if (s.lowest_score_wins) continue;
        for (const [pid, score] of Object.entries(s.scores)) {
          if (score === null) continue;
          const entry =
            byGame.get(s.game_id) ?? { entries: [], sessionIds: new Set<string>() };
          entry.entries.push({ playerId: pid, score, playedAt: s.played_at });
          entry.sessionIds.add(s.id);
          byGame.set(s.game_id, entry);
        }
      }
      let earliest: string | null = null;
      for (const { entries, sessionIds } of byGame.values()) {
        if (sessionIds.size < 4) continue; // pas zinvol met wat historie
        const best = Math.max(...entries.map((e) => e.score));
        const holders = entries.filter((e) => e.score === best);
        const solo = holders[0];
        if (holders.length !== 1 || !solo || solo.playerId !== playerId) continue;
        if (!earliest || solo.playedAt < earliest) earliest = solo.playedAt;
      }
      return earliest;
    },
  },
];

/** Sessions the player took part in, oldest first */
function playerSessions(
  sessions: AchievementSession[],
  playerId: string
): AchievementSession[] {
  return sessions
    .filter((s) => s.players.includes(playerId))
    .sort((a, b) => a.played_at.localeCompare(b.played_at));
}

/** Sessions the player won, oldest first */
function winSessions(
  sessions: AchievementSession[],
  playerId: string
): AchievementSession[] {
  return sessions
    .filter((s) => s.winner_id === playerId)
    .sort((a, b) => a.played_at.localeCompare(b.played_at));
}

/** Date of the player's nth win (1-based), or null */
function nthWinDate(
  sessions: AchievementSession[],
  playerId: string,
  n: number
): string | null {
  const wins = winSessions(sessions, playerId);
  return wins[n - 1]?.played_at ?? null;
}

/** Date of the nth session matching `pred` (sessions must be sorted ascending) */
function nthMatchDate(
  sessions: AchievementSession[],
  pred: (s: AchievementSession) => boolean,
  n: number
): string | null {
  let count = 0;
  for (const s of sessions) {
    if (!pred(s)) continue;
    count++;
    if (count >= n) return s.played_at;
  }
  return null;
}

/** Date on which the nth distinct `key` value was reached (sessions sorted ascending) */
function nthDistinctDate(
  sessions: AchievementSession[],
  key: (s: AchievementSession) => string,
  n: number
): string | null {
  const seen = new Set<string>();
  for (const s of sessions) {
    seen.add(key(s));
    if (seen.size >= n) return s.played_at;
  }
  return null;
}

/** Highest (or lowest, when the lowest wins) opponent score in a session */
function bestOpponentScore(
  session: AchievementSession,
  playerId: string
): number | null {
  const others = Object.entries(session.scores)
    .filter(([pid, score]) => pid !== playerId && score !== null)
    .map(([, score]) => score as number);
  if (others.length === 0) return null;
  return session.lowest_score_wins ? Math.min(...others) : Math.max(...others);
}

/** Absolute score gap between the winner and the runner-up, or null */
function winMargin(session: AchievementSession, playerId: string): number | null {
  const own = session.scores[playerId];
  const runnerUp = bestOpponentScore(session, playerId);
  if (own === null || own === undefined || runnerUp === null) return null;
  return Math.abs(own - runnerUp);
}

/** Earliest date on which the player played `n` sessions within one calendar day */
function findNthOnSingleDayDate(
  sessions: AchievementSession[],
  playerId: string,
  n: number
): string | null {
  const byDay = new Map<string, string[]>();
  for (const s of sessions) {
    if (!s.players.includes(playerId)) continue;
    const day = localDayKey(s.played_at);
    const arr = byDay.get(day) ?? [];
    arr.push(s.played_at);
    byDay.set(day, arr);
  }
  let earliest: string | null = null;
  for (const dates of byDay.values()) {
    if (dates.length < n) continue;
    const nth = [...dates].sort((a, b) => a.localeCompare(b))[n - 1];
    if (nth && (!earliest || nth < earliest)) earliest = nth;
  }
  return earliest;
}

/** Earliest period (week/month) in which the player had strictly the most wins */
function findPeriodChampionDate(
  sessions: AchievementSession[],
  playerId: string,
  periodKey: (isoDate: string) => string,
  minWins: number
): string | null {
  const winsByPeriod = new Map<string, Map<string, number>>();
  for (const s of sessions) {
    if (!s.winner_id) continue;
    const period = periodKey(s.played_at);
    if (!winsByPeriod.has(period)) winsByPeriod.set(period, new Map());
    const periodMap = winsByPeriod.get(period)!;
    periodMap.set(s.winner_id, (periodMap.get(s.winner_id) ?? 0) + 1);
  }
  let earliest: string | null = null;
  for (const [period, periodMap] of winsByPeriod.entries()) {
    const playerWins = periodMap.get(playerId) ?? 0;
    if (playerWins < minWins) continue;
    const isMax = [...periodMap.entries()].every(
      ([pid, wins]) => pid === playerId || wins < playerWins
    );
    if (!isMax) continue;
    // Laatste winst van de speler in die periode
    const lastDate = sessions
      .filter((s) => s.winner_id === playerId && periodKey(s.played_at) === period)
      .reduce((max, s) => (s.played_at > max ? s.played_at : max), "");
    if (lastDate && (!earliest || lastDate < earliest)) earliest = lastDate;
  }
  return earliest;
}

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
  for (const s of sorted) {
    if (s.winner_id === playerId) {
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

const NL_PARTS_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Amsterdam",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const partsCache = new Map<
  string,
  { year: number; month: number; day: number; hour: number; weekday: number }
>();

/** Date parts in Europe/Amsterdam — spelavonden lopen door na middernacht UTC */
function localParts(isoDate: string) {
  const cached = partsCache.get(isoDate);
  if (cached) return cached;
  const parts = NL_PARTS_FORMATTER.formatToParts(new Date(isoDate));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);
  const year = get("year");
  const month = get("month");
  const day = get("day");
  // hour kan "24" zijn in hour12:false-notatie rond middernacht
  const hour = get("hour") % 24;
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const result = { year, month, day, hour, weekday };
  partsCache.set(isoDate, result);
  return result;
}

/** "2025-03-26" in Europe/Amsterdam */
function localDayKey(isoDate: string): string {
  const { year, month, day } = localParts(isoDate);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Doorlopende weekteller (maandag als eerste dag) voor opeenvolgende weken */
function weekIndex(isoDate: string): number {
  const { year, month, day } = localParts(isoDate);
  const utc = Date.UTC(year, month - 1, day);
  const dayNum = new Date(utc).getUTCDay() || 7; // maandag = 1
  const monday = utc - (dayNum - 1) * 86400000;
  return Math.floor(monday / 604800000);
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

/** Get month key like "2025-03" */
function getMonthKey(isoDate: string): string {
  const { year, month } = localParts(isoDate);
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Calculate all achievements for a player */
export function calculateAchievements(
  sessions: AchievementSession[],
  playerId: string,
  ctx: AchievementContext = {}
): Achievement[] {
  return ACHIEVEMENT_DEFS.map((def) => ({
    id: def.id,
    emoji: def.emoji,
    name: def.name,
    description: def.description,
    category: def.category,
    tier: def.tier,
    earnedAt: def.check(sessions, playerId, ctx),
  }));
}

/** Total number of badges that can be earned */
export const TOTAL_ACHIEVEMENTS = ACHIEVEMENT_DEFS.length;

/** Result for all players */
export type PlayerAchievements = {
  player: Player;
  achievements: Achievement[];
  earnedCount: number;
};
