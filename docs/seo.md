# Technické SEO

Implementace a níže uvedené zdroje zkontrolovány 18. října 2026. Web na GitHub Pages
je nadále náhled. Produkční příprava není povolením přepnout doménu ani dokladem
indexace. Postup a zbývající podmínky jsou v [dokumentaci nasazení](nasazeni.md).

## Adresy, obsah a indexace

- Statické HTML obsahuje české a anglické texty, nadpisy, běžné odkazy na produkty,
  kontakt a galerie. Zachovává osm produktových dvojic a všechny historické cesty
  z [mapy adres](routes.md). Nové galerie nevytvářejí stránky pro smyšlené provozovny.
- Hlavní a produktové popisy vycházejí z validovaného CMS. Právní stránky mají vlastní
  bilingvní shrnutí svého obsahu; 404 popisuje nenalezenou stránku. Jejich výchozí
  popisy jsou v `src/lib/seo.ts`; při změně právního obsahu zkontrolovat i shrnutí.
  [Seznam doporučuje odlišné popisy jednotlivých stránek](https://o-seznam.cz/napoveda/vyhledavani/optimalizace/optimalizacni-minimum/).
- Každé HTML náhledu včetně 404 obsahuje počáteční `noindex, follow`. Robots dovoluje
  stažení; zakázání procházení by robotům skrylo zákaz indexace.
  [Google](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
  i [Seznam](https://o-seznam.cz/napoveda/vyhledavani/seznambot/meta-tag-robots/)
  popisují tuto podmínku; Seznam navíc uvádí, že ignoruje `X-Robots-Tag`.
- Náhled nevydává canonical, hreflang, `og:url` ani JSON-LD. Jeho sitemap neobsahuje
  adresy a robots ji nepropaguje. Na Pages jsou tyto soubory pod prefixem repozitáře;
  vyloučení z indexace zajišťuje HTML, nikoli robots v podadresáři.
- Pouze výslovně zvolený lokální produkční režim používá zachovaný host `www`,
  samoodkazující canonical a vzájemné `cs`/`en`/`x-default` pro každou dvojici.
  Neznámé a jazykově nesouladné cesty zůstávají `noindex`. Hreflang je v HTML;
  [Google nepřisuzuje výhodu duplikování do dalších metod](https://developers.google.com/search/docs/specialty/international/localized-versions).
- Produkční sitemap vychází z téže mapy adres a vynechává 404. Nevymýšlí `lastmod`
  ani prioritu. Robots odkazuje na absolutní adresu sitemap.
  [Google](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
  a [Seznam](https://o-seznam.cz/napoveda/vyhledavani/seznambot/sitemap-xml/)
  uvádějí požadavky na sitemap. Žádná mapa nebyla odeslána vyhledávačům.

## Fotografie a sdílení

Produktový detail pro Open Graph použije první skutečnou fotografii své kategorie,
stejně jako viditelný detail. Galerie použije svou první fotografii. Bez odpovídající
fotografie a na ostatních stránkách zůstává logo; cizí výrobek ji nenahrazuje.
Astro vytvoří JPEG nejvýše 1200 pixelů široký bez zvětšení nebo ořezu. Obě jazykové
verze sdílejí soubor, ale mají vlastní CMS alternativní text. Metadata obsahují
absolutní adresu obrázku na právě zvoleném cíli, skutečné rozměry a MIME typ podle
[Open Graph](https://ogp.me/). Náhled obrázkem neodkazuje na budoucí produkci.

Viditelné obrázky nadále používají lokální responzivní varianty, rozměry a popisné
alternativní texty. Text má popisovat fotografii, ne opakovat klíčová slova nebo
neověřené místo realizace; viz [doporučení Google pro obrázky](https://developers.google.com/search/docs/appearance/google-images).

## Strukturovaná data

- Produkční kontakty vydávají jednu identitu `LocalBusiness` se skutečnými CMS
  kontakty a adresou provozovny. Sídlo není další pobočka. Nepřidávají se hodnocení,
  ceny, souřadnice ani certifikace. [Pravidla Google](https://developers.google.com/search/docs/appearance/structured-data/local-business)
  vyžadují odpovídající údaje; samostatně stanovují
  [omezení vlastních firemních hodnocení](https://developers.google.com/search/docs/appearance/structured-data/review-snippet).
- Týdenní strukturované hodiny se vynechávají, pokud CMS obsahuje datované výjimky
  **nebo zavírání o českých svátcích**. Je to záměrné konzervativní rozhodnutí:
  neomezené týdenní intervaly by tvrdily celoroční platnost a nezachytily pohyblivé
  svátky. Viditelný úplný rozvrh s vyhodnocením Europe/Prague zůstává dostupný.
  Jinak se použijí jen potvrzené intervaly; prázdný či předpokládaný den není
  automaticky zapsán jako zavřeno a montážní pátek se nestává návštěvní dobou.
- Osm produkčních detailů v obou jazycích vydává `BreadcrumbList` odpovídající
  viditelné cestě „Produkty → název výrobku“. Názvy výrobků pocházejí z CMS,
  adresy ze stabilní mapy. [Google vyžaduje nejméně dvě položky](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb).
- JSON-LD escapuje `<`, aby CMS text nemohl uzavřít datový skript. Neobsahuje
  spustitelný kód. [Strukturovaná data musí odpovídat viditelnému obsahu](https://developers.google.com/search/docs/appearance/structured-data/sd-policies);
  platný zápis nezaručuje rozšířený výsledek ani pořadí.

## Jazyk a ověření

Ruční volba jazyka a motivu i výchozí nastavení zařízení zůstávají beze změny.
Pouze náhled může při čerstvé návštěvě české homepage bez parametrů, fragmentu
a interního referreru přejít podle jazyka zařízení či uložené angličtiny na `/en/`.
Produkční sestavení tento automatický přechod neprovádí: česká `/` zůstává česká
i při anglickém zařízení nebo uložené angličtině. Ruční přepínač, uložená volba,
přímé `/en/` i tematické preference zůstávají dostupné.
[Google doporučuje automatické jazykové přesměrování nepoužívat](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites).
Ochrana používá stejný ověřený cíl sestavení jako ostatní metadata. Testy spouštějí
skutečný úvodní skript pro oba cíle, zařízení, uložené volby a zakázané úložiště;
produkční nasazení vyžaduje také kontrolu výsledného HTML a prohlížeče.

## Užitečné podrobnosti výrobků

Krátké shrnutí výrobku doplňují volitelné dvojjazyčné oddíly `details` v CMS.
Obsahují doložené možnosti skel, kování a uchycení převzaté z původních firemních
produktových textů, které majitel potvrdil jako aktuální. Nadpisy a odstavce jsou
ve statickém HTML a text se bezpečně escapuje. Popisy fotografií nenahrazují informace
o výrobku; počty slov ani opakování klíčových slov nejsou cílem. Detaily nepřidávají
nové lokality, certifikace, ceny nebo přísliby odolnosti. Schéma CMS vyžaduje úplné
české i anglické znění a dovoluje nejvýše čtyři oddíly na výrobek.

`node --test tests/seo.test.ts` ověřuje cíle, odmítnutí produkce v Actions, metadata
všech dvojic, výjimky, výběr odpovídajících fotografií a bezpečné JSON-LD. Testovací
kontakty a hodiny jsou pevné validované příklady, nikoli zámek aktuálního CMS obsahu.
Integrační kontrola musí navíc projít skutečné HTML obou sestavení, načtení obrázků
a aktualizaci hlavičky po jazykovém přepnutí v prohlížeči. Kontrola externími
validátory, indexace a výsledky na budoucím hostingu nejsou těmito testy doložené.
