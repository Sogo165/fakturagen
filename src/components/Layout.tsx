import type { ReactNode } from 'react';
import { FileText, Github, LayoutDashboard, Plus, Settings, ShieldCheck, UsersRound } from 'lucide-react';
import type { Route } from '../App';
import { useI18n } from '../i18n';
import { Toast } from './Toast';

interface LayoutProps {
  route: Route;
  navigate: (path: string) => void;
  children: ReactNode;
}

const navigation = [
  { page: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { page: 'invoices', labelKey: 'nav.invoices', icon: FileText, path: '/invoices' },
  { page: 'clients', labelKey: 'nav.clients', icon: UsersRound, path: '/clients' },
  { page: 'settings', labelKey: 'nav.settings', icon: Settings, path: '/settings' },
] as const;

const pageTitleKeys = {
  dashboard: 'page.dashboard',
  invoices: 'page.invoices',
  editor: 'page.editor',
  preview: 'page.preview',
  clients: 'page.clients',
  settings: 'page.settings',
} as const;

export function Layout({ route, navigate, children }: LayoutProps) {
  const { t, language, setLanguage } = useI18n();
  const isActive = (page: string) => {
    if (page === 'invoices' && (route.page === 'editor' || route.page === 'preview')) return true;
    return route.page === page;
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" type="button" onClick={() => navigate('/dashboard')} aria-label={t('brand.homeAria')}>
          <span className="brand-mark"><FileText size={23} strokeWidth={2.2} /></span>
          <span><strong>Faktura<span>Gen</span></strong><small>{t('brand.tagline')}</small></span>
        </button>
        <button className="button button-primary sidebar-new" type="button" onClick={() => navigate('/editor/new')}>
          <Plus size={18} /> {t('common.newInvoice')}
        </button>
        <nav className="side-navigation" aria-label={t('nav.main')}>
          <span className="nav-caption">{t('nav.menu')}</span>
          {navigation.map(({ page, labelKey, icon: Icon, path }) => (
            <button key={page} className={`nav-item ${isActive(page) ? 'active' : ''}`} type="button" onClick={() => navigate(path)}>
              <Icon size={20} />
              <span>{t(labelKey)}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-note">
            <ShieldCheck size={19} />
            <div><strong>{t('privacy.localTitle')}</strong><span>{t('privacy.localText')}</span></div>
          </div>
          <span className="version">FakturaGen 1.0</span>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button className="mobile-brand" type="button" onClick={() => navigate('/dashboard')} aria-label={t('brand.homeAria')}>
            <span className="brand-mark"><FileText size={20} /></span>
            <strong>Faktura<span>Gen</span></strong>
          </button>
          <h1 className="desktop-page-title">{t(pageTitleKeys[route.page])}</h1>
          <div className="topbar-actions">
            <span className="save-indicator"><span /> {t('common.savedLocally')}</span>
            <div className="language-switch" role="group" aria-label={t('common.language')}>
              <button type="button" className={language === 'cs' ? 'active' : ''} onClick={() => setLanguage('cs')} aria-pressed={language === 'cs'}>CS</button>
              <button type="button" className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')} aria-pressed={language === 'en'}>EN</button>
            </div>
            <a className="github-button" href="https://github.com/Sogo165/fakturagen" target="_blank" rel="noreferrer" aria-label={t('common.githubAria')}>
              <Github size={18} /><span>{t('common.github')}</span>
            </a>
            <button className="button button-primary topbar-new" type="button" onClick={() => navigate('/editor/new')} aria-label={t('common.newInvoice')}>
              <Plus size={18} /> <span>{t('common.newInvoice')}</span>
            </button>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>

      <nav className="mobile-navigation" aria-label={t('nav.mobile')}>
        {navigation.map(({ page, labelKey, icon: Icon, path }) => (
          <button key={page} className={isActive(page) ? 'active' : ''} type="button" onClick={() => navigate(path)}>
            <Icon size={21} /><span>{t(labelKey)}</span>
          </button>
        ))}
      </nav>
      <Toast />
    </div>
  );
}
