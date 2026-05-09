import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PurchaseForm from '../../pages/PurchaseForm';
import { purchaseApi, dealerApi, productApi } from '../../api/client';
import toast from 'react-hot-toast';

const mockNavigate = vi.fn();
const mockParams: Record<string, string | undefined> = {};

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
vi.mock('../../api/client', () => ({
  purchaseApi: { create: vi.fn(), getById: vi.fn(), recordPayment: vi.fn() },
  dealerApi: { getAll: vi.fn(), create: vi.fn() },
  productApi: { getAll: vi.fn() },
}));

const products = [
  { id: 1, name: 'Urea', category: 'fertilizer', unit: 'bag', price: 120, minStock: 1, cgstPercent: 2.5, sgstPercent: 2.5, isActive: true, createdAt: '', updatedAt: '' },
];
const dealers = [
  { id: 1, name: 'Dealer A', phone: '1111111111', gst: 'GST1', address: 'Address 1', isActive: true, createdAt: '' },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <PurchaseForm />
    </MemoryRouter>
  );
}

describe('PurchaseForm page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockParams).forEach((key) => delete mockParams[key]);
    (productApi.getAll as any).mockResolvedValue({ data: products });
    (dealerApi.getAll as any).mockResolvedValue({ data: dealers });
    (dealerApi.create as any).mockResolvedValue({ data: { ...dealers[0], id: 2, name: 'Dealer B' } });
    (purchaseApi.create as any).mockResolvedValue({});
  });

  it('calculates totals and submits a new purchase', async () => {
    renderPage();

    await waitFor(() => expect(productApi.getAll).toHaveBeenCalled());
    fireEvent.change(screen.getByPlaceholderText('INV-2026-001'), { target: { value: 'INV-NEW-1' } });

    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[0], { target: { value: '1' } });
    fireEvent.change(selects[1], { target: { value: '1' } });

    fireEvent.change(screen.getByText('batchNo').parentElement!.querySelector('input') as HTMLInputElement, { target: { value: 'B-100' } });
    fireEvent.change(screen.getByText('hsnCode').parentElement!.querySelector('input') as HTMLInputElement, { target: { value: 'HSN-100' } });
    fireEvent.change(screen.getAllByText('quantity')[0].parentElement!.querySelector('input') as HTMLInputElement, { target: { value: '2' } });
    fireEvent.change(screen.getByText('freeQty').parentElement!.querySelector('input') as HTMLInputElement, { target: { value: '1' } });
    fireEvent.change(screen.getByText('costPrice (₹)').parentElement!.querySelector('input') as HTMLInputElement, { target: { value: '100' } });
    fireEvent.change(screen.getByText('discount (₹)').parentElement!.querySelector('input') as HTMLInputElement, { target: { value: '10' } });
    fireEvent.change(screen.getByText('cgstPercent').parentElement!.querySelector('input') as HTMLInputElement, { target: { value: '5' } });
    fireEvent.change(screen.getByText('sgstPercent').parentElement!.querySelector('input') as HTMLInputElement, { target: { value: '5' } });
    fireEvent.change(screen.getByText('paidAmount (₹)').parentElement!.querySelector('input') as HTMLInputElement, { target: { value: '50' } });

    await waitFor(() => {
      expect(screen.getAllByText('₹200').length).toBeGreaterThan(0);
      expect(screen.getAllByText('₹9.5').length).toBeGreaterThan(0);
      expect(screen.getAllByText('₹209').length).toBeGreaterThan(0);
      expect(screen.getByText('dueAmount: ₹159')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => expect(purchaseApi.create).toHaveBeenCalled());
    expect(purchaseApi.create).toHaveBeenCalledWith({
      invoiceNo: 'INV-NEW-1',
      dealerId: 1,
      dealerName: 'Dealer A',
      purchaseDate: expect.any(String),
      subtotal: 200,
      discount: 10,
      cgst: 9.5,
      sgst: 9.5,
      total: 209,
      paidAmount: 50,
      notes: null,
      items: [
        {
          productId: 1,
          batchNo: 'B-100',
          hsnCode: 'HSN-100',
          mfgDate: null,
          expiryDate: null,
          costPrice: 100,
          discount: 10,
          cgstPercent: 5,
          sgstPercent: 5,
          quantity: 2,
          freeQty: 1,
        },
      ],
    });
    expect(mockNavigate).toHaveBeenCalledWith('/purchases');
  });

  it('quick adds a dealer from the modal', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(dealerApi.getAll).toHaveBeenCalled());
    const dealerRowButton = screen.getByText('dealer').parentElement!.querySelector('button') as HTMLButtonElement;
    fireEvent.click(dealerRowButton);

    fireEvent.change(screen.getByPlaceholderText('dealerName *'), { target: { value: 'Dealer B' } });
    fireEvent.change(screen.getByPlaceholderText('dealerPhone'), { target: { value: '9999999999' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'save' }).at(-1)!);

    await waitFor(() => expect(dealerApi.create).toHaveBeenCalledWith({ name: 'Dealer B', phone: '9999999999', gst: '', address: '' }));
    expect(container).toHaveTextContent('Dealer B');
  });

  it('validates required purchase data', async () => {
    renderPage();

    await waitFor(() => expect(productApi.getAll).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'save' }));
    expect(toast.error).toHaveBeenCalledWith('Invoice number required');
  });
});
