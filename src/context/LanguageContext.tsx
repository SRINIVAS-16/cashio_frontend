// ─── Language Context (i18n) ─────────────────────────────────────
import React, { createContext, useContext, useState, ReactNode } from "react";
import en from "../i18n/en";
import te from "../i18n/te";

type Lang = "en" | "te";
type Translations = typeof en;

interface LanguageContextType {
  lang: Lang;
  t: Translations;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
}

const translations: Record<Lang, Translations> = { en, te };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(
    () => (localStorage.getItem("lang") as Lang) || "en"
  );

  const setLang = (newLang: Lang) => {
    localStorage.setItem("lang", newLang);
    setLangState(newLang);
  };

  const toggleLang = () => {
    setLang(lang === "en" ? "te" : "en");
  };

  return (
    <LanguageContext.Provider value={{ lang, t: translations[lang], setLang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLang must be used within LanguageProvider");
  return context;
}
