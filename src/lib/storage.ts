import type { AppData, BackupFile, Settings } from '../types';
import type { Language } from '../i18n';

export const STORAGE_KEY = 'fakturagen:data:v1';

export const defaultSettings: Settings = {
  name: '',
  ico: '',
  dic: '',
  street: '',
  city: '',
  zip: '',
  country: 'Česká republika',
  email: '',
  phone: '',
  web: '',
  bankAccount: '',
  iban: '',
  vatPayer: false,
  invoicePrefix: 'FV',
  nextNumber: 1,
  dueDays: 14,
  defaultVatRate: 21,
  defaultNote: '',
};

export const emptyData = (): AppData => ({
  invoices: [],
  clients: [],
  settings: { ...defaultSettings },
});

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw) as Partial<AppData>;
    if (!Array.isArray(parsed.invoices) || !Array.isArray(parsed.clients) || !parsed.settings) {
      return emptyData();
    }
    return {
      invoices: parsed.invoices,
      clients: parsed.clients,
      settings: { ...defaultSettings, ...parsed.settings },
    };
  } catch {
    return emptyData();
  }
}

export function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function createBackup(data: AppData): BackupFile {
  return {
    app: 'FakturaGen',
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function parseBackup(text: string): AppData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('invalid-json');
  }

  const candidate = parsed as Partial<BackupFile> | Partial<AppData>;
  const data = 'data' in candidate ? candidate.data : candidate as AppData;
  if (
    !data || !Array.isArray(data.invoices) || !Array.isArray(data.clients) ||
    !data.settings || typeof data.settings !== 'object'
  ) {
    throw new Error('invalid-backup');
  }

  return {
    invoices: data.invoices,
    clients: data.clients,
    settings: { ...defaultSettings, ...data.settings },
  };
}

export function downloadJson(data: AppData, language: Language = 'cs') {
  const backup = createBackup(data);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `fakturagen-${language === 'cs' ? 'zaloha' : 'backup'}-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
