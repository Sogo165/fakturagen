import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { FileText } from 'lucide-react';
import type { Invoice } from '../types';
import { calculateInvoice, formatDate, formatMoney, paymentQrString, roundMoney } from '../lib/invoice';
import { useI18n } from '../i18n';

export function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  const { t, locale } = useI18n();
  const [qrCode, setQrCode] = useState('');
  const isVatPayer = invoice.supplier.vatPayer;
  const totals = calculateInvoice(invoice.items.map((item) => isVatPayer ? item : { ...item, vatRate: 0 as const }));

  useEffect(() => {
    let active = true;
    const paymentString = paymentQrString(invoice);
    if (!paymentString) { setQrCode(''); return; }
    QRCode.toDataURL(paymentString, {
      width: 220,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#173f35', light: '#ffffff' },
    }).then((url) => { if (active) setQrCode(url); }).catch(() => { if (active) setQrCode(''); });
    return () => { active = false; };
  }, [invoice]);

  const address = (party: Invoice['client']) => [party.street, `${party.zip} ${party.city}`.trim(), party.country].filter(Boolean);
  const hasContact = invoice.supplier.email || invoice.supplier.phone;

  return (
    <article className="invoice-sheet" aria-label={invoice.number}>
      <header className="document-header">
        <div className="document-brand"><span><FileText size={26} /></span><div><strong>{invoice.supplier.name || t('editor.supplier')}</strong>{invoice.supplier.web && <small>{invoice.supplier.web}</small>}</div></div>
        <div className="document-title"><span>{t('document.title')}</span><h2>{invoice.number}</h2><small>{isVatPayer ? t('document.taxDocument') : t('document.serviceDocument')}</small></div>
      </header>

      <section className="document-parties">
        <div><p className="document-label">{t('document.supplier')}</p><h3>{invoice.supplier.name}</h3>{address(invoice.supplier).map((line) => <p key={line}>{line}</p>)}<dl><div><dt>{t('labels.ico')}:</dt><dd>{invoice.supplier.ico || '—'}</dd></div><div><dt>{t('labels.dic')}:</dt><dd>{invoice.supplier.dic || '—'}</dd></div></dl></div>
        <div><p className="document-label">{t('document.customer')}</p><h3>{invoice.client.name}</h3>{address(invoice.client).map((line) => <p key={line}>{line}</p>)}<dl><div><dt>{t('labels.ico')}:</dt><dd>{invoice.client.ico || '—'}</dd></div><div><dt>{t('labels.dic')}:</dt><dd>{invoice.client.dic || '—'}</dd></div></dl></div>
      </section>

      <section className="document-dates">
        <div><span>{t('document.issuedDate')}</span><strong>{formatDate(invoice.issueDate, locale)}</strong></div>
        <div><span>{isVatPayer ? t('document.taxDate') : t('document.supplyDate')}</span><strong>{formatDate(invoice.taxDate, locale)}</strong></div>
        <div><span>{t('document.dueDate')}</span><strong>{formatDate(invoice.dueDate, locale)}</strong></div>
        <div><span>{t('document.paymentMethod')}</span><strong>{invoice.paymentMethod === 'bank' ? t('document.bankTransfer') : t('document.cash')}</strong></div>
      </section>

      <table className={`document-items ${isVatPayer ? '' : 'document-items-no-vat'}`}>
        <thead><tr><th>{t('document.itemDescription')}</th><th>{t('document.quantity')}</th><th className="align-right">{t('document.unitPrice')}</th>{isVatPayer && <th className="align-right">{t('document.vat')}</th>}<th className="align-right">{isVatPayer ? t('document.totalWithoutVat') : t('document.total')}</th></tr></thead>
        <tbody>{invoice.items.map((item) => {
          const lineBase = roundMoney(Math.max(0, item.quantity) * Math.max(0, item.unitPrice));
          return <tr key={item.id}><td>{item.description || t('document.defaultItem')}</td><td>{item.quantity.toLocaleString(locale)} {item.unit}</td><td className="align-right">{formatMoney(item.unitPrice, invoice.currency, locale)}</td>{isVatPayer && <td className="align-right">{item.vatRate} %</td>}<td className="align-right">{formatMoney(lineBase, invoice.currency, locale)}</td></tr>;
        })}</tbody>
      </table>

      <section className="document-bottom">
        <div className="payment-details">
          <p className="document-label">{t('document.paymentDetails')}</p>
          {invoice.paymentMethod === 'bank' ? <>
            {invoice.supplier.bankAccount && <p><span>{t('document.bankAccount')}</span><strong>{invoice.supplier.bankAccount}</strong></p>}
            {invoice.supplier.iban && <p><span>IBAN</span><strong>{invoice.supplier.iban}</strong></p>}
            {invoice.variableSymbol && <p><span>{t('document.variableSymbol')}</span><strong>{invoice.variableSymbol}</strong></p>}
            {invoice.constantSymbol && <p><span>{t('document.constantSymbol')}</span><strong>{invoice.constantSymbol}</strong></p>}
          </> : <p><strong>{t('document.cashPayment')}</strong></p>}
          {qrCode && <div className="qr-payment"><img src={qrCode} alt={t('document.qrAlt')} /><div><strong>{t('document.qrPayment')}</strong><span>{t('document.qrScan')}<br />{t('document.qrInApp')}</span></div></div>}
        </div>
        <div className="document-totals">
          {isVatPayer ? <>
            <p><span>{t('document.taxBase')}</span><strong>{formatMoney(totals.subtotal, invoice.currency, locale)}</strong></p>
            {totals.vatGroups.filter((group) => group.rate > 0).map((group) => <p key={group.rate}><span>{t('document.vat')} {group.rate} % {formatMoney(group.base, invoice.currency, locale)}</span><strong>{formatMoney(group.vat, invoice.currency, locale)}</strong></p>)}
          </> : <p className="not-vat-payer">{t('document.notVatPayer')}</p>}
          <div className="grand-total"><span>{t('document.totalDue')}</span><strong>{formatMoney(totals.total, invoice.currency, locale)}</strong></div>
        </div>
      </section>

      {invoice.note && <section className="document-note"><p className="document-label">{t('document.note')}</p><p>{invoice.note}</p></section>}
      {hasContact && <footer className="document-footer"><div>{invoice.supplier.email && <span>{invoice.supplier.email}</span>}{invoice.supplier.phone && <span>{invoice.supplier.phone}</span>}</div></footer>}
    </article>
  );
}
