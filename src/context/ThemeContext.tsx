import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeKey = "blue" | "emerald" | "purple" | "orange" | "rose";

export interface ThemeMeta {
  key: ThemeKey;
  label: string;
  swatch: string; // hex for the 600 shade
}

export const themes: ThemeMeta[] = [
  { key: "blue", label: "Soft Blue", swatch: "#4272d6" },
  { key: "emerald", label: "Teal", swatch: "#2d8898" },
  { key: "purple", label: "Indigo", swatch: "#5c62a8" },
  { key: "orange", label: "Green", swatch: "#3f8a5f" },
  { key: "rose", label: "Coral", swatch: "#b86a58" },
];

interface ThemeCtx {
  theme: ThemeKey;
  setTheme: (t: ThemeKey) => void;
}

const ThemeContext = createContext<ThemeCtx>({ theme: "blue", setTheme: () => {} });

const STORAGE_KEY = "cashio-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeKey>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return themes.some((t) => t.key === saved) ? (saved as ThemeKey) : "blue";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
