import { useEffect, useRef, useState } from 'react';
import { Building2, Check, Database, Download, FileJson, Landmark, LockKeyhole, ReceiptText, RotateCcw, Settings2, Upload } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Settings as SettingsType, VatRate } from '../types';
import { nextInvoiceNumber } from '../lib/invoice';
import { downloadJson, parseBackup } from '../lib/storage';
import { PartyFields } from '../components/PartyFields';
import { ConfirmDialog } from '../components/Modal';
import { useI18n } from '../i18n';

export function Settings() {
  const { data, updateSettings, replaceData, resetData, notify } = useApp();
  const { t, language } = useI18n();
  const [form, setForm] = useState<SettingsType>({ ...data.settings });
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => setForm({ ...data.settings }), [data.settings]);
  const patch = <K extends keyof SettingsType>(key: K, value: SettingsType[K]) => setForm((current) => ({ ...current, [key]: value }));

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.ico.trim()) { notify(t('settings.validation'), 'error'); return; }
    updateSettings({ ...form, nextNumber: Math.max(1, Math.round(form.nextNumber)), dueDays: Math.max(0, Math.round(form.dueDays)) });
  };

  const importBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      replaceData(parseBackup(await file.text()));
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      notify(code === 'invalid-json' ? t('settings.invalidJson') : code === 'invalid-backup' ? t('settings.invalidBackup') : t('settings.backupError'), 'error');
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return (
    <div className="page-stack settings-page">
      <section className="page-heading"><div><p className="eyebrow">{t('settings.eyebrow')}</p><h2>{t('settings.title')}</h2><p>{t('settings.subtitle')}</p></div></section>
      <form onSubmit={save}>
        <div className="settings-layout">
          <div className="settings-main">
            <section className="panel form-section">
              <header className="section-header"><span className="section-icon"><Building2 size={20} /></span><div><h3>{t('settings.profileTitle')}</h3><p>{t('settings.profileSubtitle')}</p></div></header>
              <div className="section-content"><PartyFields value={form} onChange={(party) => setForm({ ...form, ...party })} requireIdentifiers /><label className="toggle-row"><span><strong>{t('settings.vatPayer')}</strong><small>{t('settings.vatPayerHint')}</small></span><input type="checkbox" checked={form.vatPayer} onChange={(event) => { patch('vatPayer', event.target.checked); patch('defaultVatRate', event.target.checked ? 21 : 0); }} /><i aria-hidden="true" /></label></div>
            </section>

            <section className="panel form-section">
              <header className="section-header"><span className="section-icon"><Landmark size={20} /></span><div><h3>{t('settings.bankTitle')}</h3><p>{t('settings.bankSubtitle')}</p></div></header>
              <div className="section-content form-grid">
                <label className="form-field field-full"><span>{t('settings.accountNumber')}</span><input value={form.bankAccount} onChange={(event) => patch('bankAccount', event.target.value)} placeholder="123456789/0100" /><small>{t('settings.accountHint')}</small></label>
                <label className="form-field field-full"><span>IBAN <em>({t('common.optional')})</em></span><input value={form.iban} onChange={(event) => patch('iban', event.target.value)} placeholder="CZ12 0100 0000 0012 3456 7890" /><small>{t('settings.ibanHint')}</small></label>
              </div>
            </section>

            <section className="panel form-section">
              <header className="section-header"><span className="section-icon"><ReceiptText size={20} /></span><div><h3>{t('settings.defaultsTitle')}</h3><p>{t('settings.defaultsSubtitle')}</p></div></header>
              <div className="section-content form-grid">
                <label className="form-field"><span>{t('settings.prefix')}</span><input value={form.invoicePrefix} onChange={(event) => patch('invoicePrefix', event.target.value)} placeholder="FV" maxLength={12} /></label>
                <label className="form-field"><span>{t('settings.nextNumber')}</span><input type="number" min="1" step="1" value={form.nextNumber} onChange={(event) => patch('nextNumber', Number(event.target.value))} required /></label>
                <div className="number-preview field-full"><span>{t('settings.nextPreview')}</span><strong>{nextInvoiceNumber(form)}</strong></div>
                <label className="form-field"><span>{t('settings.dueDays')}</span><input type="number" min="0" max="365" step="1" value={form.dueDays} onChange={(event) => patch('dueDays', Number(event.target.value))} required /></label>
                {form.vatPayer ? <label className="form-field"><span>{t('settings.defaultVat')}</span><select value={form.defaultVatRate} onChange={(event) => patch('defaultVatRate', Number(event.target.value) as VatRate)}><option value={21}>21 %</option><option value={12}>12 %</option><option value={0}>0 %</option></select></label> : <div className="vat-exempt-field"><span>{t('editor.vat')}</span><p>{t('settings.notVatPayer')}</p></div>}
                <label className="form-field field-full"><span>{t('settings.defaultNote')} <em>({t('common.optional')})</em></span><textarea rows={3} value={form.defaultNote} onChange={(event) => patch('defaultNote', event.target.value)} placeholder={t('settings.defaultNotePlaceholder')} /></label>
              </div>
            </section>
            <div className="settings-save"><span><Check size={16} /> {t('settings.saveNote')}</span><button className="button button-primary" type="submit"><Settings2 size={18} /> {t('settings.saveButton')}</button></div>
          </div>

          <aside className="settings-aside">
            <section className="panel data-card"><span className="section-icon"><Database size={20} /></span><h3>{t('settings.backupTitle')}</h3><p>{t('settings.backupText')}</p><button className="button button-secondary full-button" type="button" onClick={() => downloadJson(data, language)}><Download size={17} /> {t('settings.downloadBackup')}</button><button className="button button-ghost full-button" type="button" onClick={() => fileInput.current?.click()}><Upload size={17} /> {t('settings.restoreBackup')}</button><input ref={fileInput} className="sr-only" type="file" accept="application/json,.json" onChange={(event) => importBackup(event.target.files?.[0])} /><div className="data-file-note"><FileJson size={15} /> {t('settings.replaceNote')}</div></section>
            <section className="panel security-card"><LockKeyhole size={22} /><h3>{t('settings.securityTitle')}</h3><p>{t('settings.securityText')}</p></section>
            <section className="panel danger-zone"><h3>{t('settings.dangerTitle')}</h3><p>{t('settings.dangerText')}</p><button className="button button-danger-ghost full-button" type="button" onClick={() => setConfirmReset(true)}><RotateCcw size={17} /> {t('settings.deleteData')}</button></section>
          </aside>
        </div>
      </form>
      {confirmReset && <ConfirmDialog title={t('settings.resetTitle')} message={t('settings.resetMessage')} confirmLabel={t('settings.resetConfirm')} danger onClose={() => setConfirmReset(false)} onConfirm={resetData} />}
    </div>
  );
}
