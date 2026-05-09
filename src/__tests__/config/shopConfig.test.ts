import { describe, it, expect } from "vitest";
import { defaultShopConfig, shopConfig } from "../../config/shopConfig";

describe("shopConfig", () => {
  const requiredFields = [
    "name",
    "nameTe",
    "tagline",
    "taglineTe",
    "phone",
    "altPhone",
    "gst",
    "address",
    "addressTe",
    "district",
    "districtTe",
    "email",
    "logo",
  ] as const;

  it("exports all required string fields", () => {
    expect(Object.keys(defaultShopConfig).sort()).toEqual([...requiredFields].sort());

    for (const field of requiredFields) {
      expect(defaultShopConfig[field]).toEqual(expect.any(String));
      expect(defaultShopConfig[field]).not.toHaveLength(0);
    }
  });

  it("exports shopConfig as a backward-compatible alias", () => {
    expect(shopConfig).toBe(defaultShopConfig);
  });
});
