import { describe, expect, it } from 'vitest';
import { buildInvoiceEmail } from './email';
import { createInvoice } from './invoice';
import { defaultSettings } from './storage';

describe('e-mail s fakturou', () => {
  it('vytvoří předmět a zprávu podle konkrétní faktury', () => {
    const invoice = createInvoice({ ...defaultSettings, name: 'Jan Novák' });
    invoice.number = 'FV20260007';
    invoice.issueDate = '2026-11-17';
    invoice.client.name = 'Twenty one million s.r.o.';

    const email = buildInvoiceEmail(invoice, 'ucetni@example.cz');
    expect(email.subject).toBe('Faktura FV20260007 – listopad 2026');
    expect(email.body).toContain('FV20260007');
    expect(email.body).toContain('k úhradě');
    expect(email.mailto).toContain('mailto:ucetni%40example.cz');
    expect(email.mailto).not.toContain(' ');
  });

  it('nepoužije neplatnou adresu s vloženým řádkem', () => {
    const invoice = createInvoice(defaultSettings);
    const email = buildInvoiceEmail(invoice, 'ucetni@example.cz\r\nBcc: cizi@example.cz');
    expect(email.recipient).toBe('');
  });
});
