import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  updateShop: vi.fn(),
  updateLocalLanguage: vi.fn(),
  setTheme: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('../../context/LanguageContext', () => ({
  useLang: () => ({
    t: new Proxy({}, { get: (_, key) => String(key) }),
    lang: 'en',
    setLang: vi.fn(),
    languages: [
      { code: 'en', name: 'English', script: 'EN' },
      { code: 'te', name: 'తెలుగు', script: 'తె' },
    ],
  }),
}));

vi.mock('../../context/ShopConfigContext', () => ({
  useShopConfig: () => ({
    shop: {
      name: 'Test Shop',
      nameLocal: 'టెస్ట్ షాప్',
      tagline: 'Best inputs',
      taglineLocal: 'బెస్ట్',
      phone: '9999999999',
      altPhone: '8888888888',
      email: 'shop@example.com',
      gst: 'GST123',
      address: 'Main road',
      addressLocal: 'మెయిన్ రోడ్',
      district: 'East Godavari',
      districtLocal: 'ఈస్ట్ గోదావరి',
      logo: '/logo.svg',
    },
    localLanguage: 'te',
    updateShop: mocks.updateShop,
    updateLocalLanguage: mocks.updateLocalLanguage,
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
    mocks.updateLocalLanguage.mockReset().mockResolvedValue(undefined);
    mocks.setTheme.mockReset();
    mocks.toastSuccess.mockReset();
  });

  it('renders settings sections and handles theme/language changes', async () => {
    renderWithRouter(<Settings />);

    expect(screen.getByText('themeColor')).toBeInTheDocument();
    expect(screen.getByText('Local Language (for all users)')).toBeInTheDocument();
    expect(screen.getByText('shopDetails')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Shop')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Teal/i }));
    fireEvent.click(screen.getByText('हिन्दी'));

    expect(mocks.setTheme).toHaveBeenCalledWith('emerald');
    await waitFor(() => expect(mocks.updateLocalLanguage).toHaveBeenCalledWith('hi'));
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Local language set to Hindi');
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
