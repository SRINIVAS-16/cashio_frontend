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
import SuperAdminLayout from "./components/SuperAdminLayout";
import { lazy, Suspense } from "react";

// Lazy-loaded pages for code splitting
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Products = lazy(() => import("./pages/Products"));
const Customers = lazy(() => import("./pages/Customers"));
const Billing = lazy(() => import("./pages/Billing"));
const Orders = lazy(() => import("./pages/Orders"));
const CustomFields = lazy(() => import("./pages/CustomFields"));
const ProductForm = lazy(() => import("./pages/ProductForm"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const Purchases = lazy(() => import("./pages/Purchases"));
const PurchaseForm = lazy(() => import("./pages/PurchaseForm"));
const Dealers = lazy(() => import("./pages/Dealers"));
const StockBook = lazy(() => import("./pages/StockBook"));
const ProductStock = lazy(() => import("./pages/ProductStock"));
const Settings = lazy(() => import("./pages/Settings"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const RolePermissions = lazy(() => import("./pages/RolePermissions"));
const SuperAdminDashboard = lazy(() => import("./pages/super-admin/SuperAdminDashboard"));
const ManageTenants = lazy(() => import("./pages/super-admin/ManageTenants"));

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
        <ShopConfigProvider>
          <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <PermissionProvider>
                <BrowserRouter>
                    <Routes>
                      <Route path="/login" element={<Suspense fallback={<PageLoader />}><Login /></Suspense>} />
                      <Route
                        path="/super-admin"
                        element={
                          <ProtectedRoute superAdminOnly>
                            <SuperAdminLayout />
                          </ProtectedRoute>
                        }
                      >
                        <Route index element={<Suspense fallback={<PageLoader />}><SuperAdminDashboard /></Suspense>} />
                        <Route path="tenants" element={<Suspense fallback={<PageLoader />}><ManageTenants /></Suspense>} />
                      </Route>
                      <Route
                        path="/"
                        element={
                          <ProtectedRoute redirectSuperAdmin>
                            <Layout />
                          </ProtectedRoute>
                        }
                      >
                        <Route index element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
                        <Route path="billing" element={<ProtectedRoute permission="billing"><Suspense fallback={<PageLoader />}><Billing /></Suspense></ProtectedRoute>} />
                        <Route path="orders" element={<ProtectedRoute permission="orders"><Suspense fallback={<PageLoader />}><Orders /></Suspense></ProtectedRoute>} />
                        <Route path="orders/:id" element={<ProtectedRoute permission="orders"><Suspense fallback={<PageLoader />}><OrderDetail /></Suspense></ProtectedRoute>} />
                        <Route path="customers" element={<ProtectedRoute permission="customers"><Suspense fallback={<PageLoader />}><Customers /></Suspense></ProtectedRoute>} />
                        <Route path="products" element={<ProtectedRoute permission="products"><Suspense fallback={<PageLoader />}><Products /></Suspense></ProtectedRoute>} />
                        <Route path="products/new" element={<ProtectedRoute permission="products"><Suspense fallback={<PageLoader />}><ProductForm /></Suspense></ProtectedRoute>} />
                        <Route path="products/:id/edit" element={<ProtectedRoute permission="products"><Suspense fallback={<PageLoader />}><ProductForm /></Suspense></ProtectedRoute>} />
                        <Route path="purchases" element={<ProtectedRoute permission="purchases"><Suspense fallback={<PageLoader />}><Purchases /></Suspense></ProtectedRoute>} />
                        <Route path="purchases/new" element={<ProtectedRoute permission="purchases"><Suspense fallback={<PageLoader />}><PurchaseForm /></Suspense></ProtectedRoute>} />
                        <Route path="purchases/:id" element={<ProtectedRoute permission="purchases"><Suspense fallback={<PageLoader />}><PurchaseForm /></Suspense></ProtectedRoute>} />
                        <Route path="dealers" element={<ProtectedRoute permission="dealers"><Suspense fallback={<PageLoader />}><Dealers /></Suspense></ProtectedRoute>} />
                        <Route path="stock-book" element={<ProtectedRoute permission="stock-book"><Suspense fallback={<PageLoader />}><StockBook /></Suspense></ProtectedRoute>} />
                        <Route path="stock-book/:productId" element={<ProtectedRoute permission="stock-book"><Suspense fallback={<PageLoader />}><ProductStock /></Suspense></ProtectedRoute>} />
                        <Route path="custom-fields" element={<ProtectedRoute permission="custom-fields"><Suspense fallback={<PageLoader />}><CustomFields /></Suspense></ProtectedRoute>} />
                        <Route path="settings" element={<ProtectedRoute permission="settings"><Suspense fallback={<PageLoader />}><Settings /></Suspense></ProtectedRoute>} />
                        <Route path="users" element={<ProtectedRoute permission="users"><Suspense fallback={<PageLoader />}><UserManagement /></Suspense></ProtectedRoute>} />
                        <Route path="role-permissions" element={<ProtectedRoute permission="roles"><Suspense fallback={<PageLoader />}><RolePermissions /></Suspense></ProtectedRoute>} />
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
          </ThemeProvider>
        </ShopConfigProvider>
    </QueryClientProvider>
  );
}
