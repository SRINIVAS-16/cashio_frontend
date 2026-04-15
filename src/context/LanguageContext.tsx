// ─── Language Context (i18n) ─────────────────────────────────────
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import en from "../i18n/en";
import { LangCode, languages, loadTranslation, getTranslationSync } from "../i18n";

type Translations = typeof en;

interface LanguageContextType {
  lang: LangCode;
  t: Translations;
  setLang: (lang: LangCode) => void;
  languages: typeof languages;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangRaw] = useState<LangCode>(
    () => (localStorage.getItem("lang") as LangCode) || "en"
  );
  const [t, setT] = useState<Translations>(() => getTranslationSync(lang));

  const setLang = useCallback(async (newLang: LangCode) => {
    localStorage.setItem("lang", newLang);
    setLangRaw(newLang);
    const translation = await loadTranslation(newLang);
    setT(translation);
  }, []);

  // Load initial language on mount (handles non-en/te cached langs)
  useEffect(() => {
    loadTranslation(lang).then(setT);
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, t, setLang, languages }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLang must be used within LanguageProvider");
  return context;
}
