import { useEffect, useMemo, useState } from 'react';
import { Building2, Mail, Pencil, Phone, Plus, Search, Trash2, UserPlus, UsersRound } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Client, Party } from '../types';
import { Modal, ConfirmDialog } from '../components/Modal';
import { PartyFields } from '../components/PartyFields';

const blankParty: Party = { name: '', ico: '', dic: '', street: '', city: '', zip: '', country: 'Česká republika', email: '', phone: '', web: '' };

export function Clients({ initialNew = false }: { initialNew?: boolean }) {
  const { data, saveClient, deleteClient } = useApp();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Client | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [toDelete, setToDelete] = useState<Client | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialNew) openNew();
  }, [initialNew]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.clients.filter((client) => !query || client.name.toLowerCase().includes(query) || client.ico.includes(query) || client.email.toLowerCase().includes(query));
  }, [data.clients, search]);

  function openNew() {
    setEditing({ ...blankParty, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    setIsNew(true);
    setError('');
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing?.name.trim()) { setError('Vyplňte název nebo jméno odběratele.'); return; }
    const duplicate = data.clients.some((client) => client.id !== editing.id && editing.ico && client.ico === editing.ico);
    if (duplicate) { setError('Odběratel s tímto IČO už v adresáři existuje.'); return; }
    saveClient({ ...editing, name: editing.name.trim() });
    setEditing(null);
  };

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div><p className="eyebrow">ADRESÁŘ</p><h2>Odběratelé</h2><p>Mějte údaje svých zákazníků vždy po ruce.</p></div>
        <button className="button button-primary" type="button" onClick={openNew}><UserPlus size={18} /> Přidat odběratele</button>
      </section>
      <section className="panel list-panel">
        <div className="list-toolbar">
          <label className="search-field"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Hledat podle názvu, IČO nebo e-mailu…" aria-label="Hledat odběratele" /></label>
          <span className="toolbar-count"><UsersRound size={17} /> {data.clients.length} kontaktů</span>
        </div>
        {filtered.length ? (
          <div className="client-grid">{filtered.map((client) => (
            <article className="client-card" key={client.id}>
              <div className="client-card-top"><span className="client-avatar">{client.name.trim().slice(0, 2).toUpperCase() || <Building2 size={21} />}</span><div className="row-actions"><button className="icon-button" type="button" onClick={() => { setEditing({ ...client }); setIsNew(false); setError(''); }} aria-label={`Upravit ${client.name}`}><Pencil size={17} /></button><button className="icon-button danger-icon" type="button" onClick={() => setToDelete(client)} aria-label={`Smazat ${client.name}`}><Trash2 size={16} /></button></div></div>
              <h3>{client.name}</h3>
              <p className="client-identifiers">{client.ico ? `IČO: ${client.ico}` : 'IČO neuvedeno'}{client.dic && ` · DIČ: ${client.dic}`}</p>
              <div className="client-details">
                {(client.street || client.city) && <p><Building2 size={16} /><span>{[client.street, `${client.zip} ${client.city}`.trim()].filter(Boolean).join(', ')}</span></p>}
                {client.email && <p><Mail size={16} /><a href={`mailto:${client.email}`}>{client.email}</a></p>}
                {client.phone && <p><Phone size={16} /><a href={`tel:${client.phone}`}>{client.phone}</a></p>}
              </div>
            </article>
          ))}</div>
        ) : (
          <div className="empty-state"><span className="empty-illustration"><UsersRound size={33} /></span><h3>{search ? 'Žádný odběratel neodpovídá hledání' : 'Váš adresář je zatím prázdný'}</h3><p>{search ? 'Zkuste zadat jiný výraz.' : 'Přidejte prvního odběratele a příště jeho údaje nemusíte vypisovat znovu.'}</p>{search ? <button className="button button-secondary" type="button" onClick={() => setSearch('')}>Zrušit hledání</button> : <button className="button button-primary" type="button" onClick={openNew}><Plus size={18} /> Přidat prvního odběratele</button>}</div>
        )}
      </section>

      {editing && <Modal title={isNew ? 'Nový odběratel' : 'Upravit odběratele'} onClose={() => setEditing(null)} wide>
        <form onSubmit={submit}>
          {error && <div className="form-error" role="alert">{error}</div>}
          <PartyFields value={editing} onChange={(party) => setEditing({ ...editing, ...party })} emailLabel="E-mail pro zaslání faktury" />
          <div className="modal-actions"><button className="button button-secondary" type="button" onClick={() => setEditing(null)}>Zrušit</button><button className="button button-primary" type="submit">{isNew ? 'Přidat odběratele' : 'Uložit změny'}</button></div>
        </form>
      </Modal>}
      {toDelete && <ConfirmDialog title="Odebrat odběratele?" message={`Kontakt ${toDelete.name} bude odebrán z adresáře. Již vystavené faktury zůstanou beze změny.`} confirmLabel="Odebrat" danger onClose={() => setToDelete(null)} onConfirm={() => deleteClient(toDelete.id)} />}
    </div>
  );
}
