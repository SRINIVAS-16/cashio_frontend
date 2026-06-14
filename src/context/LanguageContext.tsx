// ─── Language Context (i18n) ─────────────────────────────────────
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import en from "../i18n/en";
import { LangCode, languages as allLanguages, loadTranslation, getTranslationSync, LangMeta } from "../i18n";
import { useShopConfig } from "./ShopConfigContext";

type Translations = typeof en;

interface LanguageContextType {
  lang: LangCode;
  t: Translations;
  setLang: (lang: LangCode) => void;
  languages: LangMeta[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { localLanguage } = useShopConfig();

  // Only English + the tenant's local language are available
  const availableLanguages = allLanguages.filter(
    (l) => l.code === "en" || l.code === localLanguage
  );

  const [lang, setLangRaw] = useState<LangCode>(
    () => (localStorage.getItem("lang") as LangCode) || "en"
  );
  const [t, setT] = useState<Translations>(() => getTranslationSync(lang));

  // If current lang is not in available languages, reset to English
  useEffect(() => {
    if (lang !== "en" && lang !== localLanguage) {
      setLangRaw("en");
      localStorage.setItem("lang", "en");
      loadTranslation("en").then(setT);
    }
  }, [localLanguage]);

  const setLang = useCallback(async (newLang: LangCode) => {
    localStorage.setItem("lang", newLang);
    setLangRaw(newLang);
    const translation = await loadTranslation(newLang);
    setT(translation);
  }, []);

  // Load initial language on mount
  useEffect(() => {
    loadTranslation(lang).then(setT);
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, t, setLang, languages: availableLanguages }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLang must be used within LanguageProvider");
  return context;
}
