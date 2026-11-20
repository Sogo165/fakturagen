import { useMemo, useState } from 'react';
import { Copy, Download, Eye, FilePlus2, FileText, Pencil, Search, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Invoice } from '../types';
import { calculateInvoice, formatDate, formatMoney, isOverdue } from '../lib/invoice';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/Modal';
import { useI18n } from '../i18n';

type Filter = 'all' | 'sent' | 'paid' | 'draft' | 'overdue';

export function InvoiceList({ navigate }: { navigate: (path: string) => void }) {
  const { data, deleteInvoice, duplicateInvoice } = useApp();
  const { t, locale } = useI18n();
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
      [t('list.exportNumber'), t('list.exportCustomer'), t('list.exportIco'), t('list.exportIssued'), t('list.exportDue'), t('list.exportStatus'), t('list.exportBase'), t('list.exportVat'), t('list.exportTotal'), t('list.exportCurrency')],
      ...filtered.map((invoice) => {
        const totals = calculateInvoice(invoice.items);
        const statusKey = invoice.status === 'draft' ? 'status.draft' : invoice.status === 'sent' ? 'status.sent' : 'status.paid';
        return [invoice.number, invoice.client.name, invoice.client.ico, invoice.issueDate, invoice.dueDate, isOverdue(invoice) ? t('status.overdue') : t(statusKey), totals.subtotal.toFixed(2), totals.vat.toFixed(2), totals.total.toFixed(2), invoice.currency];
      }),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${locale === 'cs-CZ' ? 'faktury' : 'invoices'}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: t('list.filterAll') }, { value: 'sent', label: t('list.filterSent') },
    { value: 'overdue', label: t('list.filterOverdue') }, { value: 'paid', label: t('list.filterPaid') }, { value: 'draft', label: t('list.filterDraft') },
  ];

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div><p className="eyebrow">{t('list.eyebrow')}</p><h2>{t('list.title')}</h2><p>{t('list.subtitle')}</p></div>
        <div className="heading-actions">
          {data.invoices.length > 0 && <button className="button button-secondary" type="button" onClick={exportCsv}><Download size={18} /> {t('list.exportCsv')}</button>}
          <button className="button button-primary" type="button" onClick={() => navigate('/editor/new')}><FilePlus2 size={18} /> {t('common.newInvoice')}</button>
        </div>
      </section>

      <section className="panel list-panel">
        <div className="list-toolbar">
          <label className="search-field"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('list.searchPlaceholder')} aria-label={t('list.searchAria')} /></label>
          <select className="sort-select" value={sort} onChange={(event) => setSort(event.target.value)} aria-label={t('list.sortAria')}>
            <option value="newest">{t('list.sortNewest')}</option><option value="oldest">{t('list.sortOldest')}</option><option value="due">{t('list.sortDue')}</option><option value="amount">{t('list.sortAmount')}</option>
          </select>
        </div>
        <div className="filter-tabs" role="tablist" aria-label={t('list.title')}>
          {filters.map((item) => <button key={item.value} type="button" role="tab" aria-selected={filter === item.value} className={filter === item.value ? 'active' : ''} onClick={() => setFilter(item.value)}>{item.label}<span>{item.value === 'all' ? data.invoices.length : data.invoices.filter((invoice) => item.value === 'overdue' ? isOverdue(invoice) : invoice.status === item.value).length}</span></button>)}
        </div>

        {filtered.length ? (
          <>
            <div className="table-wrap">
              <table className="data-table invoice-table">
                <thead><tr><th>{t('list.tableInvoice')}</th><th>{t('list.tableCustomer')}</th><th>{t('list.tableIssued')}</th><th>{t('list.tableDue')}</th><th>{t('list.tableStatus')}</th><th className="align-right">{t('list.tableAmount')}</th><th><span className="sr-only">{t('common.actions')}</span></th></tr></thead>
                <tbody>{filtered.map((invoice) => (
                  <tr key={invoice.id}>
                    <td><button className="invoice-link" type="button" onClick={() => navigate(`/invoice/${invoice.id}`)}>{invoice.number}</button></td>
                    <td><strong className="client-name">{invoice.client.name || t('list.noName')}</strong><small>{invoice.client.ico ? `${t('labels.ico')}: ${invoice.client.ico}` : '—'}</small></td>
                    <td>{formatDate(invoice.issueDate, locale)}</td><td className={isOverdue(invoice) ? 'overdue-date' : ''}>{formatDate(invoice.dueDate, locale)}</td>
                    <td><StatusBadge invoice={invoice} /></td>
                    <td className="align-right amount-cell">{formatMoney(calculateInvoice(invoice.items).total, invoice.currency, locale)}</td>
                    <td><div className="row-actions">
                      <button className="icon-button" type="button" title={t('common.preview')} aria-label={t('list.previewAria', { number: invoice.number })} onClick={() => navigate(`/invoice/${invoice.id}`)}><Eye size={17} /><span className="mobile-action-label">{t('common.preview')}</span></button>
                      <button className="icon-button" type="button" title={t('common.edit')} aria-label={t('list.editAria', { number: invoice.number })} onClick={() => navigate(`/editor/${invoice.id}`)}><Pencil size={16} /><span className="mobile-action-label">{t('common.edit')}</span></button>
                      <button className="icon-button desktop-action" type="button" title={t('common.duplicate')} aria-label={t('list.duplicateAria', { number: invoice.number })} onClick={() => { const copy = duplicateInvoice(invoice.id); if (copy) navigate(`/editor/${copy.id}`); }}><Copy size={16} /></button>
                      <button className="icon-button danger-icon desktop-action" type="button" title={t('common.delete')} aria-label={t('list.deleteAria', { number: invoice.number })} onClick={() => setToDelete(invoice)}><Trash2 size={16} /></button>
                    </div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <footer className="list-footer"><span>{t('list.shown', { shown: filtered.length, total: data.invoices.length })}</span><span>{t('list.selectedTotal')} <strong>{formatMoney(filtered.reduce((sum, invoice) => sum + calculateInvoice(invoice.items).total, 0), 'CZK', locale)}</strong></span></footer>
          </>
        ) : (
          <div className="empty-state">
            <span className="empty-illustration">{search || filter !== 'all' ? <Search size={32} /> : <FileText size={32} />}</span>
            <h3>{search || filter !== 'all' ? t('list.emptySearchTitle') : t('list.emptyTitle')}</h3>
            <p>{search || filter !== 'all' ? t('list.emptySearchText') : t('list.emptyText')}</p>
            {search || filter !== 'all' ? <button className="button button-secondary" type="button" onClick={() => { setSearch(''); setFilter('all'); }}>{t('list.resetFilters')}</button> : <button className="button button-primary" type="button" onClick={() => navigate('/editor/new')}><FilePlus2 size={18} /> {t('list.emptyButton')}</button>}
          </div>
        )}
      </section>
      {toDelete && <ConfirmDialog title={t('list.deleteTitle')} message={t('list.deleteMessage', { number: toDelete.number })} confirmLabel={t('list.deleteConfirm')} danger onClose={() => setToDelete(null)} onConfirm={() => deleteInvoice(toDelete.id)} />}
    </div>
  );
}
