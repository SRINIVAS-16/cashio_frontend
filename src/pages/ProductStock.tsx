// ─── Product Stock Detail Page ───────────────────────────────────
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronRight, Package, ShoppingCart, TrendingDown, AlertTriangle } from "lucide-react";
import { stockBookApi } from "../api/client";
import { useLang } from "../context/LanguageContext";
import { ProductStockDetail, StockBatch } from "../types";
import toast from "react-hot-toast";

const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";

export default function ProductStock() {
  const { t } = useLang();
  const { productId } = useParams<{ productId: string }>();
  const [data, setData] = useState<ProductStockDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedBatch, setExpandedBatch] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await stockBookApi.getProductDetail(Number(productId));
        setData(res.data);
      } catch {
        toast.error("Failed to load product stock data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [productId]);

  const toggleBatch = (id: number) => {
    setExpandedBatch((prev) => (prev === id ? null : id));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  if (!data) {
    return <div className="text-center py-12 text-gray-400">{t.noData}</div>;
  }

  const { product, totalPurchased, totalSold, currentStock, batches, unlinkedOrders } = data;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/stock-book" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-800">{product.name}</h1>
          {product.nameTe && <p className="text-xs text-gray-400">{product.nameTe}</p>}
        </div>
        <span className="ml-auto px-2 py-0.5 text-[10px] rounded bg-slate-100 text-slate-600 font-medium capitalize">{product.category}</span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
            <Package className="w-4 h-4 text-primary-600" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-medium">{t.totalPurchased || "Total Purchased"}</p>
            <p className="text-lg font-bold text-primary-700">{totalPurchased} <span className="text-xs font-normal text-gray-400">{product.unit}</span></p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
            <ShoppingCart className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-medium">{t.totalSold || "Total Sold"}</p>
            <p className="text-lg font-bold text-amber-700">{totalSold} <span className="text-xs font-normal text-gray-400">{product.unit}</span></p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <TrendingDown className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-medium">{t.currentStock || "Current Stock"}</p>
            <p className="text-lg font-bold text-emerald-700">{currentStock} <span className="text-xs font-normal text-gray-400">{product.unit}</span></p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
            <Package className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-medium">{t.totalBatches || "Total Batches"}</p>
            <p className="text-lg font-bold text-purple-700">{batches.length}</p>
          </div>
        </div>
      </div>

      {/* Batches */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-700">{t.purchaseBatches || "Purchase Batches"}</h2>
        {batches.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-100 p-6 text-center text-gray-400 text-xs">No purchase batches found</div>
        )}
        {batches.map((batch: StockBatch) => {
          const isExpanded = expandedBatch === batch.id;
          const isExpiringSoon = batch.expiryDate && new Date(batch.expiryDate) < new Date(Date.now() + 90 * 86400000);
          return (
            <div key={batch.id} className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
              {/* Batch Header */}
              <div className="p-3 cursor-pointer hover:bg-slate-50/50 transition" onClick={() => toggleBatch(batch.id)}>
                <div className="flex items-start gap-3">
                  <div className="mt-1 text-gray-400">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-800">{batch.batchNo || "No Batch #"}</p>
                      {batch.hsnCode && <span className="px-1.5 py-0.5 text-[10px] rounded bg-primary-50 text-primary-600 font-medium">HSN: {batch.hsnCode}</span>}
                      {isExpiringSoon && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-red-50 text-red-500 font-medium flex items-center gap-0.5">
                          <AlertTriangle className="w-3 h-3" /> Expiring Soon
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
                      <div>
                        <p className="text-[10px] text-gray-400">Qty</p>
                        <p className="font-semibold text-gray-700">{batch.quantity}{batch.freeQty > 0 && <span className="text-emerald-600">+{batch.freeQty}</span>}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">Sold</p>
                        <p className="font-semibold text-amber-600">{batch.soldQty}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">Remaining</p>
                        <p className={`font-semibold ${batch.remainingQty <= 0 ? "text-red-500" : "text-emerald-600"}`}>{batch.remainingQty}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded: orders linked to this batch */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-slate-50/30">
                  <div className="p-3">
                    <p className="text-xs font-medium text-gray-500 mb-2">{t.ordersFromBatch || "Orders from this batch"} ({batch.orders.length})</p>
                    {batch.orders.length === 0 ? (
                      <p className="text-xs text-gray-400">No orders linked to this batch yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="py-1.5 px-2 text-[11px] font-medium text-gray-500">{t.orderNo || "Order #"}</th>
                              <th className="py-1.5 px-2 text-[11px] font-medium text-gray-500">{t.date}</th>
                              <th className="py-1.5 px-2 text-[11px] font-medium text-gray-500">{t.customer}</th>
                              <th className="py-1.5 px-2 text-[11px] font-medium text-gray-500 text-right">{t.quantity}</th>
                            </tr>
                          </thead>
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
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Unlinked Orders */}
      {unlinkedOrders.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">{t.unlinkedOrders || "Unlinked Orders"}</h2>
          <p className="text-[11px] text-gray-400">Orders that were created without batch tracking</p>
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
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
                {unlinkedOrders.map((o) => (
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
    </div>
  );
}
