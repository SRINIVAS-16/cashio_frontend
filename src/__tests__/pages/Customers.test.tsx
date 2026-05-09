import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  customerApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('../../context/LanguageContext', () => ({
  useLang: () => ({ t: new Proxy({}, { get: (_, key) => String(key) }), lang: 'en', setLang: vi.fn() }),
}));

vi.mock('../../context/PermissionContext', () => ({
  usePermissions: () => ({ hasPermission: () => true, permissions: new Set() }),
}));

vi.mock('../../api/client', () => ({
  customerApi: mocks.customerApi,
}));

vi.mock('react-hot-toast', () => ({
  default: { success: mocks.toastSuccess, error: mocks.toastError },
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

import Customers from '../../pages/Customers';
import { renderWithRouter } from './testUtils';

const customers = [
  {
    id: 1,
    name: 'Ravi Kumar',
    phone: '9876543210',
    village: 'Anaparthy',
    address: 'Main road',
    photo: '',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
];

describe('Customers page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.customerApi.getAll.mockReset();
    mocks.customerApi.getById.mockReset();
    mocks.customerApi.create.mockReset();
    mocks.customerApi.update.mockReset();
    mocks.customerApi.delete.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
    mocks.customerApi.getAll.mockResolvedValue({ data: customers });
  });

  it('renders the customer list after loading', async () => {
    renderWithRouter(<Customers />);

    expect(await screen.findByText('Ravi Kumar')).toBeInTheDocument();
    expect(screen.getByText('Anaparthy')).toBeInTheDocument();
    expect(mocks.customerApi.getAll).toHaveBeenCalled();
  });

  it('updates search input value when user types', async () => {
    renderWithRouter(<Customers />);

    await screen.findByText('Ravi Kumar');
    const input = screen.getByPlaceholderText('searchByPhone');
    fireEvent.change(input, { target: { value: '9876' } });
    expect(input).toHaveValue('9876');
  });

  it('creates a new customer from the add form', async () => {
    mocks.customerApi.create.mockResolvedValue({});

    renderWithRouter(<Customers />);

    await screen.findByText('Ravi Kumar');
    fireEvent.click(screen.getByRole('button', { name: /addCustomer/i }));
    const textboxes = screen.getAllByRole('textbox');
    fireEvent.change(textboxes[1], { target: { value: 'Sita' } });
    fireEvent.change(textboxes[2], { target: { value: '9000000000' } });
    fireEvent.change(textboxes[3], { target: { value: 'Kakinada' } });
    fireEvent.change(textboxes[4], { target: { value: 'Street 1' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'save' }));
    });

    await waitFor(() => {
      expect(mocks.customerApi.create).toHaveBeenCalled();
    });
    const callArgs = mocks.customerApi.create.mock.calls[0][0];
    expect(callArgs.name).toBe('Sita');
    expect(callArgs.phone).toBe('9000000000');
  });

  it('opens the edit form and updates a customer', async () => {
    mocks.customerApi.update.mockResolvedValue({});

    const { container } = renderWithRouter(<Customers />);

    await screen.findByText('Ravi Kumar');
    // Click the edit button (pen icon)
    const buttons = container.querySelectorAll('button');
    const editBtn = Array.from(buttons).find(b => b.querySelector('.lucide-pen'));
    fireEvent.click(editBtn || buttons[2]);

    const textboxes = screen.getAllByRole('textbox');
    fireEvent.change(textboxes[1], { target: { value: 'Ravi Teja' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'save' }));
    });

    await waitFor(() => {
      expect(mocks.customerApi.update).toHaveBeenCalled();
    });
    expect(mocks.customerApi.update.mock.calls[0][0]).toBe(1);
  });
});
