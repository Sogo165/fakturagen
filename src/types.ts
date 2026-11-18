export type VatRate = 0 | 12 | 21;
export type InvoiceStatus = 'draft' | 'sent' | 'paid';
export type PaymentMethod = 'bank' | 'cash';
export type Currency = 'CZK' | 'EUR';

export interface Party {
  name: string;
  ico: string;
  dic: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  email: string;
  phone: string;
  web: string;
}

export interface Supplier extends Party {
  bankAccount: string;
  iban: string;
  vatPayer: boolean;
}

export interface Settings extends Supplier {
  invoicePrefix: string;
  nextNumber: number;
  dueDays: number;
  defaultVatRate: VatRate;
  defaultNote: string;
}

export interface Client extends Party {
  id: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: VatRate;
}

export interface Invoice {
  id: string;
  number: string;
  status: InvoiceStatus;
  issueDate: string;
  taxDate: string;
  dueDate: string;
  paymentMethod: PaymentMethod;
  currency: Currency;
  variableSymbol: string;
  constantSymbol: string;
  supplier: Supplier;
  client: Party;
  items: InvoiceItem[];
  note: string;
  createdAt: string;
  updatedAt: string;
  paidDate?: string;
}

export interface AppData {
  invoices: Invoice[];
  clients: Client[];
  settings: Settings;
}

export interface BackupFile {
  app: 'FakturaGen';
  version: 1;
  exportedAt: string;
  data: AppData;
}
