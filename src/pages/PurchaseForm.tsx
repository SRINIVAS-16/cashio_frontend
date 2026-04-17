// ─── Purchase Form Page (Create) ──────────────────────────────────
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, X, IndianRupee, Package, Calendar, Hash, FileText } from "lucide-react";
import { purchaseApi, dealerApi, productApi } from "../api/client";
import { useLang } from "../context/LanguageContext";
import { Product, Dealer, Purchase } from "../types";
import toast from "react-hot-toast";

interface ItemRow {
  productId: number;
  productName: string;
  batchNo: string;
  hsnCode: string;
  mfgDate: string;
  expiryDate: string;
  costPrice: number;
  discount: number;
  cgstPercent: number;
  sgstPercent: number;
  quantity: number;
  freeQty: number;
}

const emptyItem = (): ItemRow => ({
  productId: 0, productName: "", batchNo: "", hsnCode: "",
  mfgDate: "", expiryDate: "", costPrice: 0, discount: 0, cgstPercent: 0, sgstPercent: 0, quantity: 1, freeQty: 0,
});

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-[11px] font-medium text-gray-400 mb-1">{label}</label>
    {children}
  </div>
);

export default function PurchaseForm() {
  const { t } = useLang();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const isView = isEdit; // view mode for existing purchases

  const [loading, setLoading] = useState(isEdit);
  const [products, setProducts] = useState<Product[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);

  const [form, setForm] = useState({
    invoiceNo: "", dealerId: null as number | null, dealerName: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    paidAmount: 0, notes: "",
  });
  const [items, setItems] = useState<ItemRow[]>([emptyItem()]);

  // Quick add dealer modal
  const [showAddDealer, setShowAddDealer] = useState(false);
  const [dealerForm, setDealerForm] = useState({ name: "", phone: "", gst: "", address: "" });

  // View mode: purchase + payment
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [payMode, setPayMode] = useState("cash");
  const [payNotes, setPayNotes] = useState("");

  useEffect(() => {
    loadProducts();
    loadDealers();
    if (isEdit) loadPurchase();
  }, [id]);

  const loadProducts = async () => {
    try { const res = await productApi.getAll(); setProducts(res.data); } catch {}
  };

  const loadDealers = async () => {
    try { const res = await dealerApi.getAll(); setDealers(res.data); } catch {}
  };

  const loadPurchase = async () => {
    try {
      const res = await purchaseApi.getById(Number(id));
      const p = res.data;
      setPurchase(p);
      setForm({
        invoiceNo: p.invoiceNo, dealerId: p.dealerId || null,
        dealerName: p.dealerName || "",
        purchaseDate: new Date(p.purchaseDate).toISOString().split("T")[0],
        paidAmount: Number(p.paidAmount), notes: p.notes || "",
      });
      setItems(p.items.map((it: any) => ({
        productId: it.productId, productName: it.product?.name || "",
        batchNo: it.batchNo || "", hsnCode: it.hsnCode || "",
        mfgDate: it.mfgDate ? new Date(it.mfgDate).toISOString().split("T")[0] : "",
        expiryDate: it.expiryDate ? new Date(it.expiryDate).toISOString().split("T")[0] : "",
        costPrice: Number(it.costPrice), discount: Number(it.discount || 0), cgstPercent: Number(it.cgstPercent || 0), sgstPercent: Number(it.sgstPercent || 0), quantity: it.quantity, freeQty: it.freeQty || 0,
      })));
    } catch {
      toast.error("Failed to load purchase");
      navigate("/purchases");
    } finally { setLoading(false); }
  };

  // Items management
  const updateItem = (idx: number, field: keyof ItemRow, value: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    if (field === "productId") {
      const p = products.find((pr) => pr.id === Number(value));
      updated[idx].productName = p?.name || "";
    }
    setItems(updated);
  };

  const addItem = () => setItems([...items, emptyItem()]);

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const subtotal = items.reduce((sum, it) => sum + (it.costPrice * it.quantity), 0);
  const totalDiscount = items.reduce((sum, it) => sum + it.discount, 0);
  const totalCgst = items.reduce((sum, it) => {
    const taxable = it.costPrice * it.quantity - it.discount;
    return sum + (taxable > 0 ? taxable * it.cgstPercent / 100 : 0);
  }, 0);
  const totalSgst = items.reduce((sum, it) => {
    const taxable = it.costPrice * it.quantity - it.discount;
    return sum + (taxable > 0 ? taxable * it.sgstPercent / 100 : 0);
  }, 0);
  const total = subtotal - totalDiscount + totalCgst + totalSgst;

  const handleSave = async () => {
    if (!form.invoiceNo) { toast.error("Invoice number required"); return; }
    const validItems = items.filter((it) => it.productId > 0 && it.quantity > 0);
    if (validItems.length === 0) { toast.error("Add at least one item"); return; }

    try {
      const cappedPaid = Math.min(form.paidAmount, total);
      await purchaseApi.create({
        invoiceNo: form.invoiceNo,
        dealerId: form.dealerId || null,
        dealerName: form.dealerName || null,
        purchaseDate: form.purchaseDate,
        subtotal,
        discount: totalDiscount,
        cgst: Math.round(totalCgst * 100) / 100,
        sgst: Math.round(totalSgst * 100) / 100,
        total: Math.round(total * 100) / 100,
        paidAmount: Math.round(cappedPaid * 100) / 100,
        notes: form.notes || null,
        items: validItems.map((it) => ({
          productId: it.productId,
          batchNo: it.batchNo || null,
          hsnCode: it.hsnCode || null,
          mfgDate: it.mfgDate || null,
          expiryDate: it.expiryDate || null,
          costPrice: it.costPrice,
          discount: it.discount,
          cgstPercent: it.cgstPercent,
          sgstPercent: it.sgstPercent,
          quantity: it.quantity,
          freeQty: it.freeQty,
        })),
      });
      toast.success("Purchase saved! Stock updated.");
      navigate("/purchases");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Save failed");
    }
  };

  const handleQuickAddDealer = async () => {
    if (!dealerForm.name) { toast.error("Dealer name required"); return; }
    try {
      const res = await dealerApi.create(dealerForm);
      setDealers([...dealers, res.data]);
      setForm({ ...form, dealerId: res.data.id, dealerName: res.data.name });
      setShowAddDealer(false);
      toast.success("Dealer added!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed");
    }
  };

  const handleRecordPayment = async () => {
    if (!purchase || payAmount <= 0) return;
    try {
      await purchaseApi.recordPayment(purchase.id, payAmount, payMode, payNotes || undefined);
      toast.success("Payment recorded!");
      setShowPayment(false);
      setPayMode("cash");
      setPayNotes("");
      loadPurchase();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Payment failed");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  const inp = "w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none text-xs bg-white transition";

  // ─── VIEW MODE ─────────────────────────────────────────────────
  if (isView) {
    const dealer = dealers.find((d) => d.id === form.dealerId);
    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/purchases")} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
              <ArrowLeft className="w-4 h-4 text-gray-500" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-800">{form.invoiceNo}</h1>
              <p className="text-xs text-gray-400">{new Date(form.purchaseDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:flex-shrink-0">
            {purchase && (
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                purchase.paymentStatus === "paid" ? "bg-emerald-50 text-emerald-700" :
                purchase.paymentStatus === "partial" ? "bg-amber-50 text-amber-700" :
                "bg-red-50 text-red-600"
              }`}>
                {purchase.paymentStatus}
              </span>
            )}
            {purchase && Number(purchase.dueAmount) > 0 && (
              <button onClick={() => { setPayAmount(Number(purchase.dueAmount)); setShowPayment(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-xs font-medium hover:bg-primary-100 border border-primary-200 transition">
                <IndianRupee className="w-3 h-3" /> {t.recordPayment}
              </button>
            )}
          </div>
        </div>

        {/* Invoice Meta + Payment Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Dealer & Invoice Info */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-[11px] text-gray-400 mb-0.5">{t.dealer}</p>
                <p className="text-sm font-semibold text-gray-800">{form.dealerName || "—"}</p>
                {dealer?.phone && <p className="text-[11px] text-gray-400">{dealer.phone}</p>}
                {dealer?.gst && <p className="text-[11px] text-gray-400 mt-0.5">GST: {dealer.gst}</p>}
              </div>
              <div>
                <p className="text-[11px] text-gray-400 mb-0.5">{t.invoiceNo}</p>
                <p className="text-sm font-medium text-gray-700">{form.invoiceNo}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 mb-0.5">{t.purchaseDate}</p>
                <p className="text-sm font-medium text-gray-700">{new Date(form.purchaseDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
              </div>
              {form.notes && (
                <div>
                  <p className="text-[11px] text-gray-400 mb-0.5">{t.notes}</p>
                  <p className="text-sm text-gray-600">{form.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Payment Summary */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-2.5">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{t.subtotal}</span>
              <span className="font-medium text-gray-700">₹{subtotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-xs text-gray-500">
                <span>{t.discount}</span>
                <span className="font-medium text-red-500">−₹{totalDiscount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
              </div>
            )}
            {(totalCgst > 0 || totalSgst > 0) && (
              <>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{t.cgst}</span>
                  <span className="font-medium text-gray-600">₹{totalCgst.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{t.sgst}</span>
                  <span className="font-medium text-gray-600">₹{totalSgst.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-sm font-bold text-gray-800 border-t border-gray-200 pt-2">
              <span>{t.grandTotal}</span>
              <span>₹{total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
            </div>
            {purchase && (
              <div className="space-y-1.5 border-t border-gray-100 pt-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">{t.paidAmount}</span>
                  <span className="font-semibold text-emerald-600">₹{Number(purchase.paidAmount).toLocaleString("en-IN")}</span>
                </div>
                {Number(purchase.dueAmount) > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-red-500 font-medium">{t.dueAmount}</span>
                    <span className="font-bold text-red-600">₹{Number(purchase.dueAmount).toLocaleString("en-IN")}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">{t.products} ({items.length})</h2>
          <div className="space-y-3">
            {items.map((item, idx) => {
              const lineAmt = item.costPrice * item.quantity;
              const taxable = lineAmt - item.discount;
              const gstAmt = taxable > 0 ? taxable * (item.cgstPercent + item.sgstPercent) / 100 : 0;
              const itemTotal = taxable + gstAmt;
              return (
                <div key={idx} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Item header: product name + total */}
                  <div className="flex items-center justify-between px-5 py-3 bg-slate-50/70 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{item.productName}</p>
                        {item.hsnCode && <p className="text-[11px] text-gray-400">HSN: {item.hsnCode}</p>}
                      </div>
                    </div>
                    <p className="text-sm font-bold text-gray-800">₹{itemTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p>
                  </div>
                  {/* Item details grid */}
                  <div className="px-5 py-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-x-5 gap-y-3">
                      <DetailCell icon={<Package className="w-3 h-3" />} label={t.quantity} value={`${item.quantity}${item.freeQty ? ` + ${item.freeQty} free` : ""}`} />
                      <DetailCell label={t.costPrice} value={`₹${item.costPrice.toLocaleString("en-IN")}`} />
                      <DetailCell label={t.discount} value={`₹${item.discount.toLocaleString("en-IN")}`} className={item.discount > 0 ? "text-red-500" : undefined} />
                      <DetailCell label={t.cgst} value={`${item.cgstPercent}%`} />
                      <DetailCell label={t.sgst} value={`${item.sgstPercent}%`} />
                      {item.batchNo && <DetailCell icon={<Hash className="w-3 h-3" />} label={t.batchNo} value={item.batchNo} />}
                      {item.mfgDate && <DetailCell icon={<Calendar className="w-3 h-3" />} label={t.mfgDate} value={new Date(item.mfgDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />}
                      {item.expiryDate && <DetailCell icon={<Calendar className="w-3 h-3" />} label={t.expiryDate} value={new Date(item.expiryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment History */}
        {purchase?.payments && purchase.payments.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">{t.paymentHistory} ({purchase.payments.length})</h2>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
              <table className="w-full text-xs min-w-[500px]">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-gray-100 text-[11px] text-gray-400 uppercase tracking-wide">
                    <th className="text-left px-4 py-2.5">#</th>
                    <th className="text-left px-4 py-2.5">{t.date}</th>
                    <th className="text-right px-4 py-2.5">{t.amount}</th>
                    <th className="text-left px-4 py-2.5">{t.paymentMode}</th>
                    <th className="text-left px-4 py-2.5">{t.notes}</th>
                  </tr>
                </thead>
                <tbody>
                  {purchase.payments.map((pay, idx) => (
                    <tr key={pay.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-2.5 text-gray-700">{new Date(pay.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}<span className="text-gray-400 ml-1">{new Date(pay.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span></td>
                      <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">₹{Number(pay.amount).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-medium uppercase">{pay.paymentMode}</span></td>
                      <td className="px-4 py-2.5 text-gray-500">{pay.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPayment && purchase && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowPayment(false)}>
            <div className="bg-white rounded-xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-sm font-bold text-gray-800">{t.recordPayment}</h2>
                  <p className="text-xs text-gray-500">{t.dueAmount}: <span className="font-bold text-red-600">₹{Number(purchase.dueAmount).toLocaleString("en-IN")}</span></p>
                </div>
                <button onClick={() => setShowPayment(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t.paidAmount} (₹)</label>
                  <input type="text" inputMode="decimal" value={payAmount}
                    onChange={(e) => setPayAmount(Math.min(parseFloat(e.target.value) || 0, Number(purchase.dueAmount)))}
                    className={inp + " text-right"} autoFocus />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t.paymentMode}</label>
                  <select value={payMode} onChange={(e) => setPayMode(e.target.value)} className={inp}>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t.notes}</label>
                  <input type="text" value={payNotes} onChange={(e) => setPayNotes(e.target.value)}
                    className={inp} placeholder="Optional..." />
                </div>
                <div className="flex gap-2.5 pt-1">
                  <button onClick={() => setShowPayment(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium">{t.cancel}</button>
                  <button onClick={handleRecordPayment} disabled={payAmount <= 0}
                    className="flex-1 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 shadow-sm disabled:opacity-50">
                    {t.recordPayment}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── CREATE MODE ───────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/purchases")} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">{t.addPurchase}</h1>
      </div>

      {/* Invoice & Dealer Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label={`${t.invoiceNo} *`}>
            <input type="text" value={form.invoiceNo}
              onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })}
              className={inp} placeholder="INV-2026-001" />
          </Field>
          <Field label={t.dealer}>
            <div className="flex gap-1.5">
              <select value={form.dealerId || ""}
                onChange={(e) => {
                  const did = Number(e.target.value);
                  const d = dealers.find((dl) => dl.id === did);
                  setForm({ ...form, dealerId: did || null, dealerName: d?.name || "" });
                }}
                className={inp + " flex-1"}>
                <option value="">-- {t.selectDealer} --</option>
                {dealers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <button onClick={() => { setDealerForm({ name: "", phone: "", gst: "", address: "" }); setShowAddDealer(true); }}
                className="px-2.5 py-1.5 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 transition">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </Field>
          <Field label={t.purchaseDate}>
            <input type="date" value={form.purchaseDate}
              onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
              className={inp} />
          </Field>
          <Field label={t.notes}>
            <input type="text" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className={inp} placeholder="Optional..." />
          </Field>
        </div>
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">{t.products}</h2>
          <button onClick={addItem}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 text-xs font-medium hover:bg-primary-100 border border-primary-200 transition">
            <Plus className="w-3 h-3" /> {t.add}
          </button>
        </div>
        <div className="space-y-3">
          {items.map((item, idx) => {
            const lineAmt = item.costPrice * item.quantity;
            const taxable = lineAmt - item.discount;
            const gst = taxable > 0 ? taxable * (item.cgstPercent + item.sgstPercent) / 100 : 0;
            const itemTotal = taxable + gst;
            return (
              <div key={idx} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
                {/* Row 1: Product selector */}
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[10px] font-bold mt-0.5">{idx + 1}</span>
                  <div className="flex-1">
                    <select value={item.productId || ""}
                      onChange={(e) => updateItem(idx, "productId", Number(e.target.value))}
                      className={inp}>
                      <option value="">-- {t.productName} --</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  {items.length > 1 && (
                    <button onClick={() => removeItem(idx)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition mt-0.5">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Row 2: Batch / HSN / Dates */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pl-8">
                  <Field label={t.batchNo}>
                    <input type="text" value={item.batchNo}
                      onChange={(e) => updateItem(idx, "batchNo", e.target.value)}
                      className={inp} />
                  </Field>
                  <Field label={t.hsnCode}>
                    <input type="text" value={item.hsnCode}
                      onChange={(e) => updateItem(idx, "hsnCode", e.target.value)}
                      className={inp} />
                  </Field>
                  <Field label={t.mfgDate}>
                    <input type="date" value={item.mfgDate}
                      onChange={(e) => updateItem(idx, "mfgDate", e.target.value)}
                      className={inp} />
                  </Field>
                  <Field label={t.expiryDate}>
                    <input type="date" value={item.expiryDate}
                      onChange={(e) => updateItem(idx, "expiryDate", e.target.value)}
                      className={inp} />
                  </Field>
                </div>

                {/* Row 3: Qty / Cost / Discount / GST / Total */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 pl-8">
                  <Field label={t.quantity}>
                    <input type="text" inputMode="numeric" value={item.quantity}
                      onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 0)}
                      className={inp + " text-center"} />
                  </Field>
                  <Field label={t.freeQty}>
                    <input type="text" inputMode="numeric" value={item.freeQty}
                      onChange={(e) => updateItem(idx, "freeQty", parseInt(e.target.value) || 0)}
                      className={inp + " text-center"} />
                  </Field>
                  <Field label={`${t.costPrice} (₹)`}>
                    <input type="text" inputMode="decimal" value={item.costPrice}
                      onChange={(e) => updateItem(idx, "costPrice", parseFloat(e.target.value) || 0)}
                      className={inp + " text-right"} />
                  </Field>
                  <Field label={`${t.discount} (₹)`}>
                    <input type="text" inputMode="decimal" value={item.discount}
                      onChange={(e) => updateItem(idx, "discount", parseFloat(e.target.value) || 0)}
                      className={inp + " text-right"} />
                  </Field>
                  <Field label={t.cgstPercent}>
                    <input type="text" inputMode="decimal" value={item.cgstPercent}
                      onChange={(e) => updateItem(idx, "cgstPercent", parseFloat(e.target.value) || 0)}
                      className={inp + " text-center"} />
                  </Field>
                  <Field label={t.sgstPercent}>
                    <input type="text" inputMode="decimal" value={item.sgstPercent}
                      onChange={(e) => updateItem(idx, "sgstPercent", parseFloat(e.target.value) || 0)}
                      className={inp + " text-center"} />
                  </Field>
                  <div className="col-span-2">
                    <label className="block text-[11px] font-medium text-gray-400 mb-1">{t.total}</label>
                    <p className="px-2.5 py-1.5 text-xs font-bold text-gray-800 text-right bg-slate-50 rounded-lg border border-gray-100">
                      ₹{itemTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Totals & Payment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-2.5">
          <div className="flex justify-between text-xs text-gray-500">
            <span>{t.subtotal}</span>
            <span className="font-medium text-gray-700">₹{subtotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>{t.discount}</span>
              <span className="font-medium text-red-500">−₹{totalDiscount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
            </div>
          )}
          {(totalCgst > 0 || totalSgst > 0) && (
            <>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{t.cgst}</span>
                <span className="font-medium">₹{totalCgst.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{t.sgst}</span>
                <span className="font-medium">₹{totalSgst.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
              </div>
            </>
          )}
          <div className="flex justify-between text-sm font-bold text-gray-800 border-t border-gray-200 pt-2.5">
            <span>{t.grandTotal}</span>
            <span>₹{total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
          </div>
          <div className="pt-1">
            <label className="block text-[11px] font-medium text-gray-400 mb-1">{t.paidAmount} (₹)</label>
            <input type="text" inputMode="decimal" value={form.paidAmount}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setForm({ ...form, paidAmount: Math.min(Math.max(0, val), total) });
              }}
              className={inp + " text-right"} />
          </div>
          {form.paidAmount < total && (
            <p className="text-[11px] text-amber-600">{t.dueAmount}: ₹{(total - form.paidAmount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 max-w-md ml-auto">
        <button onClick={() => navigate("/purchases")}
          className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition">
          {t.cancel}
        </button>
        <button onClick={handleSave}
          className="flex-1 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition shadow-sm">
          {t.save}
        </button>
      </div>

      {/* Quick Add Dealer Modal */}
      {showAddDealer && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAddDealer(false)}>
          <div className="bg-white rounded-xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-gray-800">{t.addDealer}</h2>
              <button onClick={() => setShowAddDealer(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <input type="text" value={dealerForm.name}
                onChange={(e) => setDealerForm({ ...dealerForm, name: e.target.value })}
                placeholder={t.dealerName + " *"}
                className={inp} autoFocus />
              <input type="tel" value={dealerForm.phone}
                onChange={(e) => setDealerForm({ ...dealerForm, phone: e.target.value })}
                placeholder={t.dealerPhone}
                className={inp} />
              <input type="text" value={dealerForm.gst}
                onChange={(e) => setDealerForm({ ...dealerForm, gst: e.target.value })}
                placeholder={t.dealerGst}
                className={inp} />
              <input type="text" value={dealerForm.address}
                onChange={(e) => setDealerForm({ ...dealerForm, address: e.target.value })}
                placeholder={t.dealerAddress}
                className={inp} />
              <div className="flex gap-2.5 pt-1">
                <button onClick={() => setShowAddDealer(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium">{t.cancel}</button>
                <button onClick={handleQuickAddDealer} className="flex-1 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 shadow-sm">{t.save}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Detail Cell (view mode) ──────────────────────────────────────
function DetailCell({ icon, label, value, className }: { icon?: React.ReactNode; label: string; value: string; className?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] text-gray-400 mb-0.5 flex items-center gap-1">
        {icon}{label}
      </p>
      <p className={`text-xs font-medium text-gray-700 truncate ${className || ""}`}>{value}</p>
    </div>
  );
}
