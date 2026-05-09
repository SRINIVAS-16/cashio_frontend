import { describe, it, expect, vi, beforeEach } from "vitest";
import en from "../../i18n/en";
import te from "../../i18n/te";

async function loadI18n() {
  return import("../../i18n");
}

describe("i18n registry", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("exposes language metadata for all supported languages", async () => {
    const { languages } = await loadI18n();

    expect(languages).toHaveLength(11);
    expect(languages.map((language) => language.code)).toEqual([
      "en",
      "te",
      "hi",
      "ta",
      "kn",
      "ml",
      "mr",
      "bn",
      "gu",
      "pa",
      "or",
    ]);

    for (const language of languages) {
      expect(language.name).toEqual(expect.any(String));
      expect(language.nameEn).toEqual(expect.any(String));
      expect(language.script).toEqual(expect.any(String));
    }
  });

  it("returns bundled English and Telugu translations synchronously", async () => {
    const { getTranslationSync, loadTranslation } = await loadI18n();

    expect(getTranslationSync("en")).toStrictEqual(en);
    expect(getTranslationSync("te")).toStrictEqual(te);
    await expect(loadTranslation("en")).resolves.toStrictEqual(en);
    await expect(loadTranslation("te")).resolves.toStrictEqual(te);
  });

  it("falls back to English until a lazy language is loaded", async () => {
    const { getTranslationSync } = await loadI18n();

    expect(getTranslationSync("hi")).toStrictEqual(en);
  });

  it("lazy-loads uncached translations and reuses the cached object", async () => {
    const { getTranslationSync, loadTranslation } = await loadI18n();
    const hiModule = (await import("../../i18n/hi")).default;

    const firstLoad = await loadTranslation("hi");
    const secondLoad = await loadTranslation("hi");

    expect(firstLoad).toEqual(hiModule);
    expect(firstLoad).toBe(secondLoad);
    expect(getTranslationSync("hi")).toBe(firstLoad);
    expect(firstLoad.dashboard).not.toBe(en.dashboard);
  });
});
