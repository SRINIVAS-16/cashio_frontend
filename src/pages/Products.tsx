//  Products (Inventory) Page 
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plus, Search, Edit2, Trash2,
  X, Filter, History, ChevronDown, ChevronRight, AlertTriangle, Package
} from "lucide-react";
import { productApi, stockBookApi } from "../api/client";
import { useLang } from "../context/LanguageContext";
import { Product, ProductStockDetail, StockBatch } from "../types";
import toast from "react-hot-toast";

const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";

export default function Products() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [historyData, setHistoryData] = useState<ProductStockDetail | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedBatch, setExpandedBatch] = useState<number | null>(null);


  useEffect(() => { loadProducts(); loadCategories(); }, []);

  const loadProducts = async () => {
    try {
      const res = await productApi.getAll(search || undefined, category !== "all" ? category : undefined);
      setProducts(res.data);
    } catch (err) {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await productApi.getCategories();
      setCategories(res.data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const timer = setTimeout(() => loadProducts(), 300);
    return () => clearTimeout(timer);
  }, [search, category]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this product?")) return;
    try {
      await productApi.delete(id);
      toast.success("Product deleted!");
      loadProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Delete failed");
    }
  };

  const openHistory = async (productId: number) => {
    try {
      setHistoryLoading(true);
      setHistoryOpen(true);
      setExpandedBatch(null);
      const res = await stockBookApi.getProductDetail(productId);
      setHistoryData(res.data);
    } catch {
      toast.error("Failed to load purchase history");
      setHistoryOpen(false);
    } finally {
      setHistoryLoading(false);
    }
  };



  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-xl font-bold text-gray-800">{t.products} / {t.inventory}</h1>
        <button onClick={() => navigate("/products/new")} className="flex items-center gap-1.5 px-3.5 py-2 bg-primary-600 text-white rounded-md text-xs font-medium hover:bg-primary-700 transition shadow-sm">
          <Plus className="w-3.5 h-3.5" /> {t.addProduct}
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={`${t.search}...`}
            className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="pl-8 pr-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 appearance-none bg-white outline-none text-sm">
            <option value="all">{t.allCategories}</option>
            {categories.map((c) => <option key={c} value={c}>{(t as any)[c] || c}</option>)}
          </select>
        </div>
      </div>

      {/*  Products Table  */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-gray-100">
              <tr>
                <th className="px-3 py-2.5 text-xs font-medium text-gray-500">{t.productName}</th>
                <th className="px-3 py-2.5 text-xs font-medium text-gray-500">{t.category}</th>
                <th className="px-3 py-2.5 text-xs font-medium text-gray-500">{t.price} (₹)</th>
                <th className="px-3 py-2.5 text-xs font-medium text-gray-500">{t.unit}</th>
                <th className="px-3 py-2.5 text-xs font-medium text-gray-500">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      {p.photo ? (
                        <img src={p.photo} alt={p.name} className="w-8 h-8 rounded-md object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold flex-shrink-0">{p.name.charAt(0)}</div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 text-sm truncate">{p.name}</p>
                        {p.nameTe && <p className="text-[10px] text-gray-400 truncate">{p.nameTe}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="px-1.5 py-0.5 text-[10px] rounded font-medium bg-slate-100 text-gray-600 capitalize">{(t as any)[p.category] || p.category}</span>
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-gray-800 text-sm">₹{Number(p.price).toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2.5 text-gray-600 text-sm capitalize">{(t as any)[p.unit] || p.unit}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => openHistory(p.id)} className="p-1.5 rounded hover:bg-primary-50 text-primary-600" title={t.purchaseHistory || "Purchase History"}>
                        <History className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => navigate(`/products/${p.id}/edit`)} className="p-1.5 rounded hover:bg-primary-50 text-primary-600" title={t.editProduct}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded hover:bg-red-50 text-red-600" title={t.deleteProduct || "Delete"}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && <p className="text-center py-6 text-gray-400 text-xs">{t.noData}</p>}
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-50">
          {products.map((p) => (
            <div key={p.id} className="p-3">
              <div className="flex items-center gap-2.5">
                {p.photo ? (
                  <img src={p.photo} alt={p.name} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center text-slate-400 text-sm font-bold flex-shrink-0">{p.name.charAt(0)}</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-gray-800 text-sm truncate">{p.name}</p>
                    <span className="text-primary-700 font-bold text-sm flex-shrink-0">₹{Number(p.price).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-gray-500 capitalize">{(t as any)[p.category] || p.category}</span>
                      <span className="text-xs text-gray-600">{(t as any)[p.unit] || p.unit}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => openHistory(p.id)} className="p-1.5 rounded hover:bg-primary-50 text-primary-600"><History className="w-3.5 h-3.5" /></button>
                      <button onClick={() => navigate(`/products/${p.id}/edit`)} className="p-1.5 rounded hover:bg-primary-50 text-primary-600"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded hover:bg-red-50 text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {products.length === 0 && <p className="text-center py-6 text-gray-400 text-xs">{t.noData}</p>}
        </div>
      </div>

      {/* ─── Purchase History Modal ───────────────────────── */}
      {historyOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setHistoryOpen(false)}>
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                  <Package className="w-4 h-4 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-800">{t.purchaseHistory || "Purchase History"}</h2>
                  {historyData && <p className="text-xs text-gray-500">{historyData.product.name}</p>}
                </div>
              </div>
              <button onClick={() => setHistoryOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {historyLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                </div>
              ) : historyData ? (
                <>
                  {/* Summary Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-[11px] text-gray-400 font-medium">{t.totalPurchased || "Total Purchased"}</p>
                      <p className="text-base font-bold text-gray-800">{historyData.totalPurchased} <span className="text-xs font-normal text-gray-400">{historyData.product.unit}</span></p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-[11px] text-gray-400 font-medium">{t.totalSold || "Total Sold"}</p>
                      <p className="text-base font-bold text-amber-700">{historyData.totalSold} <span className="text-xs font-normal text-gray-400">{historyData.product.unit}</span></p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-[11px] text-gray-400 font-medium">{t.currentStock || "Current Stock"}</p>
                      <p className="text-base font-bold text-emerald-700">{historyData.currentStock} <span className="text-xs font-normal text-gray-400">{historyData.product.unit}</span></p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-[11px] text-gray-400 font-medium">{t.totalBatches || "Total Batches"}</p>
                      <p className="text-base font-bold text-gray-800">{historyData.batches.length}</p>
                    </div>
                  </div>

                  {/* Batches */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-gray-600">{t.purchaseBatches || "Purchase Batches"}</h3>
                    {historyData.batches.length === 0 && (
                      <p className="text-center py-4 text-gray-400 text-xs">{t.noData}</p>
                    )}
                    {historyData.batches.map((batch: StockBatch) => {
                      const isExpanded = expandedBatch === batch.id;
                      const isExpiringSoon = batch.expiryDate && new Date(batch.expiryDate) < new Date(Date.now() + 90 * 86400000);
                      return (
                        <div key={batch.id} className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                          <div className="p-3 cursor-pointer hover:bg-slate-50/50 transition" onClick={() => setExpandedBatch(isExpanded ? null : batch.id)}>
                            <div className="flex items-start gap-2">
                              <div className="mt-0.5 text-gray-400">
                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <p className="text-sm font-semibold text-gray-800">{batch.batchNo || "No Batch #"}</p>
                                  {batch.hsnCode && <span className="px-1.5 py-0.5 text-[10px] rounded bg-primary-50 text-primary-600 font-medium">HSN: {batch.hsnCode}</span>}
                                  {isExpiringSoon && (
                                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-red-50 text-red-500 font-medium flex items-center gap-0.5">
                                      <AlertTriangle className="w-3 h-3" /> Expiring
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
                                  <span>Invoice: <b className="text-gray-700">{batch.purchase.invoiceNo}</b></span>
                                  <span>Dealer: <b className="text-gray-700">{batch.purchase.dealer}</b></span>
                                  <span>Date: <b className="text-gray-700">{fmtDate(batch.purchase.purchaseDate)}</b></span>
                                  <span>MFG: <b className="text-gray-700">{fmtDate(batch.mfgDate)}</b></span>
                                  <span>EXP: <b className={isExpiringSoon ? "text-red-600" : "text-gray-700"}>{fmtDate(batch.expiryDate)}</b></span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="flex gap-3 text-xs">
                                  <div><p className="text-[10px] text-gray-400">Qty</p><p className="font-semibold text-gray-700">{batch.quantity}{batch.freeQty > 0 && <span className="text-emerald-600">+{batch.freeQty}</span>}</p></div>
                                  <div><p className="text-[10px] text-gray-400">Sold</p><p className="font-semibold text-amber-600">{batch.soldQty}</p></div>
                                  <div><p className="text-[10px] text-gray-400">Left</p><p className={`font-semibold ${batch.remainingQty <= 0 ? "text-red-500" : "text-emerald-600"}`}>{batch.remainingQty}</p></div>
                                </div>
                              </div>
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="border-t border-gray-100 bg-slate-50/30 p-3">
                              <p className="text-xs font-medium text-gray-500 mb-2">{t.ordersFromBatch || "Orders from this batch"} ({batch.orders.length})</p>
                              {batch.orders.length === 0 ? (
                                <p className="text-xs text-gray-400">No orders linked to this batch yet.</p>
                              ) : (
                                <table className="w-full text-left text-xs">
                                  <thead><tr className="border-b border-gray-200">
                                    <th className="py-1.5 px-2 text-[11px] font-medium text-gray-500">{t.orderNo || "Order #"}</th>
                                    <th className="py-1.5 px-2 text-[11px] font-medium text-gray-500">{t.date}</th>
                                    <th className="py-1.5 px-2 text-[11px] font-medium text-gray-500">{t.customer}</th>
                                    <th className="py-1.5 px-2 text-[11px] font-medium text-gray-500 text-right">{t.quantity}</th>
                                  </tr></thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {batch.orders.map((o) => (
                                      <tr key={o.id} className="hover:bg-white/50">
                                        <td className="py-1.5 px-2 font-medium text-primary-600">{o.orderNo}</td>
                                        <td className="py-1.5 px-2 text-gray-600">{fmtDate(o.date)}</td>
                                        <td className="py-1.5 px-2 text-gray-600">{o.customer}</td>
                                        <td className="py-1.5 px-2 text-right font-medium text-gray-700">{o.quantity}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Unlinked Orders */}
                  {historyData.unlinkedOrders.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-gray-600">{t.unlinkedOrders || "Unlinked Orders"}</h3>
                      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-gray-100">
                            <tr>
                              <th className="py-2 px-3 text-[11px] font-medium text-gray-500">{t.orderNo || "Order #"}</th>
                              <th className="py-2 px-3 text-[11px] font-medium text-gray-500">{t.date}</th>
                              <th className="py-2 px-3 text-[11px] font-medium text-gray-500">{t.customer}</th>
                              <th className="py-2 px-3 text-[11px] font-medium text-gray-500 text-right">{t.quantity}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {historyData.unlinkedOrders.map((o) => (
                              <tr key={o.id} className="hover:bg-slate-50/50">
                                <td className="py-1.5 px-3 font-medium text-primary-600">{o.orderNo}</td>
                                <td className="py-1.5 px-3 text-gray-600">{fmtDate(o.date)}</td>
                                <td className="py-1.5 px-3 text-gray-600">{o.customer}</td>
                                <td className="py-1.5 px-3 text-right font-medium text-gray-700">{o.quantity}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
