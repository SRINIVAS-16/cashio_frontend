import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Billing from '../../pages/Billing';
import { productApi, customerApi, orderApi, stockBookApi } from '../../api/client';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';

const mockNavigate = vi.fn();
const mockParams: Record<string, string | undefined> = {};
const openMock = vi.fn();

vi.mock('../../context/LanguageContext', () => ({
  useLang: () => ({ t: new Proxy({}, { get: (_, key) => String(key) }), lang: 'en', setLang: vi.fn() }),
}));
vi.mock('../../context/PermissionContext', () => ({
  usePermissions: () => ({ hasPermission: () => true, permissions: new Set() }),
}));
vi.mock('../../context/ShopConfigContext', () => ({
  useShopConfig: () => ({ shop: { name: 'Test Shop', nameLocal: '', address: '', phone: '', altPhone: '', gst: '', email: '' }, updateShop: vi.fn() }),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() }, toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => mockParams };
});

const docMock = {
  setFontSize: vi.fn(),
  setFont: vi.fn(),
  text: vi.fn(),
  line: vi.fn(),
  rect: vi.fn(),
  setDrawColor: vi.fn(),
  setLineWidth: vi.fn(),
  setTextColor: vi.fn(),
  internal: { pageSize: { getWidth: () => 297, getHeight: () => 210 }, scaleFactor: 1 },
  splitTextToSize: vi.fn().mockReturnValue(['']),
  getLineHeight: vi.fn().mockReturnValue(10),
  save: vi.fn(),
  autoPrint: vi.fn(),
  output: vi.fn().mockReturnValue('blob:url'),
  lastAutoTable: { finalY: 40 },
};

vi.mock('jspdf', () => ({ default: vi.fn(function () { return docMock; }) }));
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));
vi.mock('../../api/client', () => ({
  productApi: { getAll: vi.fn() },
  customerApi: { getAll: vi.fn(), create: vi.fn() },
  orderApi: { create: vi.fn() },
  stockBookApi: { getAvailableBatches: vi.fn() },
}));

const product = {
  id: 1,
  name: 'Urea',
  category: 'fertilizer',
  unit: 'bag',
  price: 100,
  minStock: 1,
  cgstPercent: 2.5,
  sgstPercent: 2.5,
  isActive: true,
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
};

const customer = {
  id: 1,
  name: 'Alice',
  phone: '9999999999',
  village: 'Village',
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
};

const batch = {
  purchaseItemId: 11,
  batchNo: 'BATCH-1',
  hsnCode: 'HSN-1',
  mfgDate: '2025-01-01',
  expiryDate: '2026-01-01',
  costPrice: 80,
  totalQty: 10,
  soldQty: 0,
  availableQty: 5,
  invoice: 'INV-1',
  purchaseDate: '2025-01-01',
  dealer: 'Dealer A',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <Billing />
    </MemoryRouter>
  );
}

describe.skip('Billing page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockParams).forEach((key) => delete mockParams[key]);
    (productApi.getAll as any).mockResolvedValue({ data: [product] });
    (customerApi.create as any).mockResolvedValue({ data: customer });
    (stockBookApi.getAvailableBatches as any).mockResolvedValue({ data: [batch] });
    (orderApi.create as any).mockResolvedValue({ data: { id: 55 } });
    docMock.save.mockClear();
    docMock.autoPrint.mockClear();
    docMock.output.mockClear();
    openMock.mockReset();
    openMock.mockReturnValue({});
    vi.stubGlobal('open', openMock);
  });

  it('supports billing flow, calculations, quotation actions and submit', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(productApi.getAll).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /add new/i }));
    fireEvent.change(screen.getByPlaceholderText('customerName *'), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByPlaceholderText('phone *'), { target: { value: '9999999999' } });
    fireEvent.change(screen.getByPlaceholderText('village'), { target: { value: 'Village' } });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => expect(customerApi.create).toHaveBeenCalledWith({ name: 'Alice', phone: '9999999999', village: 'Village' }));
    expect(screen.getByText('Alice')).toBeInTheDocument();

    let addButton = screen.getAllByText('Urea')[0].closest('div')?.parentElement?.querySelector('button') as HTMLButtonElement;
    fireEvent.click(addButton);
    await waitFor(() => expect(stockBookApi.getAvailableBatches).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.getByText('BATCH-1')).toBeInTheDocument());
    fireEvent.click(screen.getByText('BATCH-1'));

    await waitFor(() => expect(screen.getAllByText('₹105').length).toBeGreaterThan(0));

    addButton = screen.getAllByText('Urea')[0].closest('div')?.parentElement?.querySelector('button') as HTMLButtonElement;
    fireEvent.click(addButton);
    await waitFor(() => expect(screen.getByText('BATCH-1')).toBeInTheDocument());
    fireEvent.click(screen.getByText('BATCH-1'));
    await waitFor(() => expect(screen.getAllByText('₹210').length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole('button', { name: 'billSummary' }));

    fireEvent.change(screen.getByDisplayValue('100'), { target: { value: '120' } });
    const taxInputs = screen.getAllByDisplayValue('2.5');
    fireEvent.change(taxInputs[0], { target: { value: '10' } });
    fireEvent.change(taxInputs[1], { target: { value: '5' } });

    await waitFor(() => {
      expect(screen.getAllByText('₹240').length).toBeGreaterThan(0);
      expect(screen.getAllByText('₹24').length).toBeGreaterThan(0);
      expect(screen.getAllByText('₹12').length).toBeGreaterThan(0);
      expect(screen.getAllByText('₹276').length).toBeGreaterThan(0);
    });

    fireEvent.click(container.querySelector('button[title="downloadQuotation"]') as HTMLButtonElement);
    expect(jsPDF).toHaveBeenCalled();
    expect(docMock.save).toHaveBeenCalled();

    fireEvent.click(container.querySelector('button[title="printQuotation"]') as HTMLButtonElement);
    expect(docMock.autoPrint).toHaveBeenCalled();
    expect(openMock).toHaveBeenCalledWith('blob:url', '_blank');

    fireEvent.click(screen.getByRole('button', { name: 'generateBill' }));

    await waitFor(() => expect(orderApi.create).toHaveBeenCalled());
    expect(orderApi.create).toHaveBeenCalledWith({
      customerId: 1,
      items: [
        {
          productId: 1,
          quantity: 2,
          price: 120,
          purchaseItemId: 11,
          hsnCode: 'HSN-1',
          batchNo: 'BATCH-1',
          mfgDate: '2025-01-01',
          expiryDate: '2026-01-01',
        },
      ],
      paidAmount: 276,
      paymentMode: 'cash',
      orderDate: undefined,
      notes: undefined,
    });
    expect(mockNavigate).toHaveBeenCalledWith('/orders/55');
  });

  it('removes items from the cart', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(productApi.getAll).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /add new/i }));
    fireEvent.change(screen.getByPlaceholderText('customerName *'), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByPlaceholderText('phone *'), { target: { value: '9999999999' } });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));
    await waitFor(() => expect(customerApi.create).toHaveBeenCalled());

    const addButton = screen.getAllByText('Urea')[0].closest('div')?.parentElement?.querySelector('button') as HTMLButtonElement;
    fireEvent.click(addButton);
    await waitFor(() => expect(screen.getByText('BATCH-1')).toBeInTheDocument());
    fireEvent.click(screen.getByText('BATCH-1'));
    await waitFor(() => expect(screen.getAllByText('₹105').length).toBeGreaterThan(0));

    const cartRowLabel = screen.getAllByText('Urea').find((node) => node.closest('.bg-slate-50'));
    const cartRow = cartRowLabel?.closest('.bg-slate-50') as HTMLElement;
    const buttons = cartRow.querySelectorAll('button');
    fireEvent.click(buttons[2]);

    await waitFor(() => expect(screen.getByText('No items added yet')).toBeInTheDocument());
    expect(container.querySelector('button[title="downloadQuotation"]')).not.toBeInTheDocument();
  });

  it('shows an error when product loading fails', async () => {
    (productApi.getAll as any).mockRejectedValueOnce(new Error('fail'));
    renderPage();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to load products'));
  });
});



