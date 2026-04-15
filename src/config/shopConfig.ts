// ─── Shop Configuration Defaults ─────────────────────────────────
export interface ShopConfig {
  name: string;
  nameTe: string;
  tagline: string;
  taglineTe: string;
  phone: string;
  altPhone: string;
  gst: string;
  address: string;
  addressTe: string;
  district: string;
  districtTe: string;
  email: string;
  logo: string;
}

export const defaultShopConfig: ShopConfig = {
  name: "Amrutha Lakshmi Fertilisers & Pesticides",
  nameTe: "అమృత లక్ష్మి ఎరువులు & పురుగు మందులు",
  tagline: "Quality Seeds, Fertilizers & Pesticides",
  taglineTe: "నాణ్యమైన గింజలు, ఎరువులు & పురుగు మందులు",
  phone: "+91 98765 43210",
  altPhone: "+91 87654 32109",
  gst: "36AABCU9603R1ZM",
  address: "Door No 2, 25, Dorlamma Street, Anaparthy, Duppalapudi, Andhra Pradesh 533342",
  addressTe: "డోర్ నం 2, 25, దొర్లమ్మ వీధి, అనపర్తి, దుప్పలపూడి, ఆంధ్ర ప్రదేశ్ - 533342",
  district: "Duppalapudi, Andhra Pradesh - 533342",
  districtTe: "దుప్పలపూడి, ఆంధ్ర ప్రదేశ్ - 533342",
  email: "amruthalakshmifertilisers@gmail.com",
  logo: "/logo.svg",
};

// Backward-compatible alias — static consumers can still use this
export const shopConfig = defaultShopConfig;
