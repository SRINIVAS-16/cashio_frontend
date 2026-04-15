import { createContext, useContext, useState, type ReactNode } from "react";
import { defaultShopConfig, type ShopConfig } from "../config/shopConfig";

interface ShopConfigCtx {
  shop: ShopConfig;
  updateShop: (updates: Partial<ShopConfig>) => void;
}

const STORAGE_KEY = "cashio-shop-config";

function loadShop(): ShopConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...defaultShopConfig, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return { ...defaultShopConfig };
}

const ShopConfigContext = createContext<ShopConfigCtx>({
  shop: defaultShopConfig,
  updateShop: () => {},
});

export function ShopConfigProvider({ children }: { children: ReactNode }) {
  const [shop, setShop] = useState<ShopConfig>(loadShop);

  const updateShop = (updates: Partial<ShopConfig>) => {
    setShop((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <ShopConfigContext.Provider value={{ shop, updateShop }}>
      {children}
    </ShopConfigContext.Provider>
  );
}

export const useShopConfig = () => useContext(ShopConfigContext);
