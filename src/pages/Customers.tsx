// ─── Customers Page ──────────────────────────────────────────────
import { useEffect, useState } from "react";
import { Plus, Search, Edit2, Trash2, Phone, MapPin, X, History, ImagePlus } from "lucide-react";
import { customerApi } from "../api/client";
import { useLang } from "../context/LanguageContext";
import { Customer } from "../types";
import toast from "react-hot-toast";

export default function Customers() {
  const { t } = useLang();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", village: "", address: "", photo: "" });

  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async () => {
    try {
      const res = await customerApi.getAll(search || undefined);
      setCustomers(res.data);
    } catch { toast.error("Failed to load customers"); } finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = setTimeout(() => loadCustomers(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const openAddForm = () => {
    setEditCustomer(null);
    setForm({ name: "", phone: "", village: "", address: "", photo: "" });
    setShowForm(true);
  };

  const openEditForm = (c: Customer) => {
    setEditCustomer(c);
    setForm({ name: c.name, phone: c.phone, village: c.village || "", address: c.address || "", photo: c.photo || "" });
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      if (editCustomer) {
        await customerApi.update(editCustomer.id, form);
        toast.success("Customer updated!");
      } else {
        await customerApi.create(form);
        toast.success("Customer added!");
      }
      setShowForm(false);
      loadCustomers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.details?.[0]?.message || "Save failed");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this customer?")) return;
    try {
      await customerApi.delete(id);
      toast.success("Customer deleted!");
      loadCustomers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Delete failed");
    }
  };

  const viewHistory = async (c: Customer) => {
    try {
      const res = await customerApi.getById(c.id);
      setSelectedCustomer(res.data);
      setShowHistory(true);
    } catch {
      toast.error("Failed to load order history");
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Photo must be under 2MB"); return; }
    const reader = new FileReader();
    reader.onloadend = () => setter(reader.result as string);
    reader.readAsDataURL(file);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-xl font-bold text-gray-800">{t.customers}</h1>
        <button onClick={openAddForm} className="flex items-center gap-1.5 px-3.5 py-2 bg-primary-600 text-white rounded-md text-xs font-medium hover:bg-primary-700 transition shadow-sm">
          <Plus className="w-3.5 h-3.5" /> {t.addCustomer}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={t.searchByPhone}
          className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
      </div>

      {/* Customer Cards — horizontal layout, 2 per row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {customers.map((c) => (
          <div key={c.id} className="bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition overflow-hidden flex">
            {/* Customer Photo — left side */}
            <div className="relative w-28 sm:w-36 flex-shrink-0 bg-gradient-to-br from-primary-50 to-primary-50">
              {c.photo ? (
                <img src={c.photo} alt={c.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-4xl font-bold text-primary-300">{c.name.charAt(0).toUpperCase()}</span>
                </div>
              )}
            </div>
            {/* Customer Info — right side */}
            <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
              <div>
                <h3 className="font-semibold text-gray-800 text-sm leading-tight" title={c.name}>{c.name}</h3>
                <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
                  <Phone className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{c.phone}</span>
                </div>
                {c.village && (
                  <div className="flex items-center gap-1 text-gray-400 text-[11px] mt-0.5">
                    <MapPin className="w-2.5 h-2.5 flex-shrink-0" /> <span className="truncate">{c.village}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-1 mt-2">
                <button onClick={() => viewHistory(c)} className="flex-1 py-1.5 rounded bg-slate-50 text-gray-700 text-[11px] font-medium hover:bg-slate-100 transition flex items-center justify-center gap-0.5">
                  <History className="w-3 h-3" /> History
                </button>
                <button onClick={() => openEditForm(c)} className="px-2.5 py-1.5 rounded bg-primary-50 text-primary-700 hover:bg-primary-100 transition"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(c.id)} className="px-2.5 py-1.5 rounded bg-red-50 text-red-700 hover:bg-red-100 transition"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
        {customers.length === 0 && (
          <div className="col-span-full text-center py-8 text-gray-400 text-sm">{t.noData}</div>
        )}
      </div>

      {/* ─── Customer Form Modal ─────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-lg w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-gray-800">{editCustomer ? t.editCustomer : t.addCustomer}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              {/* Photo Upload */}
              <div className="flex flex-col items-center gap-2">
                {form.photo ? (
                  <img src={form.photo} alt="Preview" className="w-32 h-32 rounded-full object-cover border-2 border-primary-200 shadow" />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-slate-50 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
                    <ImagePlus className="w-8 h-8 text-gray-300 mb-1" />
                    <span className="text-[10px] text-gray-400">Add Photo</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer px-3 py-1.5 rounded-md bg-primary-50 text-primary-700 text-xs font-medium hover:bg-primary-100 transition">
                    Choose Photo
                    <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, (val) => setForm({ ...form, photo: val }))} className="hidden" />
                  </label>
                  {form.photo && <button type="button" onClick={() => setForm({ ...form, photo: "" })} className="text-xs text-red-500 hover:underline">Remove</button>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.customerName} *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 outline-none text-sm" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.phone} *</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 outline-none text-sm" placeholder="9876543210" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.village}</label>
                <input type="text" value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.address}</label>
                <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 outline-none text-sm" rows={2} />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-md border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition">{t.cancel}</button>
                <button onClick={handleSave} className="flex-1 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition shadow-sm">{t.save}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Order History Modal ──────────────────────────────── */}
      {showHistory && selectedCustomer && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowHistory(false)}>
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-3">
                {selectedCustomer.photo ? (
                  <img src={selectedCustomer.photo} alt={selectedCustomer.name} className="w-14 h-14 rounded-full object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-primary-50 flex items-center justify-center text-primary-700 text-xl font-bold">{selectedCustomer.name.charAt(0).toUpperCase()}</div>
                )}
                <div>
                  <h2 className="text-sm font-bold text-gray-800">{selectedCustomer.name}</h2>
                  <p className="text-xs text-gray-500">{selectedCustomer.phone}</p>
                </div>
              </div>
              <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
            </div>
            <h3 className="font-medium text-gray-700 mb-2 text-xs">{t.orderHistory}</h3>
            <div className="space-y-2">
              {(selectedCustomer.orders || []).length === 0 ? (
                <p className="text-gray-400 text-center py-4 text-xs">{t.noData}</p>
              ) : (
                selectedCustomer.orders!.map((o) => (
                  <div key={o.id} className="bg-slate-50 rounded-md p-2.5">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-gray-800 text-sm">{o.orderNo}</span>
                      <span className="font-semibold text-gray-800 text-sm">₹{Number(o.total).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{new Date(o.createdAt).toLocaleDateString("en-IN")}</span>
                      <span className={`capitalize font-medium ${
                        o.status === "cancelled" ? "text-red-500"
                        : o.paymentStatus === "partial" ? "text-amber-600"
                        : o.paymentStatus === "unpaid" ? "text-red-500"
                        : "text-emerald-600"
                      }`}>
                        {o.status === "cancelled" ? t.cancelled : o.paymentStatus === "partial" ? t.partial : o.paymentStatus === "unpaid" ? t.unpaid : t.completed}
                      </span>
                    </div>
                    {Number(o.dueAmount) > 0 && o.status !== "cancelled" && (
                      <div className="flex justify-between text-xs mt-0.5">
                        <span className="text-gray-500">{t.paidAmount}: ₹{Number(o.paidAmount).toLocaleString("en-IN")}</span>
                        <span className="text-red-600 font-semibold">{t.dueAmount}: ₹{Number(o.dueAmount).toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    {o.items && (
                      <div className="mt-1.5 text-[11px] text-gray-500 space-y-0.5">
                        {o.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{item.product?.name} x {Number(item.quantity)}</span>
                            <span>₹{Number(item.total).toLocaleString("en-IN")}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
