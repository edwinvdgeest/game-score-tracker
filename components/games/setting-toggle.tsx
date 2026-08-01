"use client";

interface SettingToggleProps {
  id: string;
  label: string;
  /** Klein grijs regeltje onder het label, meestal een voorbeeld. */
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/**
 * Aan/uit-schakelaar voor een speelregel in het spelformulier.
 *
 * Gedeeld door add-game-form en edit-game-form: die twee liepen eerder uit elkaar omdat
 * dezelfde twintig regels opmaak er twee keer stonden.
 */
export function SettingToggle({ id, label, hint, checked, onChange }: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
        {hint && (
          <span
            className="block text-xs font-semibold mt-0.5"
            style={{ color: "var(--muted-foreground)" }}
          >
            {hint}
          </span>
        )}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer flex-shrink-0"
        style={{ backgroundColor: checked ? "var(--color-coral)" : "var(--border)" }}
      >
        <span
          className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
          style={{ transform: checked ? "translateX(1.375rem)" : "translateX(0.125rem)" }}
        />
      </button>
    </div>
  );
}
