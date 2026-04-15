// ─── Product Add / Edit Page ─────────────────────────────────────
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ImagePlus } from "lucide-react";
import { productApi, customFieldApi } from "../api/client";
import { useLang } from "../context/LanguageContext";
import { CustomFieldDefinition } from "../types";
import toast from "react-hot-toast";

export default function ProductForm() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [form, setForm] = useState({
    name: "", nameTe: "", category: "fertilizer", unit: "bag",
    price: 0, costPrice: 0, minStock: 10, description: "", photo: "",
    cgstPercent: 2.5, sgstPercent: 2.5,
  });

  // Custom fields
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDefinition[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<number, string>>({});

  const unitOptions = ["kg", "bag", "bottle", "packet", "litre", "piece"];
  const categoryOptions = ["fertilizer", "pesticide", "seeds", "organic", "micronutrient", "growth_promoter", "soil_amendment", "equipment", "general"];

  useEffect(() => {
    if (isEdit) {
      loadProduct();
    } else {
      loadCustomFieldDefs("fertilizer");
    }
  }, [id]);

  const loadProduct = async () => {
    try {
      const res = await productApi.getById(Number(id));
      const p = res.data;
      setForm({
        name: p.name, nameTe: p.nameTe || "", category: p.category, unit: p.unit,
        price: Number(p.price), costPrice: Number(p.costPrice || 0),
        minStock: p.minStock, description: p.description || "", photo: p.photo || "",
        cgstPercent: p.cgstPercent ?? 2.5, sgstPercent: p.sgstPercent ?? 2.5,
      });
      if (p.customFieldValues) {
        const vals: Record<number, string> = {};
        p.customFieldValues.forEach((v: any) => { vals[v.customFieldDefinitionId] = v.value; });
        setCustomFieldValues(vals);
      }
      loadCustomFieldDefs(p.category);
    } catch {
      toast.error("Failed to load product");
      navigate("/products");
    } finally {
      setLoading(false);
    }
  };

  const loadCustomFieldDefs = async (cat: string) => {
    try {
      const res = await customFieldApi.getForCategory(cat);
      setCustomFieldDefs(res.data);
    } catch { setCustomFieldDefs([]); }
  };

  const handleSave = async () => {
    try {
      const data = {
        ...form,
        price: Number(form.price),
        costPrice: form.costPrice ? Number(form.costPrice) : undefined,
        cgstPercent: Number(form.cgstPercent),
        sgstPercent: Number(form.sgstPercent),
        photo: form.photo || undefined,
      };
      let productId: number;
      if (isEdit) {
        await productApi.update(Number(id), data);
        productId = Number(id);
        toast.success("Product updated!");
      } else {
        const res = await productApi.create(data);
        productId = res.data.id;
        toast.success("Product added!");
      }
      // Save custom field values
      const valuesArr = Object.entries(customFieldValues)
        .filter(([, val]) => val !== "")
        .map(([defId, val]) => ({ customFieldDefinitionId: Number(defId), value: val }));
      if (valuesArr.length > 0) {
        await customFieldApi.saveProductValues(productId, valuesArr);
      }
      navigate("/products");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Save failed");
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Photo must be under 2MB"); return; }
    const reader = new FileReader();
    reader.onloadend = () => setForm({ ...form, photo: reader.result as string });
    reader.readAsDataURL(file);
  };

  const fieldLabel = (def: CustomFieldDefinition) =>
    lang === "te" && def.labelTe ? def.labelTe : def.label;

  const renderCustomField = (def: CustomFieldDefinition) => (
    <>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {fieldLabel(def)} {def.isRequired && <span className="text-red-500">*</span>}
      </label>
      {def.fieldType === "select" ? (
        <select
          value={customFieldValues[def.id] || ""}
          onChange={(e) => setCustomFieldValues({ ...customFieldValues, [def.id]: e.target.value })}
          className="w-full px-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 outline-none bg-white text-sm">
          <option value="">-- Select --</option>
          {(() => { try { return JSON.parse(def.options || "[]"); } catch { return []; } })().map((opt: string) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : def.fieldType === "textarea" ? (
        <textarea
          value={customFieldValues[def.id] || ""}
          onChange={(e) => setCustomFieldValues({ ...customFieldValues, [def.id]: e.target.value })}
          className="w-full px-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 outline-none text-sm" rows={2} />
      ) : (
        <input
          type={def.fieldType === "number" ? "number" : def.fieldType === "date" ? "date" : "text"}
          value={customFieldValues[def.id] || ""}
          onChange={(e) => setCustomFieldValues({ ...customFieldValues, [def.id]: e.target.value })}
          className="w-full px-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 outline-none text-sm" />
      )}
    </>
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/products")} className="p-1.5 rounded-md hover:bg-gray-100 transition">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-800">{isEdit ? t.editProduct : t.addProduct}</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-4">
          {/* Photo Upload - spans full width on top */}
          <div className="lg:col-span-3 flex items-center gap-4">
            {form.photo ? (
              <img src={form.photo} alt="Preview" className="w-24 h-24 rounded-lg object-cover border-2 border-primary-200 shadow flex-shrink-0" />
            ) : (
              <div className="w-24 h-24 rounded-lg bg-slate-50 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center flex-shrink-0">
                <ImagePlus className="w-6 h-6 text-gray-300 mb-1" />
                <span className="text-[10px] text-gray-400">Photo</span>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label className="cursor-pointer px-3 py-1.5 rounded-md bg-primary-50 text-primary-700 text-xs font-medium hover:bg-primary-100 transition inline-block">
                Choose Photo
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
              {form.photo && <button type="button" onClick={() => setForm({ ...form, photo: "" })} className="text-xs text-red-500 hover:underline">Remove</button>}
            </div>
          </div>

          {/* Row 1: Name, Name (Telugu), Category */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.productName} *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.productNameTe}</label>
            <input type="text" value={form.nameTe} onChange={(e) => setForm({ ...form, nameTe: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 outline-none text-sm" placeholder="తెలుగులో పేరు" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.category}</label>
            <select value={form.category} onChange={(e) => { setForm({ ...form, category: e.target.value }); loadCustomFieldDefs(e.target.value); }}
              className="w-full px-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 outline-none bg-white text-sm">
              {categoryOptions.map((c) => <option key={c} value={c}>{(t as any)[c] || c}</option>)}
            </select>
          </div>

          {/* Row 2: Price, CGST, SGST */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.price} (₹) *</label>
            <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 outline-none text-sm" min="0" step="0.01" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">CGST %</label>
            <input type="number" value={form.cgstPercent} onChange={(e) => setForm({ ...form, cgstPercent: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 outline-none text-sm" min="0" max="100" step="0.5" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">SGST %</label>
            <input type="number" value={form.sgstPercent} onChange={(e) => setForm({ ...form, sgstPercent: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 outline-none text-sm" min="0" max="100" step="0.5" />
          </div>

          {/* Row 3: Unit, Min Stock */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.unit}</label>
            <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 outline-none bg-white text-sm">
              {unitOptions.map((u) => <option key={u} value={u}>{(t as any)[u] || u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.minStock}</label>
            <input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 outline-none text-sm" min="0" />
          </div>

          {/* Custom Fields (inline) */}
          {customFieldDefs.map((def) => (
            <div key={def.id}>{renderCustomField(def)}</div>
          ))}

          {/* Description - full width */}
          <div className="lg:col-span-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.description}</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 outline-none text-sm" rows={3} />
          </div>

          {/* Actions - full width */}
          <div className="lg:col-span-3 flex gap-3 pt-2">
            <button onClick={() => navigate("/products")} className="flex-1 py-2.5 rounded-md border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition">
              {t.cancel}
            </button>
            <button onClick={handleSave} className="flex-1 py-2.5 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition shadow-sm">
              {t.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
