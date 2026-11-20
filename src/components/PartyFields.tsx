import { useId } from 'react';
import type { Party } from '../types';
import { useI18n } from '../i18n';

interface PartyFieldsProps {
  value: Party;
  onChange: (value: Party) => void;
  requireIdentifiers?: boolean;
  emailLabel?: string;
}

export function PartyFields({ value, onChange, requireIdentifiers = false, emailLabel }: PartyFieldsProps) {
  const id = useId();
  const { t } = useI18n();
  const update = (field: keyof Party, fieldValue: string) => onChange({ ...value, [field]: fieldValue });
  const field = (key: keyof Party, label: string, options: { required?: boolean; full?: boolean; type?: string; placeholder?: string; inputMode?: 'text' | 'numeric' | 'email' | 'tel' | 'url' } = {}) => (
    <label className={`form-field ${options.full ? 'field-full' : ''}`} htmlFor={`${id}-${key}`}>
      <span>{label}{options.required && <b> *</b>}</span>
      <input id={`${id}-${key}`} type={options.type ?? 'text'} inputMode={options.inputMode ?? (key === 'ico' ? 'numeric' : 'text')} value={value[key]} onChange={(event) => update(key, event.target.value)} required={options.required} placeholder={options.placeholder} />
    </label>
  );

  return (
    <div className="form-grid">
      {field('name', t('party.name'), { required: true, full: true, placeholder: t('party.placeholderName') })}
      {field('ico', t('party.ico'), { required: requireIdentifiers, placeholder: '12345678' })}
      {field('dic', t('party.dic'), { placeholder: 'CZ12345678' })}
      {field('street', t('party.street'), { full: true, placeholder: t('party.placeholderStreet') })}
      {field('city', t('party.city'), { placeholder: t('party.placeholderCity') })}
      {field('zip', t('party.zip'), { placeholder: t('party.placeholderZip'), inputMode: 'numeric' })}
      {field('country', t('party.country'), { full: true, placeholder: t('party.placeholderCountry') })}
      {field('email', emailLabel ?? t('party.email'), { type: 'email', inputMode: 'email', placeholder: t('party.placeholderEmail') })}
      {field('phone', t('party.phone'), { type: 'tel', inputMode: 'tel', placeholder: t('party.placeholderPhone') })}
      {field('web', t('party.web'), { full: true, type: 'url', inputMode: 'url', placeholder: t('party.placeholderWeb') })}
    </div>
  );
}
