// ─── App Router ──────────────────────────────────────────────────
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { PermissionProvider } from "./context/PermissionContext";
import { LanguageProvider } from "./context/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ShopConfigProvider } from "./context/ShopConfigContext";
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
import Settings from "./pages/Settings";
import UserManagement from "./pages/UserManagement";
import RolePermissions from "./pages/RolePermissions";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
      <ShopConfigProvider>
      <LanguageProvider>
        <AuthProvider>
          <PermissionProvider>
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
                <Route path="billing" element={<ProtectedRoute permission="billing"><Billing /></ProtectedRoute>} />
                <Route path="orders" element={<ProtectedRoute permission="orders"><Orders /></ProtectedRoute>} />
                <Route path="orders/:id" element={<ProtectedRoute permission="orders"><OrderDetail /></ProtectedRoute>} />
                <Route path="customers" element={<ProtectedRoute permission="customers"><Customers /></ProtectedRoute>} />
                <Route path="products" element={<ProtectedRoute permission="products"><Products /></ProtectedRoute>} />
                <Route path="products/new" element={<ProtectedRoute permission="products"><ProductForm /></ProtectedRoute>} />
                <Route path="products/:id/edit" element={<ProtectedRoute permission="products"><ProductForm /></ProtectedRoute>} />
                <Route path="purchases" element={<ProtectedRoute permission="purchases"><Purchases /></ProtectedRoute>} />
                <Route path="purchases/new" element={<ProtectedRoute permission="purchases"><PurchaseForm /></ProtectedRoute>} />
                <Route path="purchases/:id" element={<ProtectedRoute permission="purchases"><PurchaseForm /></ProtectedRoute>} />
                <Route path="dealers" element={<ProtectedRoute permission="dealers"><Dealers /></ProtectedRoute>} />
                <Route path="stock-book" element={<ProtectedRoute permission="stock-book"><StockBook /></ProtectedRoute>} />
                <Route path="stock-book/:productId" element={<ProtectedRoute permission="stock-book"><ProductStock /></ProtectedRoute>} />
                <Route path="custom-fields" element={<ProtectedRoute permission="custom-fields"><CustomFields /></ProtectedRoute>} />
                <Route path="settings" element={<ProtectedRoute permission="settings"><Settings /></ProtectedRoute>} />
                <Route path="users" element={<ProtectedRoute permission="users"><UserManagement /></ProtectedRoute>} />
                <Route path="role-permissions" element={<ProtectedRoute permission="roles"><RolePermissions /></ProtectedRoute>} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          </PermissionProvider>
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
      </ShopConfigProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
