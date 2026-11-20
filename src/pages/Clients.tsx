import { useEffect, useMemo, useState } from 'react';
import { Building2, Mail, Pencil, Phone, Plus, Search, Trash2, UserPlus, UsersRound } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Client, Party } from '../types';
import { Modal, ConfirmDialog } from '../components/Modal';
import { PartyFields } from '../components/PartyFields';
import { ClientLookup } from '../components/ClientLookup';
import { createId } from '../lib/id';
import { useI18n } from '../i18n';

export function Clients({ initialNew = false }: { initialNew?: boolean }) {
  const { data, saveClient, deleteClient } = useApp();
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Client | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [toDelete, setToDelete] = useState<Client | null>(null);
  const [error, setError] = useState('');

  const blankParty = (): Party => ({
    name: '', ico: '', dic: '', street: '', city: '', zip: '', country: t('party.countryDefault'), email: '', phone: '', web: '',
  });

  useEffect(() => {
    if (initialNew) openNew();
  }, [initialNew]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.clients.filter((client) => !query || client.name.toLowerCase().includes(query) || client.ico.includes(query) || client.email.toLowerCase().includes(query));
  }, [data.clients, search]);

  function openNew() {
    setEditing({ ...blankParty(), id: createId(), createdAt: new Date().toISOString() });
    setIsNew(true);
    setError('');
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing?.name.trim()) { setError(t('clients.errorName')); return; }
    const duplicate = data.clients.some((client) => client.id !== editing.id && editing.ico && client.ico === editing.ico);
    if (duplicate) { setError(t('clients.errorDuplicate')); return; }
    saveClient({ ...editing, name: editing.name.trim() });
    setEditing(null);
  };

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div><p className="eyebrow">{t('clients.eyebrow')}</p><h2>{t('clients.title')}</h2><p>{t('clients.subtitle')}</p></div>
        <button className="button button-primary" type="button" onClick={openNew}><UserPlus size={18} /> {t('clients.add')}</button>
      </section>
      <section className="panel list-panel">
        <div className="list-toolbar">
          <label className="search-field"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('clients.searchPlaceholder')} aria-label={t('clients.searchAria')} /></label>
          <span className="toolbar-count"><UsersRound size={17} /> {t('clients.contactCount', { count: data.clients.length })}</span>
        </div>
        {filtered.length ? (
          <div className="client-grid">{filtered.map((client) => (
            <article className="client-card" key={client.id}>
              <div className="client-card-top"><span className="client-avatar">{client.name.trim().slice(0, 2).toUpperCase() || <Building2 size={21} />}</span><div className="row-actions"><button className="icon-button" type="button" onClick={() => { setEditing({ ...client }); setIsNew(false); setError(''); }} aria-label={t('clients.editAria', { name: client.name })}><Pencil size={17} /></button><button className="icon-button danger-icon" type="button" onClick={() => setToDelete(client)} aria-label={t('clients.deleteAria', { name: client.name })}><Trash2 size={16} /></button></div></div>
              <h3>{client.name}</h3>
              <p className="client-identifiers">{client.ico ? `${t('labels.ico')}: ${client.ico}` : t('clients.icoMissing')}{client.dic && ` · ${t('labels.dic')}: ${client.dic}`}</p>
              <div className="client-details">
                {(client.street || client.city) && <p><Building2 size={16} /><span>{[client.street, `${client.zip} ${client.city}`.trim()].filter(Boolean).join(', ')}</span></p>}
                {client.email && <p><Mail size={16} /><a href={`mailto:${client.email}`}>{client.email}</a></p>}
                {client.phone && <p><Phone size={16} /><a href={`tel:${client.phone}`}>{client.phone}</a></p>}
              </div>
            </article>
          ))}</div>
        ) : (
          <div className="empty-state"><span className="empty-illustration"><UsersRound size={33} /></span><h3>{search ? t('clients.emptySearchTitle') : t('clients.emptyTitle')}</h3><p>{search ? t('clients.emptySearchText') : t('clients.emptyText')}</p>{search ? <button className="button button-secondary" type="button" onClick={() => setSearch('')}>{t('clients.resetSearch')}</button> : <button className="button button-primary" type="button" onClick={openNew}><Plus size={18} /> {t('clients.addFirst')}</button>}</div>
        )}
      </section>

      {editing && <Modal title={isNew ? t('clients.newTitle') : t('clients.editTitle')} onClose={() => setEditing(null)} wide>
        <form onSubmit={submit}>
          {error && <div className="form-error" role="alert">{error}</div>}
          {isNew && <ClientLookup
            clients={data.clients}
            onSelect={(party, savedClientId) => {
              const existingClient = savedClientId ? data.clients.find((client) => client.id === savedClientId) : undefined;
              if (existingClient) {
                setEditing({ ...existingClient });
                setIsNew(false);
              } else {
                setEditing((current) => current ? { ...current, ...party, email: current.email, phone: current.phone, web: current.web } : current);
              }
              setError('');
            }}
          />}
          <PartyFields value={editing} onChange={(party) => setEditing({ ...editing, ...party })} emailLabel={t('party.emailForInvoice')} />
          <div className="modal-actions"><button className="button button-secondary" type="button" onClick={() => setEditing(null)}>{t('common.cancel')}</button><button className="button button-primary" type="submit">{isNew ? t('clients.addSubmit') : t('common.saveChanges')}</button></div>
        </form>
      </Modal>}
      {toDelete && <ConfirmDialog title={t('clients.deleteTitle')} message={t('clients.deleteMessage', { name: toDelete.name })} confirmLabel={t('clients.deleteConfirm')} danger onClose={() => setToDelete(null)} onConfirm={() => deleteClient(toDelete.id)} />}
    </div>
  );
}
