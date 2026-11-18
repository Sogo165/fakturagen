import type { ReactNode } from 'react';
import { FileText, LayoutDashboard, Plus, Settings, ShieldCheck, UsersRound } from 'lucide-react';
import type { Route } from '../App';
import { Toast } from './Toast';

interface LayoutProps {
  route: Route;
  navigate: (path: string) => void;
  children: ReactNode;
}

const navigation = [
  { page: 'dashboard', label: 'Přehled', icon: LayoutDashboard, path: '/dashboard' },
  { page: 'invoices', label: 'Faktury', icon: FileText, path: '/invoices' },
  { page: 'clients', label: 'Odběratelé', icon: UsersRound, path: '/clients' },
  { page: 'settings', label: 'Nastavení', icon: Settings, path: '/settings' },
];

const titles: Record<string, string> = {
  dashboard: 'Přehled',
  invoices: 'Faktury',
  editor: 'Editor faktury',
  preview: 'Detail faktury',
  clients: 'Odběratelé',
  settings: 'Nastavení',
};

export function Layout({ route, navigate, children }: LayoutProps) {
  const isActive = (page: string) => {
    if (page === 'invoices' && (route.page === 'editor' || route.page === 'preview')) return true;
    return route.page === page;
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" type="button" onClick={() => navigate('/dashboard')} aria-label="FakturaGen — přehled">
          <span className="brand-mark"><FileText size={23} strokeWidth={2.2} /></span>
          <span><strong>Faktura<span>Gen</span></strong><small>Faktury bez starostí</small></span>
        </button>
        <button className="button button-primary sidebar-new" type="button" onClick={() => navigate('/editor/new')}>
          <Plus size={18} /> Nová faktura
        </button>
        <nav className="side-navigation" aria-label="Hlavní navigace">
          <span className="nav-caption">MENU</span>
          {navigation.map(({ page, label, icon: Icon, path }) => (
            <button key={page} className={`nav-item ${isActive(page) ? 'active' : ''}`} type="button" onClick={() => navigate(path)}>
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-note">
            <ShieldCheck size={19} />
            <div><strong>Vaše data jsou jen vaše</strong><span>Uloženo lokálně v prohlížeči</span></div>
          </div>
          <span className="version">FakturaGen 1.0</span>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button className="mobile-brand" type="button" onClick={() => navigate('/dashboard')} aria-label="FakturaGen">
            <span className="brand-mark"><FileText size={20} /></span>
            <strong>Faktura<span>Gen</span></strong>
          </button>
          <h1 className="desktop-page-title">{titles[route.page]}</h1>
          <div className="topbar-actions">
            <span className="save-indicator"><span /> Uloženo lokálně</span>
            <button className="button button-primary topbar-new" type="button" onClick={() => navigate('/editor/new')} aria-label="Nová faktura">
              <Plus size={18} /> <span>Nová faktura</span>
            </button>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>

      <nav className="mobile-navigation" aria-label="Mobilní navigace">
        {navigation.map(({ page, label, icon: Icon, path }) => (
          <button key={page} className={isActive(page) ? 'active' : ''} type="button" onClick={() => navigate(path)}>
            <Icon size={21} /><span>{label}</span>
          </button>
        ))}
      </nav>
      <Toast />
    </div>
  );
}
