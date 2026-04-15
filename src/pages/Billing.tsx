// ─── Billing Page (2-Step: Add Items + Review) ──────────────────
import { useEffect, useState } from "react";
import {
  Search, Plus, Minus, Trash2, User, ShoppingCart, Receipt,
  ArrowRight, ArrowLeft, Check, Phone, UserPlus, Package
} from "lucide-react";
import { productApi, customerApi, orderApi, stockBookApi } from "../api/client";
import { useLang } from "../context/LanguageContext";
import { Product, Customer, CartItem, AvailableBatch } from "../types";
import { shopConfig } from "../config/shopConfig";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

// Unique key per cart line (product + batch)
const cartKey = (item: CartItem) =>
  `${item.product.id}_${item.purchaseItemId ?? "none"}`;

export default function Billing() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Step 1: Customer
  const [phoneSearch, setPhoneSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Step 2: Products
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  // Step 3: Summary
  const [paidAmount, setPaidAmount] = useState<number | null>(null);
  const [paymentMode, setPaymentMode] = useState<"cash" | "upi">("cash");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Quick add customer
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickForm, setQuickForm] = useState({ name: "", phone: "", village: "" });
  const [searchingCustomers, setSearchingCustomers] = useState(false);

  // Batch selection
  const [batchProduct, setBatchProduct] = useState<Product | null>(null);
  const [batches, setBatches] = useState<AvailableBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    try {
      const res = await productApi.getAll();
      setProducts(res.data);
    } catch { toast.error("Failed to load products"); }
  };

  const searchCustomers = async (query: string) => {
    if (query.length < 3) { setSearchingCustomers(false); return; }
    setSearchingCustomers(true);
    try {
      const res = await customerApi.getAll(query);
      setCustomers(res.data);
    } catch { /* ignore */ } finally { setSearchingCustomers(false); }
  };

  useEffect(() => {
    const timer = setTimeout(() => searchCustomers(phoneSearch), 300);
    return () => clearTimeout(timer);
  }, [phoneSearch]);

  const filteredProducts = products.filter(
    (p) =>
      productSearch === "" ||
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.nameTe && p.nameTe.includes(productSearch))
  );

  // ─── Cart Management (multi-batch) ────────────────────
  const addToCart = (product: Product) => {
    // Always open batch selector — allows picking different batches for same product
    setBatchProduct(product);
    setLoadingBatches(true);
    stockBookApi.getAvailableBatches(product.id)
      .then((res) => {
        // Subtract quantities already in cart from available
        const batchesInCart = cart
          .filter((c) => c.product.id === product.id && c.purchaseItemId)
          .reduce((acc, c) => {
            acc[c.purchaseItemId!] = (acc[c.purchaseItemId!] || 0) + c.quantity;
            return acc;
          }, {} as Record<number, number>);
        const available = res.data.map((b: AvailableBatch) => ({
          ...b,
          availableQty: b.availableQty - (batchesInCart[b.purchaseItemId] || 0),
        })).filter((b: AvailableBatch) => b.availableQty > 0);
        setBatches(available);
      })
      .catch(() => setBatches([]))
      .finally(() => setLoadingBatches(false));
  };

  // Compute item total including tax
  const calcItemTotal = (qty: number, price: number, cgst: number, sgst: number) =>
    Math.round(qty * price * (1 + cgst / 100 + sgst / 100) * 100) / 100;

  const selectBatch = (product: Product, batch?: AvailableBatch) => {
    const cgst = product.cgstPercent ?? 2.5;
    const sgst = product.sgstPercent ?? 2.5;
    const newItem: CartItem = {
      product,
      quantity: 1,
      price: Number(product.price),
      total: calcItemTotal(1, Number(product.price), cgst, sgst),
      cgstPercent: cgst,
      sgstPercent: sgst,
      purchaseItemId: batch?.purchaseItemId || null,
      hsnCode: batch?.hsnCode || null,
      batchNo: batch?.batchNo || null,
      mfgDate: batch?.mfgDate || null,
      expiryDate: batch?.expiryDate || null,
      maxAvailableQty: batch?.availableQty ?? null,
    };
    const key = cartKey(newItem);

    // If same product+batch already in cart, increment
    const existingIdx = cart.findIndex((c) => cartKey(c) === key);
    if (existingIdx >= 0) {
      const existing = cart[existingIdx];
      const maxQty = batch ? batch.availableQty : existing.maxAvailableQty;
      if (maxQty != null && existing.quantity >= maxQty) {
        toast.error(`Only ${maxQty} available`);
        setBatchProduct(null); setBatches([]);
        return;
      }
      const updated = [...cart];
      updated[existingIdx] = {
        ...existing,
        quantity: existing.quantity + 1,
        total: calcItemTotal(existing.quantity + 1, existing.price, existing.cgstPercent, existing.sgstPercent),
      };
      setCart(updated);
    } else {
      setCart([...cart, newItem]);
    }
    setBatchProduct(null);
    setBatches([]);
  };

  const updateQuantity = (key: string, qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter((c) => cartKey(c) !== key));
      return;
    }
    const item = cart.find((c) => cartKey(c) === key);
    if (!item) return;
    if (item.maxAvailableQty != null && qty > item.maxAvailableQty) {
      toast.error(`Only ${item.maxAvailableQty} available`);
      return;
    }
    setCart(
      cart.map((c) =>
        cartKey(c) === key ? { ...c, quantity: qty, total: calcItemTotal(qty, c.price, c.cgstPercent, c.sgstPercent) } : c
      )
    );
  };

  const removeFromCart = (key: string) => {
    setCart(cart.filter((c) => cartKey(c) !== key));
  };

  const updateCartItemPrice = (key: string, newPrice: number) => {
    setCart(cart.map((c) =>
      cartKey(c) === key ? { ...c, price: newPrice, total: calcItemTotal(c.quantity, newPrice, c.cgstPercent, c.sgstPercent) } : c
    ));
  };

  const updateCartItemTax = (key: string, field: "cgstPercent" | "sgstPercent", value: number) => {
    setCart(cart.map((c) => {
      if (cartKey(c) !== key) return c;
      const updated = { ...c, [field]: value };
      return { ...updated, total: calcItemTotal(updated.quantity, updated.price, updated.cgstPercent, updated.sgstPercent) };
    }));
  };

  const total = cart.reduce((sum, item) => sum + item.total, 0);
  const totalBase = Math.round(cart.reduce((sum, item) => sum + item.quantity * item.price, 0) * 100) / 100;
  const totalCgst = Math.round(cart.reduce((sum, item) => sum + item.quantity * item.price * item.cgstPercent / 100, 0) * 100) / 100;
  const totalSgst = Math.round(cart.reduce((sum, item) => sum + item.quantity * item.price * item.sgstPercent / 100, 0) * 100) / 100;

  // ─── Quick Add Customer ────────────────────────────────
  const handleQuickAdd = async () => {
    try {
      const res = await customerApi.create(quickForm);
      setSelectedCustomer(res.data);
      setShowQuickAdd(false);
      toast.success("Customer added!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to add customer");
    }
  };

  // ─── Submit Order ──────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedCustomer) { toast.error("Please select a customer"); return; }
    if (cart.length === 0) { toast.error("Add at least one item"); return; }
    setSubmitting(true);
    try {
      const orderData = {
        customerId: selectedCustomer?.id || null,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.price,
          purchaseItemId: item.purchaseItemId || null,
          hsnCode: item.hsnCode || null,
          batchNo: item.batchNo || null,
          mfgDate: item.mfgDate || null,
          expiryDate: item.expiryDate || null,
        })),
        paidAmount: paidAmount ?? total,
        paymentMode,
        orderDate: orderDate !== new Date().toISOString().split("T")[0] ? orderDate : undefined,
        notes: notes || undefined,
      };

      const res = await orderApi.create(orderData);
      toast.success(t.billSuccess);
      navigate(`/orders/${res.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to create bill");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Step indicator ────────────────────────────────────
  const steps = [
    { num: 1, label: t.addItems, icon: ShoppingCart },
    { num: 2, label: t.billSummary, icon: Receipt },
  ];

  const cartQty = cart.reduce((s, c) => s + c.quantity, 0);

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)]">
      <h1 className="text-xl font-bold text-gray-800 mb-4 shrink-0">{t.createBill}</h1>

      {/* ─── Step Indicator ─────────────────────────────────── */}
      <div className="flex items-center gap-1.5 sm:gap-0 sm:justify-between bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-100 shrink-0 mb-3">
        {steps.map((s, idx) => (
          <div key={s.num} className="flex items-center gap-1.5">
            <button
              onClick={() => s.num < step && setStep(s.num)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-xs font-medium ${
                step === s.num
                  ? "bg-primary-600 text-white shadow-sm"
                  : step > s.num
                  ? "bg-primary-50 text-primary-700 hover:bg-primary-100"
                  : "bg-gray-50 text-gray-400"
              }`}
            >
              <s.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{s.num}</span>
            </button>
            {idx < steps.length - 1 && (
              <ArrowRight className="w-3 h-3 text-gray-300 mx-0.5 hidden sm:block" />
            )}
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* STEP 1: Customer + Add Products (combined)             */}
      {/* ═══════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="flex flex-col flex-1 min-h-0 gap-3">
          {/* ─── Customer Section (compact) ───────────────── */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden shrink-0">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-slate-50">
              <h3 className="font-medium text-slate-700 text-xs flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary-600" /> {t.customer}
              </h3>
            </div>
            <div className="p-3">
              {selectedCustomer ? (
                <div className="flex gap-2 items-center">
                  <div className="w-1/4 shrink-0">
                    <input type="date" value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                      className="w-full px-2.5 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 outline-none text-xs" />
                  </div>
                  <div className="w-1/2 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-emerald-800 text-xs">{selectedCustomer.name}</p>
                      <p className="text-[10px] text-emerald-600">{selectedCustomer.phone} {selectedCustomer.village ? `• ${selectedCustomer.village}` : ""}</p>
                    </div>
                    <button onClick={() => { setSelectedCustomer(null); setPhoneSearch(""); }} className="text-emerald-500 hover:text-red-500 transition text-xs font-medium">✕</button>
                  </div>
                  <div className="w-1/4 shrink-0" />
                </div>
              ) : (
                <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="w-1/4 shrink-0">
                    <input type="date" value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                      className="w-full px-2.5 py-1.5 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 outline-none text-xs" />
                  </div>
                  <div className="relative w-1/2">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text" value={phoneSearch} onChange={(e) => setPhoneSearch(e.target.value)}
                      placeholder={t.searchByPhone}
                      className="w-full pl-8 pr-3 py-1.5 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 outline-none text-xs"
                    />
                  </div>
                  <button onClick={() => { setQuickForm({ name: "", phone: "", village: "" }); setShowQuickAdd(true); }}
                    className="w-1/4 flex items-center justify-center gap-1 px-2 py-1.5 bg-primary-50 text-primary-700 rounded-md text-[10px] font-medium hover:bg-primary-100 border border-primary-200 transition whitespace-nowrap">
                    <UserPlus className="w-3 h-3" /> Add New
                  </button>
                </div>

                  {phoneSearch.length >= 3 && (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {searchingCustomers ? (
                        <div className="flex items-center justify-center py-3">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                        </div>
                      ) : customers.length > 0 ? (
                        customers.map((c) => (
                          <button key={c.id} onClick={() => setSelectedCustomer(c)}
                            className="w-full text-left rounded-md px-3 py-2 hover:bg-primary-50 border border-gray-100 hover:border-primary-200 transition-all">
                            <p className="font-medium text-gray-800 text-xs">{c.name}</p>
                            <p className="text-[10px] text-gray-500">{c.phone} {c.village ? `• ${c.village}` : ""}</p>
                          </button>
                        ))
                      ) : (
                        <div className="text-center py-2">
                          <p className="text-gray-400 text-[10px]">No customer found</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ─── Product Search ─────────────────────────────── */}
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" value={productSearch} onChange={(e) => setProductSearch(e.target.value)}
              placeholder={`${t.search} products...`}
              className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 outline-none text-sm bg-white shadow-sm"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 flex-1 min-h-0">
            {/* Product List */}
            <div className="lg:col-span-3 space-y-1.5 overflow-y-auto pr-1">
              {filteredProducts.map((p) => {
                const inCartItems = cart.filter((c) => c.product.id === p.id);
                const inCartTotal = inCartItems.reduce((s, c) => s + c.quantity, 0);
                return (
                  <div key={p.id} className={`bg-white rounded-md px-3 py-2.5 shadow-sm border transition-all hover:shadow ${inCartTotal > 0 ? "border-primary-200 bg-primary-50/20" : "border-gray-100"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm">{p.name}</p>
                        {p.nameTe && <p className="text-[11px] text-gray-400">{p.nameTe}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-semibold text-gray-700">₹{Number(p.price).toLocaleString("en-IN")}/{(t as any)[p.unit] || p.unit}</span>
                          {inCartTotal > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-100 text-primary-700 font-medium">
                              In cart: {inCartTotal}
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => addToCart(p)}
                        className="px-3 py-1.5 rounded-md bg-primary-600 text-white font-medium hover:bg-primary-700 transition text-xs flex items-center gap-1 shadow-sm flex-shrink-0">
                        <Plus className="w-3 h-3" /> {t.add}
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredProducts.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-1.5 opacity-30" />
                  <p className="text-xs">{t.noData}</p>
                </div>
              )}
            </div>

            {/* Cart Summary Panel */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-gray-100">
                <h3 className="font-medium text-slate-700 text-xs flex items-center gap-1.5">
                  <ShoppingCart className="w-3.5 h-3.5 text-primary-600" /> Cart
                  {cart.length > 0 && (
                    <span className="ml-auto text-[10px] bg-primary-600 text-white px-1.5 py-0.5 rounded-full">{cartQty}</span>
                  )}
                </h3>
              </div>
              <div className="p-3 flex flex-col flex-1 min-h-0">
                {cart.length === 0 ? (
                  <p className="text-gray-400 text-xs text-center py-4">No items added yet</p>
                ) : (
                  <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0">
                    {cart.map((item) => {
                      const key = cartKey(item);
                      return (
                        <div key={key} className="flex items-center justify-between bg-slate-50 rounded px-2.5 py-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 text-xs truncate">{item.product.name}</p>
                            {item.batchNo && <p className="text-[10px] text-primary-500 truncate">Batch: {item.batchNo}</p>}
                            <p className="text-[11px] text-gray-400">{item.quantity} × ₹{item.price.toLocaleString("en-IN")}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <div className="flex items-center gap-0.5 bg-white rounded border border-gray-200 p-0.5">
                              <button onClick={() => updateQuantity(key, item.quantity - 1)}
                                className="w-5 h-5 rounded bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition">
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <span className="w-5 text-center font-semibold text-[10px]">{item.quantity}</span>
                              <button onClick={() => updateQuantity(key, item.quantity + 1)}
                                className="w-5 h-5 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition">
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>
                            <span className="font-semibold text-[10px] text-gray-700 w-14 text-right">₹{item.total.toLocaleString("en-IN")}</span>
                            <button onClick={() => removeFromCart(key)} className="text-red-400 hover:text-red-600 transition p-0.5">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {cart.length > 0 && (
                  <div className="border-t border-gray-100 mt-auto pt-2.5 shrink-0">
                    <div className="flex justify-between items-center font-semibold text-sm text-gray-800">
                      <span>{t.total}</span>
                      <span className="text-primary-700">₹{total.toLocaleString("en-IN")}</span>
                    </div>
                    <button onClick={() => { if (!selectedCustomer) { toast.error("Please select a customer"); return; } if (cart.length === 0) { toast.error("Add at least one item"); return; } setStep(2); }}
                      className="w-full mt-3 py-2 bg-primary-600 text-white rounded-md text-xs font-medium hover:bg-primary-700 transition flex items-center justify-center gap-1.5 shadow-sm">
                      {t.billSummary} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* STEP 2: Review & Confirm                               */}
      {/* ═══════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-y-auto flex-1 min-h-0">
          {/* Shop header */}
          <div className="text-center px-5 py-3 border-b border-gray-100 bg-slate-50">
            <p className="font-bold text-primary-800 text-sm">{shopConfig.name}</p>
            <p className="text-[10px] text-gray-500">{shopConfig.nameTe}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{shopConfig.address}</p>
            <p className="text-[10px] text-gray-400">{t.phone}: {shopConfig.phone}</p>
            <p className="text-[10px] font-semibold text-gray-500 mt-0.5">{t.gstin}: {shopConfig.gst}</p>
          </div>

          {/* Customer info banner */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-primary-700" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t.billTo}</p>
              <p className="font-medium text-gray-800 text-sm">
                {selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.phone})` : "No customer selected"}
              </p>
              {selectedCustomer?.village && (
                <p className="text-[10px] text-gray-400">{selectedCustomer.village}</p>
              )}
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Items table */}
            <div>
              <h3 className="font-medium text-gray-700 text-xs mb-2">{t.addItems} ({cart.length} {cart.length > 1 ? "lines" : "line"})</h3>
              <div className="border border-gray-100 rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-left text-gray-500">
                      <th className="px-3 py-2 font-medium">{t.productName}</th>
                      <th className="px-3 py-2 font-medium">{t.batchNo || "Batch"}</th>
                      <th className="px-3 py-2 font-medium text-center">{t.quantity}</th>
                      <th className="px-3 py-2 font-medium text-right">{t.price}</th>
                      <th className="px-3 py-2 font-medium text-center">CGST%</th>
                      <th className="px-3 py-2 font-medium text-center">SGST%</th>
                      <th className="px-3 py-2 font-medium text-right">{t.itemTotal}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {cart.map((item) => {
                      const key = cartKey(item);
                      return (
                      <tr key={key} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-gray-800">{item.product.name}</p>
                          <p className="text-[10px] text-gray-400">per {(t as any)[item.product.unit] || item.product.unit}</p>
                        </td>
                        <td className="px-3 py-2.5">
                          {item.batchNo ? (
                            <div>
                              <p className="text-[11px] font-medium text-gray-600">{item.batchNo}</p>
                              {item.hsnCode && <p className="text-[10px] text-gray-400">HSN: {item.hsnCode}</p>}
                              {item.expiryDate && <p className="text-[10px] text-gray-400">Exp: {new Date(item.expiryDate).toLocaleDateString("en-IN")}</p>}
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center text-gray-600">{item.quantity}</td>
                        <td className="px-3 py-2.5 text-right">
                          <input type="number" value={item.price}
                            onChange={(e) => updateCartItemPrice(key, parseFloat(e.target.value) || 0)}
                            className="w-20 px-1.5 py-1 rounded border border-gray-200 text-right text-xs focus:ring-1 focus:ring-primary-500 outline-none" min="0" step="1" />
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <input type="number" value={item.cgstPercent}
                            onChange={(e) => updateCartItemTax(key, "cgstPercent", parseFloat(e.target.value) || 0)}
                            className="w-14 px-1.5 py-1 rounded border border-gray-200 text-center text-xs focus:ring-1 focus:ring-primary-500 outline-none" min="0" max="100" step="0.5" />
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <input type="number" value={item.sgstPercent}
                            onChange={(e) => updateCartItemTax(key, "sgstPercent", parseFloat(e.target.value) || 0)}
                            className="w-14 px-1.5 py-1 rounded border border-gray-200 text-center text-xs focus:ring-1 focus:ring-primary-500 outline-none" min="0" max="100" step="0.5" />
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-gray-800">₹{item.total.toLocaleString("en-IN")}</td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">{t.paidAmount} (₹)</label>
                <input type="number"
                  value={paidAmount ?? total}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setPaidAmount(isNaN(val) ? 0 : Math.min(val, total));
                  }}
                  className="w-full px-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" min="0" max={total} />
                {(paidAmount !== null && paidAmount < total) && (
                  <p className="text-[10px] text-amber-600 mt-1">
                    {t.dueAmount}: ₹{(total - paidAmount).toLocaleString("en-IN")}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">{t.paymentMode}</label>
                <div className="flex gap-1.5">
                  {(["cash", "upi"] as const).map((mode) => (
                    <button key={mode} onClick={() => setPaymentMode(mode)}
                      className={`flex-1 py-2 rounded-md font-medium transition-all text-xs ${
                        paymentMode === mode
                          ? "bg-primary-600 text-white shadow-sm"
                          : "bg-slate-50 text-gray-600 hover:bg-slate-100 border border-gray-200"
                      }`}>
                      {(t as any)[mode]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">{t.notes}</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                placeholder="Optional notes..." />
            </div>

            {/* Totals with GST */}
            <div className="bg-slate-50 rounded-md p-4 space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>{t.taxableAmount}</span>
                <span className="font-medium text-gray-700">₹{totalBase.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{t.cgst}</span>
                <span>₹{totalCgst.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{t.sgst}</span>
                <span>₹{totalSgst.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-800 border-t border-gray-200 pt-2">
                <span>{t.grandTotal}</span>
                <span>₹{total.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
          </div>

          {/* Action Buttons - Fixed at bottom */}
          <div className="flex gap-2.5 pt-3 shrink-0">
            <button onClick={() => setStep(1)}
              className="flex-1 py-2 rounded-md border border-gray-200 bg-white text-gray-600 text-xs font-medium hover:bg-gray-50 transition flex items-center justify-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> {t.back}
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              className="flex-1 py-2 bg-primary-600 text-white rounded-md font-medium text-xs hover:bg-primary-700 transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50">
              {submitting ? "..." : (<><Check className="w-3.5 h-3.5" /> {t.generateBill}</>)}
            </button>
          </div>
        </div>
      )}

      {/* ─── Batch Selection Modal ───────────────────────── */}
      {batchProduct && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setBatchProduct(null); setBatches([]); }}>
          <div className="bg-white rounded-lg w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-slate-50 px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Package className="w-4 h-4 text-primary-600" />
              <div>
                <h2 className="text-sm font-bold text-gray-800">{t.selectBatch || "Select Batch"}</h2>
                <p className="text-[11px] text-gray-500">{batchProduct.name}</p>
              </div>
            </div>
            <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
              {loadingBatches ? (
                <div className="flex items-center justify-center py-6"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div></div>
              ) : batches.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs text-gray-400">No batches available. Add purchase first.</p>
                </div>
              ) : (
                <>
                  {batches.map((b) => (
                    <button key={b.purchaseItemId} onClick={() => selectBatch(batchProduct, b)}
                      className="w-full text-left rounded-md p-3 border border-gray-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800 text-xs">{b.batchNo || "No batch #"}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">
                          Avail: {b.availableQty}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                        {b.hsnCode && <span className="text-[10px] text-gray-500">HSN: {b.hsnCode}</span>}
                        <span className="text-[10px] text-gray-500">Invoice: {b.invoice}</span>
                        <span className="text-[10px] text-gray-500">Dealer: {b.dealer}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {b.mfgDate && <span className="text-[10px] text-gray-400">MFG: {new Date(b.mfgDate).toLocaleDateString("en-IN")}</span>}
                        {b.expiryDate && <span className="text-[10px] text-gray-400">EXP: {new Date(b.expiryDate).toLocaleDateString("en-IN")}</span>}
                        <span className="text-[10px] text-gray-400">Cost: ₹{b.costPrice}</span>
                      </div>
                    </button>
                  ))}

                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Quick Add Customer Modal ─────────────────────── */}
      {showQuickAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowQuickAdd(false)}>
          <div className="bg-white rounded-lg w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-sm font-bold text-gray-800 mb-3">Quick Add Customer</h2>
            <div className="space-y-2.5">
              <input type="text" value={quickForm.name} onChange={(e) => setQuickForm({ ...quickForm, name: e.target.value })}
                placeholder={t.customerName + " *"} className="w-full px-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 outline-none text-sm" autoFocus />
              <input type="tel" value={quickForm.phone} onChange={(e) => setQuickForm({ ...quickForm, phone: e.target.value })}
                placeholder={t.phone + " *"} className="w-full px-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 outline-none text-sm" />
              <input type="text" value={quickForm.village} onChange={(e) => setQuickForm({ ...quickForm, village: e.target.value })}
                placeholder={t.village} className="w-full px-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 outline-none text-sm" />
              <div className="flex gap-2.5 pt-1">
                <button onClick={() => setShowQuickAdd(false)} className="flex-1 py-2 rounded-md border border-gray-200 text-gray-600 text-sm font-medium">{t.cancel}</button>
                <button onClick={handleQuickAdd} className="flex-1 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 shadow-sm">{t.save}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
