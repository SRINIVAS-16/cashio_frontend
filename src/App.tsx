// ─── App Router ──────────────────────────────────────────────────
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Customers from "./pages/Customers";
import Billing from "./pages/Billing";
import Orders from "./pages/Orders";
import CustomFields from "./pages/CustomFields";
import ProductForm from "./pages/ProductForm";
import OrderDetail from "./pages/OrderDetail";
import Purchases from "./pages/Purchases";
import PurchaseForm from "./pages/PurchaseForm";
import Dealers from "./pages/Dealers";
import StockBook from "./pages/StockBook";
import ProductStock from "./pages/ProductStock";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="products" element={<Products />} />
                <Route path="products/new" element={<ProductForm />} />
                <Route path="products/:id/edit" element={<ProductForm />} />
                <Route path="customers" element={<Customers />} />
                <Route path="billing" element={<Billing />} />
                <Route path="orders" element={<Orders />} />
                <Route path="orders/:id" element={<OrderDetail />} />
                <Route path="purchases" element={<Purchases />} />
                <Route path="purchases/new" element={<PurchaseForm />} />
                <Route path="purchases/:id" element={<PurchaseForm />} />
                <Route path="dealers" element={<Dealers />} />
                <Route path="stock-book" element={<StockBook />} />
                <Route path="stock-book/:productId" element={<ProductStock />} />
                <Route path="custom-fields" element={<CustomFields />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                borderRadius: "12px",
                padding: "12px 16px",
                fontSize: "14px",
              },
            }}
          />
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
