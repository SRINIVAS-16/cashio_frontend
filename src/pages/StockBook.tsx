// ─── Stock Book Page ──────────────────────────────────────────────
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Search, ArrowRight, AlertTriangle, Clock } from "lucide-react";
import { stockBookApi } from "../api/client";
import { useLang } from "../context/LanguageContext";
import { StockBookProduct } from "../types";
import toast from "react-hot-toast";

export default function StockBook() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [products, setProducts] = useState<StockBookProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await stockBookApi.getAll(search || undefined, category !== "all" ? category : undefined);
        setProducts(res.data);
      } catch {
        toast.error("Failed to load stock data");
      } finally {
        setLoading(false);
      }
    };
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [search, category]);

  const categories = ["all", ...new Set(products.map((p) => p.category))];

  const totalStock = products.reduce((s, p) => s + p.stock, 0);
  const totalPurchased = products.reduce((s, p) => s + p.totalPurchased, 0);
  const totalSold = products.reduce((s, p) => s + p.totalSold, 0);
  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;
  const expiringCount = products.filter((p) => {
    if (!p.nearestExpiry) return false;
    const daysLeft = Math.ceil((new Date(p.nearestExpiry).getTime() - Date.now()) / 86400000);
    return daysLeft <= 30;
  }).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-xl font-bold text-gray-800">{t.stockBook || "Stock Book"}</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
            <Package className="w-4 h-4 text-primary-600" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-medium">{t.totalProducts || "Total Products"}</p>
            <p className="text-lg font-bold text-gray-800">{products.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-medium">{t.totalPurchased || "Total Purchased"}</p>
            <p className="text-lg font-bold text-emerald-700">{totalPurchased}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
            <Package className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-medium">{t.totalSold || "Total Sold"}</p>
            <p className="text-lg font-bold text-amber-700">{totalSold}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-medium">{t.lowStock || "Low Stock"}</p>
            <p className="text-lg font-bold text-red-600">{lowStockCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-orange-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
            <Clock className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-medium">Expiring (&lt;30d)</p>
            <p className="text-lg font-bold text-orange-600">{expiringCount}</p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 min-w-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder={`${t.search} products...`}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-gray-200 focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none text-xs bg-white transition" />
            </div>
          </div>
          <div>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full sm:w-auto px-2.5 py-1.5 rounded-lg border border-gray-200 focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none text-xs bg-white transition">
              {categories.map((c) => <option key={c} value={c}>{c === "all" ? (t.allCategories || "All Categories") : c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-gray-100">
                <tr>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500">{t.productName}</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500">{t.category}</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-center">{t.totalPurchased || "Purchased"}</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-center">{t.totalSold || "Sold"}</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-center">{t.currentStock || "Current Stock"}</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-center">Expiry</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-center">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map((p) => {
                  const isLow = p.stock <= p.minStock;
                  const qty30d = p.expiringQty30d || 0;
                  const hasExpiring = qty30d > 0;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition cursor-pointer" onClick={() => navigate(`/stock-book/${p.id}`)}>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-gray-800 text-sm">{p.name}</p>
                        {p.nameTe && <p className="text-[10px] text-gray-400">{p.nameTe}</p>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-slate-600 font-medium capitalize">{p.category}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-sm text-emerald-600 font-medium">{p.totalPurchased}</td>
                      <td className="px-3 py-2.5 text-center text-sm text-amber-600 font-medium">{p.totalSold}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                          isLow ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
                        }`}>
                          {isLow && <AlertTriangle className="w-3 h-3" />}
                          {p.stock} {p.unit}
                        </span>
                      </td>
                      <td className={`px-3 py-2.5 text-center text-sm font-medium ${hasExpiring ? "text-red-600" : "text-emerald-600"}`}>
                        {qty30d}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button className="p-1.5 rounded hover:bg-primary-50 text-primary-600" title="View Details">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {products.length === 0 && <p className="text-center py-6 text-gray-400 text-xs">{t.noData}</p>}
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-50">
            {products.map((p) => {
              const isLow = p.stock <= p.minStock;
              const expiryDays = p.nearestExpiry ? Math.ceil((new Date(p.nearestExpiry).getTime() - Date.now()) / 86400000) : null;
              const isExpired = expiryDays !== null && expiryDays < 0;
              const isExpiringSoon = expiryDays !== null && expiryDays <= 30;
              return (
                <div key={p.id} className="p-3 cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/stock-book/${p.id}`)}>
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{p.name}</p>
                      <p className="text-[10px] text-gray-400 capitalize">{p.category}</p>
                    </div>
                    <div className="flex gap-1.5 items-center">
                      {expiryDays !== null && (isExpired || isExpiringSoon) && (
                        <span className={`px-1.5 py-0.5 text-[10px] rounded font-semibold ${
                          isExpired ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600"
                        }`}>
                          {isExpired ? "Expired" : `${expiryDays}d`}
                        </span>
                      )}
                      <span className={`px-1.5 py-0.5 text-[10px] rounded font-semibold ${
                        isLow ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
                      }`}>
                        {p.stock} {p.unit}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-4 text-[11px] text-gray-500">
                    <span>Purchased: <b className="text-emerald-600">{p.totalPurchased}</b></span>
                    <span>Sold: <b className="text-amber-600">{p.totalSold}</b></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
