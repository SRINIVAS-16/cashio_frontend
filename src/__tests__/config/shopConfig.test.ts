import { describe, it, expect } from "vitest";
import { defaultShopConfig, shopConfig } from "../../config/shopConfig";

describe("shopConfig", () => {
  const requiredFields = [
    "name",
    "nameLocal",
    "tagline",
    "taglineLocal",
    "phone",
    "altPhone",
    "gst",
    "address",
    "addressLocal",
    "district",
    "districtLocal",
    "email",
    "logo",
  ] as const;

  it("exports all required string fields", () => {
    expect(Object.keys(defaultShopConfig).sort()).toEqual([...requiredFields].sort());

    for (const field of requiredFields) {
      expect(defaultShopConfig[field]).toEqual(expect.any(String));
    }

    expect(defaultShopConfig).toMatchObject({
      name: "",
      nameLocal: "",
      tagline: "",
      taglineLocal: "",
      phone: "",
      altPhone: "",
      gst: "",
      address: "",
      addressLocal: "",
      district: "",
      districtLocal: "",
      email: "",
      logo: "/logo.svg",
    });
  });

  it("exports shopConfig as a backward-compatible alias", () => {
    expect(shopConfig).toBe(defaultShopConfig);
  });
});

