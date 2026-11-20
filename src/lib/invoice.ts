import type { Invoice, InvoiceItem, Settings, Supplier, VatRate } from '../types';
import { createId } from './id';

export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function localDateISO(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(dateISO: string, days: number) {
  if (!dateISO || !Number.isFinite(days)) return '';
  const date = new Date(`${dateISO}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + days);
  return localDateISO(date);
}

export function formatDate(dateISO: string) {
  if (!dateISO) return '—';
  return new Intl.DateTimeFormat('cs-CZ').format(new Date(`${dateISO}T12:00:00`));
}

export function formatMoney(value: number, currency = 'CZK') {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value || 0);
}

export function nextInvoiceNumber(settings: Settings, issueDate = localDateISO()) {
  const prefix = settings.invoicePrefix.trim();
  const year = issueDate.slice(0, 4);
  return `${prefix}${year}${String(Math.max(1, settings.nextNumber)).padStart(4, '0')}`;
}

export function numericVariableSymbol(invoiceNumber: string) {
  return invoiceNumber.replace(/\D/g, '').slice(-10);
}

export function supplierFromSettings(settings: Settings): Supplier {
  const {
    name, ico, dic, street, city, zip, country, email, phone, web,
    bankAccount, iban, vatPayer,
  } = settings;
  return { name, ico, dic, street, city, zip, country, email, phone, web, bankAccount, iban, vatPayer };
}

export function createInvoice(settings: Settings): Invoice {
  const issueDate = localDateISO();
  const number = nextInvoiceNumber(settings, issueDate);
  const now = new Date().toISOString();

  return {
    id: createId(),
    number,
    status: 'draft',
    issueDate,
    taxDate: issueDate,
    dueDate: addDays(issueDate, settings.dueDays),
    paymentMethod: 'bank',
    currency: 'CZK',
    variableSymbol: numericVariableSymbol(number),
    constantSymbol: '',
    supplier: supplierFromSettings(settings),
    client: {
      name: '', ico: '', dic: '', street: '', city: '', zip: '',
      country: 'Česká republika', email: '', phone: '', web: '',
    },
    items: [createInvoiceItem(settings.vatPayer ? settings.defaultVatRate : 0)],
    note: settings.defaultNote,
    createdAt: now,
    updatedAt: now,
  };
}

export function createInvoiceItem(vatRate: VatRate = 21): InvoiceItem {
  return {
    id: createId(),
    description: '',
    quantity: 1,
    unit: 'ks',
    unitPrice: 0,
    vatRate,
  };
}

export function calculateInvoice(items: InvoiceItem[]) {
  const groups = new Map<VatRate, { rate: VatRate; base: number; vat: number }>();

  items.forEach((item) => {
    const base = roundMoney(Math.max(0, item.quantity) * Math.max(0, item.unitPrice));
    const current = groups.get(item.vatRate) ?? { rate: item.vatRate, base: 0, vat: 0 };
    current.base = roundMoney(current.base + base);
    groups.set(item.vatRate, current);
  });

  groups.forEach((group) => {
    group.vat = roundMoney(group.base * group.rate / 100);
  });

  const vatGroups = [...groups.values()].sort((a, b) => b.rate - a.rate);
  const subtotal = roundMoney(vatGroups.reduce((sum, group) => sum + group.base, 0));
  const vat = roundMoney(vatGroups.reduce((sum, group) => sum + group.vat, 0));
  const total = roundMoney(subtotal + vat);

  return { subtotal, vat, total, vatGroups };
}

export function isOverdue(invoice: Invoice) {
  return invoice.status === 'sent' && invoice.dueDate < localDateISO();
}

export function accountToIban(account: string): string | null {
  const match = account.replace(/\s/g, '').match(/^(?:(\d{1,6})-)?(\d{1,10})\/(\d{4})$/);
  if (!match) return null;
  const prefix = (match[1] ?? '').padStart(6, '0');
  const base = match[2].padStart(10, '0');
  const bban = `${match[3]}${prefix}${base}`;
  const remainder = BigInt(`${bban}123500`) % 97n;
  const check = String(98n - remainder).padStart(2, '0');
  return `CZ${check}${bban}`;
}

export function paymentQrString(invoice: Invoice) {
  const iban = invoice.supplier.iban.replace(/\s/g, '').toUpperCase() || accountToIban(invoice.supplier.bankAccount);
  const total = calculateInvoice(invoice.items.map((item) => invoice.supplier.vatPayer ? item : { ...item, vatRate: 0 as VatRate })).total;
  if (!iban || total <= 0 || invoice.paymentMethod !== 'bank' || invoice.currency !== 'CZK') return null;

  const fields = [
    'SPD*1.0',
    `ACC:${iban}`,
    `AM:${total.toFixed(2)}`,
    'CC:CZK',
    `RN:${invoice.supplier.name.slice(0, 35)}`,
    `X-VS:${invoice.variableSymbol.replace(/\D/g, '').slice(0, 10)}`,
    `MSG:${`Faktura ${invoice.number}`.slice(0, 60)}`,
  ];

  return `${fields.join('*')}*`;
}
