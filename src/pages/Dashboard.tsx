import { ArrowRight, CircleDollarSign, Clock3, FilePlus2, FileText, ShieldCheck, TriangleAlert, UserPlus, UsersRound, WalletCards } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calculateInvoice, formatDate, formatMoney, isOverdue, localDateISO } from '../lib/invoice';
import { StatusBadge } from '../components/StatusBadge';
import { useI18n } from '../i18n';

export function Dashboard({ navigate }: { navigate: (path: string) => void }) {
  const { data } = useApp();
  const { t, locale } = useI18n();
  const month = localDateISO().slice(0, 7);
  const activeInvoices = data.invoices.filter((invoice) => invoice.status !== 'draft');
  const billedThisMonth = activeInvoices
    .filter((invoice) => invoice.issueDate.startsWith(month))
    .reduce((sum, invoice) => sum + calculateInvoice(invoice.items).total, 0);
  const unpaid = data.invoices.filter((invoice) => invoice.status === 'sent');
  const awaiting = unpaid.reduce((sum, invoice) => sum + calculateInvoice(invoice.items).total, 0);
  const overdue = unpaid.filter(isOverdue);
  const overdueAmount = overdue.reduce((sum, invoice) => sum + calculateInvoice(invoice.items).total, 0);
  const recent = [...data.invoices].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const dateText = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const monthInvoiceCount = activeInvoices.filter((invoice) => invoice.issueDate.startsWith(month)).length;

  return (
    <div className="dashboard page-stack">
      <section className="welcome-section">
        <div>
          <p className="eyebrow">{dateText}</p>
          <h2>{data.settings.name ? t('dashboard.greeting', { name: data.settings.name.split(' ')[0] }) : t('dashboard.welcome')}</h2>
          <p>{t('dashboard.subtitle')}</p>
        </div>
        <button className="button button-primary welcome-button" type="button" onClick={() => navigate('/editor/new')}>
          <FilePlus2 size={19} /> {t('common.newInvoice')}
        </button>
      </section>

      {!data.settings.name && (
        <section className="setup-banner">
          <span className="setup-icon"><WalletCards size={23} /></span>
          <div><strong>{t('dashboard.setupTitle')}</strong><p>{t('dashboard.setupText')}</p></div>
          <button className="button button-secondary" type="button" onClick={() => navigate('/settings')}>{t('dashboard.setupButton')} <ArrowRight size={17} /></button>
        </section>
      )}

      <section className="metrics-grid" aria-label={t('dashboard.financialOverview')}>
        <article className="metric-card">
          <div className="metric-top"><span className="metric-icon green"><CircleDollarSign size={22} /></span><span className="metric-period">{t('dashboard.thisMonth')}</span></div>
          <p>{t('dashboard.billed')}</p><strong>{formatMoney(billedThisMonth, 'CZK', locale)}</strong>
          <small>{t('dashboard.invoiceCount', { count: monthInvoiceCount })}</small>
        </article>
        <article className="metric-card">
          <div className="metric-top"><span className="metric-icon amber"><Clock3 size={22} /></span><span className="metric-period">{t('dashboard.total')}</span></div>
          <p>{t('dashboard.awaiting')}</p><strong>{formatMoney(awaiting, 'CZK', locale)}</strong>
          <small>{t('dashboard.unpaidCount', { count: unpaid.length })}</small>
        </article>
        <article className="metric-card">
          <div className="metric-top"><span className="metric-icon red"><TriangleAlert size={22} /></span><span className="metric-period">{t('dashboard.attention')}</span></div>
          <p>{t('dashboard.overdue')}</p><strong>{formatMoney(overdueAmount, 'CZK', locale)}</strong>
          <small>{overdue.length ? t('dashboard.overdueCount', { count: overdue.length }) : t('dashboard.allOnTime')}</small>
        </article>
      </section>

      <div className="dashboard-grid">
        <section className="panel recent-panel">
          <header className="panel-header">
            <div><h3>{t('dashboard.recentTitle')}</h3><p>{t('dashboard.recentSubtitle')}</p></div>
            {data.invoices.length > 0 && <button className="text-button" type="button" onClick={() => navigate('/invoices')}>{t('dashboard.viewAll')} <ArrowRight size={16} /></button>}
          </header>
          {recent.length ? (
            <div className="table-wrap">
              <table className="data-table dashboard-table">
                <thead><tr><th>{t('dashboard.tableInvoice')}</th><th>{t('dashboard.tableCustomer')}</th><th>{t('dashboard.tableDue')}</th><th>{t('dashboard.tableStatus')}</th><th className="align-right">{t('dashboard.tableAmount')}</th></tr></thead>
                <tbody>{recent.map((invoice) => (
                  <tr key={invoice.id}>
                    <td><button className="invoice-link" type="button" onClick={() => navigate(`/invoice/${invoice.id}`)}>{invoice.number}</button><small className="mobile-only">{invoice.client.name}</small></td>
                    <td>{invoice.client.name || <span className="muted">{t('dashboard.withoutCustomer')}</span>}</td>
                    <td>{formatDate(invoice.dueDate, locale)}</td>
                    <td><StatusBadge invoice={invoice} /></td>
                    <td className="align-right amount-cell">{formatMoney(calculateInvoice(invoice.items).total, invoice.currency, locale)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state compact-empty">
              <span className="empty-illustration"><FileText size={34} /></span>
              <h3>{t('dashboard.emptyTitle')}</h3>
              <p>{t('dashboard.emptyText')}</p>
              <button className="button button-primary" type="button" onClick={() => navigate('/editor/new')}><FilePlus2 size={18} /> {t('dashboard.emptyButton')}</button>
            </div>
          )}
        </section>

        <aside className="dashboard-aside">
          <section className="panel quick-panel">
            <header className="panel-header"><div><h3>{t('dashboard.quickTitle')}</h3><p>{t('dashboard.quickSubtitle')}</p></div></header>
            <button className="quick-action" type="button" onClick={() => navigate('/editor/new')}><span className="quick-icon green"><FilePlus2 size={20} /></span><span><strong>{t('dashboard.quickNew')}</strong><small>{t('dashboard.quickNewText')}</small></span><ArrowRight size={17} /></button>
            <button className="quick-action" type="button" onClick={() => navigate('/clients/new')}><span className="quick-icon sand"><UserPlus size={20} /></span><span><strong>{t('dashboard.quickClient')}</strong><small>{t('dashboard.quickClientText')}</small></span><ArrowRight size={17} /></button>
            <button className="quick-action" type="button" onClick={() => navigate('/clients')}><span className="quick-icon blue"><UsersRound size={20} /></span><span><strong>{t('dashboard.quickDirectory')}</strong><small>{t('dashboard.directoryCount', { count: data.clients.length })}</small></span><ArrowRight size={17} /></button>
          </section>
          <section className="privacy-card">
            <ShieldCheck size={23} />
            <div><strong>{t('dashboard.privacyTitle')}</strong><p>{t('dashboard.privacyText')}</p></div>
          </section>
        </aside>
      </div>
    </div>
  );
}
