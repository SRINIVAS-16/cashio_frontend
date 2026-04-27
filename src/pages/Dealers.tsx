// ─── Dealers Management Page ─────────────────────────────────────
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Search, Phone, MapPin, FileText } from "lucide-react";
import { dealerApi } from "../api/client";
import { useLang } from "../context/LanguageContext";
import { usePermissions } from "../context/PermissionContext";
import { Dealer } from "../types";
import toast from "react-hot-toast";

export default function Dealers() {
  const { t } = useLang();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission("dealers", "create");
  const canUpdate = hasPermission("dealers", "update");
  const canDelete = hasPermission("dealers", "delete");
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Dealer | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", gst: "", address: "" });

  useEffect(() => { loadDealers(); }, []);

  const loadDealers = async () => {
    try {
      setLoading(true);
      const res = await dealerApi.getAll(search || undefined);
      setDealers(res.data);
    } catch { toast.error("Failed to load dealers"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const t = setTimeout(() => loadDealers(), 300);
    return () => clearTimeout(t);
  }, [search]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", phone: "", gst: "", address: "" });
    setShowModal(true);
  };

  const openEdit = (d: Dealer) => {
    setEditing(d);
    setForm({ name: d.name, phone: d.phone || "", gst: d.gst || "", address: d.address || "" });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Dealer name required"); return; }
    try {
      if (editing) {
        await dealerApi.update(editing.id, form);
        toast.success("Dealer updated!");
      } else {
        await dealerApi.create(form);
        toast.success("Dealer added!");
      }
      setShowModal(false);
      loadDealers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Save failed");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Deactivate this dealer?")) return;
    try {
      await dealerApi.delete(id);
      toast.success("Dealer deactivated");
      loadDealers();
    } catch { toast.error("Delete failed"); }
  };

  if (loading && dealers.length === 0) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{t.dealers || "Dealers"}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{t.dealersDesc || "Manage your suppliers and dealers"}</p>
        </div>
        {canCreate && (
          <button onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 transition shadow-sm">
            <Plus className="w-3.5 h-3.5" /> {t.addDealer}
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={`${t.search || "Search"}...`}
          className="w-full pl-8 pr-3 py-2 rounded-md border border-gray-200 text-xs focus:ring-1 focus:ring-primary-500 outline-none" />
      </div>

      {/* Empty */}
      {dealers.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-100">
          <p className="text-sm text-gray-500">{t.noDealers || "No dealers found"}</p>
        </div>
      )}

      {/* Desktop table */}
      {dealers.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-gray-100">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500">{t.dealerName}</th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500">{t.dealerPhone}</th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500">{t.dealerGst}</th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500">{t.dealerAddress}</th>
                  <th className="px-3 py-2.5 text-right font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dealers.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2.5 font-medium text-gray-800">{d.name}</td>
                    <td className="px-3 py-2.5 text-gray-600">{d.phone || "-"}</td>
                    <td className="px-3 py-2.5 text-gray-500 font-mono text-[11px]">{d.gst || "-"}</td>
                    <td className="px-3 py-2.5 text-gray-500 max-w-[200px] truncate">{d.address || "-"}</td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canUpdate && <button onClick={() => openEdit(d)} className="p-1.5 rounded hover:bg-primary-50 text-primary-600"><Pencil className="w-3 h-3" /></button>}
                        {canDelete && <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 className="w-3 h-3" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-50">
            {dealers.map((d) => (
              <div key={d.id} className="p-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{d.name}</p>
                    <div className="mt-1 space-y-0.5">
                      {d.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Phone className="w-3 h-3" /> {d.phone}
                        </div>
                      )}
                      {d.gst && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <FileText className="w-3 h-3" /> {d.gst}
                        </div>
                      )}
                      {d.address && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <MapPin className="w-3 h-3" /> {d.address}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {canUpdate && <button onClick={() => openEdit(d)} className="p-1.5 rounded hover:bg-primary-50 text-primary-600"><Pencil className="w-3.5 h-3.5" /></button>}
                    {canDelete && <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-lg w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-gray-800">{editing ? (t.editDealer || "Edit Dealer") : t.addDealer}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.dealerName} *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm outline-none focus:ring-1 focus:ring-primary-500" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.dealerPhone}</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm outline-none focus:ring-1 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.dealerGst}</label>
                <input type="text" value={form.gst} onChange={(e) => setForm({ ...form, gst: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="e.g. 36AXXPB1234C1ZQ" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.dealerAddress}</label>
                <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm outline-none focus:ring-1 focus:ring-primary-500" rows={2} />
              </div>
              <div className="flex gap-2.5 pt-1">
                <button onClick={() => setShowModal(false)} className="flex-1 py-2 rounded-md border border-gray-200 text-gray-600 text-sm font-medium">{t.cancel}</button>
                <button onClick={handleSave} className="flex-1 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 shadow-sm">{t.save}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
