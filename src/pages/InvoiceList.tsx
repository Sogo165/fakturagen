import { useMemo, useState } from 'react';
import { Copy, Download, Eye, FilePlus2, FileText, Pencil, Search, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Invoice } from '../types';
import { calculateInvoice, formatDate, formatMoney, isOverdue } from '../lib/invoice';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/Modal';

type Filter = 'all' | 'sent' | 'paid' | 'draft' | 'overdue';

export function InvoiceList({ navigate }: { navigate: (path: string) => void }) {
  const { data, deleteInvoice, duplicateInvoice } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState('newest');
  const [toDelete, setToDelete] = useState<Invoice | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.invoices.filter((invoice) => {
      const matchesQuery = !query || invoice.number.toLowerCase().includes(query) || invoice.client.name.toLowerCase().includes(query) || invoice.client.ico.includes(query);
      const matchesFilter = filter === 'all' || (filter === 'overdue' ? isOverdue(invoice) : invoice.status === filter);
      return matchesQuery && matchesFilter;
    }).sort((a, b) => {
      if (sort === 'oldest') return a.issueDate.localeCompare(b.issueDate);
      if (sort === 'amount') return calculateInvoice(b.items).total - calculateInvoice(a.items).total;
      if (sort === 'due') return a.dueDate.localeCompare(b.dueDate);
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [data.invoices, search, filter, sort]);

  const exportCsv = () => {
    const rows = [
      ['Číslo faktury', 'Odběratel', 'IČO', 'Vystaveno', 'Splatnost', 'Stav', 'Základ', 'DPH', 'Celkem', 'Měna'],
      ...filtered.map((invoice) => {
        const totals = calculateInvoice(invoice.items);
        return [invoice.number, invoice.client.name, invoice.client.ico, invoice.issueDate, invoice.dueDate, isOverdue(invoice) ? 'Po splatnosti' : invoice.status, totals.subtotal.toFixed(2), totals.vat.toFixed(2), totals.total.toFixed(2), invoice.currency];
      }),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `faktury-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: 'Vše' }, { value: 'sent', label: 'K úhradě' },
    { value: 'overdue', label: 'Po splatnosti' }, { value: 'paid', label: 'Uhrazené' }, { value: 'draft', label: 'Koncepty' },
  ];

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div><p className="eyebrow">FAKTURACE</p><h2>Vaše faktury</h2><p>Spravujte doklady, sledujte platby a stáhněte si přehled.</p></div>
        <div className="heading-actions">
          {data.invoices.length > 0 && <button className="button button-secondary" type="button" onClick={exportCsv}><Download size={18} /> Export CSV</button>}
          <button className="button button-primary" type="button" onClick={() => navigate('/editor/new')}><FilePlus2 size={18} /> Nová faktura</button>
        </div>
      </section>

      <section className="panel list-panel">
        <div className="list-toolbar">
          <label className="search-field"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Hledat číslo, odběratele nebo IČO…" aria-label="Hledat faktury" /></label>
          <select className="sort-select" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Řazení faktur">
            <option value="newest">Nejnovější</option><option value="oldest">Nejstarší</option><option value="due">Podle splatnosti</option><option value="amount">Podle částky</option>
          </select>
        </div>
        <div className="filter-tabs" role="tablist" aria-label="Filtr faktur">
          {filters.map((item) => <button key={item.value} type="button" role="tab" aria-selected={filter === item.value} className={filter === item.value ? 'active' : ''} onClick={() => setFilter(item.value)}>{item.label}<span>{item.value === 'all' ? data.invoices.length : data.invoices.filter((invoice) => item.value === 'overdue' ? isOverdue(invoice) : invoice.status === item.value).length}</span></button>)}
        </div>

        {filtered.length ? (
          <>
            <div className="table-wrap">
              <table className="data-table invoice-table">
                <thead><tr><th>Faktura</th><th>Odběratel</th><th>Vystaveno</th><th>Splatnost</th><th>Stav</th><th className="align-right">Částka</th><th><span className="sr-only">Akce</span></th></tr></thead>
                <tbody>{filtered.map((invoice) => (
                  <tr key={invoice.id}>
                    <td><button className="invoice-link" type="button" onClick={() => navigate(`/invoice/${invoice.id}`)}>{invoice.number}</button></td>
                    <td><strong className="client-name">{invoice.client.name || 'Bez názvu'}</strong><small>{invoice.client.ico ? `IČO: ${invoice.client.ico}` : '—'}</small></td>
                    <td>{formatDate(invoice.issueDate)}</td><td className={isOverdue(invoice) ? 'overdue-date' : ''}>{formatDate(invoice.dueDate)}</td>
                    <td><StatusBadge invoice={invoice} /></td>
                    <td className="align-right amount-cell">{formatMoney(calculateInvoice(invoice.items).total, invoice.currency)}</td>
                    <td><div className="row-actions">
                      <button className="icon-button" type="button" title="Náhled" aria-label={`Náhled faktury ${invoice.number}`} onClick={() => navigate(`/invoice/${invoice.id}`)}><Eye size={17} /></button>
                      <button className="icon-button" type="button" title="Upravit" aria-label={`Upravit fakturu ${invoice.number}`} onClick={() => navigate(`/editor/${invoice.id}`)}><Pencil size={16} /></button>
                      <button className="icon-button desktop-action" type="button" title="Duplikovat" aria-label={`Duplikovat fakturu ${invoice.number}`} onClick={() => { const copy = duplicateInvoice(invoice.id); if (copy) navigate(`/editor/${copy.id}`); }}><Copy size={16} /></button>
                      <button className="icon-button danger-icon desktop-action" type="button" title="Smazat" aria-label={`Smazat fakturu ${invoice.number}`} onClick={() => setToDelete(invoice)}><Trash2 size={16} /></button>
                    </div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <footer className="list-footer"><span>Zobrazeno {filtered.length} z {data.invoices.length} faktur</span><span>Celkem ve výběru: <strong>{formatMoney(filtered.reduce((sum, invoice) => sum + calculateInvoice(invoice.items).total, 0))}</strong></span></footer>
          </>
        ) : (
          <div className="empty-state">
            <span className="empty-illustration">{search || filter !== 'all' ? <Search size={32} /> : <FileText size={32} />}</span>
            <h3>{search || filter !== 'all' ? 'Nic jsme nenašli' : 'Zatím nemáte žádné faktury'}</h3>
            <p>{search || filter !== 'all' ? 'Zkuste změnit hledaný výraz nebo filtr.' : 'Vystavte první fakturu a mějte své podnikání pod kontrolou.'}</p>
            {search || filter !== 'all' ? <button className="button button-secondary" type="button" onClick={() => { setSearch(''); setFilter('all'); }}>Zrušit filtry</button> : <button className="button button-primary" type="button" onClick={() => navigate('/editor/new')}><FilePlus2 size={18} /> Vystavit první fakturu</button>}
          </div>
        )}
      </section>
      {toDelete && <ConfirmDialog title="Smazat fakturu?" message={`Faktura ${toDelete.number} bude trvale odstraněna. Tuto akci nelze vrátit zpět.`} confirmLabel="Smazat fakturu" danger onClose={() => setToDelete(null)} onConfirm={() => deleteInvoice(toDelete.id)} />}
    </div>
  );
}
