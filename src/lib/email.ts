import type { Invoice } from '../types';
import { translate } from '../i18n';
import type { Language } from '../i18n';

export interface InvoiceEmail {
  recipient: string;
  subject: string;
  body: string;
  mailto: string;
}

export function buildInvoiceEmail(invoice: Invoice, recipient: string, language: Language = 'cs'): InvoiceEmail {
  const locale = language === 'cs' ? 'cs-CZ' : 'en-GB';
  const month = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' })
    .format(new Date(`${invoice.issueDate || new Date().toISOString().slice(0, 10)}T12:00:00`));
  const subject = translate(language, 'email.subject', { number: invoice.number, month });
  const body = [
    translate(language, 'email.hello'),
    '',
    translate(language, 'email.body', { number: invoice.number }),
    '',
    translate(language, 'email.thanks'),
    invoice.supplier.name,
  ].join('\n');
  const candidate = recipient.replace(/[\r\n\s]/g, '').trim();
  const safeRecipient = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate) ? candidate : '';
  const mailto = `mailto:${encodeURIComponent(safeRecipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return { recipient: safeRecipient, subject, body, mailto };
}
