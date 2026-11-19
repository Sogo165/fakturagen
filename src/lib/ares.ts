import type { Party } from '../types';

const ARES_BASE = 'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty';
const icoCache = new Map<string, AresCompany>();

interface AresAddress {
  nazevUlice?: string;
  cisloDomovni?: number;
  cisloOrientacni?: number;
  cisloOrientacniPismeno?: string;
  nazevObce?: string;
  nazevMestskehoObvodu?: string;
  nazevMestskeCastiObvodu?: string;
  nazevStatu?: string;
  psc?: number;
  pscTxt?: string;
  textovaAdresa?: string;
}

interface AresSubject {
  ico?: string;
  obchodniJmeno?: string;
  dic?: string;
  sidlo?: AresAddress;
}

interface AresSearchResponse {
  pocetCelkem?: number;
  ekonomickeSubjekty?: AresSubject[];
}

export interface AresCompany {
  name: string;
  ico: string;
  dic: string;
  street: string;
  city: string;
  zip: string;
  country: string;
}

function formatStreet(address: AresAddress) {
  const streetName = address.nazevUlice?.trim();
  const houseNumber = address.cisloDomovni
    ? String(address.cisloDomovni)
    : '';
  const orientation = address.cisloOrientacni
    ? `/${address.cisloOrientacni}${address.cisloOrientacniPismeno ?? ''}`
    : '';
  const fromParts = [streetName, `${houseNumber}${orientation}`.trim()].filter(Boolean).join(' ');
  return fromParts || address.textovaAdresa?.split(',')[0]?.trim() || '';
}

function formatZip(address: AresAddress) {
  if (address.pscTxt) return address.pscTxt.trim();
  if (!address.psc) return '';
  const zip = String(address.psc).padStart(5, '0');
  return zip.length === 5 ? `${zip.slice(0, 3)} ${zip.slice(3)}` : zip;
}

export function mapAresSubject(subject: AresSubject): AresCompany | null {
  if (!subject.ico || !subject.obchodniJmeno) return null;
  const address = subject.sidlo ?? {};
  return {
    name: subject.obchodniJmeno.trim(),
    ico: subject.ico.padStart(8, '0'),
    dic: subject.dic?.trim() ?? '',
    street: formatStreet(address),
    city: address.nazevMestskehoObvodu?.trim() || address.nazevObce?.trim() || address.nazevMestskeCastiObvodu?.trim() || '',
    zip: formatZip(address),
    country: address.nazevStatu?.trim() || 'Česká republika',
  };
}

export function aresCompanyToParty(company: AresCompany): Party {
  return {
    name: company.name,
    ico: company.ico,
    dic: company.dic,
    street: company.street,
    city: company.city,
    zip: company.zip,
    country: company.country,
    email: '',
    phone: '',
    web: '',
  };
}

export async function lookupAres(query: string, signal?: AbortSignal): Promise<AresCompany[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  if (/^\d{8}$/.test(trimmed)) {
    const cached = icoCache.get(trimmed);
    if (cached) return [cached];

    const response = await fetch(`${ARES_BASE}/${trimmed}`, { signal });
    if (response.status === 404) return [];
    if (!response.ok) throw new Error(`ARES vrátil chybu ${response.status}.`);
    const company = mapAresSubject(await response.json() as AresSubject);
    if (!company) return [];
    icoCache.set(company.ico, company);
    return [company];
  }

  if (trimmed.length < 3 || /^\d+$/.test(trimmed)) return [];

  const response = await fetch(`${ARES_BASE}/vyhledat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ obchodniJmeno: trimmed, start: 0, pocet: 6 }),
    signal,
  });
  if (!response.ok) throw new Error(`ARES vrátil chybu ${response.status}.`);
  const payload = await response.json() as AresSearchResponse;
  return (payload.ekonomickeSubjekty ?? [])
    .map(mapAresSubject)
    .filter((company): company is AresCompany => company !== null);
}
