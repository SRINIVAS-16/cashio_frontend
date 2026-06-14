import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProductForm from '../../pages/ProductForm';
import { productApi, customFieldApi } from '../../api/client';
import toast from 'react-hot-toast';

const mockNavigate = vi.fn();
const mockParams: Record<string, string | undefined> = {};

vi.mock('../../context/LanguageContext', () => ({
  useLang: () => ({ t: new Proxy({}, { get: (_, key) => String(key) }), lang: 'en', setLang: vi.fn() }),
}));
vi.mock('../../context/PermissionContext', () => ({
  usePermissions: () => ({ hasPermission: () => true, permissions: new Set() }),
}));
vi.mock('../../context/ShopConfigContext', () => ({
  useShopConfig: () => ({ shop: { name: 'Test Shop', nameLocal: '', address: '', phone: '', altPhone: '', gst: '', email: '' }, updateShop: vi.fn() }),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() }, toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => mockParams };
});
vi.mock('../../api/client', () => ({
  productApi: { getById: vi.fn(), create: vi.fn(), update: vi.fn() },
  customFieldApi: { getForCategory: vi.fn(), saveProductValues: vi.fn() },
}));

const customDefs = [
  { id: 1, name: 'shade', label: 'Shade', fieldType: 'select', options: '["Red","Blue"]', isRequired: true, scope: 'global', sortOrder: 1, isActive: true, createdAt: '', updatedAt: '' },
  { id: 2, name: 'notes', label: 'Notes', fieldType: 'text', options: null, isRequired: false, scope: 'global', sortOrder: 2, isActive: true, createdAt: '', updatedAt: '' },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <ProductForm />
    </MemoryRouter>
  );
}

describe('ProductForm page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockParams).forEach((key) => delete mockParams[key]);
    (customFieldApi.getForCategory as any).mockResolvedValue({ data: customDefs });
    (customFieldApi.saveProductValues as any).mockResolvedValue({});
    (productApi.create as any).mockResolvedValue({ data: { id: 7 } });
    (productApi.update as any).mockResolvedValue({});
    (productApi.getById as any).mockResolvedValue({
      data: {
        id: 1,
        name: 'Urea',
        nameTe: 'యూరియా',
        category: 'fertilizer',
        unit: 'bag',
        price: 100,
        costPrice: 80,
        minStock: 5,
        description: 'Old desc',
        photo: 'data:image/png;base64,old',
        cgstPercent: 2.5,
        sgstPercent: 2.5,
        customFieldValues: [{ customFieldDefinitionId: 2, value: 'Stored note' }],
      },
    });

    class MockFileReader {
      result = 'data:image/png;base64,new-photo';
      onloadend: null | (() => void) = null;
      readAsDataURL() { this.onloadend?.(); }
    }
    vi.stubGlobal('FileReader', MockFileReader as any);
  });

  it('creates a product with custom fields and uploaded photo', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(customFieldApi.getForCategory).toHaveBeenCalledWith('fertilizer'));

    fireEvent.change(screen.getByText('productName *').parentElement!.querySelector('input') as HTMLInputElement, { target: { value: 'New Product' } });
    fireEvent.change(screen.getByText('price (₹) *').parentElement!.querySelector('input') as HTMLInputElement, { target: { value: '150' } });

    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [new File(['photo'], 'photo.png', { type: 'image/png' })] },
    });
    await waitFor(() => expect(screen.getByAltText('Preview')).toBeInTheDocument());

    fireEvent.change(screen.getByText('Shade').parentElement!.querySelector('select') as HTMLSelectElement, { target: { value: 'Blue' } });
    fireEvent.change(screen.getByText('Notes').parentElement!.querySelector('input') as HTMLInputElement, { target: { value: 'Seasonal item' } });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => expect(productApi.create).toHaveBeenCalled());
    expect(productApi.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Product', price: 150, photo: 'data:image/png;base64,new-photo' }));
    expect(customFieldApi.saveProductValues).toHaveBeenCalledWith(7, [
      { customFieldDefinitionId: 1, value: 'Blue' },
      { customFieldDefinitionId: 2, value: 'Seasonal item' },
    ]);
    expect(mockNavigate).toHaveBeenCalledWith('/products');
  });

  it('loads existing product data and updates it', async () => {
    mockParams.id = '1';
    renderPage();

    await waitFor(() => expect(productApi.getById).toHaveBeenCalledWith(1));
    expect(screen.getByDisplayValue('Urea')).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('100'), { target: { value: '175' } });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => expect(productApi.update).toHaveBeenCalledWith(1, expect.objectContaining({ price: 175 })));    
  });

  it('rejects oversized photo uploads', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(customFieldApi.getForCategory).toHaveBeenCalled());
    const bigFile = new File([new Uint8Array(2 * 1024 * 1024 + 10)], 'big.png', { type: 'image/png' });
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [bigFile] },
    });

    expect(toast.error).toHaveBeenCalledWith('Photo must be under 2MB');
  });
});
