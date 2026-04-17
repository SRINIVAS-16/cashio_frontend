//  Orders Page
import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, XCircle, IndianRupee, Calendar, Filter, FileDown, Printer, Users, Search, X, ChevronDown } from "lucide-react";
import { orderApi, customerApi } from "../api/client";
import { useLang } from "../context/LanguageContext";
import { OrdersResponse, Order, Customer } from "../types";
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

export default function Orders() {
  const { t } = useLang();
  const { shop: shopConfig } = useShopConfig();
  const navigate = useNavigate();
  const [data, setData] = useState<OrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [customerFilter, setCustomerFilter] = useState<number[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [custSearch, setCustSearch] = useState("");
  const [custDropdownOpen, setCustDropdownOpen] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const custDropdownRef = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);

  useEffect(() => { customerApi.getAll().then((r) => setCustomers(r.data)).catch(() => {}); }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (custDropdownRef.current && !custDropdownRef.current.contains(e.target as Node)) setCustDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!custSearch.trim()) return customers;
    const q = custSearch.toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)));
  }, [customers, custSearch]);

  useEffect(() => {
    const currentReq = ++reqId.current;
    const load = async () => {
      try {
        setLoading(true);
        const { startDate, endDate } = getCurrentDates();
        const res = await orderApi.getAll(page, 20, startDate, endDate, customerFilter.length > 0 ? customerFilter : undefined);
        if (currentReq !== reqId.current) return;
        setData(res.data);
      } catch {
        if (currentReq === reqId.current) toast.error("Failed to load orders");
      } finally {
        if (currentReq === reqId.current) setLoading(false);
      }
    };
    load();
  }, [page, datePreset, customStart, customEnd, customerFilter]);

  const changePreset = (v: DatePreset) => { setDatePreset(v); setPage(1); };
  const toggleCustomer = (id: number) => {
    setCustomerFilter((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    setPage(1);
  };
  const clearCustomerFilter = () => { setCustomerFilter([]); setPage(1); setCustSearch(""); };
  const changeCustomStart = (v: string) => { setCustomStart(v); setPage(1); };
  const changeCustomEnd = (v: string) => { setCustomEnd(v); setPage(1); };

  const getCurrentDates = () => {
    if (datePreset === "custom") return { startDate: customStart || undefined, endDate: customEnd || undefined };
    return getDateRange(datePreset);
  };

  const handleCancel = async (id: number) => {
    if (!confirm("Cancel this order? Stock will be restored.")) return;
    try {
      await orderApi.cancel(id);
      toast.success("Order cancelled");
      const currentReq = ++reqId.current;
      const { startDate, endDate } = getCurrentDates();
      const res = await orderApi.getAll(page, 20, startDate, endDate, customerFilter.length > 0 ? customerFilter : undefined);
      if (currentReq === reqId.current) setData(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Cancel failed");
    }
  };

  // Fetch ALL filtered orders (not paginated)
  const fetchAllFiltered = async (): Promise<Order[]> => {
    const { startDate, endDate } = getCurrentDates();
    const res = await orderApi.getAll(1, 10000, startDate, endDate, customerFilter.length > 0 ? customerFilter : undefined);
    return res.data.orders;
  };

  // Export to Excel
  const handleExportExcel = async () => {
    try {
      toast.loading("Preparing Excel...", { id: "export" });
      const orders = await fetchAllFiltered();
      const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("en-IN") : "";
      const rows: Record<string, string | number>[] = [];
      for (const o of orders) {
        for (const item of o.items) {
          rows.push({
            "Order No": o.orderNo,
            "Customer": o.customer?.name || o.customerName || "Walk-in",
            "Date": new Date(o.createdAt).toLocaleDateString("en-IN"),
            "Product": item.product?.name || "",
            "Batch": item.batchNo || "",
            "HSN": item.hsnCode || "",
            "MFG Date": fmtDate(item.mfgDate),
            "Expiry Date": fmtDate(item.expiryDate),
            "Qty": Number(item.quantity),
            "Rate (₹)": Number(item.price),
            "Item Total (₹)": Number(item.total),
            "Order Total (₹)": Number(o.total),
            "Paid (₹)": Number(o.paidAmount),
            "Due (₹)": Number(o.dueAmount),
            "Payment Mode": o.paymentMode,
            "Payment Status": o.paymentStatus,
            "Status": o.status,
          });
        }
      }
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = Object.keys(rows[0] || {}).map((k) => ({ wch: Math.max(k.length, 12) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Orders");
      XLSX.writeFile(wb, `Orders_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success("Excel exported!", { id: "export" });
    } catch {
      toast.error("Export failed", { id: "export" });
    }
  };

  // Print
  const handlePrint = async () => {
    try {
      toast.loading("Preparing print...", { id: "print" });
      const orders = await fetchAllFiltered();
      const { startDate, endDate } = getCurrentDates();
      const dateLabel = startDate && endDate ? `${startDate} to ${endDate}` : startDate || endDate || "All Time";
      const custLabel = customerFilter.length > 0 ? customerFilter.map((id) => customers.find((c) => c.id === id)?.name || id).join(", ") : "All Customers";

      const html = `<!DOCTYPE html><html><head><title>Orders - ${shopConfig.name}</title><style>
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
        th{background:#f0f0f0;text-align:left;padding:4px 5px;font-size:9px;border-bottom:2px solid #ddd;white-space:nowrap}
        td{padding:3px 5px;border-bottom:1px solid #eee;font-size:9px}
        .r{text-align:right}
        .paid{color:#059669}.partial{color:#d97706}.unpaid{color:#dc2626}.cancelled{color:#dc2626}
        @media print{body{margin:10px}}
      </style></head><body>
      <div class="shop-header">
        <h1>${shopConfig.name}</h1>
        <div class="name-te">${shopConfig.nameTe}</div>
        <div class="addr">${shopConfig.address}</div>
        <div class="contact">Phone: ${shopConfig.phone} | Email: ${shopConfig.email}</div>
        <div class="gst">GSTIN: ${shopConfig.gst}</div>
      </div>
      <h2>Orders Report</h2>
      <div class="meta">${dateLabel} | ${custLabel} | ${orders.length} records</div>
      <div class="summary">
        <div><span class="label">Total Orders</span><br><span class="val">₹${Number(summary.totalAmount).toLocaleString("en-IN")}</span></div>
        <div><span class="label">Total Paid</span><br><span class="val" style="color:#059669">₹${Number(summary.paidAmount).toLocaleString("en-IN")}</span></div>
        <div><span class="label">Total Due</span><br><span class="val" style="color:#dc2626">₹${Number(summary.dueAmount).toLocaleString("en-IN")}</span></div>
        <div><span class="label">Customers</span><br><span class="val">${summary.uniqueCustomers}</span></div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Order No</th><th>Customer</th><th>Date</th><th>Product</th><th>Batch</th><th>HSN</th><th>MFG</th><th>Expiry</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Item Total</th><th class="r">Order Total</th><th class="r">Paid</th><th class="r">Due</th><th>Status</th></tr></thead>
        <tbody>${(() => { let row = 0; return orders.map((o) => o.items.map((item, ii) => { row++; const fDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("en-IN") : "-"; return `<tr>
          <td>${row}</td>
          <td>${ii === 0 ? o.orderNo : ""}</td>
          <td>${ii === 0 ? (o.customer?.name || o.customerName || "Walk-in") : ""}</td>
          <td>${ii === 0 ? new Date(o.createdAt).toLocaleDateString("en-IN") : ""}</td>
          <td>${item.product?.name || ""}</td>
          <td>${item.batchNo || "-"}</td>
          <td>${item.hsnCode || "-"}</td>
          <td>${fDate(item.mfgDate)}</td>
          <td>${fDate(item.expiryDate)}</td>
          <td class="r">${Number(item.quantity)}</td>
          <td class="r">${Number(item.price).toLocaleString("en-IN")}</td>
          <td class="r">${Number(item.total).toLocaleString("en-IN")}</td>
          <td class="r">${ii === 0 ? Number(o.total).toLocaleString("en-IN") : ""}</td>
          <td class="r">${ii === 0 ? Number(o.paidAmount).toLocaleString("en-IN") : ""}</td>
          <td class="r">${ii === 0 ? Number(o.dueAmount).toLocaleString("en-IN") : ""}</td>
          <td class="${o.status === "cancelled" ? "cancelled" : o.paymentStatus}">${ii === 0 ? (o.status === "cancelled" ? "cancelled" : o.paymentStatus) : ""}</td>
        </tr>`; }).join("")).join(""); })()}</tbody>
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

  const displayedOrders = useMemo(() => {
    const orders = data?.orders || [];
    if (!orderSearch.trim()) return orders;
    const q = orderSearch.trim().toLowerCase();
    return orders.filter((o) => o.orderNo.toLowerCase().includes(q));
  }, [data?.orders, orderSearch]);

  const fmt = (val: number) => `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const inp = "px-2.5 py-1.5 rounded-lg border border-gray-200 focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none text-xs bg-white transition";

  const summary = useMemo(() => {
    const fallback = { totalAmount: 0, paidAmount: 0, dueAmount: 0, uniqueCustomers: 0 };
    if (!orderSearch.trim()) return data?.summary || fallback;
    const totalAmount = displayedOrders.reduce((s, o) => s + Number(o.total), 0);
    const paidAmount = displayedOrders.reduce((s, o) => s + Number(o.paidAmount), 0);
    const dueAmount = displayedOrders.reduce((s, o) => s + Number(o.dueAmount), 0);
    const uniqueCustomers = new Set(displayedOrders.map((o) => o.customerId).filter(Boolean)).size;
    return { totalAmount, paidAmount, dueAmount, uniqueCustomers };
  }, [data?.summary, displayedOrders, orderSearch]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-xl font-bold text-gray-800">{t.orders}</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-md text-xs font-medium hover:bg-gray-50 transition">
            <FileDown className="w-3.5 h-3.5" /> Excel
          </button>
          <button onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-md text-xs font-medium hover:bg-gray-50 transition">
            <Printer className="w-3.5 h-3.5" /> {t.print}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4">
        <div className="flex flex-wrap items-end gap-2 sm:gap-3">
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
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1"><Search className="w-3 h-3 inline mr-1" />{t.orderNo}</label>
            <input type="text" value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)}
              placeholder={`${t.orderNo}...`} className={inp + " min-w-[140px]"} />
          </div>
          <div className="relative" ref={custDropdownRef}>
            <label className="block text-[11px] font-medium text-gray-400 mb-1"><Filter className="w-3 h-3 inline mr-1" />{t.customer}</label>
            <button type="button" onClick={() => setCustDropdownOpen((v) => !v)}
              className={`${inp} flex items-center gap-1 min-w-[180px] max-w-[320px] text-left ${
                customerFilter.length > 0
                  ? "border-primary-400 bg-primary-50 ring-1 ring-primary-200 text-primary-700"
                  : custDropdownOpen
                  ? "border-primary-400 ring-1 ring-primary-200"
                  : ""
              }`}>
              {customerFilter.length === 0 ? (
                <span className="text-gray-400">{t.allCustomers}</span>
              ) : (
                <span className="truncate font-medium">{customerFilter.length} selected</span>
              )}
              <ChevronDown className={`w-3 h-3 ml-auto flex-shrink-0 transition-transform ${custDropdownOpen ? "rotate-180" : ""} ${customerFilter.length > 0 ? "text-primary-500" : "text-gray-400"}`} />
            </button>
            {customerFilter.length > 0 && (
              <button onClick={clearCustomerFilter} className="absolute right-7 top-[23px] p-0.5 text-gray-400 hover:text-gray-600">
                <X className="w-3 h-3" />
              </button>
            )}
            {custDropdownOpen && (
              <div className="absolute z-50 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 flex flex-col">
                <div className="p-2 border-b border-gray-100">
                  <div className="flex items-center gap-1.5 px-2 py-1.5 border border-gray-200 rounded-md bg-gray-50">
                    <Search className="w-3.5 h-3.5 text-gray-400" />
                    <input type="text" value={custSearch} onChange={(e) => setCustSearch(e.target.value)}
                      placeholder="Search customer..." autoFocus
                      className="flex-1 bg-transparent outline-none text-xs text-gray-700 placeholder-gray-400" />
                    {custSearch && <button onClick={() => setCustSearch("")} className="text-gray-400 hover:text-gray-600"><X className="w-3 h-3" /></button>}
                  </div>
                </div>
                <div className="overflow-y-auto flex-1">
                  {filteredCustomers.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 py-4">No customers found</p>
                  ) : filteredCustomers.map((c) => (
                    <label key={c.id}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-xs">
                      <input type="checkbox" checked={customerFilter.includes(c.id)}
                        onChange={() => toggleCustomer(c.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-3.5 w-3.5" />
                      <span className="text-gray-700 truncate">{c.name}</span>
                      {c.phone && <span className="text-gray-400 text-[10px] ml-auto flex-shrink-0">{c.phone}</span>}
                    </label>
                  ))}
                </div>
                {customerFilter.length > 0 && (
                  <div className="border-t border-gray-100 p-2 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">{customerFilter.length} selected</span>
                    <button onClick={clearCustomerFilter} className="text-[10px] text-red-500 hover:text-red-700 font-medium">Clear all</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {customerFilter.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {customerFilter.map((id) => {
              const c = customers.find((x) => x.id === id);
              return (
                <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-700 rounded-full text-[11px] font-medium">
                  {c?.name || `#${id}`}
                  <button onClick={() => toggleCustomer(id)} className="hover:text-primary-900"><X className="w-2.5 h-2.5" /></button>
                </span>
              );
            })}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
            <IndianRupee className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-primary-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] text-gray-400 font-medium">{t.totalOrderAmount}</p>
            <p className="text-sm sm:text-lg font-bold text-gray-800 truncate">{fmt(summary.totalAmount)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <IndianRupee className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] text-gray-400 font-medium">{t.totalPaid}</p>
            <p className="text-sm sm:text-lg font-bold text-emerald-700 truncate">{fmt(summary.paidAmount)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
            <IndianRupee className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-red-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] text-gray-400 font-medium">{t.totalDueAmount}</p>
            <p className="text-sm sm:text-lg font-bold text-red-600 truncate">{fmt(summary.dueAmount)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
            <Users className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-purple-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] text-gray-400 font-medium">{t.uniqueCustomers}</p>
            <p className="text-sm sm:text-lg font-bold text-purple-700">{summary.uniqueCustomers}</p>
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
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500">{t.orderNo}</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500">{t.customer}</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500">{t.date}</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500">{t.amount}</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500">{t.dueAmount}</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500">{t.paymentMode}</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500">{t.status}</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayedOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-3 py-2.5 font-medium text-gray-800 text-sm">{o.orderNo}</td>
                    <td className="px-3 py-2.5 text-gray-600 text-sm">{o.customer?.name || o.customerName || "Walk-in"}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{new Date(o.createdAt).toLocaleDateString("en-IN")}</td>
                    <td className="px-3 py-2.5 font-semibold text-gray-800 text-sm">{fmt(Number(o.total))}</td>
                    <td className="px-3 py-2.5 text-sm">
                      {Number(o.dueAmount) > 0 ? (
                        <span className="text-red-600 font-semibold">{fmt(Number(o.dueAmount))}</span>
                      ) : (
                        <span className="text-emerald-600 text-xs font-medium">{t.paid}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 capitalize text-gray-600 text-sm">{o.paymentMode}</td>
                    <td className="px-3 py-2.5">
                      {o.status === "cancelled" ? (
                        <span className="px-1.5 py-0.5 text-[10px] rounded font-medium bg-red-100 text-red-700">{t.cancelled}</span>
                      ) : o.paymentStatus === "partial" ? (
                        <span className="px-1.5 py-0.5 text-[10px] rounded font-medium bg-amber-100 text-amber-700">{t.partial}</span>
                      ) : o.paymentStatus === "unpaid" ? (
                        <span className="px-1.5 py-0.5 text-[10px] rounded font-medium bg-red-100 text-red-700">{t.unpaid}</span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-[10px] rounded font-medium bg-emerald-100 text-emerald-700">{t.completed}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => navigate(`/orders/${o.id}`)} className="p-1.5 rounded hover:bg-primary-50 text-primary-600" title={t.viewBill}>
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {o.status === "completed" && (
                          <button onClick={() => handleCancel(o.id)} className="p-1.5 rounded hover:bg-red-50 text-red-600" title={t.cancelOrder}>
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {displayedOrders.length === 0 && (
              <p className="text-center py-6 text-gray-400 text-xs">{t.noData}</p>
            )}
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-50">
            {displayedOrders.map((o) => (
              <div key={o.id} className="p-3">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{o.orderNo}</p>
                    <p className="text-xs text-gray-500">{o.customer?.name || o.customerName || "Walk-in"}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {o.status === "cancelled" ? (
                      <span className="px-1.5 py-0.5 text-[10px] rounded font-medium bg-red-100 text-red-700">{t.cancelled}</span>
                    ) : o.paymentStatus === "partial" ? (
                      <span className="px-1.5 py-0.5 text-[10px] rounded font-medium bg-amber-100 text-amber-700">{t.partial}</span>
                    ) : o.paymentStatus === "unpaid" ? (
                      <span className="px-1.5 py-0.5 text-[10px] rounded font-medium bg-red-100 text-red-700">{t.unpaid}</span>
                    ) : (
                      <span className="px-1.5 py-0.5 text-[10px] rounded font-medium bg-emerald-100 text-emerald-700">{t.completed}</span>
                    )}
                    {Number(o.dueAmount) > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] rounded font-medium bg-amber-100 text-amber-700">
                        Due: {fmt(Number(o.dueAmount))}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleDateString("en-IN")}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800 text-sm">{fmt(Number(o.total))}</span>
                    <button onClick={() => navigate(`/orders/${o.id}`)} className="p-1.5 rounded bg-primary-50 text-primary-600"><Eye className="w-3.5 h-3.5" /></button>
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
