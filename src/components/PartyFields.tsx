import { useId } from 'react';
import type { Party } from '../types';

interface PartyFieldsProps {
  value: Party;
  onChange: (value: Party) => void;
  requireIdentifiers?: boolean;
  emailLabel?: string;
}

export function PartyFields({ value, onChange, requireIdentifiers = false, emailLabel = 'E-mail' }: PartyFieldsProps) {
  const id = useId();
  const update = (field: keyof Party, fieldValue: string) => onChange({ ...value, [field]: fieldValue });
  const field = (key: keyof Party, label: string, options: { required?: boolean; full?: boolean; type?: string; placeholder?: string; inputMode?: 'text' | 'numeric' | 'email' | 'tel' | 'url' } = {}) => (
    <label className={`form-field ${options.full ? 'field-full' : ''}`} htmlFor={`${id}-${key}`}>
      <span>{label}{options.required && <b> *</b>}</span>
      <input id={`${id}-${key}`} type={options.type ?? 'text'} inputMode={options.inputMode ?? (key === 'ico' ? 'numeric' : 'text')} value={value[key]} onChange={(event) => update(key, event.target.value)} required={options.required} placeholder={options.placeholder} />
    </label>
  );

  return (
    <div className="form-grid">
      {field('name', 'Název / jméno', { required: true, full: true, placeholder: 'Např. Jan Novák nebo Firma s.r.o.' })}
      {field('ico', 'IČO', { required: requireIdentifiers, placeholder: '12345678' })}
      {field('dic', 'DIČ', { placeholder: 'CZ12345678' })}
      {field('street', 'Ulice a číslo popisné', { full: true, placeholder: 'Hlavní 123' })}
      {field('city', 'Město', { placeholder: 'Praha' })}
      {field('zip', 'PSČ', { placeholder: '110 00', inputMode: 'numeric' })}
      {field('country', 'Země', { full: true, placeholder: 'Česká republika' })}
      {field('email', emailLabel, { type: 'email', inputMode: 'email', placeholder: 'jan@example.cz' })}
      {field('phone', 'Telefon', { type: 'tel', inputMode: 'tel', placeholder: '+420 777 123 456' })}
      {field('web', 'Web', { full: true, type: 'url', inputMode: 'url', placeholder: 'https://www.example.cz' })}
    </div>
  );
}
