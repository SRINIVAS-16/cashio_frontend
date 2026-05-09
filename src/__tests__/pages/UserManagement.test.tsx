import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  userApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Admin User', role: 'admin' },
  }),
}));

vi.mock('../../context/PermissionContext', () => ({
  usePermissions: () => ({ hasPermission: () => true, permissions: new Set() }),
}));

vi.mock('../../api/client', () => ({
  userApi: mocks.userApi,
}));

vi.mock('react-hot-toast', () => ({
  default: { success: mocks.toastSuccess, error: mocks.toastError },
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

import UserManagement from '../../pages/UserManagement';
import { renderWithRouter } from './testUtils';

const users = [
  { id: 1, username: 'admin', name: 'Admin User', email: 'admin@example.com', role: 'admin', provider: 'local' },
  { id: 2, username: 'cashier1', name: 'Cashier One', email: 'cashier@example.com', role: 'cashier', provider: 'local' },
];

describe('UserManagement page', () => {
  beforeEach(() => {
    mocks.userApi.getAll.mockReset();
    mocks.userApi.create.mockReset();
    mocks.userApi.update.mockReset();
    mocks.userApi.delete.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
    mocks.userApi.getAll.mockResolvedValue({ data: users });
  });

  it('renders the user list and current user marker', async () => {
    renderWithRouter(<UserManagement />);

    expect(await screen.findByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('(you)')).toBeInTheDocument();
    expect(screen.getByText('Cashier One')).toBeInTheDocument();
  });

  it('creates a new user with a selected role', async () => {
    mocks.userApi.create.mockResolvedValue({});

    renderWithRouter(<UserManagement />);

    await screen.findByText('Admin User');
    fireEvent.click(screen.getByRole('button', { name: /Add User/i }));
    const form = screen.getByRole('button', { name: 'Create' }).closest('form')!;
    const inputs = form.querySelectorAll('input');
    const select = form.querySelector('select')!;
    fireEvent.change(inputs[0], { target: { value: 'manager1' } });
    fireEvent.change(inputs[1], { target: { value: 'Manager User' } });
    fireEvent.change(inputs[2], { target: { value: 'pass1234' } });
    fireEvent.change(select, { target: { value: 'manager' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mocks.userApi.create).toHaveBeenCalledWith({
        username: 'manager1',
        password: 'pass1234',
        name: 'Manager User',
        role: 'manager',
      });
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith('User created');
  });

  it('edits a user and updates role assignment', async () => {
    mocks.userApi.update.mockResolvedValue({});

    renderWithRouter(<UserManagement />);

    await screen.findByText('Cashier One');
    fireEvent.click(screen.getAllByTitle('Edit')[1]);
    const form = screen.getByRole('button', { name: 'Update' }).closest('form')!;
    const inputs = form.querySelectorAll('input');
    const select = form.querySelector('select')!;
    fireEvent.change(inputs[0], { target: { value: 'Senior Cashier' } });
    fireEvent.change(select, { target: { value: 'manager' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => {
      expect(mocks.userApi.update).toHaveBeenCalledWith(2, {
        name: 'Senior Cashier',
        role: 'manager',
      });
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith('User updated');
  });
});
