import { describe, expect, it } from 'vitest';
import { aresCompanyToParty, mapAresSubject } from './ares';

describe('ARES', () => {
  it('převede údaje firmy včetně adresy a DIČ', () => {
    const company = mapAresSubject({
      ico: '17259444',
      obchodniJmeno: 'Twenty one million s.r.o.',
      dic: 'CZ17259444',
      sidlo: {
        nazevUlice: 'Korunní',
        cisloDomovni: 2569,
        cisloOrientacni: 108,
        nazevMestskehoObvodu: 'Praha 10',
        nazevObce: 'Praha',
        psc: 10100,
        nazevStatu: 'Česká republika',
      },
    });
    expect(company).toMatchObject({
      name: 'Twenty one million s.r.o.',
      ico: '17259444',
      dic: 'CZ17259444',
      street: 'Korunní 2569/108',
      city: 'Praha 10',
      zip: '101 00',
      country: 'Česká republika',
    });
  });

  it('vytvoří prázdné kontaktní údaje pro vyplnění formuláře', () => {
    const party = aresCompanyToParty({
      name: 'Test s.r.o.', ico: '12345678', dic: '', street: '', city: '', zip: '', country: 'Česká republika',
    });
    expect(party.email).toBe('');
    expect(party.phone).toBe('');
  });
});
