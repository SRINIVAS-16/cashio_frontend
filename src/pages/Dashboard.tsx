// ─── Dashboard Page ──────────────────────────────────────────────
import { useEffect, useState } from "react";
import {
  IndianRupee,
  ShoppingCart,
  AlertTriangle,
  Package,
  Users,
  TrendingUp,
  Receipt,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  Clock,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { dashboardApi } from "../api/client";
import { useLang } from "../context/LanguageContext";
import { DashboardData, SalesTrend, ProductDistribution, ExpiringBatch } from "../types";
import { shopConfig } from "../config/shopConfig";

const COLORS = ["#3b82f6", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

const TileLoader = () => (
  <div className="flex items-center justify-center h-20">
    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-400"></div>
  </div>
);

const ChartLoader = () => (
  <div className="flex items-center justify-center h-56">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-400"></div>
  </div>
);

export default function Dashboard() {
  const { t, lang } = useLang();
  const [data, setData] = useState<DashboardData | null>(null);
  const [salesTrend, setSalesTrend] = useState<SalesTrend[] | null>(null);
  const [productDist, setProductDist] = useState<ProductDistribution[] | null>(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(true);
  const [distLoading, setDistLoading] = useState(true);

  useEffect(() => {
    // Load each section independently so tiles render as data arrives
    dashboardApi.getDashboard()
      .then((res) => setData(res.data))
      .catch((err) => console.error("Dashboard summary error:", err))
      .finally(() => setDashLoading(false));

    dashboardApi.getSalesTrend(30)
      .then((res) => setSalesTrend(res.data))
      .catch((err) => console.error("Sales trend error:", err))
      .finally(() => setTrendLoading(false));

    dashboardApi.getProductDistribution()
      .then((res) => setProductDist(res.data))
      .catch((err) => console.error("Product distribution error:", err))
      .finally(() => setDistLoading(false));
  }, []);

  const formatCurrency = (val: number) => `₹${val.toLocaleString("en-IN")}`;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">{t.dashboard}</h1>

      {/* ─── Shop Info Card ─────────────────────────────────── */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-600 rounded-lg p-5 shadow-sm text-white">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          {/* Left: Logo + Name + Type + Address */}
          <div className="flex items-start gap-3">
            <img
              src={shopConfig.logo}
              alt="Shop Logo"
              className="w-14 h-14 rounded-lg bg-white/20 p-0.5 flex-shrink-0"
            />
            <div>
              <h2 className="text-base font-bold">{lang === "te" ? shopConfig.nameTe : shopConfig.name}</h2>
              <p className="text-blue-200 text-xs mt-0.5">
                {lang === "te" ? shopConfig.taglineTe : shopConfig.tagline}
              </p>
              <div className="flex items-start gap-1.5 text-blue-200 text-xs mt-2">
                <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <span>{lang === "te" ? shopConfig.addressTe : shopConfig.address}</span>
              </div>
            </div>
          </div>

          {/* Right: Phone + GST */}
          <div className="space-y-1.5 text-xs sm:text-right flex-shrink-0">
            <div className="flex items-center gap-1.5 text-blue-200 sm:justify-end">
              <Phone className="w-3 h-3 flex-shrink-0" />
              <span>{shopConfig.phone}</span>
            </div>
            <div className="flex items-center gap-1.5 text-blue-200 sm:justify-end">
              <FileText className="w-3 h-3 flex-shrink-0" />
              <span>GST: {shopConfig.gst}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Summary Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Today's Sales */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-emerald-50 rounded-md">
              <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span className="text-xs text-gray-500">{t.todaySales}</span>
          </div>
          {dashLoading ? <TileLoader /> : (
            <>
              <p className="text-lg font-bold text-gray-800">{formatCurrency(data?.today?.total || 0)}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{data?.today?.count || 0} {t.orders.toLowerCase()}</p>
            </>
          )}
        </div>

        {/* Monthly Sales */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-blue-50 rounded-md">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <span className="text-xs text-gray-500">{t.monthSales}</span>
          </div>
          {dashLoading ? <TileLoader /> : (
            <>
              <p className="text-lg font-bold text-gray-800">{formatCurrency(data?.thisMonth?.total || 0)}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{data?.thisMonth?.count || 0} {t.orders.toLowerCase()}</p>
            </>
          )}
        </div>

        {/* Total Products */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-violet-50 rounded-md">
              <Package className="w-3.5 h-3.5 text-violet-600" />
            </div>
            <span className="text-xs text-gray-500">{t.totalProducts}</span>
          </div>
          {dashLoading ? <TileLoader /> : (
            <p className="text-lg font-bold text-gray-800">{data?.totalProducts || 0}</p>
          )}
        </div>

        {/* Total Customers */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-amber-50 rounded-md">
              <Users className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <span className="text-xs text-gray-500">{t.totalCustomers}</span>
          </div>
          {dashLoading ? <TileLoader /> : (
            <p className="text-lg font-bold text-gray-800">{data?.totalCustomers || 0}</p>
          )}
        </div>

        {/* Total Due Amount */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-red-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-red-50 rounded-md">
              <CreditCard className="w-3.5 h-3.5 text-red-600" />
            </div>
            <span className="text-xs text-gray-500">{t.totalDue}</span>
          </div>
          {dashLoading ? <TileLoader /> : (
            <>
              <p className="text-lg font-bold text-red-600">{formatCurrency(data?.dueSummary?.totalDueAmount || 0)}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{data?.dueSummary?.totalDueOrders || 0} {t.orders.toLowerCase()}</p>
            </>
          )}
        </div>
      </div>

      {/* ─── Charts Row ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sales Trend Line Chart */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold mb-3 text-gray-700">{t.salesTrend}</h3>
          {trendLoading ? <ChartLoader /> : !salesTrend || salesTrend.length === 0 ? (
            <div className="flex items-center justify-center h-56 text-gray-400 text-xs">{t.noData}</div>
          ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  fontSize={12}
                />
                <YAxis fontSize={12} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + "K" : v}`} />
                <Tooltip
                  formatter={(val: number) => [formatCurrency(val), "Sales"]}
                  labelFormatter={(label) => new Date(label).toLocaleDateString("en-IN")}
                />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          )}
        </div>

        {/* Product Distribution Pie Chart */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold mb-3 text-gray-700">{t.productDistribution}</h3>
          {distLoading ? <ChartLoader /> : !productDist || productDist.length === 0 ? (
            <div className="flex items-center justify-center h-56 text-gray-400 text-xs">{t.noData}</div>
          ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productDist}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="category"
                  label={({ category, count }) => `${category} (${count})`}
                  fontSize={11}
                >
                  {productDist.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          )}
        </div>
      </div>

      {/* ─── Bottom Row ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low Stock Alert */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-1.5 mb-3">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <h3 className="text-sm font-semibold text-gray-700">{t.lowStock}</h3>
          </div>
          {dashLoading ? <TileLoader /> : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {(data?.lowStockProducts as any[] || []).length === 0 ? (
              <p className="text-gray-400 text-xs">No low stock items</p>
            ) : (
              (data?.lowStockProducts as any[]).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between bg-red-50 rounded-md px-2.5 py-1.5">
                  <div>
                    <p className="font-medium text-gray-800 text-xs">{p.name}</p>
                    {p.name_te && <p className="text-[10px] text-gray-500">{p.name_te}</p>}
                  </div>
                  <span className="text-red-600 font-bold text-xs">
                    {p.stock}/{p.min_stock}
                  </span>
                </div>
              ))
            )}
          </div>
          )}
        </div>

        {/* Customers with Dues */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-red-100">
          <div className="flex items-center gap-1.5 mb-3">
            <CreditCard className="w-3.5 h-3.5 text-red-600" />
            <h3 className="text-sm font-semibold text-gray-700">{t.customersWithDue}</h3>
            {data?.customersWithDues && data.customersWithDues.length > 0 && (
              <span className="ml-auto text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded-full">{data.customersWithDues.length}</span>
            )}
          </div>
          {dashLoading ? <TileLoader /> : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {(!data?.customersWithDues || data.customersWithDues.length === 0) ? (
              <p className="text-gray-400 text-xs">{t.noDues}</p>
            ) : (
              data.customersWithDues.map((d, idx) => (
                <div key={idx} className="flex items-center justify-between bg-red-50/60 rounded-md px-2.5 py-2">
                  <div>
                    <p className="font-medium text-gray-800 text-xs">{d.customer?.name || "Unknown"}</p>
                    <p className="text-[10px] text-gray-500">{d.customer?.phone} • {d.orderCount} {t.orders.toLowerCase()}</p>
                  </div>
                  <span className="text-red-600 font-bold text-xs">
                    {formatCurrency(d.totalDue)}
                  </span>
                </div>
              ))
            )}
          </div>
          )}
        </div>
      </div>

      {/* ─── Expiring Soon ──────────────────────────────────── */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-orange-100">
        <div className="flex items-center gap-1.5 mb-3">
          <Clock className="w-3.5 h-3.5 text-orange-500" />
          <h3 className="text-sm font-semibold text-gray-700">Expiring Soon</h3>
          {data?.expiringSoon && data.expiringSoon.length > 0 && (
            <span className="ml-auto text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full">{data.expiringSoon.length}</span>
          )}
        </div>
        {dashLoading ? <TileLoader /> : (
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {(!data?.expiringSoon || data.expiringSoon.length === 0) ? (
            <p className="text-gray-400 text-xs">No products expiring soon</p>
          ) : (
            data.expiringSoon.map((b: ExpiringBatch) => {
              const daysLeft = Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / 86400000);
              const isExpired = daysLeft < 0;
              const isUrgent = daysLeft <= 30;
              return (
                <div key={b.batchId} className={`flex items-center justify-between rounded-md px-2.5 py-1.5 ${
                  isExpired ? "bg-red-50" : isUrgent ? "bg-orange-50" : "bg-amber-50/50"
                }`}>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 text-xs truncate">{b.productName}</p>
                    <p className="text-[10px] text-gray-500">
                      Batch: {b.batchNo || "-"} • {b.remaining} {b.unit} remaining
                    </p>
                  </div>
                  <span className={`text-xs font-bold whitespace-nowrap ml-2 ${
                    isExpired ? "text-red-600" : isUrgent ? "text-orange-600" : "text-amber-600"
                  }`}>
                    {isExpired ? `Expired ${Math.abs(daysLeft)}d ago` : `${daysLeft}d left`}
                  </span>
                </div>
              );
            })
          )}
        </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-1.5 mb-3">
            <ShoppingCart className="w-3.5 h-3.5 text-primary-600" />
            <h3 className="text-sm font-semibold text-gray-700">{t.topProducts}</h3>
          </div>
          {dashLoading ? <TileLoader /> : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {(data?.topProducts || []).map((p, idx) => (
              <div key={idx} className="flex items-center justify-between bg-slate-50 rounded-md px-2.5 py-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold bg-primary-100 text-primary-700 rounded-full">
                    {idx + 1}
                  </span>
                  <p className="font-medium text-gray-800 text-xs">{p.product?.name || "Unknown"}</p>
                </div>
                <span className="text-primary-700 font-semibold text-xs">
                  {formatCurrency(p.totalRevenue)}
                </span>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-1.5 mb-3">
            <Receipt className="w-3.5 h-3.5 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-700">{t.recentOrders}</h3>
          </div>
          {dashLoading ? <TileLoader /> : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {(data?.recentOrders || []).map((o) => (
              <div key={o.id} className="flex items-center justify-between bg-slate-50 rounded-md px-2.5 py-1.5">
                <div>
                  <p className="font-medium text-gray-800 text-xs">{o.orderNo}</p>
                  <p className="text-[10px] text-gray-500">
                    {o.customer?.name || o.customerName || "Walk-in"} •{" "}
                    {new Date(o.createdAt).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <span className={`font-semibold text-xs ${o.status === "cancelled" ? "text-red-500" : "text-gray-800"}`}>
                  {formatCurrency(Number(o.total))}
                </span>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
