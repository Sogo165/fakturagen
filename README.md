# FakturaGen

Responzivní webová aplikace pro vystavování faktur. Data zůstávají pouze v prohlížeči (localStorage), aplikace funguje po prvním načtení i offline a umožňuje zálohu/obnovu dat ve formátu JSON.

**Živá verze:** [https://sogo165.github.io/fakturagen/](https://sogo165.github.io/fakturagen/)

Nasazení na GitHub Pages probíhá automaticky při každém pushi do větve `main` pomocí workflow v `.github/workflows/deploy.yml`.

## Spuštění

```bash
npm install
npm run dev
```

Otevřete adresu zobrazenou ve terminálu, standardně `http://localhost:5180`. Pro použití na telefonu ve stejné síti otevřete adresu s IP počítače (např. `http://192.168.1.10:5180`).

## Produkční build

```bash
npm run build
npm run preview
```

## Testy

```bash
npm test
```

Fakturu lze v náhledu vytisknout nebo uložit jako PDF pomocí funkce prohlížeče **Tisk → Uložit jako PDF**. Nastavte údaje živnostníka v sekci **Nastavení** před vystavením první faktury.
