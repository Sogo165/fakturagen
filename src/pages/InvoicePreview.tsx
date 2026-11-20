import { useState } from 'react';
import { ArrowLeft, Check, Copy, Download, FileDown, LoaderCircle, Mail, Pencil, Printer, Send, Trash2 } from 'lucide-react';
import type { Invoice, InvoiceStatus } from '../types';
import { useApp } from '../context/AppContext';
import { InvoiceDocument } from '../components/InvoiceDocument';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/Modal';
import { createInvoicePdf, downloadInvoicePdf, invoicePdfFilename, savePdfFile } from '../lib/pdf';
import { buildInvoiceEmail } from '../lib/email';
import { useI18n } from '../i18n';

export function InvoicePreview({ invoice, navigate }: { invoice: Invoice; navigate: (path: string) => void }) {
  const { setInvoiceStatus, duplicateInvoice, deleteInvoice, notify } = useApp();
  const { t, language } = useI18n();
  const [toDelete, setToDelete] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const printInvoice = () => {
    const previousTitle = document.title;
    const restoreTitle = () => { document.title = previousTitle; };
    document.title = invoicePdfFilename(invoice, language).replace(/\.pdf$/, '');
    window.addEventListener('afterprint', restoreTitle, { once: true });
    window.print();
  };

  const downloadPdf = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const filename = await downloadInvoicePdf(invoice, language);
      notify(t('preview.pdfSaved', { file: filename }));
    } catch {
      notify(t('preview.pdfError'), 'error');
    } finally {
      setExporting(false);
    }
  };

  const sendByEmail = async () => {
    if (sendingEmail) return;
    setSendingEmail(true);
    try {
      const email = buildInvoiceEmail(invoice, invoice.client.email, language);
      const file = await createInvoicePdf(invoice, language);
      const pdfFile = new File([file.blob], file.filename, { type: 'application/pdf' });

      if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [pdfFile] })) {
        try {
          await navigator.share({ files: [pdfFile], title: email.subject, text: email.body });
          notify(t('preview.shareSuccess'));
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return;
        }
      }

      savePdfFile(file);
      notify(email.recipient ? t('preview.attachPdf') : t('preview.missingClientEmail'), 'info');
      window.location.href = email.mailto;
    } catch {
      notify(t('preview.emailError'), 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  const changeStatus = (status: InvoiceStatus) => setInvoiceStatus(invoice.id, status);

  return (
    <div className="preview-page">
      <div className="preview-top no-print">
        <button className="back-button" type="button" onClick={() => navigate('/invoices')}><ArrowLeft size={18} /> {t('preview.back')}</button>
        <div className="preview-status"><StatusBadge invoice={invoice} /><span>{t('common.savedLocally')}</span></div>
      </div>
      <section className="document-toolbar no-print">
        <div><p className="eyebrow">{t('preview.eyebrow')}</p><h2>{t('page.preview')} {invoice.number}</h2></div>
        <div className="toolbar-actions">
          <button className="button button-secondary" type="button" onClick={() => navigate(`/editor/${invoice.id}`)}><Pencil size={17} /> {t('preview.edit')}</button>
          <button className="button button-secondary print-button" type="button" onClick={printInvoice}><Printer size={18} /> {t('preview.print')}</button>
          <button className="button button-secondary" type="button" onClick={sendByEmail} disabled={sendingEmail}>
            {sendingEmail ? <LoaderCircle className="spin" size={18} /> : <Mail size={18} />}
            {sendingEmail ? t('preview.preparing') : t('preview.sendEmail')}
          </button>
          <button className="button button-primary" type="button" onClick={downloadPdf} disabled={exporting}>
            {exporting ? <LoaderCircle className="spin" size={18} /> : <FileDown size={18} />}
            {exporting ? t('preview.creatingPdf') : t('preview.downloadPdf')}
          </button>
        </div>
      </section>
      <section className="preview-actions no-print">
        <label>{t('preview.invoiceStatus')}<select value={invoice.status} onChange={(event) => changeStatus(event.target.value as InvoiceStatus)}><option value="draft">{t('status.draft')}</option><option value="sent">{t('status.sent')}</option><option value="paid">{t('status.paid')}</option></select></label>
        {invoice.status === 'draft' && <button className="text-button" type="button" onClick={() => changeStatus('sent')}><Send size={16} /> {t('preview.markIssued')}</button>}
        {invoice.status === 'sent' && <button className="text-button paid-action" type="button" onClick={() => changeStatus('paid')}><Check size={17} /> {t('preview.markPaid')}</button>}
        <span className="actions-spacer" />
        <button className="text-button" type="button" onClick={() => { const copy = duplicateInvoice(invoice.id); if (copy) navigate(`/editor/${copy.id}`); }}><Copy size={16} /> {t('common.duplicate')}</button>
        <button className="text-button danger-text" type="button" onClick={() => setToDelete(true)}><Trash2 size={16} /> {t('common.delete')}</button>
      </section>
      <div className="print-area"><InvoiceDocument invoice={invoice} /></div>
      <p className="pdf-hint no-print"><Download size={16} /> {t('preview.emailHint')}</p>
      {toDelete && <ConfirmDialog title={t('preview.deleteTitle')} message={t('preview.deleteMessage', { number: invoice.number })} confirmLabel={t('preview.deleteConfirm')} danger onClose={() => setToDelete(false)} onConfirm={() => { deleteInvoice(invoice.id); navigate('/invoices'); }} />}
    </div>
  );
}
