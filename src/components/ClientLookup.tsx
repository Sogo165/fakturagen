import { useEffect, useId, useMemo, useState } from 'react';
import { AlertCircle, Building2, LoaderCircle, Search, UsersRound, X } from 'lucide-react';
import type { Client, Party } from '../types';
import { aresCompanyToParty, lookupAres } from '../lib/ares';
import { useI18n } from '../i18n';

interface ClientLookupProps {
  clients: Client[];
  onSelect: (party: Party, savedClientId?: string) => void;
}

interface Suggestion {
  key: string;
  party: Party;
  source: 'saved' | 'ares';
  savedClientId?: string;
}

function normalize(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function clientToParty(client: Client): Party {
  return {
    name: client.name,
    ico: client.ico,
    dic: client.dic,
    street: client.street,
    city: client.city,
    zip: client.zip,
    country: client.country,
    email: client.email,
    phone: client.phone,
    web: client.web,
  };
}

export function ClientLookup({ clients, onSelect }: ClientLookupProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [remote, setRemote] = useState<Party[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [searched, setSearched] = useState(false);
  const listId = useId();
  const trimmed = query.trim();
  const compact = trimmed.replace(/\s+/g, '');
  const isNumeric = /^\d+$/.test(compact);
  const tooShortIco = isNumeric && compact.length < 8;

  const localSuggestions = useMemo<Suggestion[]>(() => {
    if (!trimmed) return [];
    const search = normalize(trimmed);
    return clients
      .filter((client) => normalize(client.name).includes(search) || client.ico.includes(compact))
      .slice(0, 5)
      .map((client) => ({
        key: `saved-${client.id}`,
        party: clientToParty(client),
        source: 'saved',
        savedClientId: client.id,
      }));
  }, [clients, compact, trimmed]);

  useEffect(() => {
    setRemote([]);
    setError(false);
    setSearched(false);
    if (trimmed.length < 3 || tooShortIco) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const companies = await lookupAres(isNumeric ? compact : trimmed, controller.signal);
        setRemote(companies.map(aresCompanyToParty));
        setSearched(true);
      } catch (lookupError) {
        if (lookupError instanceof DOMException && lookupError.name === 'AbortError') return;
        setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [compact, isNumeric, tooShortIco, trimmed]);

  const remoteSuggestions = useMemo<Suggestion[]>(() => {
    const localIcos = new Set(localSuggestions.map((item) => item.party.ico).filter(Boolean));
    const seen = new Set<string>();
    return remote
      .filter((party) => {
        const key = party.ico || party.name;
        if (seen.has(key) || (party.ico && localIcos.has(party.ico))) return false;
        seen.add(key);
        return true;
      })
      .map((party, index) => ({ key: `ares-${party.ico || index}`, party, source: 'ares' as const }));
  }, [localSuggestions, remote]);

  const suggestions = [...localSuggestions, ...remoteSuggestions];

  const choose = (suggestion: Suggestion) => {
    onSelect(suggestion.party, suggestion.savedClientId);
    setQuery('');
    setRemote([]);
    setError(false);
    setSearched(false);
  };

  const showPanel = Boolean(trimmed) && (suggestions.length > 0 || loading || error || tooShortIco || searched);
  const noResults = searched && !loading && !error && suggestions.length === 0;

  return (
    <div className="client-lookup">
      <label className="client-lookup-label" htmlFor={`${listId}-input`}>
        <span>{t('lookup.label')}</span>
        <small>{t('lookup.hint')}</small>
      </label>
      <div className="client-lookup-input">
        <Search size={18} aria-hidden="true" />
        <input
          id={`${listId}-input`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setQuery('');
            if (event.key === 'Enter' && suggestions[0]) {
              event.preventDefault();
              choose(suggestions[0]);
            }
          }}
          placeholder={t('lookup.placeholder')}
          autoComplete="off"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
        />
        {loading && <LoaderCircle size={17} className="spin lookup-spinner" aria-label={t('lookup.searching')} />}
        {!loading && query && <button className="lookup-clear" type="button" onClick={() => setQuery('')} aria-label={t('lookup.clear')}><X size={16} /></button>}
      </div>

      {showPanel && (
        <div className="client-lookup-panel" id={listId} role="listbox" aria-label={t('lookup.results')}>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.key}
              type="button"
              role="option"
              aria-selected="false"
              className="client-suggestion"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(suggestion)}
            >
              <span className="suggestion-icon">{suggestion.source === 'saved' ? <UsersRound size={18} /> : <Building2 size={18} />}</span>
              <span className="suggestion-content">
                <strong>{suggestion.party.name}</strong>
                <small>{[suggestion.party.ico && `${t('labels.ico')}: ${suggestion.party.ico}`, suggestion.party.street, suggestion.party.city].filter(Boolean).join(' · ')}</small>
              </span>
              <span className={`suggestion-source ${suggestion.source}`}>{suggestion.source === 'saved' ? t('lookup.saved') : t('lookup.ares')}</span>
            </button>
          ))}
          {loading && suggestions.length === 0 && <p className="lookup-message">{t('lookup.loading')}</p>}
          {tooShortIco && <p className="lookup-message">{t('lookup.shortIco')}</p>}
          {error && <p className="lookup-message lookup-error"><AlertCircle size={16} /> {t('lookup.error')}</p>}
          {noResults && <p className="lookup-message">{t('lookup.noResults')}</p>}
        </div>
      )}
    </div>
  );
}
