import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { AppData, Client, Invoice, InvoiceStatus, Settings } from '../types';
import { createInvoice, localDateISO, nextInvoiceNumber, numericVariableSymbol, supplierFromSettings } from '../lib/invoice';
import { createId } from '../lib/id';
import { useI18n } from '../i18n';
import { emptyData, loadData, saveData } from '../lib/storage';

type Toast = { id: number; message: string; kind: 'success' | 'error' | 'info' } | null;

interface AppContextValue {
  data: AppData;
  toast: Toast;
  notify: (message: string, kind?: 'success' | 'error' | 'info') => void;
  saveInvoice: (invoice: Invoice, isNew?: boolean) => void;
  deleteInvoice: (id: string) => void;
  duplicateInvoice: (id: string) => Invoice | null;
  setInvoiceStatus: (id: string, status: InvoiceStatus) => void;
  saveClient: (client: Client) => void;
  deleteClient: (id: string) => void;
  updateSettings: (settings: Settings) => void;
  replaceData: (data: AppData) => void;
  resetData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(loadData);
  const [toast, setToast] = useState<Toast>(null);
  const { t, locale } = useI18n();
  const defaultCountry = t('party.countryDefault');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const notify = useCallback((message: string, kind: 'success' | 'error' | 'info' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, kind });
    toastTimer.current = setTimeout(() => setToast(null), 3800);
  }, []);

  useEffect(() => {
    try {
      saveData(data);
    } catch {
      notify(t('errors.storage'), 'error');
    }
  }, [data, notify, t]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const saveInvoice = (invoice: Invoice, isNew = false) => {
    const duplicate = data.invoices.some((item) =>
      item.id !== invoice.id && item.number.trim().toLowerCase() === invoice.number.trim().toLowerCase(),
    );
    if (duplicate) throw new Error('duplicate-invoice');

    setData((current) => ({
      ...current,
      invoices: isNew
        ? [invoice, ...current.invoices]
        : current.invoices.map((item) => item.id === invoice.id ? invoice : item),
      settings: isNew ? { ...current.settings, nextNumber: current.settings.nextNumber + 1 } : current.settings,
    }));
  };

  const deleteInvoice = (id: string) => {
    setData((current) => ({ ...current, invoices: current.invoices.filter((item) => item.id !== id) }));
    notify(t('notify.invoiceDeleted'));
  };

  const duplicateInvoice = (id: string) => {
    const original = data.invoices.find((item) => item.id === id);
    if (!original) return null;
    const fresh = createInvoice(data.settings, locale === 'cs-CZ' ? 'ks' : 'pcs', defaultCountry);
    const now = new Date().toISOString();
    const duplicate: Invoice = {
      ...original,
      id: createId(),
      number: nextInvoiceNumber(data.settings),
      variableSymbol: numericVariableSymbol(nextInvoiceNumber(data.settings)),
      status: 'draft',
      issueDate: fresh.issueDate,
      taxDate: fresh.taxDate,
      dueDate: fresh.dueDate,
      supplier: supplierFromSettings(data.settings),
      items: original.items.map((item) => ({ ...item, id: createId() })),
      paidDate: undefined,
      createdAt: now,
      updatedAt: now,
    };
    setData((current) => ({
      ...current,
      invoices: [duplicate, ...current.invoices],
      settings: { ...current.settings, nextNumber: current.settings.nextNumber + 1 },
    }));
    notify(t('notify.invoiceDuplicated'));
    return duplicate;
  };

  const setInvoiceStatus = (id: string, status: InvoiceStatus) => {
    setData((current) => ({
      ...current,
      invoices: current.invoices.map((invoice) => invoice.id === id ? {
        ...invoice,
        status,
        paidDate: status === 'paid' ? invoice.paidDate ?? localDateISO() : undefined,
        updatedAt: new Date().toISOString(),
      } : invoice),
    }));
    notify(status === 'paid' ? t('notify.invoicePaid') : t('notify.invoiceStatusChanged'));
  };

  const saveClient = (client: Client) => {
    setData((current) => {
      const exists = current.clients.some((item) => item.id === client.id);
      return {
        ...current,
        clients: exists
          ? current.clients.map((item) => item.id === client.id ? client : item)
          : [client, ...current.clients],
      };
    });
    notify(t('notify.clientSaved'));
  };

  const deleteClient = (id: string) => {
    setData((current) => ({ ...current, clients: current.clients.filter((item) => item.id !== id) }));
    notify(t('notify.clientDeleted'));
  };

  const updateSettings = (settings: Settings) => {
    setData((current) => ({ ...current, settings }));
    notify(t('notify.settingsSaved'));
  };

  const replaceData = (imported: AppData) => {
    setData(imported);
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('fakturagen:draft:')) localStorage.removeItem(key);
    });
    notify(t('notify.backupRestored'));
  };

  const resetData = () => {
    setData(emptyData());
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('fakturagen:draft:')) localStorage.removeItem(key);
    });
    notify(t('notify.dataReset'), 'info');
  };

  return (
    <AppContext.Provider value={{
      data, toast, notify, saveInvoice, deleteInvoice, duplicateInvoice, setInvoiceStatus,
      saveClient, deleteClient, updateSettings, replaceData, resetData,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp musí být použit uvnitř AppProvider.');
  return context;
}
