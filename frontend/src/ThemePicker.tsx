import { Monitor, Moon, Sun } from "lucide-react";
import { useState } from "react";

type Theme = "system" | "light" | "dark";
const STORAGE_KEY = "voice-draft-theme";

function savedTheme(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark") return value;
  } catch {
    // System appearance remains available when browser storage is blocked.
  }
  return "system";
}

export function initializeTheme() {
  document.documentElement.dataset.theme = savedTheme();
}

export function ThemePicker() {
  const [theme, setTheme] = useState<Theme>(savedTheme);

  function selectTheme(value: Theme) {
    setTheme(value);
    document.documentElement.dataset.theme = value;
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // The selection still applies for this visit without browser storage.
    }
  }

  return (
    <fieldset className="theme-picker">
      <legend className="card-label">Appearance</legend>
      <div className="theme-options">
        {([
          { value: "system", label: "System", Icon: Monitor },
          { value: "light", label: "Light", Icon: Sun },
          { value: "dark", label: "Dark", Icon: Moon },
        ] as const).map(({ value, label, Icon }) => (
          <button key={value} type="button" aria-pressed={theme === value} onClick={() => selectTheme(value)}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
