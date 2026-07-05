import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  dashboardApi: { getProfitLoss: vi.fn() },
  productApi: { getAll: vi.fn(), getCategories: vi.fn() },
  customerApi: { getAll: vi.fn() },
  pdfSave: vi.fn(),
  autoTable: vi.fn(),
  xlsxWriteFile: vi.fn(),
}));

vi.mock('../../context/LanguageContext', () => ({
  useLang: () => ({ t: new Proxy({}, { get: (_, key) => String(key) }), lang: 'en', setLang: vi.fn() }),
}));

vi.mock('../../context/ShopConfigContext', () => ({
  useShopConfig: () => ({ shop: { name: 'Test Shop' } }),
}));

vi.mock('jspdf', () => ({
  default: vi.fn(function () {
    return {
      internal: { pageSize: { getWidth: () => 210 } },
      setFontSize: vi.fn(),
      setFont: vi.fn(),
      text: vi.fn(),
      save: mocks.pdfSave,
    };
  }),
}));

vi.mock('jspdf-autotable', () => ({ default: mocks.autoTable }));

vi.mock('xlsx', () => ({
  utils: {
    aoa_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: mocks.xlsxWriteFile,
}));

vi.mock('../../api/client', () => ({
  dashboardApi: mocks.dashboardApi,
  productApi: mocks.productApi,
  customerApi: mocks.customerApi,
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children, data }: any) => <div data-testid="bar-chart">{data?.length}{children}</div>,
  Bar: ({ children }: any) => <div data-testid="bar-series">{children}</div>,
  Cell: () => <div data-testid="bar-cell" />,
  ReferenceLine: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

import ProfitLoss from '../../pages/ProfitLoss';
import { renderWithRouter } from './testUtils';

function report(overrides: any = {}) {
  return {
    groupBy: 'product',
    summary: { revenue: 5000, cost: 3000, profit: 2000, quantity: 40, margin: 40, due: 800, itemCount: 12 },
    rows: [
      { key: '1', label: 'Urea', labelTe: null, quantity: 25, revenue: 3000, cost: 1500, profit: 1500, margin: 50, due: 500 },
      { key: '2', label: 'DAP', labelTe: null, quantity: 15, revenue: 2000, cost: 1500, profit: 500, margin: 25, due: 300 },
    ],
    trend: [
      { date: '2026-04-06', profit: 1200 },
      { date: '2026-04-13', profit: -300 },
    ],
    ...overrides,
  };
}

describe('ProfitLoss page', () => {
  beforeEach(() => {
    mocks.dashboardApi.getProfitLoss.mockReset();
    mocks.pdfSave.mockClear();
    mocks.autoTable.mockClear();
    mocks.xlsxWriteFile.mockClear();
    mocks.productApi.getAll.mockResolvedValue({ data: [{ id: 1, name: 'Urea', category: 'Fertilizer' }] });
    mocks.productApi.getCategories.mockResolvedValue({ data: ['Fertilizer', 'Seeds'] });
    mocks.customerApi.getAll.mockResolvedValue({ data: [{ id: 5, name: 'Ravi' }] });
  });

  it('renders KPIs and a table row per group', async () => {
    mocks.dashboardApi.getProfitLoss.mockResolvedValue({ data: report() });

    renderWithRouter(<ProfitLoss />);

    await waitFor(() => expect(mocks.dashboardApi.getProfitLoss).toHaveBeenCalled());

    expect(await screen.findByText('DAP')).toBeInTheDocument();
    expect(screen.getAllByText('Urea').length).toBeGreaterThan(0);
    // summary revenue and profit
    expect(screen.getAllByText('₹5,000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₹2,000').length).toBeGreaterThan(0);
    // weekly profit chart renders one signed bar per week
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getAllByTestId('bar-cell')).toHaveLength(2);
  });

  it('sends the current financial year as the default range', async () => {
    mocks.dashboardApi.getProfitLoss.mockResolvedValue({ data: report() });

    renderWithRouter(<ProfitLoss />);

    await waitFor(() => expect(mocks.dashboardApi.getProfitLoss).toHaveBeenCalled());
    const filters = mocks.dashboardApi.getProfitLoss.mock.calls[0][0];
    expect(filters.groupBy).toBe('product');
    expect(filters.start).toMatch(/^\d{4}-04-01$/);
    expect(filters.end).toMatch(/^\d{4}-03-31$/);
  });

  it('refetches when the group-by selector changes', async () => {
    mocks.dashboardApi.getProfitLoss.mockResolvedValue({ data: report() });

    renderWithRouter(<ProfitLoss />);
    await waitFor(() => expect(mocks.dashboardApi.getProfitLoss).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('groupBy'), { target: { value: 'payment' } });

    await waitFor(() =>
      expect(mocks.dashboardApi.getProfitLoss).toHaveBeenCalledWith(
        expect.objectContaining({ groupBy: 'payment' }),
        expect.anything()
      )
    );
  });

  it('switches to custom date fields and refetches with the chosen range', async () => {
    mocks.dashboardApi.getProfitLoss.mockResolvedValue({ data: report() });

    renderWithRouter(<ProfitLoss />);
    await waitFor(() => expect(mocks.dashboardApi.getProfitLoss).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('dateRange'), { target: { value: 'custom' } });
    fireEvent.change(screen.getByLabelText('startDate'), { target: { value: '2025-06-01' } });
    fireEvent.change(screen.getByLabelText('endDate'), { target: { value: '2025-06-30' } });

    await waitFor(() =>
      expect(mocks.dashboardApi.getProfitLoss).toHaveBeenCalledWith(
        expect.objectContaining({ start: '2025-06-01', end: '2025-06-30' }),
        expect.anything()
      )
    );
  });

  it('shows a no-data placeholder when there are no rows', async () => {
    mocks.dashboardApi.getProfitLoss.mockResolvedValue({
      data: report({ rows: [], summary: { revenue: 0, cost: 0, profit: 0, quantity: 0, margin: 0, itemCount: 0 } }),
    });

    renderWithRouter(<ProfitLoss />);

    expect(await screen.findByText('noData')).toBeInTheDocument();
  });

  it('exports the report as Excel', async () => {
    mocks.dashboardApi.getProfitLoss.mockResolvedValue({ data: report() });

    renderWithRouter(<ProfitLoss />);
    await screen.findByText('DAP');

    fireEvent.click(screen.getByText('export'));
    fireEvent.click(screen.getByText('exportExcel'));

    expect(mocks.xlsxWriteFile).toHaveBeenCalledTimes(1);
    expect(mocks.xlsxWriteFile.mock.calls[0][1]).toMatch(/^profit_loss_.*\.xlsx$/);
  });

  it('exports the report as PDF', async () => {
    mocks.dashboardApi.getProfitLoss.mockResolvedValue({ data: report() });

    renderWithRouter(<ProfitLoss />);
    await screen.findByText('DAP');

    fireEvent.click(screen.getByText('export'));
    fireEvent.click(screen.getByText('exportPdf'));

    expect(mocks.autoTable).toHaveBeenCalledTimes(1);
    expect(mocks.pdfSave).toHaveBeenCalledTimes(1);
    expect(mocks.pdfSave.mock.calls[0][0]).toMatch(/^profit_loss_.*\.pdf$/);
  });
});
