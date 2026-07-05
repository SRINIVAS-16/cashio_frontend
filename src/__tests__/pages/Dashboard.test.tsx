import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  dashboardApi: {
    getDashboard: vi.fn(),
    getSalesTrend: vi.fn(),
  },
}));

vi.mock('../../context/LanguageContext', () => ({
  useLang: () => ({ t: new Proxy({}, { get: (_, key) => String(key) }), lang: 'en', setLang: vi.fn() }),
}));

vi.mock('../../context/ShopConfigContext', () => ({
  useShopConfig: () => ({
    shop: {
      name: 'Test Shop',
      nameLocal: '',
      tagline: 'Best inputs',
      taglineLocal: '',
      address: 'Main road',
      addressLocal: '',
      district: 'East Godavari',
      districtLocal: '',
      phone: '9999999999',
      altPhone: '',
      gst: 'GST123',
      email: 'shop@example.com',
      logo: '/logo.svg',
    },
    updateShop: vi.fn(),
  }),
}));

vi.mock('../../api/client', () => ({
  dashboardApi: mocks.dashboardApi,
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children, data }: any) => <div data-testid="line-chart">{data?.length}{children}</div>,
  Line: () => <div data-testid="line-series" />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

import Dashboard from '../../pages/Dashboard';
import { renderWithRouter } from './testUtils';

function createDashboardData() {
  return {
    financialYear: { startYear: 2026, label: 'FY 2026-27' },
    fySummary: { salesCount: 12, salesTotal: 45000, grossProfit: 8000, totalCost: 37000 },
    totalProducts: 24,
    totalCustomers: 8,
    dueSummary: { totalDueAmount: 1500, totalDueOrders: 2 },
    lowStockProducts: [{ id: 1, name: 'Urea', stock: 2, min_stock: 5 }],
    customersWithDues: [{ customer: { name: 'Ravi', phone: '9999999999' }, totalDue: 1500, orderCount: 2 }],
    expiringSoon: [{ batchId: 1, productName: 'DAP', batchNo: 'B1', expiryDate: '2099-01-01', remaining: 10, unit: 'kg' }],
    topProducts: [{ product: { id: 1, name: 'Urea' }, totalQuantity: 5, totalRevenue: 2500, orderCount: 2 }],
    productProfitability: {
      topProfit: [{ product: { id: 1, name: 'Urea' }, totalQuantity: 5, totalRevenue: 2500, totalCost: 1500, profit: 1000 }],
      topLoss: [{ product: { id: 2, name: 'DAP' }, totalQuantity: 3, totalRevenue: 600, totalCost: 900, profit: -300 }],
    },
    recentOrders: [{ id: 1, orderNo: 'ORD-1', customer: { name: 'Ravi', phone: '9999999999' }, total: 2500, status: 'completed', createdAt: '2024-01-10T00:00:00.000Z' }],
  };
}

describe('Dashboard page', () => {
  beforeEach(() => {
    mocks.dashboardApi.getDashboard.mockReset();
    mocks.dashboardApi.getSalesTrend.mockReset();
  });

  it('shows loading indicators first and then renders stats and charts', async () => {
    let resolveDashboard: (value: any) => void = () => {};
    let resolveTrend: (value: any) => void = () => {};

    mocks.dashboardApi.getDashboard.mockReturnValue(new Promise((resolve) => { resolveDashboard = resolve; }));
    mocks.dashboardApi.getSalesTrend.mockReturnValue(new Promise((resolve) => { resolveTrend = resolve; }));

    const { container } = renderWithRouter(<Dashboard />);

    expect(container.querySelectorAll('.animate-spin').length).toBeGreaterThan(0);

    resolveDashboard({ data: createDashboardData() });
    resolveTrend({ data: [{ date: '2024-01-01', total: 1000 }] });

    await waitFor(() => {
      expect(screen.getByText('₹45,000')).toBeInTheDocument();
    });

    expect(screen.getByText('₹8,000')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('Ravi')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    // Profit & loss lists render amounts (no bar charts anymore)
    expect(screen.getByText('+₹1,000')).toBeInTheDocument();
    expect(screen.getByText('-₹300')).toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
  });

  it('renders no-data placeholders when chart datasets are empty', async () => {
    mocks.dashboardApi.getDashboard.mockResolvedValue({
      data: {
        ...createDashboardData(),
        topProducts: [],
        customersWithDues: [],
        productProfitability: { topProfit: [], topLoss: [] },
      },
    });
    mocks.dashboardApi.getSalesTrend.mockResolvedValue({ data: [] });

    renderWithRouter(<Dashboard />);

    await waitFor(() => {
      expect(mocks.dashboardApi.getDashboard).toHaveBeenCalled();
    });

    expect(await screen.findAllByText('noData')).toHaveLength(3);
  });

  it('refetches with the selected financial year when the dropdown changes', async () => {
    mocks.dashboardApi.getDashboard.mockResolvedValue({ data: createDashboardData() });
    mocks.dashboardApi.getSalesTrend.mockResolvedValue({ data: [] });

    renderWithRouter(<Dashboard />);

    await waitFor(() => {
      expect(mocks.dashboardApi.getDashboard).toHaveBeenCalled();
    });

    const currentFyStart = mocks.dashboardApi.getDashboard.mock.calls[0][0] as number;
    expect(typeof currentFyStart).toBe('number');
    expect(mocks.dashboardApi.getSalesTrend).toHaveBeenCalledWith(30, currentFyStart, expect.anything());

    const select = screen.getByLabelText('financialYear') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: String(currentFyStart - 1) } });

    await waitFor(() => {
      expect(mocks.dashboardApi.getDashboard).toHaveBeenCalledWith(currentFyStart - 1, expect.anything());
    });
    expect(mocks.dashboardApi.getSalesTrend).toHaveBeenCalledWith(30, currentFyStart - 1, expect.anything());
  });
});
