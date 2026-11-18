import { useState } from 'react';
import { ArrowLeft, Check, Copy, Download, FileDown, LoaderCircle, Mail, Pencil, Printer, Send, Trash2 } from 'lucide-react';
import type { Invoice, InvoiceStatus } from '../types';
import { useApp } from '../context/AppContext';
import { InvoiceDocument } from '../components/InvoiceDocument';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/Modal';
import { createInvoicePdf, downloadInvoicePdf, invoicePdfFilename, savePdfFile } from '../lib/pdf';
import { buildInvoiceEmail } from '../lib/email';

export function InvoicePreview({ invoice, navigate }: { invoice: Invoice; navigate: (path: string) => void }) {
  const { setInvoiceStatus, duplicateInvoice, deleteInvoice, notify } = useApp();
  const [toDelete, setToDelete] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const printInvoice = () => {
    const previousTitle = document.title;
    const restoreTitle = () => { document.title = previousTitle; };
    document.title = invoicePdfFilename(invoice).replace(/\.pdf$/, '');
    window.addEventListener('afterprint', restoreTitle, { once: true });
    window.print();
  };

  const downloadPdf = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const filename = await downloadInvoicePdf(invoice);
      notify(`PDF bylo uloženo jako ${filename}`);
    } catch {
      notify('PDF se nepodařilo vytvořit. Zkuste to znovu nebo použijte tisk.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const sendByEmail = async () => {
    if (sendingEmail) return;
    setSendingEmail(true);
    try {
      const email = buildInvoiceEmail(invoice, invoice.client.email);
      const file = await createInvoicePdf(invoice);
      const pdfFile = new File([file.blob], file.filename, { type: 'application/pdf' });

      if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [pdfFile] })) {
        try {
          await navigator.share({ files: [pdfFile], title: email.subject, text: email.body });
          notify('PDF bylo předáno ke sdílení.');
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return;
        }
      }

      savePdfFile(file);
      notify(email.recipient
        ? 'PDF bylo uloženo. Přiložte ho do otevřeného e-mailu.'
        : 'PDF bylo uloženo. Doplňte e-mail odběratele, pokud ho chcete mít předvyplněný.', 'info');
      window.location.href = email.mailto;
    } catch {
      notify('E-mail se nepodařilo připravit. Zkuste stáhnout PDF zvlášť.', 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  const changeStatus = (status: InvoiceStatus) => setInvoiceStatus(invoice.id, status);

  return (
    <div className="preview-page">
      <div className="preview-top no-print">
        <button className="back-button" type="button" onClick={() => navigate('/invoices')}><ArrowLeft size={18} /> Zpět na faktury</button>
        <div className="preview-status"><StatusBadge invoice={invoice} /><span>Uloženo lokálně</span></div>
      </div>
      <section className="document-toolbar no-print">
        <div><p className="eyebrow">DOKLAD</p><h2>Faktura {invoice.number}</h2></div>
        <div className="toolbar-actions">
          <button className="button button-secondary" type="button" onClick={() => navigate(`/editor/${invoice.id}`)}><Pencil size={17} /> Upravit</button>
          <button className="button button-secondary print-button" type="button" onClick={printInvoice}><Printer size={18} /> Tisk</button>
          <button className="button button-secondary" type="button" onClick={sendByEmail} disabled={sendingEmail}>
            {sendingEmail ? <LoaderCircle className="spin" size={18} /> : <Mail size={18} />}
            {sendingEmail ? 'Připravuji…' : 'Poslat e-mailem'}
          </button>
          <button className="button button-primary" type="button" onClick={downloadPdf} disabled={exporting}>
            {exporting ? <LoaderCircle className="spin" size={18} /> : <FileDown size={18} />}
            {exporting ? 'Vytvářím PDF…' : 'Stáhnout PDF'}
          </button>
        </div>
      </section>
      <section className="preview-actions no-print">
        <label>Stav faktury<select value={invoice.status} onChange={(event) => changeStatus(event.target.value as InvoiceStatus)}><option value="draft">Koncept</option><option value="sent">K úhradě</option><option value="paid">Uhrazeno</option></select></label>
        {invoice.status === 'draft' && <button className="text-button" type="button" onClick={() => changeStatus('sent')}><Send size={16} /> Označit jako vystavenou</button>}
        {invoice.status === 'sent' && <button className="text-button paid-action" type="button" onClick={() => changeStatus('paid')}><Check size={17} /> Označit jako uhrazenou</button>}
        <span className="actions-spacer" />
        <button className="text-button" type="button" onClick={() => { const copy = duplicateInvoice(invoice.id); if (copy) navigate(`/editor/${copy.id}`); }}><Copy size={16} /> Duplikovat</button>
        <button className="text-button danger-text" type="button" onClick={() => setToDelete(true)}><Trash2 size={16} /> Smazat</button>
      </section>
      <div className="print-area"><InvoiceDocument invoice={invoice} /></div>
      <p className="pdf-hint no-print"><Download size={16} /> Příjemce e-mailu se bere z e-mailu odběratele. PDF obsahuje skutečný text; na mobilu se přiloží přes systémové sdílení, v prohlížeči ho přiložíte ručně.</p>
      {toDelete && <ConfirmDialog title="Smazat fakturu?" message={`Faktura ${invoice.number} bude trvale odstraněna. Tuto akci nelze vrátit zpět.`} confirmLabel="Smazat fakturu" danger onClose={() => setToDelete(false)} onConfirm={() => { deleteInvoice(invoice.id); navigate('/invoices'); }} />}
    </div>
  );
}
