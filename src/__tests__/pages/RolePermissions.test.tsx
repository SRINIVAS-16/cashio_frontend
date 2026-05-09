import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  permissionApi: {
    getMatrix: vi.fn(),
    updateRolePermissions: vi.fn(),
  },
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('../../context/PermissionContext', () => ({
  usePermissions: () => ({ hasPermission: () => true, permissions: new Set() }),
}));

vi.mock('../../api/client', () => ({
  permissionApi: mocks.permissionApi,
}));

vi.mock('react-hot-toast', () => ({
  default: { success: mocks.toastSuccess, error: mocks.toastError },
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

import RolePermissions from '../../pages/RolePermissions';
import { renderWithRouter } from './testUtils';

const matrixResponse = {
  permissions: [
    { code: 'products', name: 'Products', description: 'Manage products', group: 'Inventory', isEntity: true },
    { code: 'dashboard', name: 'Dashboard', description: 'View dashboard', group: 'General', isEntity: false },
  ],
  matrix: {
    admin: { products: ['read', 'create'], dashboard: ['access'] },
    manager: { products: ['read'], dashboard: ['access'] },
    cashier: { products: ['read'], dashboard: [] },
    viewer: { products: [], dashboard: ['access'] },
  },
};

describe('RolePermissions page', () => {
  beforeEach(() => {
    mocks.permissionApi.getMatrix.mockReset();
    mocks.permissionApi.updateRolePermissions.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
    mocks.permissionApi.getMatrix.mockResolvedValue({ data: matrixResponse });
    mocks.permissionApi.updateRolePermissions.mockResolvedValue({});
  });

  it('renders permission groups and role tabs', async () => {
    renderWithRouter(<RolePermissions />);

    expect(await screen.findByText('Role Permissions')).toBeInTheDocument();
    expect(screen.getByText('Inventory')).toBeInTheDocument();
    expect(screen.getAllByText('admin').length).toBeGreaterThan(0);
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('toggles a permission and saves the active role', async () => {
    renderWithRouter(<RolePermissions />);

    await screen.findByText('Products');
    fireEvent.click(screen.getByRole('button', { name: /Delete$/ }));
    fireEvent.click(screen.getByRole('button', { name: /Save admin/i }));

    await waitFor(() => {
      expect(mocks.permissionApi.updateRolePermissions).toHaveBeenCalledWith(
        'admin',
        expect.arrayContaining([
          { code: 'products', action: 'read' },
          { code: 'products', action: 'create' },
          { code: 'products', action: 'delete' },
          { code: 'dashboard', action: 'access' },
        ]),
      );
    });

    expect(mocks.toastSuccess).toHaveBeenCalledWith('admin permissions saved');
  });
});
