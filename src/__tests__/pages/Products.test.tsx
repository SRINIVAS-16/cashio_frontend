import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  productApi: {
    getAll: vi.fn(),
    getCategories: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  stockBookApi: {
    getProductDetail: vi.fn(),
  },
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock('../../context/LanguageContext', () => ({
  useLang: () => ({ t: new Proxy({}, { get: (_, key) => String(key) }), lang: 'en', setLang: vi.fn() }),
}));

vi.mock('../../context/PermissionContext', () => ({
  usePermissions: () => ({ hasPermission: () => true, permissions: new Set() }),
}));

vi.mock('../../api/client', () => ({
  productApi: mocks.productApi,
  stockBookApi: mocks.stockBookApi,
}));

vi.mock('react-hot-toast', () => ({
  default: { success: mocks.toastSuccess, error: mocks.toastError },
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

import Products from '../../pages/Products';
import { renderWithRouter } from './testUtils';

const products = [
  {
    id: 1,
    name: 'Urea',
    nameTe: '',
    category: 'fertilizer',
    unit: 'kg',
    price: 1200,
    minStock: 5,
    cgstPercent: 0,
    sgstPercent: 0,
    isActive: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
];

describe('Products page', () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.productApi.getAll.mockReset();
    mocks.productApi.getCategories.mockReset();
    mocks.stockBookApi.getProductDetail.mockReset();
    mocks.productApi.getAll.mockResolvedValue({ data: products });
    mocks.productApi.getCategories.mockResolvedValue({ data: ['fertilizer', 'pesticide'] });
  });

  it('renders the product list with category options', async () => {
    renderWithRouter(<Products />);

    expect((await screen.findAllByText('Urea')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('fertilizer').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /addProduct/i })).toBeInTheDocument();
  });

  it('filters products using search input', async () => {
    renderWithRouter(<Products />);

    await screen.findAllByText('Urea');
    const input = screen.getByPlaceholderText('search...');
    fireEvent.change(input, { target: { value: 'Ure' } });
    expect(input).toHaveValue('Ure');
  });

  it('navigates to the new product form when add product is clicked', async () => {
    renderWithRouter(<Products />);

    await screen.findAllByText('Urea');
    fireEvent.click(screen.getByRole('button', { name: /addProduct/i }));

    expect(mocks.navigate).toHaveBeenCalledWith('/products/new');
  });
});
