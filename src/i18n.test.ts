import { describe, expect, it } from 'vitest';
import { translate } from './i18n';
import { buildInvoiceEmail } from './lib/email';
import { createInvoice, formatDate, formatMoney } from './lib/invoice';
import { defaultSettings } from './lib/storage';

describe('lokalizace', () => {
  it('překládá texty a doplňuje parametry', () => {
    expect(translate('cs', 'dashboard.greeting', { name: 'Jano' })).toBe('Dobrý den, Jano!');
    expect(translate('en', 'dashboard.greeting', { name: 'John' })).toBe('Hello, John!');
    expect(translate('en', 'list.shown', { shown: 2, total: 5 })).toBe('Showing 2 of 5 invoices');
  });

  it('formátuje datum a měnu podle jazyka', () => {
    expect(formatDate('2026-11-17', 'cs-CZ')).toBe('17. 11. 2026');
    expect(formatDate('2026-11-17', 'en-GB')).toBe('17/11/2026');
    expect(formatMoney(1234.5, 'CZK', 'en-GB')).toContain('1,234.50');
  });

  it('vytvoří anglický e-mail a výchozí zemi', () => {
    const invoice = createInvoice(defaultSettings, 'pcs', 'Czech Republic');
    invoice.number = 'FV20260007';
    invoice.issueDate = '2026-11-17';
    invoice.supplier.name = 'John Smith';
    expect(invoice.client.country).toBe('Czech Republic');
    const email = buildInvoiceEmail(invoice, 'client@example.com', 'en');
    expect(email.subject).toBe('Invoice FV20260007 – November 2026');
    expect(email.body).toContain('please find attached invoice No. FV20260007');
  });
});
