import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CustomFields from '../../pages/CustomFields';
import { customFieldApi } from '../../api/client';
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
  useShopConfig: () => ({ shop: { name: 'Test Shop', nameTe: '', address: '', phone: '', altPhone: '', gst: '', email: '' }, updateShop: vi.fn() }),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() }, toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => mockParams };
});
vi.mock('../../api/client', () => ({
  customFieldApi: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

const fields = [
  { id: 1, name: 'grade', label: 'Grade', labelTe: 'గ్రేడ్', fieldType: 'text', options: null, isRequired: true, scope: 'global', category: null, sortOrder: 1, isActive: true, createdAt: '', updatedAt: '' },
  { id: 2, name: 'seed_type', label: 'Seed Type', labelTe: null, fieldType: 'select', options: '["A","B"]', isRequired: false, scope: 'category', category: 'seeds', sortOrder: 2, isActive: true, createdAt: '', updatedAt: '' },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <CustomFields />
    </MemoryRouter>
  );
}

describe('CustomFields page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (customFieldApi.getAll as any).mockResolvedValue({ data: fields });
    (customFieldApi.create as any).mockResolvedValue({});
    (customFieldApi.update as any).mockResolvedValue({});
    (customFieldApi.delete as any).mockResolvedValue({});
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  it('renders fields, searches and filters by scope/category', async () => {
    renderPage();

    await waitFor(() => expect(customFieldApi.getAll).toHaveBeenCalledWith(undefined, undefined));
    expect(screen.getAllByText('Grade').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Seed Type').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByPlaceholderText('Search fields...'), { target: { value: 'grade' } });
    expect(screen.queryByText('Seed Type')).not.toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('allScopes'), { target: { value: 'category' } });
    await waitFor(() => expect(customFieldApi.getAll).toHaveBeenLastCalledWith('category', undefined));
    fireEvent.change(screen.getByDisplayValue('All Categories'), { target: { value: 'seeds' } });
    await waitFor(() => expect(customFieldApi.getAll).toHaveBeenLastCalledWith('category', 'seeds'));
  });

  it('creates a new category field with generated name', async () => {
    renderPage();

    await waitFor(() => expect(customFieldApi.getAll).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'addField' }));
    fireEvent.change(screen.getByText('label *').parentElement!.querySelector('input') as HTMLInputElement, { target: { value: 'Variety Name' } });
    const fieldTypeEls = screen.getAllByText('fieldType');
    fireEvent.change(fieldTypeEls[fieldTypeEls.length - 1]!.parentElement!.querySelector('select') as HTMLSelectElement, { target: { value: 'select' } });
    fireEvent.change(screen.getByPlaceholderText('["Option 1","Option 2"]'), { target: { value: '["Hybrid","Native"]' } });
    fireEvent.change(screen.getByText('scopeLabel').parentElement!.querySelector('select') as HTMLSelectElement, { target: { value: 'category' } });
    fireEvent.change(screen.getByDisplayValue('-- Select --'), { target: { value: 'seeds' } });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => expect(customFieldApi.create).toHaveBeenCalled());
    expect(customFieldApi.create).toHaveBeenCalledWith({
      name: 'variety_name',
      label: 'Variety Name',
      labelTe: null,
      fieldType: 'select',
      options: '["Hybrid","Native"]',
      isRequired: false,
      scope: 'category',
      category: 'seeds',
      sortOrder: 0,
    });
  });

  it('updates and deletes an existing field', async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByText('Grade').length).toBeGreaterThan(0));
    const row = screen.getAllByText('grade')[0].closest('tr') as HTMLTableRowElement;
    const buttons = row.querySelectorAll('button');

    fireEvent.click(buttons[0]);
    const labelInput = screen.getByDisplayValue('Grade');
    fireEvent.change(labelInput, { target: { value: 'Grade Updated' } });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));
    await waitFor(() => expect(customFieldApi.update).toHaveBeenCalledWith(1, expect.objectContaining({ label: 'Grade Updated' })));

    fireEvent.click(buttons[1]);
    await waitFor(() => expect(customFieldApi.delete).toHaveBeenCalledWith(1));
  });

  it('shows validation errors for invalid forms', async () => {
    renderPage();

    await waitFor(() => expect(customFieldApi.getAll).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'addField' }));
    const fieldTypeEls2 = screen.getAllByText('fieldType');
    fireEvent.change(fieldTypeEls2[fieldTypeEls2.length - 1]!.parentElement!.querySelector('select') as HTMLSelectElement, { target: { value: 'select' } });
    fireEvent.change(screen.getByPlaceholderText('["Option 1","Option 2"]'), { target: { value: 'not-json' } });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    expect(toast.error).toHaveBeenCalledWith('Label is required');
  });
});
