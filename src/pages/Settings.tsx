import { useEffect, useRef, useState } from 'react';
import { Building2, Check, Database, Download, FileJson, Landmark, LockKeyhole, ReceiptText, RotateCcw, Settings2, Upload } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Settings as SettingsType, VatRate } from '../types';
import { nextInvoiceNumber } from '../lib/invoice';
import { downloadJson, parseBackup } from '../lib/storage';
import { PartyFields } from '../components/PartyFields';
import { ConfirmDialog } from '../components/Modal';

export function Settings() {
  const { data, updateSettings, replaceData, resetData, notify } = useApp();
  const [form, setForm] = useState<SettingsType>({ ...data.settings });
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => setForm({ ...data.settings }), [data.settings]);
  const patch = <K extends keyof SettingsType>(key: K, value: SettingsType[K]) => setForm((current) => ({ ...current, [key]: value }));

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.ico.trim()) { notify('Vyplňte alespoň jméno a IČO živnostníka.', 'error'); return; }
    updateSettings({ ...form, nextNumber: Math.max(1, Math.round(form.nextNumber)), dueDays: Math.max(0, Math.round(form.dueDays)) });
  };

  const importBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      replaceData(parseBackup(await file.text()));
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Zálohu se nepodařilo načíst.', 'error');
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return (
    <div className="page-stack settings-page">
      <section className="page-heading"><div><p className="eyebrow">NASTAVENÍ</p><h2>Váš fakturační profil</h2><p>Údaje se automaticky přenesou do každé nové faktury.</p></div></section>
      <form onSubmit={save}>
        <div className="settings-layout">
          <div className="settings-main">
            <section className="panel form-section">
              <header className="section-header"><span className="section-icon"><Building2 size={20} /></span><div><h3>Údaje živnostníka</h3><p>Fakturační a kontaktní údaje dodavatele</p></div></header>
              <div className="section-content"><PartyFields value={form} onChange={(party) => setForm({ ...form, ...party })} requireIdentifiers /><label className="toggle-row"><span><strong>Jsem plátce DPH</strong><small>Zapněte, pokud na fakturách uplatňujete DPH</small></span><input type="checkbox" checked={form.vatPayer} onChange={(event) => { patch('vatPayer', event.target.checked); patch('defaultVatRate', event.target.checked ? 21 : 0); }} /><i aria-hidden="true" /></label></div>
            </section>

            <section className="panel form-section">
              <header className="section-header"><span className="section-icon"><Landmark size={20} /></span><div><h3>Bankovní spojení</h3><p>Pro bankovní převody a automatické QR platby</p></div></header>
              <div className="section-content form-grid">
                <label className="form-field field-full"><span>Číslo bankovního účtu</span><input value={form.bankAccount} onChange={(event) => patch('bankAccount', event.target.value)} placeholder="123456789/0100" /><small>Český formát účtu se pro QR platbu automaticky převede na IBAN.</small></label>
                <label className="form-field field-full"><span>IBAN <em>(nepovinné)</em></span><input value={form.iban} onChange={(event) => patch('iban', event.target.value)} placeholder="CZ12 0100 0000 0012 3456 7890" /><small>Vyplňte pouze pokud nechcete použít automatický převod, nebo pro zahraniční účet.</small></label>
              </div>
            </section>

            <section className="panel form-section">
              <header className="section-header"><span className="section-icon"><ReceiptText size={20} /></span><div><h3>Výchozí nastavení faktur</h3><p>Číslování, splatnost a daňové sazby</p></div></header>
              <div className="section-content form-grid">
                <label className="form-field"><span>Předpona čísla faktury</span><input value={form.invoicePrefix} onChange={(event) => patch('invoicePrefix', event.target.value)} placeholder="FV" maxLength={12} /></label>
                <label className="form-field"><span>Další pořadové číslo</span><input type="number" min="1" step="1" value={form.nextNumber} onChange={(event) => patch('nextNumber', Number(event.target.value))} required /></label>
                <div className="number-preview field-full"><span>Následující faktura bude:</span><strong>{nextInvoiceNumber(form)}</strong></div>
                <label className="form-field"><span>Výchozí splatnost (dní)</span><input type="number" min="0" max="365" step="1" value={form.dueDays} onChange={(event) => patch('dueDays', Number(event.target.value))} required /></label>
                {form.vatPayer ? <label className="form-field"><span>Výchozí sazba DPH</span><select value={form.defaultVatRate} onChange={(event) => patch('defaultVatRate', Number(event.target.value) as VatRate)}><option value={21}>21 %</option><option value={12}>12 %</option><option value={0}>0 %</option></select></label> : <div className="vat-exempt-field"><span>DPH</span><p>Nejste plátcem DPH. Na fakturách se DPH nebude uvádět.</p></div>}
                <label className="form-field field-full"><span>Výchozí poznámka na faktuře <em>(nepovinné)</em></span><textarea rows={3} value={form.defaultNote} onChange={(event) => patch('defaultNote', event.target.value)} placeholder="Např. platební podmínky nebo upřesnění zakázky." /></label>
              </div>
            </section>
            <div className="settings-save"><span><Check size={16} /> Změny se projeví u nově vystavovaných faktur.</span><button className="button button-primary" type="submit"><Settings2 size={18} /> Uložit nastavení</button></div>
          </div>

          <aside className="settings-aside">
            <section className="panel data-card"><span className="section-icon"><Database size={20} /></span><h3>Záloha a obnova dat</h3><p>Stáhněte si všechna data do jednoho souboru. Zálohu můžete přenést na jiné zařízení.</p><button className="button button-secondary full-button" type="button" onClick={() => downloadJson(data)}><Download size={17} /> Stáhnout zálohu JSON</button><button className="button button-ghost full-button" type="button" onClick={() => fileInput.current?.click()}><Upload size={17} /> Obnovit ze zálohy</button><input ref={fileInput} className="sr-only" type="file" accept="application/json,.json" onChange={(event) => importBackup(event.target.files?.[0])} /><div className="data-file-note"><FileJson size={15} /> Obnovení nahradí aktuální data.</div></section>
            <section className="panel security-card"><LockKeyhole size={22} /><h3>Data zůstávají u vás</h3><p>FakturaGen neodesílá žádné údaje na server. Nezapomeňte proto pravidelně stahovat zálohu.</p></section>
            <section className="panel danger-zone"><h3>Smazat všechna data</h3><p>Odstraní faktury, odběratele i nastavení z tohoto prohlížeče.</p><button className="button button-danger-ghost full-button" type="button" onClick={() => setConfirmReset(true)}><RotateCcw size={17} /> Smazat lokální data</button></section>
          </aside>
        </div>
      </form>
      {confirmReset && <ConfirmDialog title="Opravdu smazat všechna data?" message="Všechny faktury, odběratelé a nastavení budou nenávratně smazány. Před pokračováním si stáhněte zálohu." confirmLabel="Rozumím, smazat vše" danger onClose={() => setConfirmReset(false)} onConfirm={resetData} />}
    </div>
  );
}
