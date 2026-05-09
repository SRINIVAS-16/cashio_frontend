import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProductStock from '../../pages/ProductStock';
import { stockBookApi } from '../../api/client';
import toast from 'react-hot-toast';

const mockNavigate = vi.fn();
const mockParams: Record<string, string | undefined> = { productId: '1' };

vi.mock('../../context/LanguageContext', () => ({
  useLang: () => ({ t: new Proxy({}, { get: (_, key) => String(key) }), lang: 'en', setLang: vi.fn() }),
}));
vi.mock('../../context/PermissionContext', () => ({
  usePermissions: () => ({ hasPermission: () => true, permissions: new Set() }),
}));
vi.mock('../../context/ShopConfigContext', () => ({
  useShopConfig: () => ({ shop: { name: 'Test Shop', nameTe: '', address: '', phone: '', altPhone: '', gst: '', email: '' }, updateShop: vi.fn() }),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() }, toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => mockParams };
});
vi.mock('../../api/client', () => ({ stockBookApi: { getProductDetail: vi.fn() } }));

const stockDetail = {
  product: { id: 1, name: 'Urea', nameTe: '', category: 'fertilizer', unit: 'bag', price: 100, stock: 12, minStock: 2, photo: '' },
  totalPurchased: 20,
  totalSold: 8,
  currentStock: 12,
  batches: [
    {
      id: 10,
      batchNo: 'BATCH-1',
      hsnCode: 'HSN-1',
      mfgDate: '2025-01-01',
      expiryDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      costPrice: 80,
      quantity: 10,
      freeQty: 1,
      totalQty: 11,
      soldQty: 3,
      remainingQty: 8,
      purchase: { id: 1, invoiceNo: 'INV-1', purchaseDate: '2025-01-01', dealer: 'Dealer A' },
      orders: [{ id: 1, orderNo: 'ORD-1', date: '2025-01-05', customer: 'Alice', quantity: 2 }],
    },
  ],
  unlinkedOrders: [{ id: 2, orderNo: 'ORD-2', date: '2025-01-06', customer: 'Bob', quantity: 1 }],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <ProductStock />
    </MemoryRouter>
  );
}

describe('ProductStock page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (stockBookApi.getProductDetail as any).mockResolvedValue({ data: stockDetail });
  });

  it('renders stock summary and toggles batch history', async () => {
    renderPage();

    await waitFor(() => expect(stockBookApi.getProductDetail).toHaveBeenCalledWith(1, expect.objectContaining({ signal: expect.any(AbortSignal) })));
    expect(screen.getByText('Urea')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('Expiring Soon')).toBeInTheDocument();
    expect(screen.getByText('ORD-2')).toBeInTheDocument();

    fireEvent.click(screen.getByText('BATCH-1'));
    await waitFor(() => expect(screen.getByText('ORD-1')).toBeInTheDocument());
    fireEvent.click(screen.getByText('BATCH-1'));
    await waitFor(() => expect(screen.queryByText('ORD-1')).not.toBeInTheDocument());
  });

  it('handles API errors gracefully', async () => {
    (stockBookApi.getProductDetail as any).mockRejectedValueOnce(new Error('fail'));
    renderPage();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to load product stock data'));
    expect(await screen.findByText('noData')).toBeInTheDocument();
  });
});
