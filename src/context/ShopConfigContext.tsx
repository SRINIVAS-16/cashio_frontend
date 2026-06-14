import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { defaultShopConfig, type ShopConfig } from "../config/shopConfig";
import { tenantApi } from "../api/client";
import type { LangCode } from "../i18n";
import type { ShopDetails, TenantSettings } from "../types";

interface ShopConfigCtx {
  shop: ShopConfig;
  localLanguage: LangCode;
  updateShop: (updates: Partial<ShopConfig>) => Promise<void>;
  updateLocalLanguage: (lang: LangCode) => Promise<void>;
  loading: boolean;
  reload: () => Promise<void>;
}

function mapShopDetailsToShopConfig(shopDetails?: ShopDetails | null): ShopConfig {
  return {
    name: shopDetails?.name || "",
    nameLocal: shopDetails?.nameLocal || "",
    tagline: shopDetails?.tagline || "",
    taglineLocal: shopDetails?.taglineLocal || "",
    phone: shopDetails?.phone || "",
    altPhone: shopDetails?.altPhone || "",
    gst: shopDetails?.gstNo || "",
    address: shopDetails?.address || "",
    addressLocal: shopDetails?.addressLocal || "",
    district: shopDetails?.district || "",
    districtLocal: shopDetails?.districtLocal || "",
    email: shopDetails?.email || "",
    logo: shopDetails?.logo || "/logo.svg",
  };
}

const ShopConfigContext = createContext<ShopConfigCtx>({
  shop: defaultShopConfig,
  localLanguage: "te",
  updateShop: async () => {},
  updateLocalLanguage: async () => {},
  loading: true,
  reload: async () => {},
});

export function ShopConfigProvider({ children }: { children: ReactNode }) {
  const [shop, setShop] = useState<ShopConfig>(defaultShopConfig);
  const [localLanguage, setLocalLanguage] = useState<LangCode>("te");
  const [loading, setLoading] = useState(true);
  const [tokenVersion, setTokenVersion] = useState(0);

  const loadFromApi = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setShop(defaultShopConfig);
        setLocalLanguage("te");
        setLoading(false);
        return;
      }

      const [shopDetailsRes, settingsRes] = await Promise.all([
        tenantApi.getShopDetails(),
        tenantApi.getSettings(),
      ]);

      setShop(mapShopDetailsToShopConfig(shopDetailsRes.data));
      setLocalLanguage(((settingsRes.data as TenantSettings | null)?.localLanguage || "te") as LangCode);
    } catch {
      // Not logged in or API unavailable — use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFromApi();
  }, [loadFromApi, tokenVersion]);

  // Watch for token changes (login, logout, tenant switch)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "token") {
        setTokenVersion((v) => v + 1);
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // Also poll for same-tab token changes (storage event only fires cross-tab)
    let lastToken = localStorage.getItem("token");
    const interval = setInterval(() => {
      const currentToken = localStorage.getItem("token");
      if (currentToken !== lastToken) {
        lastToken = currentToken;
        setTokenVersion((v) => v + 1);
      }
    }, 500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const updateShop = async (updates: Partial<ShopConfig>) => {
    const apiData: Record<string, string> = {};
    if (updates.name !== undefined) apiData.name = updates.name;
    if (updates.nameLocal !== undefined) apiData.nameLocal = updates.nameLocal;
    if (updates.tagline !== undefined) apiData.tagline = updates.tagline;
    if (updates.taglineLocal !== undefined) apiData.taglineLocal = updates.taglineLocal;
    if (updates.phone !== undefined) apiData.phone = updates.phone;
    if (updates.altPhone !== undefined) apiData.altPhone = updates.altPhone;
    if (updates.email !== undefined) apiData.email = updates.email;
    if (updates.gst !== undefined) apiData.gstNo = updates.gst;
    if (updates.address !== undefined) apiData.address = updates.address;
    if (updates.addressLocal !== undefined) apiData.addressLocal = updates.addressLocal;
    if (updates.district !== undefined) apiData.district = updates.district;
    if (updates.districtLocal !== undefined) apiData.districtLocal = updates.districtLocal;
    if (updates.logo !== undefined) apiData.logo = updates.logo;

    const res = await tenantApi.updateShopDetails(apiData);
    setShop(mapShopDetailsToShopConfig(res.data));
  };

  const updateLocalLanguage = async (lang: LangCode) => {
    const res = await tenantApi.updateSettings({ localLanguage: lang });
    setLocalLanguage((res.data.localLanguage || "te") as LangCode);
  };

  return (
    <ShopConfigContext.Provider value={{ shop, localLanguage, updateShop, updateLocalLanguage, loading, reload: loadFromApi }}>
      {children}
    </ShopConfigContext.Provider>
  );
}

export const useShopConfig = () => useContext(ShopConfigContext);
