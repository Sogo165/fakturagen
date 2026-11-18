import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { FileText } from 'lucide-react';
import type { Invoice } from '../types';
import { calculateInvoice, formatDate, formatMoney, paymentQrString, roundMoney } from '../lib/invoice';

export function InvoiceDocument({ invoice }: { invoice: Invoice }) {
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
    <article className="invoice-sheet" aria-label={`Faktura ${invoice.number}`}>
      <header className="document-header">
        <div className="document-brand"><span><FileText size={26} /></span><div><strong>{invoice.supplier.name || 'Dodavatel'}</strong>{invoice.supplier.web && <small>{invoice.supplier.web}</small>}</div></div>
        <div className="document-title"><span>FAKTURA</span><h2>{invoice.number}</h2><small>{isVatPayer ? 'Daňový doklad' : 'Doklad o poskytnutí služby'}</small></div>
      </header>

      <section className="document-parties">
        <div><p className="document-label">DODAVATEL</p><h3>{invoice.supplier.name}</h3>{address(invoice.supplier).map((line) => <p key={line}>{line}</p>)}<dl><div><dt>IČO:</dt><dd>{invoice.supplier.ico || '—'}</dd></div><div><dt>DIČ:</dt><dd>{invoice.supplier.dic || '—'}</dd></div></dl></div>
        <div><p className="document-label">ODBĚRATEL</p><h3>{invoice.client.name}</h3>{address(invoice.client).map((line) => <p key={line}>{line}</p>)}<dl><div><dt>IČO:</dt><dd>{invoice.client.ico || '—'}</dd></div><div><dt>DIČ:</dt><dd>{invoice.client.dic || '—'}</dd></div></dl></div>
      </section>

      <section className="document-dates">
        <div><span>Datum vystavení</span><strong>{formatDate(invoice.issueDate)}</strong></div>
        <div><span>{isVatPayer ? 'Datum zdan. plnění' : 'Datum plnění'}</span><strong>{formatDate(invoice.taxDate)}</strong></div>
        <div><span>Datum splatnosti</span><strong>{formatDate(invoice.dueDate)}</strong></div>
        <div><span>Způsob úhrady</span><strong>{invoice.paymentMethod === 'bank' ? 'Bankovní převod' : 'Hotově'}</strong></div>
      </section>

      <table className={`document-items ${isVatPayer ? '' : 'document-items-no-vat'}`}>
        <thead><tr><th>Popis položky</th><th>Množství</th><th className="align-right">Cena / jedn.</th>{isVatPayer && <th className="align-right">DPH</th>}<th className="align-right">{isVatPayer ? 'Celkem bez DPH' : 'Celkem'}</th></tr></thead>
        <tbody>{invoice.items.map((item) => {
          const lineBase = roundMoney(Math.max(0, item.quantity) * Math.max(0, item.unitPrice));
          return <tr key={item.id}><td>{item.description || 'Položka faktury'}</td><td>{item.quantity.toLocaleString('cs-CZ')} {item.unit}</td><td className="align-right">{formatMoney(item.unitPrice, invoice.currency)}</td>{isVatPayer && <td className="align-right">{item.vatRate} %</td>}<td className="align-right">{formatMoney(lineBase, invoice.currency)}</td></tr>;
        })}</tbody>
      </table>

      <section className="document-bottom">
        <div className="payment-details">
          <p className="document-label">PLATEBNÍ ÚDAJE</p>
          {invoice.paymentMethod === 'bank' ? <>
            {invoice.supplier.bankAccount && <p><span>Bankovní účet</span><strong>{invoice.supplier.bankAccount}</strong></p>}
            {invoice.supplier.iban && <p><span>IBAN</span><strong>{invoice.supplier.iban}</strong></p>}
            {invoice.variableSymbol && <p><span>Variabilní symbol</span><strong>{invoice.variableSymbol}</strong></p>}
            {invoice.constantSymbol && <p><span>Konstantní symbol</span><strong>{invoice.constantSymbol}</strong></p>}
          </> : <p><strong>Úhrada hotově</strong></p>}
          {qrCode && <div className="qr-payment"><img src={qrCode} alt="QR kód pro platbu faktury" /><div><strong>QR platba</strong><span>Naskenujte kód<br />v bankovní aplikaci</span></div></div>}
        </div>
        <div className="document-totals">
          {isVatPayer ? <>
            <p><span>Základ daně</span><strong>{formatMoney(totals.subtotal, invoice.currency)}</strong></p>
            {totals.vatGroups.filter((group) => group.rate > 0).map((group) => <p key={group.rate}><span>DPH {group.rate} % z {formatMoney(group.base, invoice.currency)}</span><strong>{formatMoney(group.vat, invoice.currency)}</strong></p>)}
          </> : <p className="not-vat-payer">Nejsem plátcem DPH.</p>}
          <div className="grand-total"><span>Celkem k úhradě</span><strong>{formatMoney(totals.total, invoice.currency)}</strong></div>
        </div>
      </section>

      {invoice.note && <section className="document-note"><p className="document-label">POZNÁMKA</p><p>{invoice.note}</p></section>}
      {hasContact && <footer className="document-footer"><div>{invoice.supplier.email && <span>{invoice.supplier.email}</span>}{invoice.supplier.phone && <span>{invoice.supplier.phone}</span>}</div></footer>}
    </article>
  );
}
