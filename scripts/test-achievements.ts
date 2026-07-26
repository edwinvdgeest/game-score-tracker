/**
 * Sanity-checks voor de badge-logica in lib/achievements.ts.
 * Werkt op verzonnen sessies — geen database nodig.
 *
 *   npx tsx scripts/test-achievements.ts
 */
import {
  calculateAchievements,
  TOTAL_ACHIEVEMENTS,
  type AchievementSession,
} from "../lib/achievements";

const E = "edwin";
const L = "lisanne";

let seq = 0;
function session(over: Partial<AchievementSession> = {}): AchievementSession {
  seq++;
  return {
    id: `s${seq}`,
    played_at: new Date(Date.UTC(2025, 0, 1, 12, 0, 0) + seq * 86400000).toISOString(),
    game_id: "g1",
    winner_id: E,
    starter_id: null,
    marathon_id: null,
    duration_minutes: null,
    game_category: "bordspel",
    game_difficulty: 2,
    lowest_score_wins: false,
    players: [E, L],
    scores: { [E]: 10, [L]: 5 },
    ...over,
  };
}

function earned(sessions: AchievementSession[], playerId: string, guests: string[] = []) {
  return calculateAchievements(sessions, playerId, { guestPlayerIds: guests })
    .filter((a) => a.earnedAt !== null)
    .map((a) => a.id);
}

let failures = 0;
function check(label: string, actual: boolean, expected = true) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌"} ${label}`);
}

console.log(`Totaal aantal badges: ${TOTAL_ACHIEVEMENTS}`);

// --- streaks & wins ---------------------------------------------------------
{
  const sessions = Array.from({ length: 12 }, () => session());
  const ids = earned(sessions, E);
  check("eerste_winst na 1 win", ids.includes("eerste_winst"));
  check("tien_wins na 12 wins", ids.includes("tien_wins"));
  check("kwart_eeuw nog niet", ids.includes("kwart_eeuw"), false);
  check("legende bij 10 op rij", ids.includes("legende"));
  check("huisbaas bij 5x zelfde spel op rij", ids.includes("huisbaas"));
  check("stamgast nog niet", ids.includes("stamgast"), false);
  check("verliezer krijgt geen wins-badge", earned(sessions, L).includes("eerste_winst"), false);
}

// --- comeback --------------------------------------------------------------
{
  seq = 100;
  const sessions = [
    session({ winner_id: L }),
    session({ winner_id: L }),
    session({ winner_id: L }),
    session({ winner_id: E }),
  ];
  check("comeback_kid na 3x verlies", earned(sessions, E).includes("comeback_kid"));
}

// --- categorieën & moeilijkheid --------------------------------------------
{
  seq = 200;
  const cats = ["bordspel", "kaartspel", "dobbelspel", "woordspel"];
  const sessions = cats.map((c, i) => session({ game_id: `g${i}`, game_category: c }));
  check("alleskunner bij 4 categorieën", earned(sessions, E).includes("alleskunner"));

  seq = 250;
  const hard = Array.from({ length: 10 }, (_, i) =>
    session({ game_id: `h${i}`, game_difficulty: 5 })
  );
  check("denksporter bij 10 zware wins", earned(sessions.concat(hard), E).includes("denksporter"));
}

// --- lowest score wins -----------------------------------------------------
{
  seq = 300;
  const sessions = [
    session({ lowest_score_wins: true, scores: { [E]: 3, [L]: 20 } }),
  ];
  const ids = earned(sessions, E);
  check("omdenker bij laagste-score-spel", ids.includes("omdenker"));
  check("dominant niet bij laagste-score-spel", ids.includes("dominant"), false);
}

// --- tijd ------------------------------------------------------------------
{
  seq = 400;
  // 22:30 UTC in juli = 00:30 NL (volgende dag) → geen nachtbraker maar wel dag+1
  const sessions = [
    session({ played_at: "2025-07-01T21:30:00.000Z" }), // 23:30 NL
    session({ played_at: "2025-07-02T06:00:00.000Z" }), // 08:00 NL
    session({ played_at: "2025-12-25T18:00:00.000Z" }),
    session({ played_at: "2025-12-31T20:00:00.000Z" }),
  ];
  const ids = earned(sessions, E);
  check("nachtbraker bij 23:30 NL", ids.includes("nachtbraker"));
  check("vroege_vogel bij 08:00 NL", ids.includes("vroege_vogel"));
  check("kerstkampioen op 25 dec", ids.includes("kerstkampioen"));
  check("oud_en_nieuw op 31 dec", ids.includes("oud_en_nieuw"));
}

// --- 4 weken op rij --------------------------------------------------------
{
  seq = 500;
  const weeks = [0, 1, 2, 3].map((w) =>
    session({ played_at: new Date(Date.UTC(2025, 2, 3 + w * 7, 19)).toISOString() })
  );
  check("trouwe_speler bij 4 weken op rij", earned(weeks, E).includes("trouwe_speler"));

  seq = 550;
  const gap = [0, 1, 3, 4].map((w) =>
    session({ played_at: new Date(Date.UTC(2025, 2, 3 + w * 7, 19)).toISOString() })
  );
  check("trouwe_speler niet met gat", earned(gap, E).includes("trouwe_speler"), false);
}

// --- marathon --------------------------------------------------------------
{
  seq = 600;
  const day = "2025-05-10";
  const marathon = Array.from({ length: 5 }, (_, i) =>
    session({
      played_at: `${day}T${String(12 + i).padStart(2, "0")}:00:00.000Z`,
      marathon_id: "m1",
      duration_minutes: 45,
      winner_id: i < 3 ? E : L,
    })
  );
  const ids = earned(marathon, E);
  check("marathonspeler bij 5 potjes op één dag", ids.includes("marathonspeler"));
  check("ijzeren_man nog niet", ids.includes("ijzeren_man"), false);
  check("marathonwinnaar met 3 van 5 wins", ids.includes("marathonwinnaar"));
  check("uithoudingsvermogen bij 225 min", ids.includes("uithoudingsvermogen"));
  check("marathon niet gewonnen door L", earned(marathon, L).includes("marathonwinnaar"), false);
}

// --- speciale scores -------------------------------------------------------
{
  seq = 700;
  const sessions = [
    session({ scores: { [E]: 21, [L]: 20 } }), // fotofinish
    session({ scores: { [E]: 60, [L]: 25 } }), // afgedroogd
  ];
  const ids = earned(sessions, E);
  check("nipte_winst bij 1 punt verschil", ids.includes("nipte_winst"));
  check("dominant bij dubbele score", ids.includes("dominant"));
  check("recordbreker pas met genoeg historie", ids.includes("recordbreker"), false);

  seq = 750;
  const many = [
    session({ scores: { [E]: 100, [L]: 20 } }),
    session({ scores: { [E]: 30, [L]: 20 } }),
    session({ scores: { [E]: 30, [L]: 20 } }),
    session({ scores: { [E]: 30, [L]: 20 } }),
  ];
  check("recordbreker met hoogste score ooit", earned(many, E).includes("recordbreker"));
  check("recordbreker niet voor L", earned(many, L).includes("recordbreker"), false);
}

// --- sociaal ---------------------------------------------------------------
{
  seq = 800;
  const guests = ["gu1", "gu2", "gu3", "gu4", "gu5"];
  const sessions = guests.map((g) => session({ players: [E, L, g] }));
  check("gastheer bij 5 gasten", earned(sessions, E, guests).includes("gastheer"));
  check("gastheer niet zonder gastenlijst", earned(sessions, E).includes("gastheer"), false);

  seq = 850;
  const ties = Array.from({ length: 5 }, () => session({ winner_id: null }));
  check("diplomaat bij 5 gelijkspellen", earned(ties, E).includes("diplomaat"));

  seq = 900;
  const starterWins = Array.from({ length: 10 }, () => session({ starter_id: E }));
  check("openingszet bij 10 wins als starter", earned(starterWins, E).includes("openingszet"));

  seq = 950;
  const underdog = Array.from({ length: 25 }, () => session({ starter_id: L }));
  check("underdog bij 25 wins als niet-starter", earned(underdog, E).includes("underdog"));
  check("rivaal nog niet bij 25 potjes", earned(underdog, E).includes("rivaal"), false);
}

// --- maand/week kampioen ---------------------------------------------------
{
  seq = 1000;
  const monthWins = Array.from({ length: 6 }, (_, i) =>
    session({ played_at: new Date(Date.UTC(2025, 3, 2 + i, 19)).toISOString() })
  );
  const withLoss = monthWins.concat([
    session({ played_at: new Date(Date.UTC(2025, 3, 20, 19)).toISOString(), winner_id: L }),
  ]);
  check("maandkampioen bij 6 wins in een maand", earned(withLoss, E).includes("maandkampioen"));
  check("maandkampioen niet voor L", earned(withLoss, L).includes("maandkampioen"), false);
  check("weekkampioen behaald", earned(withLoss, E).includes("weekkampioen"));
}

console.log(failures === 0 ? "\nAlle checks geslaagd 🎉" : `\n${failures} checks gefaald`);
process.exit(failures === 0 ? 0 : 1);
