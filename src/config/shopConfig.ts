// ─── Shop Configuration Defaults ─────────────────────────────────
export interface ShopConfig {
  name: string;
  nameLocal: string;
  tagline: string;
  taglineLocal: string;
  phone: string;
  altPhone: string;
  gst: string;
  address: string;
  addressLocal: string;
  district: string;
  districtLocal: string;
  email: string;
  logo: string;
}

export const defaultShopConfig: ShopConfig = {
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
};

// Backward-compatible alias — static consumers can still use this
export const shopConfig = defaultShopConfig;
