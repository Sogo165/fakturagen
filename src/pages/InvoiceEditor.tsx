import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, Building2, Check, ChevronRight, CircleDollarSign, Eye, FileCheck2, FileText, Landmark, Plus, Save, Settings2, Trash2, UserRound } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Invoice, InvoiceItem, Party, VatRate } from '../types';
import { addDays, calculateInvoice, createInvoice, createInvoiceItem, formatDate, formatMoney, numericVariableSymbol, roundMoney, supplierFromSettings } from '../lib/invoice';
import { PartyFields } from '../components/PartyFields';
import { ClientLookup } from '../components/ClientLookup';
import { Modal } from '../components/Modal';
import { InvoiceDocument } from '../components/InvoiceDocument';
import { createId } from '../lib/id';
import { useI18n } from '../i18n';

interface InvoiceEditorProps {
  invoiceId?: string;
  navigate: (path: string) => void;
}

export function InvoiceEditor({ invoiceId, navigate }: InvoiceEditorProps) {
  const { data, saveInvoice, saveClient, notify } = useApp();
  const { t, locale } = useI18n();
  const isNew = !invoiceId || invoiceId === 'new';
  const existing = data.invoices.find((item) => item.id === invoiceId);
  const draftKey = `fakturagen:draft:${isNew ? 'new' : invoiceId}`;
  const [invoice, setInvoice] = useState<Invoice>(() => {
    try {
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        const parsed = JSON.parse(draft) as Invoice;
        if (parsed && Array.isArray(parsed.items) && parsed.client && parsed.supplier) {
          const supplier = supplierFromSettings(data.settings);
          return isNew ? {
            ...parsed,
            supplier,
            items: parsed.items.map((item) => ({ ...item, vatRate: supplier.vatPayer ? item.vatRate : 0 as VatRate })),
          } : parsed;
        }
      }
    } catch { /* Poškozený koncept se přeskočí. */ }
    if (existing) return structuredClone(existing);
    return createInvoice(data.settings, locale === 'cs-CZ' ? 'ks' : 'pcs', t('party.countryDefault'));
  });
  const [selectedClient, setSelectedClient] = useState(() => {
    const match = data.clients.find((client) => client.name === invoice.client.name && client.ico === invoice.client.ico);
    return match?.id ?? '';
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [addedToClients, setAddedToClients] = useState(false);
  const totals = useMemo(() => calculateInvoice(invoice.items), [invoice.items]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try { localStorage.setItem(draftKey, JSON.stringify(invoice)); } catch { /* Hlavní data se ukládají zvlášť. */ }
    }, 350);
    return () => clearTimeout(timer);
  }, [invoice, draftKey]);

  const patch = <K extends keyof Invoice>(key: K, value: Invoice[K]) => setInvoice((current) => ({ ...current, [key]: value }));
  const updateClient = (client: Party) => { setInvoice((current) => ({ ...current, client })); setAddedToClients(false); };
  const updateItem = <K extends keyof InvoiceItem>(id: string, key: K, value: InvoiceItem[K]) => {
    setInvoice((current) => ({ ...current, items: current.items.map((item) => item.id === id ? { ...item, [key]: value } : item) }));
  };

  const updateNumber = (number: string) => {
    setInvoice((current) => ({
      ...current,
      number,
      variableSymbol: current.variableSymbol === numericVariableSymbol(current.number) ? numericVariableSymbol(number) : current.variableSymbol,
    }));
  };

  const selectLookupClient = (party: Party, savedClientId?: string) => {
    setSelectedClient(savedClientId ?? '');
    setAddedToClients(false);
    setInvoice((current) => ({ ...current, client: party }));
  };

  const addCurrentClient = () => {
    if (!invoice.client.name.trim()) { setErrors([t('editor.errorNameForDirectory')]); return; }
    const duplicate = data.clients.find((client) => client.id !== selectedClient && invoice.client.ico && client.ico === invoice.client.ico);
    if (duplicate) { setErrors([t('editor.errorDuplicateClient')]); return; }
    const clientId = selectedClient || createId();
    saveClient({ ...invoice.client, id: clientId, createdAt: new Date().toISOString() });
    setSelectedClient(clientId);
    setAddedToClients(true);
  };

  const validate = () => {
    const problems: string[] = [];
    if (!invoice.number.trim()) problems.push(t('editor.errorNumber'));
    if (!invoice.supplier.name.trim() || !invoice.supplier.ico.trim()) problems.push(t('editor.errorSupplier'));
    if (!invoice.client.name.trim()) problems.push(t('editor.errorCustomer'));
    if (!invoice.issueDate || !invoice.taxDate || !invoice.dueDate) problems.push(t('editor.errorDates'));
    if (invoice.dueDate < invoice.issueDate) problems.push(t('editor.errorDueBeforeIssue'));
    if (!invoice.items.length || invoice.items.some((item) => !item.description.trim())) problems.push(t('editor.errorItemDescription'));
    if (invoice.items.some((item) => item.quantity <= 0 || item.unitPrice < 0)) problems.push(t('editor.errorItemValues'));
    if (invoice.paymentMethod === 'bank' && !invoice.supplier.bankAccount.trim() && !invoice.supplier.iban.trim()) problems.push(t('editor.errorBank'));
    setErrors(problems);
    if (problems.length) window.scrollTo({ top: 0, behavior: 'smooth' });
    return problems.length === 0;
  };

  const handleSave = (saveAsDraft: boolean) => {
    if (!validate()) return;
    const status = saveAsDraft ? 'draft' : invoice.status === 'draft' ? 'sent' : invoice.status;
    const finalized: Invoice = {
      ...invoice,
      number: invoice.number.trim(),
      client: { ...invoice.client, name: invoice.client.name.trim() },
      items: invoice.items.map((item) => ({ ...item, description: item.description.trim(), vatRate: invoice.supplier.vatPayer ? item.vatRate : 0 as VatRate })),
      status,
      paidDate: status === 'paid' ? invoice.paidDate ?? new Date().toISOString().slice(0, 10) : undefined,
      updatedAt: new Date().toISOString(),
    };
    try {
      saveInvoice(finalized, isNew);
      localStorage.removeItem(draftKey);
      notify(saveAsDraft ? t('editor.draftSaved') : status === 'sent' ? t('editor.invoiceIssued') : t('editor.changesSaved'));
      navigate(`/invoice/${finalized.id}`);
    } catch (error) {
      setErrors([error instanceof Error && error.message === 'duplicate-invoice' ? t('editor.errorDuplicateNumber') : t('editor.errorSave')]);
    }
  };

  const supplierComplete = invoice.supplier.name && invoice.supplier.ico;
  const clientComplete = Boolean(invoice.client.name.trim());
  const unitOptions = locale === 'cs-CZ'
    ? ['ks', 'hod', 'den', 'měsíc', 'služba', 'm²', 'kg']
    : ['pcs', 'hour', 'day', 'month', 'service', 'm²', 'kg'];

  return (
    <div className="editor-page">
      <div className="editor-heading">
        <button className="back-button" type="button" onClick={() => navigate(isNew ? '/invoices' : `/invoice/${invoice.id}`)}><ArrowLeft size={18} /> {t('common.back')}</button>
        <div><p className="eyebrow">{isNew ? t('editor.newEyebrow') : t('editor.editEyebrow')}</p><h2>{isNew ? t('editor.newTitle') : t('editor.editTitle', { number: invoice.number })}</h2><p><span className="autosave-dot" /> {t('editor.autosave')}</p></div>
        <button className="button button-secondary preview-button" type="button" onClick={() => setShowPreview(true)}><Eye size={18} /> {t('editor.previewInvoice')}</button>
      </div>

      {errors.length > 0 && <div className="form-error editor-errors" role="alert"><AlertCircle size={21} /><div><strong>{t('editor.cannotSave')}</strong><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></div></div>}

      <div className="editor-layout">
        <div className="editor-form-sections">
          <section className="panel form-section">
            <header className="section-header numbered"><span>1</span><div><h3>{t('editor.basicTitle')}</h3><p>{t('editor.basicSubtitle')}</p></div></header>
            <div className="section-content form-grid three-columns">
              <label className="form-field field-full"><span>{t('editor.invoiceNumber')} *</span><input value={invoice.number} onChange={(event) => updateNumber(event.target.value)} required maxLength={40} /></label>
              <label className="form-field"><span>{t('editor.issueDate')} *</span><input type="date" value={invoice.issueDate} onChange={(event) => { const issueDate = event.target.value; setInvoice((current) => ({ ...current, issueDate, taxDate: current.taxDate === current.issueDate ? issueDate : current.taxDate, dueDate: isNew ? addDays(issueDate, data.settings.dueDays) : current.dueDate })); }} required /></label>
              <label className="form-field"><span>{t('editor.taxDate')} *</span><input type="date" value={invoice.taxDate} onChange={(event) => patch('taxDate', event.target.value)} required /></label>
              <label className="form-field"><span>{t('editor.dueDate')} *</span><input type="date" min={invoice.issueDate} value={invoice.dueDate} onChange={(event) => patch('dueDate', event.target.value)} required /></label>
              <label className="form-field"><span>{t('editor.paymentMethod')}</span><select value={invoice.paymentMethod} onChange={(event) => patch('paymentMethod', event.target.value as Invoice['paymentMethod'])}><option value="bank">{t('editor.bankTransfer')}</option><option value="cash">{t('editor.cash')}</option></select></label>
              <label className="form-field"><span>{t('editor.currency')}</span><select value={invoice.currency} onChange={(event) => patch('currency', event.target.value as Invoice['currency'])}><option value="CZK">{t('editor.czk')}</option><option value="EUR">{t('editor.eur')}</option></select></label>
              <label className="form-field"><span>{t('editor.variableSymbol')}</span><input value={invoice.variableSymbol} onChange={(event) => patch('variableSymbol', event.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" /></label>
              <label className="form-field"><span>{t('editor.constantSymbol')}</span><input value={invoice.constantSymbol} onChange={(event) => patch('constantSymbol', event.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" placeholder={t('editor.optionalPlaceholder')} /></label>
            </div>
          </section>

          <section className="panel form-section">
            <header className="section-header numbered"><span>2</span><div><h3>{t('editor.partiesTitle')}</h3><p>{t('editor.partiesSubtitle')}</p></div></header>
            <div className="section-content">
              <div className="supplier-box"><span className="supplier-icon"><Building2 size={21} /></span><div><small>{t('editor.supplier')}</small><strong>{invoice.supplier.name || t('editor.noSupplier')}</strong><span>{[invoice.supplier.ico && `${t('labels.ico')}: ${invoice.supplier.ico}`, invoice.supplier.street, invoice.supplier.city].filter(Boolean).join(' · ') || t('editor.completeSupplier')}</span></div><button className="text-button" type="button" onClick={() => navigate('/settings')}><Settings2 size={16} /> {supplierComplete ? t('editor.editProfile') : t('editor.setupProfile')} <ChevronRight size={15} /></button></div>
              <div className="subsection-heading"><span className="small-section-icon"><UserRound size={18} /></span><h4>{t('editor.customer')}</h4></div>
              <ClientLookup clients={data.clients} onSelect={selectLookupClient} />
              <PartyFields value={invoice.client} onChange={updateClient} emailLabel={t('party.emailForInvoice')} />
              <div className="client-save-row"><span>{t('editor.useForFuture')}</span><button className="text-button" type="button" onClick={addCurrentClient} disabled={addedToClients}>{addedToClients ? <Check size={16} /> : <Save size={16} />}{addedToClients ? t('editor.savedInDirectory') : t('editor.saveToDirectory')}</button></div>
            </div>
          </section>

          <section className={`panel form-section items-section ${invoice.supplier.vatPayer ? '' : 'items-no-vat'}`}>
            <header className="section-header numbered"><span>3</span><div><h3>{t('editor.itemsTitle')}</h3><p>{t('editor.itemsSubtitle')}</p></div></header>
            <div className="section-content">
              <div className="item-labels"><span>{t('editor.itemDescription')}</span><span>{t('editor.quantity')}</span><span>{t('editor.unit')}</span><span>{invoice.supplier.vatPayer ? t('editor.priceWithoutVat') : t('editor.pricePerUnit')}</span>{invoice.supplier.vatPayer && <span>{t('editor.vat')}</span>}<span /></div>
              <div className="invoice-items-editor">{invoice.items.map((item, index) => (
                <div className="editor-item" key={item.id}>
                  <span className="mobile-item-number">{t('editor.item')} {index + 1}</span>
                  <label className="item-description"><span className="mobile-field-label">{t('editor.itemDescription')} *</span><input aria-label={`${t('editor.itemDescription')} ${index + 1}`} value={item.description} onChange={(event) => updateItem(item.id, 'description', event.target.value)} placeholder={t('editor.descriptionPlaceholder')} required /></label>
                  <label><span className="mobile-field-label">{t('editor.quantity')}</span><input aria-label={`${t('editor.quantity')} ${index + 1}`} type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => updateItem(item.id, 'quantity', Number(event.target.value))} required /></label>
                  <label><span className="mobile-field-label">{t('editor.unit')}</span><input aria-label={`${t('editor.unit')} ${index + 1}`} value={item.unit} onChange={(event) => updateItem(item.id, 'unit', event.target.value)} list="invoice-units" placeholder={t('editor.unitPlaceholder')} /></label>
                  <label><span className="mobile-field-label">{t('editor.pricePerUnit')}</span><div className="price-input"><input aria-label={`${t('editor.pricePerUnit')} ${index + 1}`} type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => updateItem(item.id, 'unitPrice', Number(event.target.value))} required /><span>{invoice.currency}</span></div></label>
                  {invoice.supplier.vatPayer && <label><span className="mobile-field-label">{t('editor.vatRate')}</span><select aria-label={`${t('editor.vatRate')} ${index + 1}`} value={item.vatRate} onChange={(event) => updateItem(item.id, 'vatRate', Number(event.target.value) as VatRate)}><option value={21}>21 %</option><option value={12}>12 %</option><option value={0}>0 %</option></select></label>}
                  <button className="icon-button remove-item" type="button" disabled={invoice.items.length === 1} onClick={() => setInvoice((current) => ({ ...current, items: current.items.filter((currentItem) => currentItem.id !== item.id) }))} aria-label={`${t('editor.deleteItem')} ${index + 1}`} title={t('editor.deleteItem')}><Trash2 size={17} /></button>
                  <span className="item-line-total">{invoice.supplier.vatPayer ? ` ${t('editor.withoutVat')}` : t('editor.total')} <strong>{formatMoney(roundMoney(item.quantity * item.unitPrice), invoice.currency, locale)}</strong></span>
                </div>
              ))}</div>
              <datalist id="invoice-units">{unitOptions.map((unit) => <option value={unit} key={unit} />)}</datalist>
              {!invoice.supplier.vatPayer && <p className="vat-notice">{t('editor.notVatPayer')}</p>}
              <button className="add-item-button" type="button" onClick={() => setInvoice((current) => ({ ...current, items: [...current.items, createInvoiceItem(current.supplier.vatPayer ? data.settings.defaultVatRate : 0, locale === 'cs-CZ' ? 'ks' : 'pcs')] }))}><Plus size={17} /> {t('editor.addItem')}</button>
            </div>
          </section>

          <section className="panel form-section">
            <header className="section-header numbered"><span>4</span><div><h3>{t('editor.noteTitle')}</h3><p>{t('editor.noteSubtitle')}</p></div></header>
            <div className="section-content"><label className="form-field"><span>{t('editor.noteLabel')} <em>({t('common.optional')})</em></span><textarea rows={4} maxLength={1000} value={invoice.note} onChange={(event) => patch('note', event.target.value)} placeholder={t('editor.notePlaceholder')} /><small className="align-right">{invoice.note.length} / 1000</small></label></div>
          </section>
        </div>

        <aside className="editor-summary">
          <section className="panel summary-card">
            <div className="summary-card-heading"><span className="section-icon"><CircleDollarSign size={20} /></span><h3>{t('editor.summary')}</h3></div>
            <div className="summary-number"><span>{invoice.number || t('editor.noNumber')}</span><small>{t('editor.dueOn', { date: formatDate(invoice.dueDate, locale) })}</small></div>
            {invoice.supplier.vatPayer && <div className="summary-lines"><p><span>{t('editor.base')}</span><strong>{formatMoney(totals.subtotal, invoice.currency, locale)}</strong></p>{totals.vatGroups.filter((group) => group.rate > 0).map((group) => <p key={group.rate}><span>{t('editor.vat')} {group.rate} %</span><strong>{formatMoney(group.vat, invoice.currency, locale)}</strong></p>)}</div>}
            <div className="summary-total"><span>{t('editor.totalDue')}</span><strong>{formatMoney(totals.total, invoice.currency, locale)}</strong></div>
            <div className="invoice-checklist"><p className={supplierComplete ? 'complete' : ''}>{supplierComplete ? <Check size={15} /> : <AlertCircle size={15} />} {t('editor.supplierData')}</p><p className={clientComplete ? 'complete' : ''}>{clientComplete ? <Check size={15} /> : <AlertCircle size={15} />} {t('editor.customerData')}</p><p className={invoice.paymentMethod === 'cash' || invoice.supplier.bankAccount || invoice.supplier.iban ? 'complete' : ''}>{invoice.paymentMethod === 'cash' || invoice.supplier.bankAccount || invoice.supplier.iban ? <Check size={15} /> : <AlertCircle size={15} />} {t('editor.paymentData')}</p></div>
            <div className="editor-buttons"><button className="button button-primary full-button" type="button" onClick={() => handleSave(false)}><FileCheck2 size={18} /> {invoice.status === 'draft' ? t('editor.issueInvoice') : t('common.saveChanges')}</button><button className="button button-secondary full-button" type="button" onClick={() => handleSave(true)}><Save size={17} /> {t('editor.saveDraft')}</button></div>
            <p className="summary-local-note"><Landmark size={14} /> {t('editor.savedLocallyNote')}</p>
          </section>
          <section className="editor-tip"><FileText size={20} /><div><strong>{t('editor.tipTitle')}</strong><p>{t('editor.tipText')}</p></div></section>
        </aside>
      </div>

      {showPreview && <Modal title={t('editor.modalPreview')} onClose={() => setShowPreview(false)} wide><div className="modal-document"><InvoiceDocument invoice={invoice} /></div><div className="modal-actions"><button className="button button-primary" type="button" onClick={() => setShowPreview(false)}>{t('editor.backToEditing')}</button></div></Modal>}
    </div>
  );
}
