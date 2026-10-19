# Technické SEO

Web od 19. října 2026 běží na GitHub Pages na vlastní doméně
`https://www.skloservis-brod.cz/` s vynuceným HTTPS. Produkční nasazení prošlo kontrolami
artefaktu a živých adres; samotné nasazení není dokladem indexace ani pořadí ve vyhledávání.
Níže uvedené zdroje byly zkontrolovány 18. října 2026. Postup produkčního sestavení
a obnovy popisuje [dokumentace nasazení](nasazeni.md).

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
- Pouze výslovně zvolený produkční režim používá zachovaný host `www`,
  samoodkazující canonical a vzájemné `cs`/`en`/`x-default` pro každou dvojici.
  Neznámé a jazykově nesouladné cesty zůstávají `noindex`. Hreflang je v HTML;
  [Google nepřisuzuje výhodu duplikování do dalších metod](https://developers.google.com/search/docs/specialty/international/localized-versions).
- Produkční sitemap vychází z téže mapy adres a vynechává 404. Nevymýšlí `lastmod`
  ani prioritu. Robots odkazuje na absolutní adresu sitemap.
  [Google](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
  a [Seznam](https://o-seznam.cz/napoveda/vyhledavani/seznambot/sitemap-xml/)
  uvádějí požadavky na sitemap. Žádná mapa nebyla odeslána vyhledávačům.

Filtry galerie používají fragmenty `#gallery-…`, ne nové stránky nebo kombinace
parametrů. Všechny fotografie a jejich odkazy jsou už ve statickém HTML; filtr je
jen skrývá. Sitemap proto uvádí celou galerii a existující produktové stránky,
nikoli fragmenty nebo samostatné adresy čtyř kategorií bez produktové stránky.
[Google tento způsob filtrování podporuje](https://developers.google.com/crawling/docs/faceted-navigation).
Není důvod zakazovat galerii v robots nebo nahrazovat odkazy obsluhou JavaScriptu.

## Fotografie a sdílení

Náhledy pro sdílení jsou značkové kompozice **1200 × 630 pixelů v JPEG**, nikoli
nezměněné fotografie realizací. Kombinují skutečné logo, petrolejovou identitu webu
a vybraný místní snímek z validované galerie. Detail výrobku používá pouze vlastní
kategorii; úvod, produkty, služby a galerie sdílejí obecný náhled se skleněnou příčkou.
Kontakty, právní stránky, 404 a výrobek bez fotografie mají čistě značkovou grafiku.
Pro náhrobní desky se fotografie nevymýšlí ani nepřebírá z jiné kategorie.

Výběr v `src/lib/seo.ts` upřednostňuje konkrétní vizuálně zkontrolované soubory.
Po jejich odebrání v CMS vezme další dostupný snímek příslušné kategorie, přednostně
alespoň 1000 × 630 pixelů; bez snímku použije značkovou variantu. Galerie, popisky,
jejích 139 položek, pořadí i dosavadní titulní snímky se tím nemění. Fotografie
a logo se zmenšují do vymezené plochy **bez zvětšení a bez ořezu**. Text v obrázku
obsahuje jen název značky; lokalizovaný titulek a popis stránky nesou metadata.

[Statický endpoint Astro](https://docs.astro.build/en/guides/endpoints/#static-file-endpoints)
`src/pages/social/[image].jpg.ts` při běžném sestavení vytvoří soubory pomocí již
používaného Sharpu. Čte jen lokální zdroje přes veřejné
[konfigurační API Astro](https://docs.astro.build/en/reference/modules/astro-config/).
Nevyžaduje nový balíček, font, vzdálené médium ani běžící backend. Metadata nevyvolávají
další obrazové požadavky běžného prohlížeče; náhled stahuje až služba, která jej používá.

Obě jazykové verze sdílejí JPEG, ale mají vlastní alternativní text odvozený z CMS,
který výslovně popisuje grafickou kompozici s logem a fotografií. Podle
[Open Graph](https://ogp.me/) hlavička uvádí HTTPS adresu, `image/jpeg`, skutečné rozměry
a alternativní text; přidává také `twitter:card=summary_large_image`, titulek, popis,
obrázek a `twitter:image:alt`. Adresy respektují zvolený host i náhledový prefix.
Náhled tedy obrázkem neodkazuje na produkční host.

Pouze indexovatelné produkční stránky dovolují `max-image-preview:large` podle
[aktuální specifikace Google](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag#max-image-preview)
ověřené 19. října 2026. Náhled, 404 a neznámé či jazykově nesouladné adresy zůstávají
`noindex, follow`. Toto nastavení dovoluje větší obrázek, neurčuje však jeho výběr.
Google sám rozhoduje, zda a jaký náhled zobrazí; sociální služby mohou uchovávat starší
verzi v mezipaměti. Výsledný vzhled ve vyhledávání ani okamžité obnovení nejsou zaručeny.

Viditelné obrázky nadále používají lokální responzivní varianty, rozměry a popisné
alternativní texty. Text má popisovat fotografii, ne opakovat klíčová slova nebo
neověřené místo realizace; viz [doporučení Google pro obrázky](https://developers.google.com/search/docs/appearance/google-images).

Produkční sitemap přidává `image:image` a `image:loc` podle
[dokumentace Google](https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps).
Obě jazykové galerie uvádějí všechny fotografie, nyní 139. Produktové stránky uvádějí
jen snímky své kategorie. Adresa pochází z `image.src` validovaného obsahu, tedy ze
stejného původního lokálního souboru, na který odkazuje fotografie v HTML. Samotná
sitemap nevytváří další obrazové varianty ani kopie a značkové náhledy do ní nepřidává.
Jeden původní soubor je v každém záznamu stránky jen jednou.
Nejde o tvrzení, že bez sitemap nebyly fotografie dostupné vyhledávačům.

XML escapuje adresy. Generátor odmítne cizí host, náhledový prefix, zdrojovou cestu
a více než 1000 fotografií na stránku; obsah potichu nekrátí. Náhled i při předání
fotografií vydává prázdnou sitemap. Nepoužívají se odstraněné značky `image:title`,
`image:caption`, `image:geo_location` ani `image:license`. Seznam dokumentuje běžnou
sitemap a [objevování obrázků z HTML](https://o-seznam.cz/napoveda/vyhledavani/vyhledavani-obrazku/);
podpora rozšíření Google z těchto zdrojů není doložena. Není slíbená indexace ani pozice.

## Strukturovaná data

- Produkční kontakty vydávají jednu identitu `LocalBusiness` se skutečnými CMS
  kontakty a adresou provozovny. Sídlo není další pobočka. Nepřidávají se hodnocení,
  ceny, souřadnice ani certifikace. [Pravidla Google](https://developers.google.com/search/docs/appearance/structured-data/local-business)
  vyžadují odpovídající údaje; samostatně stanovují
  [omezení vlastních firemních hodnocení](https://developers.google.com/search/docs/appearance/structured-data/review-snippet).
- Obě kontaktní stránky sdílejí stabilní `@id` zakončené `/#business`. Volitelné
  `sameAs` používá jen `contact.facebook_url`, který je také běžným odkazem v patičce.
  Odkaz `https://www.facebook.com/skloservisbrod/` byl 18. října 2026 ověřen v HTML
  [původního firemního webu](https://www.skloservis-brod.cz/). Vymazání pole v CMS odstraní
  i `sameAs`. [Google uvádí sociální profily jako příklad tohoto pole](https://developers.google.com/search/docs/appearance/structured-data/organization).
  Vyhledávací odkaz mapy není identitou profilu. Telefon, potvrzený e-mail, IČO a adresa
  provozovny zůstávají stejné jako viditelné kontakty. Právní stránky rozlišují sídlo
  v Březnici od provozovny v Uherském Brodě; nevytváří se druhá firemní entita.
- Týdenní strukturované hodiny se vynechávají, pokud CMS obsahuje datované výjimky
  **nebo zavírání o českých svátcích**. Je to záměrné konzervativní rozhodnutí:
  neomezené týdenní intervaly by tvrdily celoroční platnost a nezachytily pohyblivé
  svátky. Viditelný úplný rozvrh s vyhodnocením Europe/Prague zůstává dostupný.
  Jinak se použijí jen potvrzené intervaly; prázdný či předpokládaný den není
  automaticky zapsán jako zavřeno a montážní pátek se nestává návštěvní dobou.
- Jen produkční česká kořenová úvodní stránka vydává `WebSite` s viditelným názvem
  `Skloservis Brod` a kořenovou URL. Stejný název používá `og:site_name`; obchodní
  firma v kontaktech a `LocalBusiness` se nemění. [Google tak umožňuje vyjádřit preferovaný název webu](https://developers.google.com/search/docs/appearance/site-names);
  zobrazený název ani pořadí to nezaručuje.
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

`node --test tests/seo.test.ts` ověřuje cíle, odmítnutí nepovolené produkce v Actions,
metadata všech dvojic, výjimky, výběr fotografií, jejich přiřazení v sitemap,
prázdný náhled, neplatné adresy, limit obrázků, vymazání profilu a bezpečné JSON-LD. Testovací
kontakty a hodiny jsou pevné validované příklady, nikoli zámek aktuálního CMS obsahu.
Integrační kontrola musí navíc projít skutečné HTML obou sestavení, načtení obrázků
a aktualizaci hlavičky po jazykovém přepnutí v prohlížeči. Kontrola externími
validátory, indexace a výsledky na budoucím hostingu nejsou těmito testy doložené.

## Co zbývá po povoleném spuštění produkce

Náhled zůstává `noindex`; nelze na něm ověřit výslednou indexaci produkce ani dopad
na návštěvnost. Po spuštění je třeba zkontrolovat skutečné HTTP odpovědi všech cest,
canonical, jazykové dvojice, robots, sitemap a dostupnost každého uvedeného obrázku.
Návrat proměnné cíle na preview při stále připojené doméně není návratem produkce.
Obnova patří do [postupu nasazení](nasazeni.md).

Vlastník může odeslat sitemap v Google Search Console. Seznam ji objevuje přes
robots.txt; [Seznam Webmaster](https://o-seznam.cz/napoveda/vyhledavani/seznam-webmaster/)
umožní po ověření webu kontrolovat hlášené stahování, indexaci a chyby. Konzole nejsou
podmínkou samotné indexace, ale místní test je nenahrazuje. Správa Google Business Profile a
Firmy.cz, sjednocení jejich kontaktů a provozních hodin i měření hledaných dotazů
zůstávají samostatné úkoly s přístupem k účtům. Účty ani profily tato změna neupravuje.
Bez měření po nasazení nelze tvrdit růst návštěvnosti nebo lepší pořadí.
