import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { defaultShopConfig, type ShopConfig } from "../config/shopConfig";
import { tenantApi } from "../api/client";
import type { LangCode } from "../i18n";

interface ShopConfigCtx {
  shop: ShopConfig;
  localLanguage: LangCode;
  updateShop: (updates: Partial<ShopConfig>) => Promise<void>;
  updateLocalLanguage: (lang: LangCode) => Promise<void>;
  loading: boolean;
  reload: () => Promise<void>;
}

function mapTenantToShopConfig(tenant: any): ShopConfig {
  return {
    name: tenant.name || "",
    nameLocal: tenant.nameLocal || "",
    tagline: tenant.tagline || "",
    taglineLocal: tenant.taglineLocal || "",
    phone: tenant.phone || "",
    altPhone: tenant.altPhone || "",
    gst: tenant.gstNo || "",
    address: tenant.address || "",
    addressLocal: tenant.addressLocal || "",
    district: tenant.district || "",
    districtLocal: tenant.districtLocal || "",
    email: tenant.email || "",
    logo: tenant.logo || "/logo.svg",
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

  const loadFromApi = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await tenantApi.getMyTenant();
      setShop(mapTenantToShopConfig(res.data));
      setLocalLanguage((res.data.localLanguage || "te") as LangCode);
    } catch {
      // Not logged in or API unavailable — use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFromApi();
  }, [loadFromApi]);

  const updateShop = async (updates: Partial<ShopConfig>) => {
    const apiData: any = {};
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

    const res = await tenantApi.updateMyTenant(apiData);
    setShop(mapTenantToShopConfig(res.data));
  };

  const updateLocalLanguage = async (lang: LangCode) => {
    const res = await tenantApi.updateMyTenant({ localLanguage: lang });
    setLocalLanguage((res.data.localLanguage || "te") as LangCode);
  };

  return (
    <ShopConfigContext.Provider value={{ shop, localLanguage, updateShop, updateLocalLanguage, loading, reload: loadFromApi }}>
      {children}
    </ShopConfigContext.Provider>
  );
}

export const useShopConfig = () => useContext(ShopConfigContext);
