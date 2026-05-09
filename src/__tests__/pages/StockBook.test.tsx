import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  stockBookApi: {
    getAll: vi.fn(),
  },
  toastError: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock('../../context/LanguageContext', () => ({
  useLang: () => ({ t: new Proxy({}, { get: (_, key) => String(key) }), lang: 'en', setLang: vi.fn() }),
}));

vi.mock('../../api/client', () => ({
  stockBookApi: mocks.stockBookApi,
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: mocks.toastError },
  toast: { success: vi.fn(), error: mocks.toastError },
}));

import StockBook from '../../pages/StockBook';
import { renderWithRouter } from './testUtils';

const stockItems = [
  {
    id: 1,
    name: 'Urea',
    nameTe: '',
    category: 'fertilizer',
    unit: 'kg',
    price: 1200,
    stock: 8,
    minStock: 5,
    totalPurchased: 20,
    totalSold: 12,
    nearestExpiry: '2099-01-01',
    expiringQty30d: 0,
  },
  {
    id: 2,
    name: 'DAP',
    nameTe: '',
    category: 'fertilizer',
    unit: 'kg',
    price: 1400,
    stock: 3,
    minStock: 5,
    totalPurchased: 10,
    totalSold: 7,
    nearestExpiry: '2099-01-01',
    expiringQty30d: 2,
  },
];

describe('StockBook page', () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.stockBookApi.getAll.mockReset();
    mocks.toastError.mockReset();
    mocks.stockBookApi.getAll.mockResolvedValue({ data: stockItems });
  });

  it('renders stock summary cards and product rows', async () => {
    renderWithRouter(<StockBook />);

    expect((await screen.findAllByText('Urea')).length).toBeGreaterThan(0);
    expect(screen.getByText('stockBook')).toBeInTheDocument();
    expect(screen.getAllByText('fertilizer').length).toBeGreaterThan(0);
  });

  it('filters stock entries by search and category', async () => {
    renderWithRouter(<StockBook />);

    await screen.findAllByText('Urea');
    fireEvent.change(screen.getByPlaceholderText('search products...'), { target: { value: 'DAP' } });

    await waitFor(() => {
      expect(mocks.stockBookApi.getAll).toHaveBeenLastCalledWith('DAP', undefined);
    });

    fireEvent.change(screen.getByDisplayValue('allCategories'), { target: { value: 'fertilizer' } });

    await waitFor(() => {
      expect(mocks.stockBookApi.getAll).toHaveBeenLastCalledWith('DAP', 'fertilizer');
    });
  });

  it('navigates to the product detail view when a row is clicked', async () => {
    renderWithRouter(<StockBook />);

    const productName = (await screen.findAllByText('Urea'))[0];
    fireEvent.click(productName.closest('tr')!);

    expect(mocks.navigate).toHaveBeenCalledWith('/stock-book/1');
  });
});
