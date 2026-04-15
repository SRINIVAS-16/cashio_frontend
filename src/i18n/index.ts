// ─── Language Registry ────────────────────────────────────────────
import en from "./en";
import te from "./te";

export type LangCode =
  | "en" | "te" | "hi" | "ta" | "kn" | "ml" | "mr" | "bn" | "gu" | "pa" | "or";

export interface LangMeta {
  code: LangCode;
  name: string;        // native name
  nameEn: string;      // English name
  script: string;      // sample character
}

export const languages: LangMeta[] = [
  { code: "en", name: "English",   nameEn: "English",   script: "A"  },
  { code: "te", name: "తెలుగు",    nameEn: "Telugu",    script: "తె" },
  { code: "hi", name: "हिन्दी",      nameEn: "Hindi",     script: "हि" },
  { code: "ta", name: "தமிழ்",     nameEn: "Tamil",     script: "த"  },
  { code: "kn", name: "ಕನ್ನಡ",     nameEn: "Kannada",   script: "ಕ"  },
  { code: "ml", name: "മലയാളം",   nameEn: "Malayalam", script: "മ"  },
  { code: "mr", name: "मराठी",     nameEn: "Marathi",   script: "म"  },
  { code: "bn", name: "বাংলা",     nameEn: "Bengali",   script: "ব"  },
  { code: "gu", name: "ગુજરાતી",   nameEn: "Gujarati",  script: "ગ"  },
  { code: "pa", name: "ਪੰਜਾਬੀ",    nameEn: "Punjabi",   script: "ਪ"  },
  { code: "or", name: "ଓଡ଼ିଆ",     nameEn: "Odia",      script: "ଓ"  },
];

// Lazy-load translations — only en and te are bundled, rest loaded on demand
const translationLoaders: Record<LangCode, () => Promise<{ default: typeof en }>> = {
  en: () => Promise.resolve({ default: en }),
  te: () => Promise.resolve({ default: te }),
  hi: () => import("./hi"),
  ta: () => import("./ta"),
  kn: () => import("./kn"),
  ml: () => import("./ml"),
  mr: () => import("./mr"),
  bn: () => import("./bn"),
  gu: () => import("./gu"),
  pa: () => import("./pa"),
  or: () => import("./or"),
};

// Cache loaded translations
const cache: Partial<Record<LangCode, typeof en>> = { en, te };

export async function loadTranslation(code: LangCode): Promise<typeof en> {
  if (cache[code]) return cache[code]!;
  const mod = await translationLoaders[code]();
  cache[code] = mod.default;
  return mod.default;
}

export function getTranslationSync(code: LangCode): typeof en {
  return cache[code] || en;
}
