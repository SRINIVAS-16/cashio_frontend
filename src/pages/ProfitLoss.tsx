// ─── Profit & Loss Report Page ───────────────────────────────────
import { useEffect, useMemo, useRef, useState } from "react";
import { TrendingUp, TrendingDown, IndianRupee, Percent, Download, Calendar, Filter, FileText, FileSpreadsheet, ChevronDown } from "lucide-react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { dashboardApi } from "../api/client";
import { useLang } from "../context/LanguageContext";
import { useShopConfig } from "../context/ShopConfigContext";
import { ProfitLossReport, ProfitLossGroupBy, ProfitLossRow } from "../types";
import { listFinancialYears, financialYearOption, financialYearStart } from "../utils/financialYear";

type SortField = "label" | "quantity" | "revenue" | "cost" | "profit" | "margin" | "due";

export default function ProfitLoss() {
  const { t, lang } = useLang();
  const { shop: shopConfig, claimItc } = useShopConfig();

  const currentFy = financialYearOption(financialYearStart());
  const fyOptions = listFinancialYears(6);

  const [rangeSel, setRangeSel] = useState<string>(String(currentFy.startYear));
  const [start, setStart] = useState(currentFy.start);
  const [end, setEnd] = useState(currentFy.end);
  const [groupBy, setGroupBy] = useState<ProfitLossGroupBy>("product");

  const [report, setReport] = useState<ProfitLossReport | null>(null);
  const [trend, setTrend] = useState<ProfitLossReport["trend"]>([]);
  const trendRangeRef = useRef<string>("");
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<{ field: SortField; dir: "asc" | "desc" }>({ field: "profit", dir: "desc" });
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const inp = "px-2.5 py-1.5 rounded-lg border border-gray-200 focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none text-xs bg-white transition";

  const formatCurrency = (val: number) => `₹${val.toLocaleString("en-IN")}`;

  const changeRange = (val: string) => {
    setRangeSel(val);
    if (val !== "custom") {
      const fy = financialYearOption(Number(val));
      setStart(fy.start);
      setEnd(fy.end);
    }
  };

  // Fetch the report whenever the applied filters change
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    dashboardApi.getProfitLoss({ start, end, groupBy }, { signal: controller.signal })
      .then((r) => {
        setReport(r.data);
        // The weekly trend only depends on the date range, not the grouping —
        // refresh it only when the range changes so it doesn't flicker when the
        // user just switches the group-by dimension.
        const rangeKey = `${start}|${end}`;
        if (trendRangeRef.current !== rangeKey) {
          setTrend(r.data.trend);
          trendRangeRef.current = rangeKey;
        }
      })
      .catch((err) => { if (!controller.signal.aborted) console.error("Profit & loss error:", err); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [start, end, groupBy]);

  // Close the export menu when clicking outside it
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const rows = useMemo(() => {
    const list = report?.rows ? [...report.rows] : [];
    const { field, dir } = sort;
    list.sort((a, b) => {
      const av = field === "label" ? a.label.toLowerCase() : (a[field] as number);
      const bv = field === "label" ? b.label.toLowerCase() : (b[field] as number);
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [report, sort]);

  const rowLabel = (row: ProfitLossRow) => {
    if (groupBy === "product" && lang === "te" && row.labelTe) return row.labelTe;
    return row.label;
  };

  const toggleSort = (field: SortField) =>
    setSort((s) => (s.field === field ? { field, dir: s.dir === "asc" ? "desc" : "asc" } : { field, dir: field === "label" ? "asc" : "desc" }));

  const groupByOptions: { value: ProfitLossGroupBy; label: string }[] = [
    { value: "product", label: t.product },
    { value: "category", label: t.category },
    { value: "payment", label: t.paymentMode },
    { value: "customer", label: t.customer },
  ];
  const groupLabel = groupByOptions.find((o) => o.value === groupBy)?.label;

  const rangeLabel = rangeSel === "custom" ? `${start} → ${end}` : (fyOptions.find((f) => String(f.startYear) === rangeSel)?.label || `${start} → ${end}`);

  // Header row + data rows (+ total) shared by the Excel and PDF exporters.
  const buildExportData = () => {
    const head = [groupLabel || "", t.quantity, t.revenue, t.cost, t.profit, `${t.margin} %`, t.totalDue];
    const body = rows.map((r) => [rowLabel(r), r.quantity, r.revenue, r.cost, r.profit, r.margin, r.due]);
    const total = report
      ? [t.totalRow, report.summary.quantity, report.summary.revenue, report.summary.cost, report.summary.profit, report.summary.margin, report.summary.due]
      : [];
    return { head, body, total };
  };

  const exportExcel = () => {
    if (!report) return;
    const { head, body, total } = buildExportData();
    const aoa = [
      [t.profitLossReport],
      [`${t.dateRange}: ${rangeLabel}`, `${t.groupBy}: ${groupLabel}`],
      [],
      head,
      ...body,
      total,
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = head.map((h) => ({ wch: Math.max(String(h).length, 14) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Profit & Loss");
    XLSX.writeFile(wb, `profit_loss_${start}_to_${end}.xlsx`);
    setExportOpen(false);
  };

  const exportPdf = () => {
    if (!report) return;
    const { head, body, total } = buildExportData();
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(shopConfig?.name || t.profitLossReport, pageWidth / 2, 14, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(t.profitLossReport, pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(9);
    doc.text(`${t.dateRange}: ${rangeLabel}    |    ${t.groupBy}: ${groupLabel}`, pageWidth / 2, 26, { align: "center" });

    autoTable(doc, {
      startY: 32,
      head: [head],
      body: body.map((r) => r.map(String)),
      foot: [total.map(String)],
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.2 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold", halign: "center" },
      footStyles: { fillColor: [243, 244, 246], textColor: 20, fontStyle: "bold" },
      columnStyles: { 0: { halign: "left" }, 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" } },
    });

    doc.save(`profit_loss_${start}_to_${end}.pdf`);
    setExportOpen(false);
  };

  const summary = report?.summary;
  const SortIcon = ({ field }: { field: SortField }) =>
    sort.field === field ? <span className="text-primary-500">{sort.dir === "asc" ? "▲" : "▼"}</span> : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-800">{t.profitLossReport}</h1>
        <div className="ml-2 mr-auto hidden sm:block text-[11px] text-gray-400">{claimItc ? t.itcBasis : t.noItcBasis}</div>
        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setExportOpen((v) => !v)}
            disabled={!report || rows.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-40"
          >
            <Download className="h-4 w-4" /> {t.export}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${exportOpen ? "rotate-180" : ""}`} />
          </button>
          {exportOpen && (
            <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-md border border-gray-100 bg-white shadow-lg">
              <button onClick={exportPdf} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                <FileText className="h-4 w-4 text-red-500" /> {t.exportPdf}
              </button>
              <button onClick={exportExcel} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                <FileSpreadsheet className="h-4 w-4 text-green-600" /> {t.exportExcel}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Filters ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4">
        <div className="flex flex-wrap items-end gap-2 sm:gap-3">
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1"><Calendar className="w-3 h-3 inline mr-1" />{t.dateRange}</label>
            <select value={rangeSel} onChange={(e) => changeRange(e.target.value)} aria-label={t.dateRange} className={inp}>
              {fyOptions.map((fy) => (
                <option key={fy.startYear} value={fy.startYear}>{fy.label}</option>
              ))}
              <option value="custom">{t.customRange}</option>
            </select>
          </div>
          {rangeSel === "custom" && (
            <>
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">{t.startDate}</label>
                <input type="date" value={start} onChange={(e) => setStart(e.target.value)} aria-label={t.startDate} className={inp} />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">{t.endDate}</label>
                <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} aria-label={t.endDate} className={inp} />
              </div>
            </>
          )}
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1"><Filter className="w-3 h-3 inline mr-1" />{t.groupBy}</label>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as ProfitLossGroupBy)} aria-label={t.groupBy} className={inp}>
              {groupByOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ─── KPI Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-blue-50 rounded-md"><IndianRupee className="w-3.5 h-3.5 text-blue-600" /></div>
            <span className="text-xs text-gray-500">{t.revenue}</span>
          </div>
          <p className="text-lg font-bold text-gray-800">{formatCurrency(summary?.revenue || 0)}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-amber-50 rounded-md"><TrendingDown className="w-3.5 h-3.5 text-amber-600" /></div>
            <span className="text-xs text-gray-500">{t.cost}</span>
          </div>
          <p className="text-lg font-bold text-gray-800">{formatCurrency(summary?.cost || 0)}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-emerald-50 rounded-md"><TrendingUp className="w-3.5 h-3.5 text-emerald-600" /></div>
            <span className="text-xs text-gray-500">{t.grossProfit}</span>
          </div>
          <p className={`text-lg font-bold ${(summary?.profit || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(summary?.profit || 0)}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-violet-50 rounded-md"><Percent className="w-3.5 h-3.5 text-violet-600" /></div>
            <span className="text-xs text-gray-500">{t.margin}</span>
          </div>
          <p className={`text-lg font-bold ${(summary?.margin || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>{(summary?.margin || 0).toFixed(2)}%</p>
        </div>
      </div>

      {/* ─── Weekly Profit Trend (signed) ───────────────────── */}
      {trend.length > 0 && (
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold mb-3 text-gray-700">{t.weeklyProfit}</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  fontSize={12}
                  minTickGap={24}
                  tickFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                />
                <YAxis fontSize={12} tickFormatter={(v) => `₹${Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}K` : v}`} />
                <ReferenceLine y={0} stroke="#9ca3af" />
                <Tooltip
                  formatter={(val: number) => [formatCurrency(val), t.profit]}
                  labelFormatter={(label) => `${t.weekOf} ${new Date(label).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                />
                <Bar dataKey="profit">
                  {trend.map((d) => (
                    <Cell key={d.date} fill={d.profit >= 0 ? "#16a34a" : "#dc2626"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ─── Table ──────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-400" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">{t.noData}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                <th className="px-4 py-2 cursor-pointer select-none" onClick={() => toggleSort("label")}>{groupLabel} <SortIcon field="label" /></th>
                <th className="px-4 py-2 text-right cursor-pointer select-none" onClick={() => toggleSort("quantity")}>{t.quantity} <SortIcon field="quantity" /></th>
                <th className="px-4 py-2 text-right cursor-pointer select-none" onClick={() => toggleSort("revenue")}>{t.revenue} <SortIcon field="revenue" /></th>
                <th className="px-4 py-2 text-right cursor-pointer select-none" onClick={() => toggleSort("cost")}>{t.cost} <SortIcon field="cost" /></th>
                <th className="px-4 py-2 text-right cursor-pointer select-none" onClick={() => toggleSort("profit")}>{t.profit} <SortIcon field="profit" /></th>
                <th className="px-4 py-2 text-right cursor-pointer select-none" onClick={() => toggleSort("margin")}>{t.margin} % <SortIcon field="margin" /></th>
                <th className="px-4 py-2 text-right cursor-pointer select-none" onClick={() => toggleSort("due")}>{t.totalDue} <SortIcon field="due" /></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-800">{rowLabel(row)}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{row.quantity}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{formatCurrency(row.revenue)}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{formatCurrency(row.cost)}</td>
                  <td className={`px-4 py-2 text-right font-semibold ${row.profit >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(row.profit)}</td>
                  <td className={`px-4 py-2 text-right ${row.margin >= 0 ? "text-green-600" : "text-red-600"}`}>{row.margin.toFixed(2)}%</td>
                  <td className={`px-4 py-2 text-right ${row.due > 0 ? "text-red-600" : "text-gray-600"}`}>{formatCurrency(row.due)}</td>
                </tr>
              ))}
            </tbody>
            {summary && (
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50 font-semibold text-gray-800">
                  <td className="px-4 py-2">{t.totalRow}</td>
                  <td className="px-4 py-2 text-right">{summary.quantity}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(summary.revenue)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(summary.cost)}</td>
                  <td className={`px-4 py-2 text-right ${summary.profit >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(summary.profit)}</td>
                  <td className={`px-4 py-2 text-right ${summary.margin >= 0 ? "text-green-600" : "text-red-600"}`}>{summary.margin.toFixed(2)}%</td>
                  <td className={`px-4 py-2 text-right ${summary.due > 0 ? "text-red-600" : "text-gray-800"}`}>{formatCurrency(summary.due)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  );
}
