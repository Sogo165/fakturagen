import { describe, expect, it } from 'vitest';
import type { InvoiceItem } from '../types';
import { accountToIban, addDays, calculateInvoice, nextInvoiceNumber, numericVariableSymbol } from './invoice';
import { defaultSettings, createBackup, parseBackup } from './storage';

const item = (partial: Partial<InvoiceItem>): InvoiceItem => ({
  id: crypto.randomUUID(),
  description: 'Služba',
  quantity: 1,
  unit: 'ks',
  unitPrice: 0,
  vatRate: 21,
  ...partial,
});

describe('výpočty faktury', () => {
  it('spočítá základ, DPH i celkem podle sazeb', () => {
    const result = calculateInvoice([
      item({ quantity: 2, unitPrice: 1000, vatRate: 21 }),
      item({ quantity: 3, unitPrice: 199.9, vatRate: 12 }),
      item({ unitPrice: 500, vatRate: 0 }),
    ]);
    expect(result.subtotal).toBe(3099.7);
    expect(result.vat).toBe(491.96);
    expect(result.total).toBe(3591.66);
    expect(result.vatGroups).toHaveLength(3);
  });

  it('ošetří prázdnou fakturu a záporné hodnoty', () => {
    expect(calculateInvoice([]).total).toBe(0);
    expect(calculateInvoice([item({ quantity: -1, unitPrice: -100 })]).total).toBe(0);
  });
});

describe('číslování a datumy', () => {
  it('vytvoří číslo faktury a variabilní symbol', () => {
    const number = nextInvoiceNumber({ ...defaultSettings, invoicePrefix: 'FV-', nextNumber: 12 }, '2026-03-01');
    expect(number).toBe('FV-20260012');
    expect(numericVariableSymbol(number)).toBe('20260012');
  });

  it('přičte dny bez ohledu na UTC', () => {
    expect(addDays('2026-01-31', 14)).toBe('2026-02-14');
  });

  it('nezanechá neplatné datum po vyprázdnění pole', () => {
    expect(addDays('', 14)).toBe('');
    expect(addDays('neplatné', 14)).toBe('');
  });
});

describe('bankovní účet', () => {
  it('převede český účet na validní IBAN', () => {
    const iban = accountToIban('19-2000145399/0800');
    expect(iban).toBe('CZ6508000000192000145399');
  });

  it('odmítne neplatný formát', () => {
    expect(accountToIban('abc')).toBeNull();
  });
});

describe('záloha dat', () => {
  it('obnoví data z vlastní zálohy', () => {
    const data = { invoices: [], clients: [], settings: { ...defaultSettings, name: 'Jan Novák' } };
    const parsed = parseBackup(JSON.stringify(createBackup(data)));
    expect(parsed.settings.name).toBe('Jan Novák');
  });

  it('odmítne neplatný soubor', () => {
    expect(() => parseBackup('{}')).toThrow();
  });
});
