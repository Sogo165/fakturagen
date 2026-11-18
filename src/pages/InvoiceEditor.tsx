import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, Building2, Check, ChevronRight, CircleDollarSign, Eye, FileCheck2, FileText, Landmark, Plus, Save, Settings2, Trash2, UserRound } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Invoice, InvoiceItem, Party, VatRate } from '../types';
import { addDays, calculateInvoice, createInvoice, createInvoiceItem, formatDate, formatMoney, numericVariableSymbol, roundMoney, supplierFromSettings } from '../lib/invoice';
import { PartyFields } from '../components/PartyFields';
import { Modal } from '../components/Modal';
import { InvoiceDocument } from '../components/InvoiceDocument';

interface InvoiceEditorProps {
  invoiceId?: string;
  navigate: (path: string) => void;
}

export function InvoiceEditor({ invoiceId, navigate }: InvoiceEditorProps) {
  const { data, saveInvoice, saveClient, notify } = useApp();
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
    return createInvoice(data.settings);
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

  const chooseClient = (id: string) => {
    setSelectedClient(id);
    setAddedToClients(false);
    if (!id) return;
    const client = data.clients.find((item) => item.id === id);
    if (!client) return;
    const { id: _id, createdAt: _createdAt, ...party } = client;
    setInvoice((current) => ({ ...current, client: party }));
  };

  const addCurrentClient = () => {
    if (!invoice.client.name.trim()) { setErrors(['Před uložením do adresáře vyplňte jméno odběratele.']); return; }
    const duplicate = data.clients.find((client) => client.id !== selectedClient && invoice.client.ico && client.ico === invoice.client.ico);
    if (duplicate) { setErrors(['Odběratel s tímto IČO už v adresáři existuje.']); return; }
    const clientId = selectedClient || crypto.randomUUID();
    saveClient({ ...invoice.client, id: clientId, createdAt: new Date().toISOString() });
    setSelectedClient(clientId);
    setAddedToClients(true);
  };

  const validate = () => {
    const problems: string[] = [];
    if (!invoice.number.trim()) problems.push('Vyplňte číslo faktury.');
    if (!invoice.supplier.name.trim() || !invoice.supplier.ico.trim()) problems.push('Doplňte jméno a IČO dodavatele v nastavení profilu.');
    if (!invoice.client.name.trim()) problems.push('Vyplňte jméno nebo název odběratele.');
    if (!invoice.issueDate || !invoice.taxDate || !invoice.dueDate) problems.push('Vyplňte všechna data faktury.');
    if (invoice.dueDate < invoice.issueDate) problems.push('Datum splatnosti nemůže předcházet datu vystavení.');
    if (!invoice.items.length || invoice.items.some((item) => !item.description.trim())) problems.push('Každá položka musí mít vyplněný popis.');
    if (invoice.items.some((item) => item.quantity <= 0 || item.unitPrice < 0)) problems.push('Množství musí být kladné a cena nesmí být záporná.');
    if (invoice.paymentMethod === 'bank' && !invoice.supplier.bankAccount.trim() && !invoice.supplier.iban.trim()) problems.push('Doplňte bankovní účet v nastavení, nebo zvolte úhradu hotově.');
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
      notify(saveAsDraft ? 'Koncept faktury byl uložen.' : status === 'sent' ? 'Faktura byla úspěšně vystavena.' : 'Změny na faktuře byly uloženy.');
      navigate(`/invoice/${finalized.id}`);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Fakturu se nepodařilo uložit.']);
    }
  };

  const supplierComplete = invoice.supplier.name && invoice.supplier.ico;
  const clientComplete = Boolean(invoice.client.name.trim());

  return (
    <div className="editor-page">
      <div className="editor-heading">
        <button className="back-button" type="button" onClick={() => navigate(isNew ? '/invoices' : `/invoice/${invoice.id}`)}><ArrowLeft size={18} /> Zpět</button>
        <div><p className="eyebrow">{isNew ? 'NOVÝ DOKLAD' : 'ÚPRAVA DOKLADU'}</p><h2>{isNew ? 'Vystavit novou fakturu' : `Faktura ${invoice.number}`}</h2><p><span className="autosave-dot" /> Rozepsaná faktura se automaticky ukládá.</p></div>
        <button className="button button-secondary preview-button" type="button" onClick={() => setShowPreview(true)}><Eye size={18} /> Náhled faktury</button>
      </div>

      {errors.length > 0 && <div className="form-error editor-errors" role="alert"><AlertCircle size={21} /><div><strong>Fakturu zatím nelze uložit</strong><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></div></div>}

      <div className="editor-layout">
        <div className="editor-form-sections">
          <section className="panel form-section">
            <header className="section-header numbered"><span>1</span><div><h3>Základní údaje</h3><p>Číslo dokladu, datumy a způsob platby</p></div></header>
            <div className="section-content form-grid three-columns">
              <label className="form-field field-full"><span>Číslo faktury *</span><input value={invoice.number} onChange={(event) => updateNumber(event.target.value)} required maxLength={40} /></label>
              <label className="form-field"><span>Datum vystavení *</span><input type="date" value={invoice.issueDate} onChange={(event) => { const issueDate = event.target.value; setInvoice((current) => ({ ...current, issueDate, taxDate: current.taxDate === current.issueDate ? issueDate : current.taxDate, dueDate: isNew ? addDays(issueDate, data.settings.dueDays) : current.dueDate })); }} required /></label>
              <label className="form-field"><span>Datum zdan. plnění *</span><input type="date" value={invoice.taxDate} onChange={(event) => patch('taxDate', event.target.value)} required /></label>
              <label className="form-field"><span>Datum splatnosti *</span><input type="date" min={invoice.issueDate} value={invoice.dueDate} onChange={(event) => patch('dueDate', event.target.value)} required /></label>
              <label className="form-field"><span>Způsob úhrady</span><select value={invoice.paymentMethod} onChange={(event) => patch('paymentMethod', event.target.value as Invoice['paymentMethod'])}><option value="bank">Bankovní převod</option><option value="cash">Hotově</option></select></label>
              <label className="form-field"><span>Měna</span><select value={invoice.currency} onChange={(event) => patch('currency', event.target.value as Invoice['currency'])}><option value="CZK">CZK — česká koruna</option><option value="EUR">EUR — euro</option></select></label>
              <label className="form-field"><span>Variabilní symbol</span><input value={invoice.variableSymbol} onChange={(event) => patch('variableSymbol', event.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" /></label>
              <label className="form-field"><span>Konstantní symbol</span><input value={invoice.constantSymbol} onChange={(event) => patch('constantSymbol', event.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" placeholder="Nepovinné" /></label>
            </div>
          </section>

          <section className="panel form-section">
            <header className="section-header numbered"><span>2</span><div><h3>Dodavatel a odběratel</h3><p>Komu fakturujete a kdo ji vystavuje</p></div></header>
            <div className="section-content">
              <div className="supplier-box"><span className="supplier-icon"><Building2 size={21} /></span><div><small>DODAVATEL</small><strong>{invoice.supplier.name || 'Není nastaven profil živnostníka'}</strong><span>{[invoice.supplier.ico && `IČO: ${invoice.supplier.ico}`, invoice.supplier.street, invoice.supplier.city].filter(Boolean).join(' · ') || 'Doplňte své fakturační údaje'}</span></div><button className="text-button" type="button" onClick={() => navigate('/settings')}><Settings2 size={16} /> {supplierComplete ? 'Upravit profil' : 'Nastavit profil'} <ChevronRight size={15} /></button></div>
              <div className="subsection-heading"><span className="small-section-icon"><UserRound size={18} /></span><h4>Odběratel</h4></div>
              {data.clients.length > 0 && <label className="form-field client-picker"><span>Vyplnit z adresáře</span><select value={selectedClient} onChange={(event) => chooseClient(event.target.value)}><option value="">— Vyberte uloženého odběratele —</option>{data.clients.map((client) => <option value={client.id} key={client.id}>{client.name}{client.ico ? ` (IČO: ${client.ico})` : ''}</option>)}</select></label>}
              <PartyFields value={invoice.client} onChange={updateClient} emailLabel="E-mail pro zaslání faktury" />
              <div className="client-save-row"><span>Údaje můžete použít i pro další faktury.</span><button className="text-button" type="button" onClick={addCurrentClient} disabled={addedToClients}>{addedToClients ? <Check size={16} /> : <Save size={16} />}{addedToClients ? 'Uloženo v adresáři' : 'Uložit do adresáře'}</button></div>
            </div>
          </section>

          <section className={`panel form-section items-section ${invoice.supplier.vatPayer ? '' : 'items-no-vat'}`}>
            <header className="section-header numbered"><span>3</span><div><h3>Fakturované položky</h3><p>Uveďte služby nebo zboží, které fakturujete</p></div></header>
            <div className="section-content">
              <div className="item-labels"><span>Popis položky</span><span>Množství</span><span>Jednotka</span><span>{invoice.supplier.vatPayer ? 'Cena bez DPH' : 'Cena / jednotku'}</span>{invoice.supplier.vatPayer && <span>DPH</span>}<span /></div>
              <div className="invoice-items-editor">{invoice.items.map((item, index) => (
                <div className="editor-item" key={item.id}>
                  <span className="mobile-item-number">Položka {index + 1}</span>
                  <label className="item-description"><span className="mobile-field-label">Popis položky *</span><input aria-label={`Popis položky ${index + 1}`} value={item.description} onChange={(event) => updateItem(item.id, 'description', event.target.value)} placeholder="Např. Grafický návrh webu" required /></label>
                  <label><span className="mobile-field-label">Množství</span><input aria-label={`Množství položky ${index + 1}`} type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => updateItem(item.id, 'quantity', Number(event.target.value))} required /></label>
                  <label><span className="mobile-field-label">Jednotka</span><input aria-label={`Jednotka položky ${index + 1}`} value={item.unit} onChange={(event) => updateItem(item.id, 'unit', event.target.value)} list="invoice-units" placeholder="ks" /></label>
                  <label><span className="mobile-field-label">Cena / jednotku</span><div className="price-input"><input aria-label={`Cena položky ${index + 1}`} type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => updateItem(item.id, 'unitPrice', Number(event.target.value))} required /><span>{invoice.currency}</span></div></label>
                  {invoice.supplier.vatPayer && <label><span className="mobile-field-label">Sazba DPH</span><select aria-label={`Sazba DPH položky ${index + 1}`} value={item.vatRate} onChange={(event) => updateItem(item.id, 'vatRate', Number(event.target.value) as VatRate)}><option value={21}>21 %</option><option value={12}>12 %</option><option value={0}>0 %</option></select></label>}
                  <button className="icon-button remove-item" type="button" disabled={invoice.items.length === 1} onClick={() => setInvoice((current) => ({ ...current, items: current.items.filter((currentItem) => currentItem.id !== item.id) }))} aria-label={`Smazat položku ${index + 1}`} title="Smazat položku"><Trash2 size={17} /></button>
                  <span className="item-line-total">{invoice.supplier.vatPayer ? ' bez DPH' : 'Celkem'} <strong>{formatMoney(roundMoney(item.quantity * item.unitPrice), invoice.currency)}</strong></span>
                </div>
              ))}</div>
              <datalist id="invoice-units"><option value="ks" /><option value="hod" /><option value="den" /><option value="měsíc" /><option value="služba" /><option value="m²" /><option value="kg" /></datalist>
              {!invoice.supplier.vatPayer && <p className="vat-notice">Nejste plátcem DPH. DPH se na této faktuře neuvádí.</p>}
              <button className="add-item-button" type="button" onClick={() => setInvoice((current) => ({ ...current, items: [...current.items, createInvoiceItem(current.supplier.vatPayer ? data.settings.defaultVatRate : 0)] }))}><Plus size={17} /> Přidat další položku</button>
            </div>
          </section>

          <section className="panel form-section">
            <header className="section-header numbered"><span>4</span><div><h3>Poznámka</h3><p>Doplňující informace pro odběratele</p></div></header>
            <div className="section-content"><label className="form-field"><span>Text na faktuře <em>(nepovinné)</em></span><textarea rows={4} maxLength={1000} value={invoice.note} onChange={(event) => patch('note', event.target.value)} placeholder="Např. podrobnější specifikace zakázky nebo platební podmínky…" /><small className="align-right">{invoice.note.length} / 1000</small></label></div>
          </section>
        </div>

        <aside className="editor-summary">
          <section className="panel summary-card">
            <div className="summary-card-heading"><span className="section-icon"><CircleDollarSign size={20} /></span><h3>Souhrn faktury</h3></div>
            <div className="summary-number"><span>{invoice.number || 'Bez čísla'}</span><small>Splatnost {formatDate(invoice.dueDate)}</small></div>
            {invoice.supplier.vatPayer && <div className="summary-lines"><p><span>Základ</span><strong>{formatMoney(totals.subtotal, invoice.currency)}</strong></p>{totals.vatGroups.filter((group) => group.rate > 0).map((group) => <p key={group.rate}><span>DPH {group.rate} %</span><strong>{formatMoney(group.vat, invoice.currency)}</strong></p>)}</div>}
            <div className="summary-total"><span>Celkem k úhradě</span><strong>{formatMoney(totals.total, invoice.currency)}</strong></div>
            <div className="invoice-checklist"><p className={supplierComplete ? 'complete' : ''}>{supplierComplete ? <Check size={15} /> : <AlertCircle size={15} />} Údaje dodavatele</p><p className={clientComplete ? 'complete' : ''}>{clientComplete ? <Check size={15} /> : <AlertCircle size={15} />} Údaje odběratele</p><p className={invoice.paymentMethod === 'cash' || invoice.supplier.bankAccount || invoice.supplier.iban ? 'complete' : ''}>{invoice.paymentMethod === 'cash' || invoice.supplier.bankAccount || invoice.supplier.iban ? <Check size={15} /> : <AlertCircle size={15} />} Platební údaje</p></div>
            <div className="editor-buttons"><button className="button button-primary full-button" type="button" onClick={() => handleSave(false)}><FileCheck2 size={18} /> {invoice.status === 'draft' ? 'Vystavit fakturu' : 'Uložit změny'}</button><button className="button button-secondary full-button" type="button" onClick={() => handleSave(true)}><Save size={17} /> Uložit jako koncept</button></div>
            <p className="summary-local-note"><Landmark size={14} /> Vše se ukládá pouze v tomto prohlížeči.</p>
          </section>
          <section className="editor-tip"><FileText size={20} /><div><strong>Tip pro rychlou práci</strong><p>Odběratele si uložte do adresáře. Příště vyplníte fakturu jen několika kliknutími.</p></div></section>
        </aside>
      </div>

      {showPreview && <Modal title="Náhled faktury" onClose={() => setShowPreview(false)} wide><div className="modal-document"><InvoiceDocument invoice={invoice} /></div><div className="modal-actions"><button className="button button-primary" type="button" onClick={() => setShowPreview(false)}>Zpět k úpravám</button></div></Modal>}
    </div>
  );
}
