//  Products (Inventory) Page 
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plus, Search, Edit2, Trash2,
  X, Filter
} from "lucide-react";
import { productApi } from "../api/client";
import { useLang } from "../context/LanguageContext";
import { Product } from "../types";
import toast from "react-hot-toast";

export default function Products() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
  


  useEffect(() => { loadProducts(); loadCategories(); }, []);

  const loadProducts = async () => {
    try {
      const res = await productApi.getAll(search || undefined, category !== "all" ? category : undefined);
      setProducts(res.data);
    } catch (err) {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await productApi.getCategories();
      setCategories(res.data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const timer = setTimeout(() => loadProducts(), 300);
    return () => clearTimeout(timer);
  }, [search, category]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this product?")) return;
    try {
      await productApi.delete(id);
      toast.success("Product deleted!");
      loadProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Delete failed");
    }
  };



  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-xl font-bold text-gray-800">{t.products} / {t.inventory}</h1>
        <button onClick={() => navigate("/products/new")} className="flex items-center gap-1.5 px-3.5 py-2 bg-primary-600 text-white rounded-md text-xs font-medium hover:bg-primary-700 transition shadow-sm">
          <Plus className="w-3.5 h-3.5" /> {t.addProduct}
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={`${t.search}...`}
            className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="pl-8 pr-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 appearance-none bg-white outline-none text-sm">
            <option value="all">{t.allCategories}</option>
            {categories.map((c) => <option key={c} value={c}>{(t as any)[c] || c}</option>)}
          </select>
        </div>
      </div>

      {/*  Products Table  */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-gray-100">
              <tr>
                <th className="px-3 py-2.5 text-xs font-medium text-gray-500">{t.productName}</th>
                <th className="px-3 py-2.5 text-xs font-medium text-gray-500">{t.category}</th>
                <th className="px-3 py-2.5 text-xs font-medium text-gray-500">{t.price} (₹)</th>
                <th className="px-3 py-2.5 text-xs font-medium text-gray-500">{t.unit}</th>
                <th className="px-3 py-2.5 text-xs font-medium text-gray-500">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      {p.photo ? (
                        <img src={p.photo} alt={p.name} className="w-8 h-8 rounded-md object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold flex-shrink-0">{p.name.charAt(0)}</div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 text-sm truncate">{p.name}</p>
                        {p.nameTe && <p className="text-[10px] text-gray-400 truncate">{p.nameTe}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="px-1.5 py-0.5 text-[10px] rounded font-medium bg-slate-100 text-gray-600 capitalize">{(t as any)[p.category] || p.category}</span>
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-gray-800 text-sm">₹{Number(p.price).toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2.5 text-gray-600 text-sm capitalize">{(t as any)[p.unit] || p.unit}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => navigate(`/products/${p.id}/edit`)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title={t.editProduct}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded hover:bg-red-50 text-red-600" title={t.deleteProduct || "Delete"}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && <p className="text-center py-6 text-gray-400 text-xs">{t.noData}</p>}
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-50">
          {products.map((p) => (
            <div key={p.id} className="p-3">
              <div className="flex items-center gap-2.5">
                {p.photo ? (
                  <img src={p.photo} alt={p.name} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center text-slate-400 text-sm font-bold flex-shrink-0">{p.name.charAt(0)}</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-gray-800 text-sm truncate">{p.name}</p>
                    <span className="text-primary-700 font-bold text-sm flex-shrink-0">₹{Number(p.price).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-gray-500 capitalize">{(t as any)[p.category] || p.category}</span>
                      <span className="text-xs text-gray-600">{(t as any)[p.unit] || p.unit}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => navigate(`/products/${p.id}/edit`)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded hover:bg-red-50 text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {products.length === 0 && <p className="text-center py-6 text-gray-400 text-xs">{t.noData}</p>}
        </div>
      </div>


    </div>
  );
}
