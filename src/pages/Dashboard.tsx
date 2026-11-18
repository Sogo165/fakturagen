import { ArrowRight, CircleDollarSign, Clock3, FilePlus2, FileText, ShieldCheck, TriangleAlert, UserPlus, UsersRound, WalletCards } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calculateInvoice, formatDate, formatMoney, isOverdue, localDateISO } from '../lib/invoice';
import { StatusBadge } from '../components/StatusBadge';

export function Dashboard({ navigate }: { navigate: (path: string) => void }) {
  const { data } = useApp();
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
  const dateText = new Intl.DateTimeFormat('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

  return (
    <div className="dashboard page-stack">
      <section className="welcome-section">
        <div>
          <p className="eyebrow">{dateText}</p>
          <h2>{data.settings.name ? `Dobrý den, ${data.settings.name.split(' ')[0]}!` : 'Vítejte ve FakturaGenu'}</h2>
          <p>Vystavujte faktury rychle, přehledně a bez zbytečné administrativy.</p>
        </div>
        <button className="button button-primary welcome-button" type="button" onClick={() => navigate('/editor/new')}>
          <FilePlus2 size={19} /> Vystavit fakturu
        </button>
      </section>

      {!data.settings.name && (
        <section className="setup-banner">
          <span className="setup-icon"><WalletCards size={23} /></span>
          <div><strong>Nejprve si nastavte profil živnostníka</strong><p>Doplňte své údaje a bankovní účet. Na fakturách se pak vyplní automaticky.</p></div>
          <button className="button button-secondary" type="button" onClick={() => navigate('/settings')}>Nastavit profil <ArrowRight size={17} /></button>
        </section>
      )}

      <section className="metrics-grid" aria-label="Finanční přehled">
        <article className="metric-card">
          <div className="metric-top"><span className="metric-icon green"><CircleDollarSign size={22} /></span><span className="metric-period">Tento měsíc</span></div>
          <p>Vyfakturováno</p><strong>{formatMoney(billedThisMonth)}</strong>
          <small>{activeInvoices.filter((invoice) => invoice.issueDate.startsWith(month)).length} faktur v tomto měsíci</small>
        </article>
        <article className="metric-card">
          <div className="metric-top"><span className="metric-icon amber"><Clock3 size={22} /></span><span className="metric-period">Celkem</span></div>
          <p>Čeká na úhradu</p><strong>{formatMoney(awaiting)}</strong>
          <small>{unpaid.length} {unpaid.length === 1 ? 'neuhrazená faktura' : 'neuhrazených faktur'}</small>
        </article>
        <article className="metric-card">
          <div className="metric-top"><span className="metric-icon red"><TriangleAlert size={22} /></span><span className="metric-period">Vyžaduje pozornost</span></div>
          <p>Po splatnosti</p><strong>{formatMoney(overdueAmount)}</strong>
          <small>{overdue.length ? `${overdue.length} faktur po termínu splatnosti` : 'Všechny faktury jsou v termínu'}</small>
        </article>
      </section>

      <div className="dashboard-grid">
        <section className="panel recent-panel">
          <header className="panel-header">
            <div><h3>Poslední faktury</h3><p>Vaše nedávná fakturační aktivita</p></div>
            {data.invoices.length > 0 && <button className="text-button" type="button" onClick={() => navigate('/invoices')}>Zobrazit vše <ArrowRight size={16} /></button>}
          </header>
          {recent.length ? (
            <div className="table-wrap">
              <table className="data-table dashboard-table">
                <thead><tr><th>Faktura</th><th>Odběratel</th><th>Splatnost</th><th>Stav</th><th className="align-right">Částka</th></tr></thead>
                <tbody>{recent.map((invoice) => (
                  <tr key={invoice.id}>
                    <td><button className="invoice-link" type="button" onClick={() => navigate(`/invoice/${invoice.id}`)}>{invoice.number}</button><small className="mobile-only">{invoice.client.name}</small></td>
                    <td>{invoice.client.name || <span className="muted">Bez odběratele</span>}</td>
                    <td>{formatDate(invoice.dueDate)}</td>
                    <td><StatusBadge invoice={invoice} /></td>
                    <td className="align-right amount-cell">{formatMoney(calculateInvoice(invoice.items).total, invoice.currency)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state compact-empty">
              <span className="empty-illustration"><FileText size={34} /></span>
              <h3>Zatím tu není žádná faktura</h3>
              <p>Vystavte svou první fakturu během pár minut.</p>
              <button className="button button-primary" type="button" onClick={() => navigate('/editor/new')}><FilePlus2 size={18} /> Vystavit první fakturu</button>
            </div>
          )}
        </section>

        <aside className="dashboard-aside">
          <section className="panel quick-panel">
            <header className="panel-header"><div><h3>Rychlé akce</h3><p>Co chcete udělat?</p></div></header>
            <button className="quick-action" type="button" onClick={() => navigate('/editor/new')}><span className="quick-icon green"><FilePlus2 size={20} /></span><span><strong>Nová faktura</strong><small>Vystavit nový doklad</small></span><ArrowRight size={17} /></button>
            <button className="quick-action" type="button" onClick={() => navigate('/clients/new')}><span className="quick-icon sand"><UserPlus size={20} /></span><span><strong>Přidat odběratele</strong><small>Uložit nový kontakt</small></span><ArrowRight size={17} /></button>
            <button className="quick-action" type="button" onClick={() => navigate('/clients')}><span className="quick-icon blue"><UsersRound size={20} /></span><span><strong>Adresář odběratelů</strong><small>{data.clients.length} uložených kontaktů</small></span><ArrowRight size={17} /></button>
          </section>
          <section className="privacy-card">
            <ShieldCheck size={23} />
            <div><strong>Soukromí na prvním místě</strong><p>Faktury se ukládají pouze v tomto prohlížeči. Žádný server, žádná registrace.</p></div>
          </section>
        </aside>
      </div>
    </div>
  );
}
