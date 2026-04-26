// ─── TypeScript Types ────────────────────────────────────────────

export type UserRole = "admin" | "manager" | "cashier" | "viewer";

export const ALL_ROLES: UserRole[] = ["admin", "manager", "cashier", "viewer"];

export interface User {
  id: number;
  username: string;
  name: string;
  email?: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Product {
  id: number;
  name: string;
  nameTe?: string | null;
  category: string;
  company?: string | null;
  unit: string;
  price: number;
  costPrice?: number | null;
  minStock: number;
  description?: string | null;
  photo?: string | null;
  cgstPercent: number;
  sgstPercent: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  customFieldValues?: CustomFieldValue[];
}

export interface CustomFieldDefinition {
  id: number;
  name: string;
  label: string;
  labelTe?: string | null;
  fieldType: string; // text, number, date, select, textarea
  options?: string | null; // JSON array for select
  isRequired: boolean;
  scope: string; // global, category
  category?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomFieldValue {
  id: number;
  productId: number;
  customFieldDefinitionId: number;
  value: string;
  definition?: CustomFieldDefinition;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  village?: string | null;
  address?: string | null;
  photo?: string | null;
  createdAt: string;
  updatedAt: string;
  orders?: Order[];
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  purchaseItemId?: number | null;
  quantity: number;
  price: number;
  total: number;
  hsnCode?: string | null;
  batchNo?: string | null;
  mfgDate?: string | null;
  expiryDate?: string | null;
  product?: Product;
}

export interface Payment {
  id: number;
  orderId: number;
  amount: number;
  paymentMode: string;
  notes?: string | null;
  createdAt: string;
}

export interface Order {
  id: number;
  orderNo: string;
  customerId?: number | null;
  customerName?: string | null;
  subtotal: number;
  total: number;
  paidAmount: number;
  dueAmount: number;
  paymentMode: string;
  paymentStatus: string;
  status: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: { name: string; phone: string } | null;
  items: OrderItem[];
  payments?: Payment[];
}

export interface OrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  totalPages: number;
  summary: {
    totalAmount: number;
    paidAmount: number;
    dueAmount: number;
    uniqueCustomers: number;
  };
}

export interface CustomerDue {
  customer: { id: number; name: string; phone: string; village?: string | null } | undefined;
  totalDue: number;
  totalOrderValue: number;
  orderCount: number;
}

export interface DueSummary {
  totalDueAmount: number;
  totalDueOrders: number;
}

export interface ExpiringBatch {
  batchId: number;
  productId: number;
  productName: string;
  productNameTe?: string | null;
  category: string;
  unit: string;
  batchNo?: string | null;
  expiryDate: string;
  remaining: number;
  isExpired: boolean;
  invoiceNo: string;
}

export interface DashboardData {
  today: { count: number; total: number };
  thisMonth: { count: number; total: number };
  lowStockProducts: Product[];
  topProducts: {
    product: { id: number; name: string; nameTe?: string | null } | undefined;
    totalQuantity: number;
    totalRevenue: number;
    orderCount: number;
  }[];
  recentOrders: Order[];
  totalProducts: number;
  totalCustomers: number;
  dueSummary: DueSummary;
  customersWithDues: CustomerDue[];
  expiringSoon: ExpiringBatch[];
}

export interface SalesTrend {
  date: string;
  total: number;
}

export interface ProductDistribution {
  category: string;
  count: number;
}

// ─── Cart (for billing frontend) ─────────────────────────────────
export interface CartItem {
  product: Product;
  quantity: number;
  price: number;
  total: number;
  cgstPercent: number;
  sgstPercent: number;
  purchaseItemId?: number | null;
  hsnCode?: string | null;
  batchNo?: string | null;
  mfgDate?: string | null;
  expiryDate?: string | null;
  maxAvailableQty?: number | null;
}

// ─── Available Batch (for billing batch selection) ───────────────
export interface AvailableBatch {
  purchaseItemId: number;
  batchNo?: string | null;
  hsnCode?: string | null;
  mfgDate?: string | null;
  expiryDate?: string | null;
  costPrice: number;
  totalQty: number;
  soldQty: number;
  availableQty: number;
  invoice: string;
  purchaseDate: string;
  dealer: string;
}

// ─── Stock Book ──────────────────────────────────────────────────
export interface StockBookProduct {
  id: number; name: string; nameTe?: string | null; category: string;
  unit: string; price: number; stock: number; minStock: number;
  photo?: string | null; totalPurchased: number; totalSold: number;
  nearestExpiry?: string | null; expiringBatchCount?: number; expiringQty30d?: number;
}

export interface StockBatchOrder {
  id: number; orderNo: string; date: string; customer: string; quantity: number;
}

export interface StockBatch {
  id: number; batchNo?: string | null; hsnCode?: string | null;
  mfgDate?: string | null; expiryDate?: string | null;
  costPrice: number; quantity: number; freeQty: number;
  totalQty: number; soldQty: number; remainingQty: number;
  purchase: { id: number; invoiceNo: string; purchaseDate: string; dealer: string };
  orders: StockBatchOrder[];
}

export interface ProductStockDetail {
  product: { id: number; name: string; nameTe?: string | null; category: string; unit: string; price: number; stock: number; minStock: number; photo?: string | null };
  totalPurchased: number; totalSold: number; currentStock: number;
  batches: StockBatch[];
  unlinkedOrders: StockBatchOrder[];
}

// ─── Dealers (Suppliers) ─────────────────────────────────────────
export interface Dealer {
  id: number;
  name: string;
  phone?: string | null;
  gst?: string | null;
  address?: string | null;
  isActive: boolean;
  createdAt: string;
}

// ─── Purchases ───────────────────────────────────────────────────
export interface PurchaseItem {
  id: number;
  purchaseId: number;
  productId: number;
  batchNo?: string | null;
  hsnCode?: string | null;
  mfgDate?: string | null;
  expiryDate?: string | null;
  costPrice: number;
  discount: number;
  cgstPercent: number;
  sgstPercent: number;
  quantity: number;
  freeQty: number;
  product?: { id: number; name: string; nameTe?: string | null; unit: string; category?: string };
}

export interface PurchasePayment {
  id: number;
  purchaseId: number;
  amount: number;
  paymentMode: string;
  notes?: string | null;
  createdAt: string;
}

export interface Purchase {
  id: number;
  invoiceNo: string;
  dealerId?: number | null;
  dealerName?: string | null;
  purchaseDate: string;
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: string;
  notes?: string | null;
  createdAt: string;
  dealer?: Dealer | null;
  items: PurchaseItem[];
  payments?: PurchasePayment[];
}

export interface PurchasesResponse {
  purchases: Purchase[];
  total: number;
  page: number;
  totalPages: number;
  summary: {
    totalAmount: number;
    paidAmount: number;
    dueAmount: number;
  };
}
