import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  updateShop: vi.fn(),
  setTheme: vi.fn(),
  setLang: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('../../context/LanguageContext', () => ({
  useLang: () => ({
    t: new Proxy({}, { get: (_, key) => String(key) }),
    lang: 'en',
    setLang: mocks.setLang,
    languages: [
      { code: 'en', name: 'English', script: 'EN' },
      { code: 'te', name: 'Telugu', script: 'తె' },
    ],
  }),
}));

vi.mock('../../context/ShopConfigContext', () => ({
  useShopConfig: () => ({
    shop: {
      name: 'Test Shop',
      nameTe: 'టెస్ట్ షాప్',
      tagline: 'Best inputs',
      taglineTe: 'బెస్ట్',
      phone: '9999999999',
      altPhone: '8888888888',
      email: 'shop@example.com',
      gst: 'GST123',
      address: 'Main road',
      addressTe: 'మెయిన్ రోడ్',
      district: 'East Godavari',
      districtTe: 'ఈస్ట్ గోదావరి',
      logo: '/logo.svg',
    },
    updateShop: mocks.updateShop,
  }),
}));

vi.mock('../../context/ThemeContext', async () => {
  const actual = await vi.importActual<any>('../../context/ThemeContext');
  return {
    ...actual,
    useTheme: () => ({ theme: 'blue', setTheme: mocks.setTheme }),
  };
});

vi.mock('react-hot-toast', () => ({
  default: { success: mocks.toastSuccess, error: vi.fn() },
  toast: { success: mocks.toastSuccess, error: vi.fn() },
}));

import Settings from '../../pages/Settings';
import { renderWithRouter } from './testUtils';

describe('Settings page', () => {
  beforeEach(() => {
    mocks.updateShop.mockReset();
    mocks.setTheme.mockReset();
    mocks.setLang.mockReset();
    mocks.toastSuccess.mockReset();
  });

  it('renders settings sections and handles theme/language changes', () => {
    renderWithRouter(<Settings />);

    expect(screen.getByText('themeColor')).toBeInTheDocument();
    expect(screen.getByText('language')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Shop')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Teal/i }));
    fireEvent.click(screen.getByRole('button', { name: /Telugu/i }));

    expect(mocks.setTheme).toHaveBeenCalledWith('emerald');
    expect(mocks.setLang).toHaveBeenCalledWith('te');
  });

  it('updates shop configuration when saved', async () => {
    renderWithRouter(<Settings />);

    fireEvent.change(screen.getByDisplayValue('Test Shop'), { target: { value: 'Updated Shop' } });
    fireEvent.click(screen.getByRole('button', { name: /saveSettings/i }));

    await waitFor(() => {
      expect(mocks.updateShop).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated Shop' }));
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith('settingsSaved');
  });
});
