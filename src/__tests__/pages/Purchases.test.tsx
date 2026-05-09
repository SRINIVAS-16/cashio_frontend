import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Purchases from '../../pages/Purchases';
import { purchaseApi, dealerApi } from '../../api/client';
import * as XLSX from 'xlsx';

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
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() }, toast: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() } }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => mockParams };
});
vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));
vi.mock('../../api/client', () => ({
  purchaseApi: { getAll: vi.fn() },
  dealerApi: { getAll: vi.fn() },
}));

const dealers = [
  { id: 1, name: 'Dealer A', phone: '1111111111', isActive: true, createdAt: '' },
  { id: 2, name: 'Dealer B', phone: '2222222222', isActive: true, createdAt: '' },
];

const pageOne = {
  data: {
    purchases: [
      { id: 1, invoiceNo: 'INV-1', dealerId: 1, dealerName: 'Dealer A', purchaseDate: '2025-01-01', subtotal: 100, discount: 0, total: 100, paidAmount: 100, dueAmount: 0, paymentStatus: 'paid', createdAt: '', items: [] },
      { id: 2, invoiceNo: 'INV-2', dealerId: 2, dealerName: 'Dealer B', purchaseDate: '2025-01-02', subtotal: 200, discount: 0, total: 200, paidAmount: 50, dueAmount: 150, paymentStatus: 'partial', createdAt: '', items: [] },
    ],
    total: 2,
    page: 1,
    totalPages: 2,
    summary: { totalAmount: 300, paidAmount: 150, dueAmount: 150 },
  },
};

const pageTwo = {
  data: {
    purchases: [
      { id: 3, invoiceNo: 'INV-3', dealerId: 1, dealerName: 'Dealer A', purchaseDate: '2025-01-03', subtotal: 50, discount: 0, total: 50, paidAmount: 0, dueAmount: 50, paymentStatus: 'unpaid', createdAt: '', items: [] },
    ],
    total: 3,
    page: 2,
    totalPages: 2,
    summary: { totalAmount: 50, paidAmount: 0, dueAmount: 50 },
  },
};

function renderPage() {
  return render(
    <MemoryRouter>
      <Purchases />
    </MemoryRouter>
  );
}

describe('Purchases page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (dealerApi.getAll as any).mockResolvedValue({ data: dealers });
    (purchaseApi.getAll as any).mockImplementation((page: number, limit: number) => {
      if (limit === 10000) return Promise.resolve(pageOne);
      return Promise.resolve(page === 2 ? pageTwo : pageOne);
    });
    const printWindow = {
      document: { write: vi.fn(), close: vi.fn() },
      print: vi.fn(),
      onload: null as null | (() => void),
    };
    vi.stubGlobal('open', vi.fn(() => printWindow));
  });

  it('renders purchases, filters by invoice and dealer, and paginates', async () => {
    renderPage();

    await waitFor(() => expect(purchaseApi.getAll).toHaveBeenCalledWith(1, 20, undefined, undefined, undefined));
    expect(screen.getAllByText('INV-1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('partial').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByPlaceholderText('invoiceNo...'), { target: { value: 'INV-2' } });
    expect(screen.queryByText('INV-1')).not.toBeInTheDocument();
    expect(screen.getAllByText('INV-2').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByDisplayValue('allDealers'), { target: { value: '1' } });
    await waitFor(() => expect(purchaseApi.getAll).toHaveBeenLastCalledWith(1, 20, 1, undefined, undefined));

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(purchaseApi.getAll).toHaveBeenCalledWith(2, 20, 1, undefined, undefined));
  });

  it('exports excel and prints the filtered report', async () => {
    renderPage();

    await waitFor(() => expect(purchaseApi.getAll).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Excel' }));
    await waitFor(() => expect(XLSX.writeFile).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: 'print' }));
    await waitFor(() => expect(purchaseApi.getAll).toHaveBeenCalledWith(1, 10000, undefined, undefined, undefined));

    const printWindow = (window.open as any).mock.results[0].value;
    await waitFor(() => expect(printWindow.document.write).toHaveBeenCalled());
    expect(printWindow.document.write.mock.calls[0][0]).toContain('Purchases Report');
    printWindow.onload?.();
    expect(printWindow.print).toHaveBeenCalled();
  });
});
