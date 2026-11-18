import { useEffect, useState } from 'react';
import { FileQuestion, FilePlus2 } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { InvoiceList } from './pages/InvoiceList';
import { InvoiceEditor } from './pages/InvoiceEditor';
import { InvoicePreview } from './pages/InvoicePreview';
import { Clients } from './pages/Clients';
import { Settings } from './pages/Settings';

export type Page = 'dashboard' | 'invoices' | 'editor' | 'preview' | 'clients' | 'settings';
export interface Route { page: Page; id?: string }

function readRoute(): Route {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'invoices') return { page: 'invoices' };
  if (parts[0] === 'editor') return { page: 'editor', id: parts[1] ?? 'new' };
  if (parts[0] === 'invoice' && parts[1]) return { page: 'preview', id: parts[1] };
  if (parts[0] === 'clients') return { page: 'clients', id: parts[1] };
  if (parts[0] === 'settings') return { page: 'settings' };
  return { page: 'dashboard' };
}

function Application() {
  const [route, setRoute] = useState<Route>(readRoute);
  const { data } = useApp();
  const navigate = (path: string) => { window.location.hash = path.startsWith('/') ? path : `/${path}`; };

  useEffect(() => {
    if (!window.location.hash) window.history.replaceState(null, '', '#/dashboard');
    const handleHash = () => { setRoute(readRoute()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  useEffect(() => {
    const titles = { dashboard: 'Přehled', invoices: 'Faktury', editor: 'Editor faktury', preview: 'Detail faktury', clients: 'Odběratelé', settings: 'Nastavení' };
    document.title = `${titles[route.page]} | FakturaGen`;
  }, [route.page]);

  const invoice = route.id ? data.invoices.find((item) => item.id === route.id) : undefined;
  let content: React.ReactNode;
  switch (route.page) {
    case 'dashboard': content = <Dashboard navigate={navigate} />; break;
    case 'invoices': content = <InvoiceList navigate={navigate} />; break;
    case 'editor':
      content = route.id !== 'new' && !invoice
        ? <NotFound navigate={navigate} />
        : <InvoiceEditor key={route.id} invoiceId={route.id} navigate={navigate} />;
      break;
    case 'preview': content = invoice ? <InvoicePreview invoice={invoice} navigate={navigate} /> : <NotFound navigate={navigate} />; break;
    case 'clients': content = <Clients key={route.id ?? 'list'} initialNew={route.id === 'new'} />; break;
    case 'settings': content = <Settings />; break;
  }

  return <Layout route={route} navigate={navigate}>{content}</Layout>;
}

function NotFound({ navigate }: { navigate: (path: string) => void }) {
  return <div className="panel empty-state not-found"><span className="empty-illustration"><FileQuestion size={35} /></span><h2>Faktura nebyla nalezena</h2><p>Možná byla smazána, nebo odkaz není správný.</p><div className="heading-actions"><button className="button button-secondary" type="button" onClick={() => navigate('/invoices')}>Zpět na faktury</button><button className="button button-primary" type="button" onClick={() => navigate('/editor/new')}><FilePlus2 size={17} /> Nová faktura</button></div></div>;
}

export default function App() {
  return <AppProvider><Application /></AppProvider>;
}
