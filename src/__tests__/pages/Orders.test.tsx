import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Orders from '../../pages/Orders';
import { orderApi, customerApi } from '../../api/client';
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
  useShopConfig: () => ({ shop: { name: 'Test Shop', nameLocal: '', address: '', phone: '', altPhone: '', gst: '', email: '' }, updateShop: vi.fn() }),
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
  orderApi: { getAll: vi.fn(), cancel: vi.fn() },
  customerApi: { getAll: vi.fn() },
}));

const customers = [
  { id: 1, name: 'Alice', phone: '1111111111', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
  { id: 2, name: 'Bob', phone: '2222222222', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
];

const pageOne = {
  data: {
    orders: [
      {
        id: 1,
        orderNo: 'ORD-1001',
        customerId: 1,
        subtotal: 100,
        total: 100,
        paidAmount: 100,
        dueAmount: 0,
        paymentMode: 'cash',
        paymentStatus: 'paid',
        status: 'completed',
        createdAt: '2025-01-01T10:00:00.000Z',
        updatedAt: '2025-01-01T10:00:00.000Z',
        customer: { name: 'Alice', phone: '1111111111' },
        items: [{ id: 1, orderId: 1, productId: 1, quantity: 1, price: 100, total: 100, product: { name: 'Urea' } }],
      },
      {
        id: 2,
        orderNo: 'ORD-1002',
        customerId: 2,
        subtotal: 200,
        total: 200,
        paidAmount: 150,
        dueAmount: 50,
        paymentMode: 'upi',
        paymentStatus: 'partial',
        status: 'completed',
        createdAt: '2025-01-02T10:00:00.000Z',
        updatedAt: '2025-01-02T10:00:00.000Z',
        customer: { name: 'Bob', phone: '2222222222' },
        items: [{ id: 2, orderId: 2, productId: 1, quantity: 2, price: 100, total: 200, product: { name: 'DAP' } }],
      },
    ],
    total: 2,
    page: 1,
    totalPages: 2,
    summary: { totalAmount: 300, paidAmount: 250, dueAmount: 50, uniqueCustomers: 2 },
  },
};

const pageTwo = {
  data: {
    orders: [
      {
        id: 3,
        orderNo: 'ORD-1003',
        customerId: 1,
        subtotal: 50,
        total: 50,
        paidAmount: 0,
        dueAmount: 50,
        paymentMode: 'cash',
        paymentStatus: 'unpaid',
        status: 'cancelled',
        createdAt: '2025-01-03T10:00:00.000Z',
        updatedAt: '2025-01-03T10:00:00.000Z',
        customer: { name: 'Alice', phone: '1111111111' },
        items: [{ id: 3, orderId: 3, productId: 1, quantity: 1, price: 50, total: 50, product: { name: 'Potash' } }],
      },
    ],
    total: 3,
    page: 2,
    totalPages: 2,
    summary: { totalAmount: 50, paidAmount: 0, dueAmount: 50, uniqueCustomers: 1 },
  },
};

function renderPage() {
  return render(
    <MemoryRouter>
      <Orders />
    </MemoryRouter>
  );
}

describe('Orders page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockParams).forEach((key) => delete mockParams[key]);
    (customerApi.getAll as any).mockResolvedValue({ data: customers });
    (orderApi.getAll as any).mockImplementation((page: number, limit: number) => {
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

  it('renders orders, filters by search and customers, and paginates', async () => {
    renderPage();

    await waitFor(() => expect(orderApi.getAll).toHaveBeenCalledWith(1, 20, undefined, undefined, undefined, expect.objectContaining({ signal: expect.any(AbortSignal) })));
    expect(screen.getAllByText('ORD-1001').length).toBeGreaterThan(0);
    expect(screen.getAllByText('partial').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByPlaceholderText('orderNo...'), { target: { value: '1002' } });
    expect(screen.queryByText('ORD-1001')).not.toBeInTheDocument();
    expect(screen.getAllByText('ORD-1002').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₹200.00').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'allCustomers' }));
    const aliceOption = screen.getAllByText('Alice').find((node) => node.closest('label'))!.closest('label')!.querySelector('input') as HTMLInputElement;
    fireEvent.click(aliceOption);
    await waitFor(() => expect(orderApi.getAll).toHaveBeenLastCalledWith(1, 20, undefined, undefined, [1], expect.objectContaining({ signal: expect.any(AbortSignal) })));

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(orderApi.getAll).toHaveBeenCalledWith(2, 20, undefined, undefined, [1], expect.objectContaining({ signal: expect.any(AbortSignal) })));
  });

  it('applies custom dates, exports excel and prints report', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(orderApi.getAll).toHaveBeenCalled());
    fireEvent.change(screen.getByDisplayValue('allTime'), { target: { value: 'custom' } });
    const dateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2025-01-01' } });
    fireEvent.change(dateInputs[1], { target: { value: '2025-01-31' } });

    await waitFor(() => expect(orderApi.getAll).toHaveBeenLastCalledWith(1, 20, '2025-01-01', '2025-01-31', undefined, expect.objectContaining({ signal: expect.any(AbortSignal) })));

    fireEvent.click(screen.getByRole('button', { name: 'Excel' }));
    await waitFor(() => expect(XLSX.writeFile).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: 'print' }));
    await waitFor(() => expect(orderApi.getAll).toHaveBeenCalledWith(1, 10000, '2025-01-01', '2025-01-31', undefined));

    const printWindow = (window.open as any).mock.results[0].value;
    await waitFor(() => expect(printWindow.document.write).toHaveBeenCalled());
    expect(printWindow.document.write.mock.calls[0][0]).toContain('Orders Report');
    printWindow.onload?.();
    expect(printWindow.print).toHaveBeenCalled();
  });
});
