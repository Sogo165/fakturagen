# FakturaGen

Responzivní webová aplikace pro vystavování faktur. Data zůstávají pouze v prohlížeči (localStorage), aplikace funguje po prvním načtení i offline a umožňuje zálohu/obnovu dat ve formátu JSON.

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
