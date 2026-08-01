import type { Game } from "@/lib/schemas";
import { usesRounds } from "@/lib/rounds";

/**
 * De stappen van de quick-log-wizard.
 *
 * "done" hoort er bewust niet bij: dat is het eindscherm en geen stap waar je naartoe
 * navigeert of die een bolletje in de voortgangsbalk krijgt.
 */
export type Step = "game" | "starter" | "scores" | "rounds" | "done";

/** Alle stappen behalve het eindscherm — de dingen die je daadwerkelijk invult. */
export type FormStep = Exclude<Step, "done">;

/**
 * Welke stappen dit potje heeft, in volgorde.
 *
 * Niet elk spel heeft ze allemaal: bij een spel waar het niet uitmaakt wie begint
 * (`starter_matters = false`, bijv. Take 5) valt de beginner-stap weg en houd je er twee
 * over. De voortgangsbalk telt daarom de stappen uit deze lijst en niet tot drie.
 *
 * Zolang er nog geen spel gekozen is tonen we de volledige lijst: dat is de eerlijkste
 * gok over wat er komt, en zodra er getikt wordt klopt het alsnog.
 */
export function stepsFor(game: Game | null): FormStep[] {
  if (!game) return ["game", "starter", "scores"];

  const steps: FormStep[] = ["game"];
  // ?? true: een spel uit een cache van vóór migratie 013 heeft de kolom nog niet, en
  // dan is het oude gedrag (mét beginner-stap) het juiste antwoord.
  if (game.starter_matters ?? true) steps.push("starter");
  // Rondespellen krijgen het rondescherm in plaats van de losse score-invoer: het is
  // dezelfde plek in de wizard, alleen een andere manier om er een totaal in te krijgen.
  steps.push(usesRounds(game) ? "rounds" : "scores");
  return steps;
}

/** De volgende stap, of null als dit de laatste is. */
export function nextStep(steps: FormStep[], current: Step): FormStep | null {
  const index = steps.indexOf(current as FormStep);
  if (index === -1) return null;
  return steps[index + 1] ?? null;
}

/** De vorige stap, of null als dit de eerste is. */
export function prevStep(steps: FormStep[], current: Step): FormStep | null {
  const index = steps.indexOf(current as FormStep);
  if (index <= 0) return null;
  return steps[index - 1] ?? null;
}

/**
 * De stap waar je op landt zodra een spel gekozen is.
 *
 * Eén plek voor de drie ingangen die dat doen: tikken in het spelraster, "Nog eens?" vanaf
 * de homepage, en een spel dat via `?game=` in de URL binnenkomt.
 */
export function stepAfterGame(game: Game): FormStep {
  return nextStep(stepsFor(game), "game") ?? "scores";
}
