// ─── Purchases List Page ──────────────────────────────────────────
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Eye, IndianRupee, Calendar, Filter, FileDown, Printer, Search } from "lucide-react";
import { purchaseApi, dealerApi } from "../api/client";
import { useLang } from "../context/LanguageContext";
import { PurchasesResponse, Dealer, Purchase } from "../types";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { useShopConfig } from "../context/ShopConfigContext";

type DatePreset = "all" | "today" | "7d" | "30d" | "month" | "year" | "custom";

function getDateRange(preset: DatePreset): { startDate?: string; endDate?: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  switch (preset) {
    case "today": return { startDate: fmt(today), endDate: fmt(today) };
    case "7d": { const d = new Date(today); d.setDate(d.getDate() - 6); return { startDate: fmt(d), endDate: fmt(today) }; }
    case "30d": { const d = new Date(today); d.setDate(d.getDate() - 29); return { startDate: fmt(d), endDate: fmt(today) }; }
    case "month": { const d = new Date(today.getFullYear(), today.getMonth(), 1); return { startDate: fmt(d), endDate: fmt(today) }; }
    case "year": { const d = new Date(today.getFullYear(), 0, 1); return { startDate: fmt(d), endDate: fmt(today) }; }
    default: return {};
  }
}

export default function Purchases() {
  const { t } = useLang();
  const { shop: shopConfig } = useShopConfig();
  const navigate = useNavigate();
  const [data, setData] = useState<PurchasesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [dealerFilter, setDealerFilter] = useState<number | undefined>(undefined);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const reqId = useRef(0);

  useEffect(() => { dealerApi.getAll().then((r) => setDealers(r.data)).catch(() => {}); }, []);

  // Single effect — loads purchases whenever any filter or page changes
  useEffect(() => {
    const currentReq = ++reqId.current;
    const load = async () => {
      try {
        setLoading(true);
        let startDate: string | undefined;
        let endDate: string | undefined;
        if (datePreset === "custom") {
          startDate = customStart || undefined;
          endDate = customEnd || undefined;
        } else {
          const range = getDateRange(datePreset);
          startDate = range.startDate;
          endDate = range.endDate;
        }
        const res = await purchaseApi.getAll(page, 20, dealerFilter, startDate, endDate);
        if (currentReq !== reqId.current) return; // stale response
        setData(res.data);
      } catch {
        if (currentReq === reqId.current) toast.error("Failed to load purchases");
      } finally {
        if (currentReq === reqId.current) setLoading(false);
      }
    };
    load();
  }, [page, datePreset, customStart, customEnd, dealerFilter]);

  // Reset page to 1 when filters change (called from onChange handlers)
  const changePreset = (v: DatePreset) => { setDatePreset(v); setPage(1); };
  const changeDealer = (v: number | undefined) => { setDealerFilter(v); setPage(1); };
  const changeCustomStart = (v: string) => { setCustomStart(v); setPage(1); };
  const changeCustomEnd = (v: string) => { setCustomEnd(v); setPage(1); };

  // Get current filter dates for export/print
  const getCurrentDates = () => {
    if (datePreset === "custom") return { startDate: customStart || undefined, endDate: customEnd || undefined };
    return getDateRange(datePreset);
  };

  // Fetch ALL filtered purchases (not paginated)
  const fetchAllFiltered = async (): Promise<Purchase[]> => {
    const { startDate, endDate } = getCurrentDates();
    const res = await purchaseApi.getAll(1, 10000, dealerFilter, startDate, endDate);
    return res.data.purchases;
  };

  // Export to Excel
  const handleExportExcel = async () => {
    try {
      toast.loading("Preparing Excel...", { id: "export" });
      const purchases = await fetchAllFiltered();
      const rows = purchases.map((p) => ({
        "Invoice No": p.invoiceNo,
        "Dealer": p.dealer?.name || p.dealerName || "-",
        "Purchase Date": new Date(p.purchaseDate).toLocaleDateString("en-IN"),
        "Subtotal (₹)": Number(p.subtotal || 0),
        "Discount (₹)": Number(p.discount || 0),
        "CGST (₹)": Number((p as any).cgst || 0),
        "SGST (₹)": Number((p as any).sgst || 0),
        "Total (₹)": Number(p.total),
        "Paid (₹)": Number(p.paidAmount),
        "Due (₹)": Number(p.dueAmount),
        "Status": p.paymentStatus,
        "Notes": p.notes || "",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      // Auto-size columns
      ws["!cols"] = Object.keys(rows[0] || {}).map((k) => ({ wch: Math.max(k.length, 12) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Purchases");
      XLSX.writeFile(wb, `Purchases_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success("Excel exported!", { id: "export" });
    } catch {
      toast.error("Export failed", { id: "export" });
    }
  };

  // Print
  const handlePrint = async () => {
    try {
      toast.loading("Preparing print...", { id: "print" });
      const purchases = await fetchAllFiltered();
      const { startDate, endDate } = getCurrentDates();
      const dateLabel = startDate && endDate ? `${startDate} to ${endDate}` : startDate || endDate || "All Time";
      const dealerLabel = dealerFilter ? dealers.find((d) => d.id === dealerFilter)?.name || "" : "All Dealers";

      const html = `<!DOCTYPE html><html><head><title>Purchases - ${shopConfig.name}</title><style>
        body{font-family:Arial,sans-serif;font-size:12px;margin:20px;color:#333}
        .shop-header{text-align:center;border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:14px}
        .shop-header h1{margin:0;font-size:18px;color:#1a1a1a}
        .shop-header .name-te{font-size:13px;color:#555;margin:2px 0}
        .shop-header .addr{font-size:11px;color:#666;margin:2px 0}
        .shop-header .gst{font-size:11px;font-weight:bold;color:#444;margin-top:4px}
        .shop-header .contact{font-size:10px;color:#888}
        h2{margin:12px 0 4px;font-size:16px}
        .meta{color:#666;font-size:11px;margin-bottom:12px}
        .summary{display:flex;gap:24px;margin-bottom:14px}
        .summary div{padding:6px 12px;background:#f5f5f5;border-radius:4px}
        .summary .label{font-size:10px;color:#888}
        .summary .val{font-size:14px;font-weight:bold}
        table{width:100%;border-collapse:collapse;margin-top:8px}
        th{background:#f0f0f0;text-align:left;padding:6px 8px;font-size:11px;border-bottom:2px solid #ddd}
        td{padding:5px 8px;border-bottom:1px solid #eee;font-size:11px}
        .r{text-align:right}
        .paid{color:#059669}.partial{color:#d97706}.unpaid{color:#dc2626}
        @media print{body{margin:10px}}
      </style></head><body>
      <div class="shop-header">
        <h1>${shopConfig.name}</h1>
        <div class="name-te">${shopConfig.nameTe}</div>
        <div class="addr">${shopConfig.address}</div>
        <div class="contact">Phone: ${shopConfig.phone} | Email: ${shopConfig.email}</div>
        <div class="gst">GSTIN: ${shopConfig.gst}</div>
      </div>
      <h2>Purchases Report</h2>
      <div class="meta">${dateLabel} | ${dealerLabel} | ${purchases.length} records</div>
      <div class="summary">
        <div><span class="label">Total Purchase</span><br><span class="val">₹${Number(summary.totalAmount).toLocaleString("en-IN")}</span></div>
        <div><span class="label">Total Paid</span><br><span class="val" style="color:#059669">₹${Number(summary.paidAmount).toLocaleString("en-IN")}</span></div>
        <div><span class="label">Total Due</span><br><span class="val" style="color:#dc2626">₹${Number(summary.dueAmount).toLocaleString("en-IN")}</span></div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Invoice</th><th>Dealer</th><th>Date</th><th class="r">Total (₹)</th><th class="r">Paid (₹)</th><th class="r">Due (₹)</th><th>Status</th></tr></thead>
        <tbody>${purchases.map((p, i) => `<tr>
          <td>${i + 1}</td>
          <td>${p.invoiceNo}</td>
          <td>${p.dealer?.name || p.dealerName || "-"}</td>
          <td>${new Date(p.purchaseDate).toLocaleDateString("en-IN")}</td>
          <td class="r">${Number(p.total).toLocaleString("en-IN")}</td>
          <td class="r">${Number(p.paidAmount).toLocaleString("en-IN")}</td>
          <td class="r">${Number(p.dueAmount).toLocaleString("en-IN")}</td>
          <td class="${p.paymentStatus}">${p.paymentStatus}</td>
        </tr>`).join("")}</tbody>
      </table>
      </body></html>`;

      const win = window.open("", "_blank");
      if (win) {
        win.document.write(html);
        win.document.close();
        win.onload = () => { win.print(); };
      }
      toast.dismiss("print");
    } catch {
      toast.error("Print failed", { id: "print" });
    }
  };

  const fmt = (val: number) => `₹${Number(val).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  const inp = "px-2.5 py-1.5 rounded-lg border border-gray-200 focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none text-xs bg-white transition";

  const displayedPurchases = useMemo(() => {
    const purchases = data?.purchases || [];
    if (!invoiceSearch.trim()) return purchases;
    const q = invoiceSearch.trim().toLowerCase();
    return purchases.filter((p) => p.invoiceNo.toLowerCase().includes(q));
  }, [data?.purchases, invoiceSearch]);

  const summary = useMemo(() => {
    const fallback = { totalAmount: 0, paidAmount: 0, dueAmount: 0 };
    if (!invoiceSearch.trim()) return data?.summary || fallback;
    const totalAmount = displayedPurchases.reduce((s, p) => s + Number(p.total), 0);
    const paidAmount = displayedPurchases.reduce((s, p) => s + Number(p.paidAmount), 0);
    const dueAmount = displayedPurchases.reduce((s, p) => s + Number(p.dueAmount), 0);
    return { totalAmount, paidAmount, dueAmount };
  }, [data?.summary, displayedPurchases, invoiceSearch]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-xl font-bold text-gray-800">{t.purchases}</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-md text-xs font-medium hover:bg-gray-50 transition">
            <FileDown className="w-3.5 h-3.5" /> Excel
          </button>
          <button onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-md text-xs font-medium hover:bg-gray-50 transition">
            <Printer className="w-3.5 h-3.5" /> {t.print}
          </button>
          <button onClick={() => navigate("/purchases/new")}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary-600 text-white rounded-md text-xs font-medium hover:bg-primary-700 transition shadow-sm">
            <Plus className="w-3.5 h-3.5" /> {t.addPurchase}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Date preset */}
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1"><Calendar className="w-3 h-3 inline mr-1" />{t.date}</label>
            <select value={datePreset} onChange={(e) => changePreset(e.target.value as DatePreset)} className={inp}>
              <option value="all">{t.allTime}</option>
              <option value="today">{t.today}</option>
              <option value="7d">{t.last7Days}</option>
              <option value="30d">{t.last30Days}</option>
              <option value="month">{t.thisMonth}</option>
              <option value="year">{t.thisYear}</option>
              <option value="custom">{t.customRange}</option>
            </select>
          </div>

          {/* Custom date inputs */}
          {datePreset === "custom" && (
            <>
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">{t.startDate}</label>
                <input type="date" value={customStart} onChange={(e) => changeCustomStart(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">{t.endDate}</label>
                <input type="date" value={customEnd} onChange={(e) => changeCustomEnd(e.target.value)} className={inp} />
              </div>
            </>
          )}

          {/* Invoice search */}
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1"><Search className="w-3 h-3 inline mr-1" />{t.invoiceNo}</label>
            <input type="text" value={invoiceSearch} onChange={(e) => setInvoiceSearch(e.target.value)}
              placeholder={`${t.invoiceNo}...`} className={inp + " min-w-[140px]"} />
          </div>

          {/* Dealer filter */}
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1"><Filter className="w-3 h-3 inline mr-1" />{t.dealer}</label>
            <select value={dealerFilter || ""} onChange={(e) => changeDealer(e.target.value ? Number(e.target.value) : undefined)} className={inp}>
              <option value="">{t.allDealers}</option>
              {dealers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
            <IndianRupee className="w-4 h-4 text-primary-600" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-medium">{t.totalPurchaseAmount}</p>
            <p className="text-lg font-bold text-gray-800">{fmt(summary.totalAmount)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-medium">{t.totalPaid}</p>
            <p className="text-lg font-bold text-emerald-700">{fmt(summary.paidAmount)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
            <IndianRupee className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-medium">{t.totalDueAmount}</p>
            <p className="text-lg font-bold text-red-600">{fmt(summary.dueAmount)}</p>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-gray-100">
                <tr>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500">{t.invoiceNo}</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500">{t.dealer}</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500">{t.purchaseDate}</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500">{t.amount}</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500">{t.dueAmount}</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500">{t.status}</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayedPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-3 py-2.5 font-medium text-gray-800 text-sm">{p.invoiceNo}</td>
                    <td className="px-3 py-2.5 text-gray-600 text-sm">{p.dealer?.name || p.dealerName || "-"}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{new Date(p.purchaseDate).toLocaleDateString("en-IN")}</td>
                    <td className="px-3 py-2.5 font-semibold text-gray-800 text-sm">{fmt(p.total)}</td>
                    <td className="px-3 py-2.5 text-sm">
                      {Number(p.dueAmount) > 0 ? (
                        <span className="text-red-600 font-semibold">{fmt(p.dueAmount)}</span>
                      ) : (
                        <span className="text-emerald-600 text-xs font-medium">{t.paid}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {p.paymentStatus === "paid" ? (
                        <span className="px-1.5 py-0.5 text-[10px] rounded font-medium bg-emerald-100 text-emerald-700">{t.paid}</span>
                      ) : p.paymentStatus === "partial" ? (
                        <span className="px-1.5 py-0.5 text-[10px] rounded font-medium bg-amber-100 text-amber-700">{t.partial}</span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-[10px] rounded font-medium bg-red-100 text-red-700">{t.unpaid}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => navigate(`/purchases/${p.id}`)} className="p-1.5 rounded hover:bg-primary-50 text-primary-600" title="View">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {displayedPurchases.length === 0 && (
              <p className="text-center py-6 text-gray-400 text-xs">{t.noPurchases}</p>
            )}
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-50">
            {displayedPurchases.map((p) => (
              <div key={p.id} className="p-3">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{p.invoiceNo}</p>
                    <p className="text-xs text-gray-500">{p.dealer?.name || p.dealerName || "-"}</p>
                  </div>
                  {p.paymentStatus === "paid" ? (
                    <span className="px-1.5 py-0.5 text-[10px] rounded font-medium bg-emerald-100 text-emerald-700">{t.paid}</span>
                  ) : p.paymentStatus === "partial" ? (
                    <span className="px-1.5 py-0.5 text-[10px] rounded font-medium bg-amber-100 text-amber-700">{t.partial}</span>
                  ) : (
                    <span className="px-1.5 py-0.5 text-[10px] rounded font-medium bg-red-100 text-red-700">{t.unpaid}</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">{new Date(p.purchaseDate).toLocaleDateString("en-IN")}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800 text-sm">{fmt(p.total)}</span>
                    <button onClick={() => navigate(`/purchases/${p.id}`)} className="p-1.5 rounded bg-primary-50 text-primary-600"><Eye className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
            className="px-3 py-1.5 rounded-md border border-gray-200 text-gray-600 text-xs disabled:opacity-50 hover:bg-gray-50">
            Previous
          </button>
          <span className="px-3 py-1.5 text-gray-600 text-xs">Page {page} of {data.totalPages}</span>
          <button onClick={() => setPage(Math.min(data.totalPages, page + 1))} disabled={page === data.totalPages}
            className="px-3 py-1.5 rounded-md border border-gray-200 text-gray-600 text-xs disabled:opacity-50 hover:bg-gray-50">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
