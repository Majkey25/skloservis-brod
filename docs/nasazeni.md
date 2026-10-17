# Náhled a budoucí přechod domény

Stav ověřený 17. října 2026. Tento postup **není pokynem k okamžitému přepnutí**. Aktuálně se publikuje pouze [náhled na GitHub Pages](https://majkey25.github.io/skloservis-brod/). WordPress, produkční doména a DNS zůstávají beze změny.

## Máme vše potřebné?

Pro náhled máme repozitář, statický Astro web, české a anglické adresy, obsahové schéma, konfiguraci Pages CMS a workflow ověřující artefakt před nasazením. Přístupy do administrace WordPressu samy o sobě nestačí ke změně hostingu nebo DNS.

Před skutečným přechodem ještě potřebujeme:

- Ověřený přístup správce k doméně/DNS a produkčnímu hostingu. Tyto přístupy nebyly testovány.
- Potvrdit, že cílový hosting obslouží statické soubory, HTTPS, skutečné 404 a potřebná přesměrování. Možnosti současného tarifu nejsou ověřené.
- Zálohu souborů a databáze WordPressu, kompletní export DNS a ověřený způsob návratu. Při tomto běhu se záloha ani obnova produkce neprovádí.
- Přihlášeného oprávněného editora pro Pages CMS a jeden ověřený průchod uložení → commit → CI → veřejná změna. Prohlížeč nyní končí na přihlášení GitHubu.
- Pro přímé odesílání z formuláře schválený relay, jeho podmínky a aktivaci příjemce. Zvlášť povolit testovací zprávu a ověřit přijetí ve schránce. Nic z toho není aktivní. Dosavadní formulář připravuje pouze místní e-mailový koncept; `mailto:` neprokazuje odeslání.
- Dokončit inventuru starých adres a médií včetně případných `?page_id=…` aliasů. Kód zachovává 14 známých českých adres, to ale samo neprokazuje úplnost historických odkazů.
- Před přechodem potvrdit aktuální firemní informace a provozní pravidla. Jednoměsíční uchování vyřízených poptávek zajišťuje majitel v e-mailu a papírových záznamech, nikoli tento web.

## Doporučená varianta: Pages ponechat jako náhled

Produkci publikovat na samostatném ověřeném cíli, případně na současném hostingu, pokud podporuje uvedené požadavky. Astro vytvoří HTML, CSS, JavaScript a obrázky; na serveru nepotřebuje běžící Node.js ani „Astro backend“. Náhled na adrese Majkey25 tak může dál zůstat nezávislý a s `noindex`.

### 1. Připravit přístupy, zálohu a návrat

Správce hostingu nejprve zjistí skutečný dokumentový kořen a způsob přepnutí webu. Připraví oddělené místo pro novou verzi a zálohu WordPressu včetně databáze. Stávající instalaci nemaže ani nepřepisuje. Ověří obnovu mimo živý web a zaznamená přesný postup návratu, odpovědnou osobu a poslední funkční verzi.

Export DNS musí zahrnout také poštu, IPv6, TXT a případná CAA pravidla. Veřejné dotazy nyní vrátily:

- `skloservis-brod.cz` má A `62.109.155.9`.
- `www.skloservis-brod.cz` má CNAME `skloservis-brod.cz`.
- MX jsou `mx1.savana.cz` s prioritou 10 a `mx2.savana.cz` s prioritou 20.

Jde o časový snímek, ne kompletní zálohu zóny. Před přechodem jej obnovit. **Neměnit poštovní MX, SPF, DKIM ani DMARC kvůli přesunu webu.** Žádná zde uvedená adresa není přihlašovací údaj.

### 2. Ověřit CMS samostatně

Podle [návodu k editaci](editace.md) se přihlásit do Pages CMS účtem s potřebným přístupem. Případnou instalaci GitHub App omezit na tento repozitář. Vybrat `main`, uložit skutečnou drobnou obsahovou změnu a dohledat její commit, úspěšný workflow a změněnou českou i anglickou stránku. Nestačí jen otevřít editor nebo nahrát obrázek bez položky galerie.

Chybný obsah nesmí projít sestavením. Nezkoušet úmyslně rozbitá data na produkční větvi; validaci vadných dat ověřují místní testy nebo oddělená nepublikující větev. Neobcházet případnou ochranu větve.

### 3. Připravit produkční artefakt

Vybrat konkrétní commit a spustit:

```sh
npm ci
npm run format:check
npm run check
npm test
npm run build
```

Běžný build je vždy náhled v `dist/`. Budoucí produkční příprava vyžaduje jedinou výslovnou volbu `SITE_BUILD_TARGET=production`. Například v **Git Bash**, nikoli zkopírováním příkazu do PowerShellu:

```sh
SITE_BUILD_TARGET=production npm run build
SITE_BUILD_TARGET=production npm run preview -- --host 127.0.0.1 --port 4322
```

Produkční výstup je v ignorované `.reference/build-production/`, adresa je `https://www.skloservis-brod.cz` a základní cesta `/`. Do cílového webového kořene patří **obsah tohoto výstupu**, nikoli zdrojové soubory, `.git`, `node_modules`, přístupy nebo celá `.reference/`.

Současný GitHub Actions workflow produkční režim úmyslně odmítá. Pozdější automatické nasazování na produkční hosting potřebuje samostatně schválenou úpravu workflow, oddělený cíl a zabezpečené přihlašovací údaje. Nenastavovat globální produkční proměnnou v repozitáři a neměnit dnešní Pages job na produkční.

### 4. Ověřit artefakt před přepnutím

Na neveřejném testovacím cíli nebo lokálně ověřit:

- Všechny adresy z [mapy cest](routes.md), obě jazykové verze, obrázky, odkazy a skutečnou neznámou 404.
- Produkční samoodkazující canonical, vzájemné `cs`/`en`/`x-default`, sitemap a robots. Produkce nesmí obsahovat `noindex` na známých stránkách ani prefix `/skloservis-brod/`; náhled musí `noindex` zachovat.
- Kontakty, platnost hlášek, výjimky otevírací doby, klávesnici galerie, oba motivy a mobil. Údaje ve strukturovaných datech musí odpovídat viditelnému obsahu.
- Staré aliasy řešit skutečným HTTP 301 na odpovídající stránku. Statický HTML/JavaScript přechod není 301. Staré mediální adresy zachovat nebo jednotlivě přesměrovat na odpovídající soubory; neházet všechny ztracené adresy na úvodní stranu.
- Poptávku podle skutečně povoleného způsobu odesílání. Úspěšná HTTP odpověď relaye sama nepotvrzuje přijetí e-mailu.

Produkční artefakt obsahuje indexovatelné stránky. Nevystavovat jej na volně dostupné testovací adrese bez zvláštní ochrany.

### 5. Teprve po zvláštním povolení přepnout produkci

Pokud nový web zůstane na současném hostingu se stejnou IP, DNS se nemusí měnit; záleží na ověřeném nastavení hostingu. Správce atomicky přepne webový kořen nebo nasadí připravený artefakt způsobem umožňujícím návrat. Když se hosting mění, upraví pouze dohodnuté webové záznamy. WordPress ponechá dostupný pro návrat, nikoli veřejně upravitelný na náhodné nové adrese.

Ihned potom ověřit HTTPS, finální host `www`, HTTP přesměrování, všechny historické adresy, obrázky, sitemap, robots a kontakty přímo z veřejného internetu. Při trvajících 404/5xx na důležitých stránkách, chybných odkazech nebo problému s HTTPS obnovit připravenou funkční verzi. Návrat DNS může záviset na cache, proto nenahrazuje předem otestovaný návrat webu.

### 6. Vyhledávače a sledování

Použít stávající ověřené účty Search Console, Seznam Webmaster, firemní profily a existující ověřovací soubory. Žádné náhradní tokeny nebo duplicitní profily. Po přechodu zkontrolovat vybrané produkční adresy a odeslat jejich skutečný sitemap. Protože doména zůstává stejná, nejde o žádost o změnu adresy webu na jinou doménu. Podrobnosti uvádí [Google pro přesun bez změny URL](https://developers.google.com/search/docs/crawling-indexing/site-move-no-url-changes).

První týden sledovat denně chyby a důležité stránky, další měsíc pravidelně porovnávat návštěvnost a skutečné poptávky s dřívějším obdobím. Zpětné odkazy mají vycházet ze skutečných dodavatelů, projektů a relevantních zmínek. Jejich získávání ani oslovování třetích stran zde není provedeno. První pozici [Google nezaručuje](https://developers.google.com/search/docs/fundamentals/do-i-need-seo); [Seznam doporučuje přínosný obsah a přirozené odkazy](https://o-seznam.cz/napoveda/vyhledavani/optimalizace/optimalizacni-minimum/).

## Volitelná varianta: vlastní doména na GitHub Pages

Není zvolená ani provedená. [Pravidla Pages omezují provoz komerčních webů](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits); vhodnost zamýšlené produkce musí být vyřešena před volbou tohoto hostingu. Technické nasazení nepředstavuje potvrzení souladu s podmínkami.

Připojení vlastní domény ke **stejnému** Pages webu by změnilo také chování dnešní adresy `github.io`, která přesměruje na vlastní doménu. Pro zachování nezávislého náhledu je potřeba oddělený produkční cíl. Popis viz [GitHub a vlastní domény](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages).

Po samostatném schválení této varianty:

1. Připravit oddělené produkční publikování a ověřený artefakt. Dnešní workflow je pouze pro náhled.
2. V nastavení účtu Majkey25 → Pages ověřit doménu pomocí GitHubem vygenerovaného TXT. Hodnotu nevymýšlet; TXT ponechat. Viz [ověření domény](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages).
3. Před směrováním DNS nastavit u cílového repozitáře Settings → Pages → Custom domain na `www.skloservis-brod.cz`.
4. `www` CNAME nasměrovat přímo na `Majkey25.github.io`, bez jména repozitáře. Apex podle aktuálního oficiálního návodu směrovat A/ALIAS/ANAME na Pages; odstranit pouze konfliktní webové záznamy a zkontrolovat případné AAAA. Nepoužívat wildcard. Poštovní záznamy zachovat.
5. Po úspěšné DNS a certifikátové kontrole zapnout Enforce HTTPS, otestovat apex → `www` a všechny cesty. U Actions publikování se soubor CNAME nepoužívá jako nastavení domény.

Přesné DNS hodnoty a pořadí znovu ověřit v [aktuálním návodu GitHubu](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site). Tento dokument nic nenastavuje a neopravňuje provést přepnutí nyní.
