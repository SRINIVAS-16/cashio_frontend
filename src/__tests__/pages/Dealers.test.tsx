import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  dealerApi: {
    getAll: vi.fn(),
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
  dealerApi: mocks.dealerApi,
}));

vi.mock('react-hot-toast', () => ({
  default: { success: mocks.toastSuccess, error: mocks.toastError },
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

import Dealers from '../../pages/Dealers';
import { renderWithRouter } from './testUtils';

const dealers = [
  { id: 1, name: 'Sri Agencies', phone: '9000000000', gst: 'GST123', address: 'Main road', isActive: true, createdAt: '2024-01-01' },
];

describe('Dealers page', () => {
  beforeEach(() => {
    mocks.dealerApi.getAll.mockReset();
    mocks.dealerApi.create.mockReset();
    mocks.dealerApi.update.mockReset();
    mocks.dealerApi.delete.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
    mocks.dealerApi.getAll.mockResolvedValue({ data: dealers });
  });

  it('renders the dealer list', async () => {
    renderWithRouter(<Dealers />);

    expect((await screen.findAllByText('Sri Agencies')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('GST123').length).toBeGreaterThan(0);
  });

  it('creates a dealer from the add modal', async () => {
    mocks.dealerApi.create.mockResolvedValue({});

    renderWithRouter(<Dealers />);

    await screen.findAllByText('Sri Agencies');
    fireEvent.click(screen.getByRole('button', { name: /addDealer/i }));
    const textboxes = screen.getAllByRole('textbox');
    fireEvent.change(textboxes[1], { target: { value: 'Lakshmi Traders' } });
    fireEvent.change(textboxes[2], { target: { value: '9888888888' } });
    fireEvent.change(textboxes[3], { target: { value: 'GST999' } });
    fireEvent.change(textboxes[4], { target: { value: 'Market road' } });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => {
      expect(mocks.dealerApi.create).toHaveBeenCalledWith({
        name: 'Lakshmi Traders',
        phone: '9888888888',
        gst: 'GST999',
        address: 'Market road',
      });
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Dealer added!');
  });

  it('edits an existing dealer', async () => {
    mocks.dealerApi.update.mockResolvedValue({});

    const { container } = renderWithRouter(<Dealers />);

    await screen.findAllByText('Sri Agencies');
    fireEvent.click(container.querySelectorAll('button')[1]);
    const textboxes = screen.getAllByRole('textbox');
    fireEvent.change(textboxes[1], { target: { value: 'Sri Fertilizers' } });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => {
      expect(mocks.dealerApi.update).toHaveBeenCalledWith(1, {
        name: 'Sri Fertilizers',
        phone: '9000000000',
        gst: 'GST123',
        address: 'Main road',
      });
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Dealer updated!');
  });
});
