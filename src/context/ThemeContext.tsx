import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useShopConfig } from "./ShopConfigContext";

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

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { themeColor, updateThemeColor } = useShopConfig();
  const [theme, setThemeState] = useState<ThemeKey>(() => {
    return themes.some((t) => t.key === themeColor) ? (themeColor as ThemeKey) : "blue";
  });

  // Sync with DB value when it changes (e.g., tenant switch)
  useEffect(() => {
    const validTheme = themes.some((t) => t.key === themeColor) ? (themeColor as ThemeKey) : "blue";
    setThemeState(validTheme);
  }, [themeColor]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = (t: ThemeKey) => {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    updateThemeColor(t).catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
