import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OrderDetail from '../../pages/OrderDetail';
import { orderApi, paymentApi } from '../../api/client';
import jsPDF from 'jspdf';

const mockNavigate = vi.fn();
const mockParams: Record<string, string | undefined> = { id: '1' };

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
  lastAutoTable: { finalY: 50 },
};

vi.mock('jspdf', () => ({ default: vi.fn(function () { return docMock; }) }));
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));
vi.mock('../../api/client', () => ({
  orderApi: { getById: vi.fn(), cancel: vi.fn() },
  paymentApi: { recordPayment: vi.fn() },
}));

const order = {
  id: 1,
  orderNo: 'ORD-1',
  customerId: 1,
  subtotal: 100,
  total: 118,
  paidAmount: 68,
  dueAmount: 50,
  paymentMode: 'cash',
  paymentStatus: 'partial',
  status: 'completed',
  notes: 'Deliver soon',
  createdAt: '2025-01-01T10:00:00.000Z',
  updatedAt: '2025-01-01T10:00:00.000Z',
  customer: { name: 'Alice', phone: '9999999999' },
  items: [
    {
      id: 1,
      orderId: 1,
      productId: 1,
      quantity: 1,
      price: 100,
      total: 118,
      batchNo: 'BATCH-1',
      hsnCode: 'HSN-1',
      mfgDate: '2025-01-01',
      expiryDate: '2026-01-01',
      product: { name: 'Urea' },
    },
  ],
  payments: [{ id: 10, orderId: 1, amount: 68, paymentMode: 'cash', createdAt: '2025-01-01T12:00:00.000Z' }],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <OrderDetail />
    </MemoryRouter>
  );
}

describe('OrderDetail page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (orderApi.getById as any).mockResolvedValue({ data: order });
    (paymentApi.recordPayment as any).mockResolvedValue({});
    (orderApi.cancel as any).mockResolvedValue({});
    vi.stubGlobal('open', vi.fn(() => ({})));
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  it('renders order details and handles PDF and print actions', async () => {
    renderPage();

    await waitFor(() => expect(orderApi.getById).toHaveBeenCalledWith(1));
    expect(screen.getAllByText('ORD-1').length).toBeGreaterThan(0);
    expect(screen.getByText('BATCH-1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /A4 PDF/i }));
    fireEvent.click(screen.getByRole('button', { name: /Receipt PDF/i }));
    fireEvent.click(screen.getByRole('button', { name: 'print' }));

    expect(jsPDF).toHaveBeenCalledTimes(3);
    expect(docMock.save).toHaveBeenCalledWith('Bill_ORD-1.pdf');
    expect(docMock.autoPrint).toHaveBeenCalled();
    expect(window.open).toHaveBeenCalledWith('blob:url', '_blank');
  });

  it('records a payment from the modal', async () => {
    (orderApi.getById as any)
      .mockResolvedValueOnce({ data: order })
      .mockResolvedValueOnce({ data: { ...order, paidAmount: 98, dueAmount: 20, payments: [...order.payments, { id: 11, orderId: 1, amount: 30, paymentMode: 'upi', createdAt: '2025-01-02T10:00:00.000Z' }] } });

    renderPage();

    await waitFor(() => expect(screen.getByText('recordPayment')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'recordPayment' }));

    fireEvent.change(screen.getByDisplayValue('50'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'upi' }));
    fireEvent.change(screen.getByPlaceholderText('Optional notes...'), { target: { value: 'Paid by UPI' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'recordPayment' })[1]);

    await waitFor(() => expect(paymentApi.recordPayment).toHaveBeenCalledWith(1, { amount: 30, paymentMode: 'upi', notes: 'Paid by UPI' }));
    await waitFor(() => expect(orderApi.getById).toHaveBeenCalledTimes(2));
  });

  it('cancels the order and reloads the page data', async () => {
    (orderApi.getById as any)
      .mockResolvedValueOnce({ data: order })
      .mockResolvedValueOnce({ data: { ...order, status: 'cancelled', paymentStatus: 'unpaid' } });

    renderPage();

    await waitFor(() => expect(screen.getByRole('button', { name: 'cancelOrder' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'cancelOrder' }));

    await waitFor(() => expect(orderApi.cancel).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.getByText('cancelled')).toBeInTheDocument());
  });
});
