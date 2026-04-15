// ─── Settings / Configuration Page ───────────────────────────────
import { useState } from "react";
import { Save, RotateCcw, Store, Palette, Check } from "lucide-react";
import { useLang } from "../context/LanguageContext";
import { useShopConfig } from "../context/ShopConfigContext";
import { useTheme, themes } from "../context/ThemeContext";
import { defaultShopConfig, type ShopConfig } from "../config/shopConfig";
import toast from "react-hot-toast";

export default function Settings() {
  const { t, lang, setLang, languages } = useLang();
  const { shop, updateShop } = useShopConfig();
  const { theme, setTheme } = useTheme();

  const [form, setForm] = useState<ShopConfig>({ ...shop });
  const [dirty, setDirty] = useState(false);

  const set = (key: keyof ShopConfig, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    updateShop(form);
    setDirty(false);
    toast.success(t.settingsSaved || "Settings saved!");
  };

  const handleReset = () => {
    setForm({ ...defaultShopConfig });
    setDirty(true);
  };

  const fields: { key: keyof ShopConfig; label: string; rows?: number }[] = [
    { key: "name", label: t.shopName || "Shop Name" },
    { key: "nameTe", label: t.shopNameTe || "Shop Name (Telugu)" },
    { key: "tagline", label: t.tagline || "Tagline" },
    { key: "taglineTe", label: t.taglineTe || "Tagline (Telugu)" },
    { key: "phone", label: t.phone || "Phone" },
    { key: "altPhone", label: t.altPhone || "Alternate Phone" },
    { key: "email", label: t.email || "Email" },
    { key: "gst", label: t.gstin || "GSTIN" },
    { key: "address", label: t.addressLabel || "Address", rows: 2 },
    { key: "addressTe", label: t.addressLabelTe || "Address (Telugu)", rows: 2 },
    { key: "district", label: t.district || "District" },
    { key: "districtTe", label: t.districtTe || "District (Telugu)" },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">{t.settings}</h1>
      </div>

      {/* ─── Theme Selection ──────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary-600" />
          <h2 className="text-sm font-semibold text-gray-800">{t.themeColor || "Theme Color"}</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {themes.map((th) => (
              <button
                key={th.key}
                onClick={() => setTheme(th.key)}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  theme === th.key
                    ? "border-gray-800 bg-gray-50 shadow-sm"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div
                  className="w-10 h-10 rounded-full shadow-inner"
                  style={{ backgroundColor: th.swatch }}
                />
                <span className="text-xs font-medium text-gray-700">{th.label}</span>
                {theme === th.key && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-4 h-4 text-gray-800" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Language ─────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
          <span className="text-sm">🌐</span>
          <h2 className="text-sm font-semibold text-gray-800">{t.language || "Language"}</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                  l.code === lang
                    ? "border-primary-500 bg-primary-50 text-primary-700 font-medium"
                    : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <span className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                  {l.script}
                </span>
                <span className="truncate">{l.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Shop Details ─────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-primary-600" />
            <h2 className="text-sm font-semibold text-gray-800">{t.shopDetails || "Shop Details"}</h2>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <RotateCcw className="w-3 h-3" /> {t.resetDefaults || "Reset Defaults"}
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map(({ key, label, rows }) => (
              <div key={key} className={rows ? "sm:col-span-2" : ""}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                {rows ? (
                  <textarea
                    value={form[key]}
                    onChange={(e) => set(key, e.target.value)}
                    rows={rows}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none text-sm transition resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={form[key]}
                    onChange={(e) => set(key, e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none text-sm transition"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
            <button
              onClick={handleSave}
              disabled={!dirty}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm ${
                dirty
                  ? "bg-primary-600 text-white hover:bg-primary-700"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              <Save className="w-4 h-4" /> {t.saveSettings || "Save Settings"}
            </button>
            {!dirty && (
              <span className="text-xs text-gray-400">{t.allChangesSaved || "All changes saved"}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
