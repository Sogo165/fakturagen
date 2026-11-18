import type { Invoice } from '../types';

export interface InvoiceEmail {
  recipient: string;
  subject: string;
  body: string;
  mailto: string;
}

export function buildInvoiceEmail(invoice: Invoice, recipient: string): InvoiceEmail {
  const month = new Intl.DateTimeFormat('cs-CZ', { month: 'long', year: 'numeric' })
    .format(new Date(`${invoice.issueDate || new Date().toISOString().slice(0, 10)}T12:00:00`));
  const subject = `Faktura ${invoice.number} – ${month}`;
  const body = [
    'Dobrý den,',
    '',
    `v příloze posílám fakturu č. ${invoice.number} k úhradě.`,
    '',
    'Děkuji,',
    invoice.supplier.name,
  ].join('\n');
  const candidate = recipient.replace(/[\r\n\s]/g, '').trim();
  const safeRecipient = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate) ? candidate : '';
  const mailto = `mailto:${encodeURIComponent(safeRecipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return { recipient: safeRecipient, subject, body, mailto };
}
