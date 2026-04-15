// ─── Custom Fields Management Page ───────────────────────────────
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Search, Filter } from "lucide-react";
import { customFieldApi } from "../api/client";
import { useLang } from "../context/LanguageContext";
import { CustomFieldDefinition } from "../types";
import toast from "react-hot-toast";

const fieldTypes = ["text", "number", "date", "select", "textarea"];
const categoryOptions = ["fertilizer", "pesticide", "seeds", "organic", "micronutrient", "growth_promoter", "soil_amendment", "equipment", "general"];

const typeColors: Record<string, string> = {
  text: "bg-primary-50 text-primary-700",
  number: "bg-emerald-50 text-emerald-700",
  date: "bg-amber-50 text-amber-700",
  select: "bg-purple-50 text-purple-700",
  textarea: "bg-slate-100 text-slate-700",
};

export default function CustomFields() {
  const { t, lang } = useLang();
  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [search, setSearch] = useState("");
  const [filterScope, setFilterScope] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CustomFieldDefinition | null>(null);
  const [form, setForm] = useState({
    name: "", label: "", labelTe: "", fieldType: "text",
    options: "", isRequired: false, scope: "global", category: "", sortOrder: 0,
  });

  useEffect(() => { loadFields(true); }, []);
  useEffect(() => { if (!loading) loadFields(false); }, [filterScope, filterCategory]);

  const loadFields = async (initial = false) => {
    try {
      if (initial) setLoading(true);
      else setFiltering(true);
      const res = await customFieldApi.getAll(filterScope || undefined, filterCategory || undefined);
      setFields(res.data);
    } catch { toast.error("Failed to load fields"); }
    finally { setLoading(false); setFiltering(false); }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", label: "", labelTe: "", fieldType: "text", options: "", isRequired: false, scope: "global", category: "", sortOrder: 0 });
    setShowModal(true);
  };

  const openEdit = (f: CustomFieldDefinition) => {
    setEditing(f);
    setForm({
      name: f.name, label: f.label, labelTe: f.labelTe || "", fieldType: f.fieldType,
      options: f.options || "", isRequired: f.isRequired, scope: f.scope, category: f.category || "", sortOrder: f.sortOrder,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.label) { toast.error("Label is required"); return; }
    if (form.scope === "category" && !form.category) { toast.error("Select a category"); return; }
    if (form.fieldType === "select" && form.options) {
      try { JSON.parse(form.options); } catch { toast.error('Options must be a JSON array, e.g. ["A","B"]'); return; }
    }

    try {
      if (editing) {
        await customFieldApi.update(editing.id, {
          label: form.label, labelTe: form.labelTe || null, fieldType: form.fieldType,
          options: form.options || null, isRequired: form.isRequired, sortOrder: form.sortOrder,
        });
        toast.success("Field updated!");
      } else {
        const name = form.name || form.label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");
        await customFieldApi.create({
          ...form, name, labelTe: form.labelTe || null,
          options: form.options || null, category: form.scope === "category" ? form.category : null,
        });
        toast.success("Field created!");
      }
      setShowModal(false);
      loadFields();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Save failed");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Deactivate this field? Existing values will be kept.")) return;
    try {
      await customFieldApi.delete(id);
      toast.success("Field deactivated");
      loadFields();
    } catch { toast.error("Delete failed"); }
  };

  const filtered = fields.filter((f) => {
    const q = search.toLowerCase();
    return !q || f.name.toLowerCase().includes(q) || f.label.toLowerCase().includes(q) || (f.labelTe || "").toLowerCase().includes(q);
  });

  const globalFields = filtered.filter((f) => f.scope === "global");
  const categoryFields = filtered.filter((f) => f.scope === "category");

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className={`space-y-4${filtering ? " opacity-50 pointer-events-none transition-opacity" : ""}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{t.customFields}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{t.customFieldsDesc}</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 transition shadow-sm">
          <Plus className="w-3.5 h-3.5" /> {t.addField}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search fields..."
            className="w-full pl-8 pr-3 py-2 rounded-md border border-gray-200 text-xs focus:ring-1 focus:ring-primary-500 outline-none" />
        </div>
        <select value={filterScope} onChange={(e) => { setFilterScope(e.target.value); setFilterCategory(""); }}
          className="px-3 py-2 rounded-md border border-gray-200 text-xs bg-white outline-none">
          <option value="">{t.allScopes}</option>
          <option value="global">{t.global}</option>
          <option value="category">{t.categoryLevel}</option>
        </select>
        {filterScope === "category" && (
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 rounded-md border border-gray-200 text-xs bg-white outline-none">
            <option value="">All Categories</option>
            {categoryOptions.map((c) => <option key={c} value={c}>{(t as any)[c] || c}</option>)}
          </select>
        )}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-100">
          <Filter className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">{t.noCustomFields}</p>
          <p className="text-xs text-gray-400 mt-1">{t.noCustomFieldsHint}</p>
        </div>
      )}

      {/* Global Fields */}
      {globalFields.length > 0 && (
        <FieldSection title={t.globalFields} fields={globalFields} t={t} lang={lang} onEdit={openEdit} onDelete={handleDelete} />
      )}

      {/* Category Fields - grouped */}
      {categoryFields.length > 0 && (
        <>
          {Object.entries(
            categoryFields.reduce<Record<string, CustomFieldDefinition[]>>((acc, f) => {
              const cat = f.category || "unknown";
              (acc[cat] = acc[cat] || []).push(f);
              return acc;
            }, {})
          ).map(([cat, catFields]) => (
            <FieldSection key={cat} title={`${(t as any)[cat] || cat}`} fields={catFields} t={t} lang={lang} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-lg w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-gray-800">{editing ? t.editField : t.addField}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              {!editing && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t.fieldName}</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Auto-generated from label if empty"
                    className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t.label} *</label>
                  <input type="text" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm outline-none focus:ring-1 focus:ring-primary-500" autoFocus />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t.labelTe}</label>
                  <input type="text" value={form.labelTe} onChange={(e) => setForm({ ...form, labelTe: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t.fieldType}</label>
                  <select value={form.fieldType} onChange={(e) => setForm({ ...form, fieldType: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm bg-white outline-none">
                    {fieldTypes.map((ft) => <option key={ft} value={ft}>{ft}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t.sortOrderLabel}</label>
                  <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm outline-none" min="0" />
                </div>
              </div>
              {form.fieldType === "select" && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t.optionsLabel} (JSON array)</label>
                  <input type="text" value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })}
                    placeholder='["Option 1","Option 2"]'
                    className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
              )}
              {!editing && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t.scopeLabel}</label>
                    <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm bg-white outline-none">
                      <option value="global">{t.global}</option>
                      <option value="category">{t.categoryLevel}</option>
                    </select>
                  </div>
                  {form.scope === "category" && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{t.category}</label>
                      <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm bg-white outline-none">
                        <option value="">-- Select --</option>
                        {categoryOptions.map((c) => <option key={c} value={c}>{(t as any)[c] || c}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={form.isRequired} onChange={(e) => setForm({ ...form, isRequired: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                {t.required}
              </label>
              <div className="flex gap-2.5 pt-2">
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

// ─── Field Section Component ─────────────────────────────────────
function FieldSection({ title, fields, t, lang, onEdit, onDelete }: {
  title: string; fields: CustomFieldDefinition[]; t: any; lang: string;
  onEdit: (f: CustomFieldDefinition) => void; onDelete: (id: number) => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 bg-slate-50/50">
        <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{title}</h2>
      </div>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-xs table-fixed">
          <thead className="bg-slate-50 border-b border-gray-100">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-500 w-[20%]">{t.fieldName}</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500 w-[20%]">{t.label}</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500 w-[18%]">{t.labelTe}</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500 w-[12%]">{t.fieldType}</th>
              <th className="px-3 py-2 text-center font-medium text-gray-500 w-[10%]">{t.required}</th>
              <th className="px-3 py-2 text-center font-medium text-gray-500 w-[10%]">{t.sortOrderLabel}</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500 w-[10%]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {fields.map((f) => (
              <tr key={f.id} className="hover:bg-slate-50/50">
                <td className="px-3 py-2 font-mono text-gray-500 truncate" title={f.name}>{f.name}</td>
                <td className="px-3 py-2 font-medium text-gray-800 truncate" title={f.label}>{f.label}</td>
                <td className="px-3 py-2 text-gray-500 truncate" title={f.labelTe || "-"}>{f.labelTe || "-"}</td>
                <td className="px-3 py-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${typeColors[f.fieldType] || "bg-gray-100 text-gray-600"}`}>
                    {f.fieldType}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">{f.isRequired ? "✓" : "-"}</td>
                <td className="px-3 py-2 text-center text-gray-400">{f.sortOrder}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => onEdit(f)} className="p-1 rounded hover:bg-primary-50 text-primary-600"><Pencil className="w-3 h-3" /></button>
                    <button onClick={() => onDelete(f.id)} className="p-1 rounded hover:bg-red-50 text-red-500"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-gray-50">
        {fields.map((f) => (
          <div key={f.id} className="p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">{lang === "te" && f.labelTe ? f.labelTe : f.label}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-[10px] text-gray-400">{f.name}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${typeColors[f.fieldType] || "bg-gray-100 text-gray-600"}`}>
                  {f.fieldType}
                </span>
                {f.isRequired && <span className="text-[10px] text-red-500 font-medium">Required</span>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => onEdit(f)} className="p-1.5 rounded hover:bg-primary-50 text-primary-600"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => onDelete(f.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
