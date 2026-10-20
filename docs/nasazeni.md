# Náhled a budoucí přechod domény

Stav aktualizovaný 18. října 2026. Majitel chce budoucí produkci na GitHub Pages s vlastní doménou, podobně jako Exhalace. Tento postup **není pokynem k okamžitému přepnutí**. Aktuálně se publikuje pouze [náhled na GitHub Pages](https://majkey25.github.io/skloservis-brod/). WordPress, produkční doména a DNS zůstávají beze změny.

## Máme vše potřebné?

Pro náhled máme repozitář, statický Astro web, české a anglické adresy, obsahové schéma, konfiguraci Pages CMS a workflow ověřující artefakt před nasazením. Přístupy do administrace WordPressu samy o sobě nestačí ke změně hostingu nebo DNS.

Před skutečným přechodem ještě potřebujeme:

- Ověřený přístup správce k doméně a aktivní DNS zóně. Ten nebyl testován. Administrátorský přístup k repozitáři na GitHubu byl pouze čtením potvrzen; není to přístup k DNS.
- Pro požadovaný GitHub Pages ověřit vhodnost podle podmínek služby, dokončit ověření připraveného produkčního režimu workflow, vlastní doménu, HTTPS, skutečné 404 a řešení starých aliasů. Přístup SFTP k nynějšímu hostingu není potřeba k publikování na Pages, může však být potřeba pro zálohu a návrat WordPressu.
- Zálohu souborů a databáze WordPressu, kompletní export DNS a ověřený způsob návratu. Při tomto běhu se záloha ani obnova produkce neprovádí.
- Ověřit přístupy a nasazování pro vybraný produkční cíl. Na současném náhledu byl 18. října 2026 úspěšně ověřen celý průchod Pages CMS: uložení → commit → zelené CI → zveřejněný český i anglický text galerie. [Ověřený běh](https://github.com/Majkey25/skloservis-brod/actions/runs/39081477798) se týká GitHub Pages, nikoli dosud nenastaveného produkčního hostingu.
- Před přechodem na jiný host znovu ověřit funkčnost formuláře. Web3Forms vyžaduje `web3forms_access_key` formuláře ověřeného pro `skloservis.brod@gmail.com`; bez klíče není webový formulář dostupný. Zkontrolovat také limit tarifu a uchování zpráv v administraci služby. Historický jediný povolený test FormSubmit byl spotřebován; další skutečný test vyžaduje nové povolení. Potvrzení služby ani `mailto:` samy neprokazují doručení. Prověřit také podmínky poskytovatele popsané v právních poznámkách.
- Dokončit inventuru starých adres a médií včetně případných `?page_id=…` aliasů. Kód zachovává 14 známých českých adres, to ale samo neprokazuje úplnost historických odkazů.
- Ověřit výsledný produkční výběr jazyka. Produkční sestavení již nechává českou úvodní adresu českou bez automatického přechodu na `/en/`; náhled zachovává výchozí výběr podle zařízení. Přímé jazykové adresy a ruční přepínač zůstávají dostupné. [Google doporučuje samostatné jazykové adresy a varuje před automatickým přesměrováním mezi nimi](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites). Skutečný dopad na indexaci zatím není změřený.
- Před přechodem potvrdit aktuální firemní informace a provozní pravidla. Jednoměsíční uchování vyřízených poptávek zajišťuje majitel v e-mailu a papírových záznamech, nikoli tento web.

## Alternativa: Pages ponechat jako samostatný náhled

Produkci publikovat na samostatném ověřeném cíli, případně na současném hostingu, pokud podporuje uvedené požadavky. Astro vytvoří HTML, CSS, JavaScript a obrázky; na serveru nepotřebuje běžící Node.js ani „Astro backend“. Náhled na adrese Majkey25 tak může dál zůstat nezávislý a s `noindex`.

### 1. Připravit přístupy, zálohu a návrat

Produkční návrat na GitHub Pages musí zachovat produkční cíl a vlastní doménu.
Při vadném novém vydání se znovu publikuje ověřený produkční commit nebo jeho
ověřený artefakt. Přepnutí `SITE_DEPLOY_TARGET` na `preview` či smazání proměnné
není návrat produkce: vytvořilo by `noindex` a prefix `/skloservis-brod/` na vlastní
doméně. Pokud je nutný návrat na původní WordPress, obnoví se předem zaznamenané
webové DNS a související nastavení Pages. Poštovní záznamy zůstávají beze změny.
Před přechodem musí být zapsané konkrétní funkční SHA, artefakt, DNS a ověřený
postup obnovy; samotná existence dokumentu není ověřená záloha.

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

Připravený GitHub Actions workflow standardně sestavuje náhled. Produkční režim povoluje pouze pro push nebo ruční běh na `main`, pokud je repozitářová proměnná `SITE_DEPLOY_TARGET=production`. Pull requesty vždy sestavují náhled. Před nahráním kontroluje artefakt vybraného cíle. Aktivace produkční proměnné je součástí samostatně povoleného přechodu domény; před tímto okamžikem ji nenastavovat. Nový režim musí být před přechodem také publikovaný a ověřený vzdáleným CI, nestačí lokální zdroj.

Volbou je repozitářová proměnná Actions `SITE_DEPLOY_TARGET`. Nyní není nastavená, takže web zůstává náhledem:

| `SITE_DEPLOY_TARGET`            | Push nebo ruční běh na `main`                                                   | Pull request, jiná větev |
| ------------------------------- | ------------------------------------------------------------------------------- | ------------------------ |
| nenastavená, prázdná, `preview` | náhled s `noindex` z `dist/`                                                    | náhled, nepublikuje se   |
| `production`                    | `https://www.skloservis-brod.cz` s kořenem `/` z `.reference/build-production/` | náhled, nepublikuje se   |
| jiná hodnota                    | běh selže před sestavením                                                       | běh selže                |

Ruční běh publikuje jen s volbou `publish`. Název publikačního jobu ukazuje cíl, `Publish preview` nebo `Publish production`. Nahrává se jen obsah vybraného výstupu, ne zbytek `.reference/`. Aktivace v povoleném okně přechodu:

```sh
gh variable set SITE_DEPLOY_TARGET --body production -R Majkey25/skloservis-brod
gh workflow run site.yml -R Majkey25/skloservis-brod --ref main -f publish=true
```

Dokud není připojená vlastní doména, návrat k náhledu je:

```sh
gh variable delete SITE_DEPLOY_TARGET -R Majkey25/skloservis-brod
gh workflow run site.yml -R Majkey25/skloservis-brod --ref main -f publish=true
```

Po připojení domény platí návrat z kroku 1. Proměnná zůstává `production` a znovu se spustí poslední ověřený produkční běh: `gh run rerun <ID běhu> -R Majkey25/skloservis-brod`. GitHub při opakování použije stejný commit a ref, a to [nejvýše 30 dní po původním běhu](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs). Jinak vadnou změnu vrátí nový commit na `main`.

### 4. Ověřit artefakt před přepnutím

Na neveřejném testovacím cíli nebo lokálně ověřit:

- Všechny adresy z [mapy cest](routes.md), obě jazykové verze, obrázky, odkazy a skutečnou neznámou 404.
- Produkční samoodkazující canonical, vzájemné `cs`/`en`/`x-default`, sitemap a robots. Produkce nesmí obsahovat `noindex` na známých stránkách ani prefix `/skloservis-brod/`; náhled musí `noindex` zachovat.
- Kontakty, platnost hlášek, výjimky otevírací doby, klávesnici galerie, oba motivy a mobil. Údaje ve strukturovaných datech musí odpovídat viditelnému obsahu.
- [Technická SEO metadata](seo.md): vlastní popisy právních stránek, obrázek sdílení odpovídající produktu, jeho dostupnou adresu a skutečné rozměry; po přepnutí jazyka také nový popis, alternativní text a canonical. Produkční drobečková data musí odpovídat viditelnému „Produkty → výrobek“. Při datovaných výjimkách nebo zavírání o českých svátcích se týdenní strukturované hodiny záměrně nevydávají.
- Zavřenou sobotu, neděli a české svátky včetně pohyblivých Velikonoc; konkrétní datovaná výjimka má přednost. U přepínání jazyka ověřit zachování rozpracované poptávky a pozice stránky.
- Google Maps až po souhlasu návštěvníka: před souhlasem ani po odmítnutí se mapa nesmí načítat. Ověřit správnou polohu Prakšická 281, zavření mapy, funkční externí odkaz a shodu s českou i anglickou informací o soukromí. Případná pravidla cílového hostingu nesmí blokovat schválené vložení nebo formulář.
- Staré aliasy řešit skutečným HTTP 301 na odpovídající stránku. Statický HTML/JavaScript přechod není 301. Staré mediální adresy zachovat nebo jednotlivě přesměrovat na odpovídající soubory; neházet všechny ztracené adresy na úvodní stranu.
- Poptávku podle skutečně povoleného způsobu odesílání. Úspěšná HTTP odpověď relaye sama nepotvrzuje přijetí e-mailu.

Produkční artefakt obsahuje indexovatelné stránky. Nevystavovat jej na volně dostupné testovací adrese bez zvláštní ochrany.

### 5. Teprve po zvláštním povolení přepnout produkci

Pokud nový web zůstane na současném hostingu se stejnou IP, DNS se nemusí měnit; záleží na ověřeném nastavení hostingu. Správce atomicky přepne webový kořen nebo nasadí připravený artefakt způsobem umožňujícím návrat. Když se hosting mění, upraví pouze dohodnuté webové záznamy. WordPress ponechá dostupný pro návrat, nikoli veřejně upravitelný na náhodné nové adrese.

Ihned potom ověřit HTTPS, finální host `www`, HTTP přesměrování, všechny historické adresy, obrázky, sitemap, robots a kontakty přímo z veřejného internetu. Při trvajících 404/5xx na důležitých stránkách, chybných odkazech nebo problému s HTTPS obnovit připravenou funkční verzi. Návrat DNS může záviset na cache, proto nenahrazuje předem otestovaný návrat webu.

### 6. Vyhledávače a sledování

Použít stávající ověřené účty Search Console, Seznam Webmaster, firemní profily a existující ověřovací soubory. Žádné náhradní tokeny nebo duplicitní profily. Po přechodu zkontrolovat vybrané produkční adresy a odeslat jejich skutečný sitemap. Protože doména zůstává stejná, nejde o žádost o změnu adresy webu na jinou doménu. Podrobnosti uvádí [Google pro přesun bez změny URL](https://developers.google.com/search/docs/crawling-indexing/site-move-no-url-changes).

První týden sledovat denně chyby a důležité stránky, další měsíc pravidelně porovnávat návštěvnost a skutečné poptávky s dřívějším obdobím. Zpětné odkazy mají vycházet ze skutečných dodavatelů, projektů a relevantních zmínek. Jejich získávání ani oslovování třetích stran zde není provedeno. První pozici [Google nezaručuje](https://developers.google.com/search/docs/fundamentals/do-i-need-seo); [Seznam doporučuje přínosný obsah a přirozené odkazy](https://o-seznam.cz/napoveda/vyhledavani/optimalizace/optimalizacni-minimum/).

## Požadovaná budoucí varianta: vlastní doména na GitHub Pages

Majitel tuto variantu požaduje, dosud není nastavená ani provedená. Dne 18. října 2026 byl pouze čtením ověřen jeho příklad `Majkey25/exhalace`: GitHub Pages používá Actions, vlastní `www.exhalace.cz` a schválený certifikát pro `www` i hlavní doménu s vynuceným HTTPS. Technicky lze podobně připravit tento web; není to potvrzení vhodnosti komerčního použití.

[Pravidla Pages omezují provoz komerčních webů](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), zejména provoz online podnikání a webů zaměřených především na obchodní transakce. Tento web je firemní prezentace s externí poptávkou, nikoli platební systém. Před produkční volbou je potřeba vyjasnit použitelnost pravidel s GitHubem. Samotný fungující kapelní web není schválením firemního webu.

### Co zjistit a připravit předem

- **Správa domény a DNS:** kdo má přístup k aktivní DNS zóně a u jakého poskytovatele. Veřejné NS `ns.grdns.cz` a `ns.grdns.it` samy neprokazují registrátora ani oprávnění. Správce musí umět přidat ověřovací TXT a později upravit webové A/CNAME, případně konfliktní AAAA a CAA. Nezveřejňovat přístupová hesla.
- **Úplný export DNS:** všechny webové i poštovní záznamy včetně SPF, DKIM a DMARC. Současné MX směřují na `mx1.savana.cz` a `mx2.savana.cz`; přesun webu nevyžaduje jejich změnu ani rušení poštovní služby.
- **Záloha a návrat:** soubory a databáze WordPressu, původní DNS a ověřená obnova. Není potřeba WordPress nejprve smazat. Starý server musí zůstat dostupný pro případ návratu.
- **GitHub:** administrátorský přístup k `Majkey25/skloservis-brod` byl přes API potvrzen. To neověřuje přístup k doméně. Připravený workflow má výslovnou produkční volbu popsanou výše; výchozí náhled není neobejitelný zákaz produkce. Před aktivací je nutné ověřit publikovaný commit, vzdálené CI a samostatné povolení přechodu.
- **Vyhledávače:** přístup ke stávajícím Search Console a Seznam Webmaster, export nejnavštěvovanějších stránek a odkazů, zachování existujícího ověření. Nevytvářet duplicitní firemní profily.
- **Staré adresy:** porovnat 14 současných cest ze sitemap s historickými adresami, `?page_id=…`, starými sitemap a `/wp-content/uploads/…`. Některé existující odkazy vedou přímo na `/galerie/`. Zachovat významné adresy médií nebo předem rozhodnout o jejich náhradě. Nepublikovat vyřazené osobní či portrétní fotografie jen kvůli zachování staré adresy.

GitHub Pages nelze považovat za server s vlastními pravidly Apache/Nginx pro libovolné HTTP 301. U zachovaných 14 cest přesměrování potřeba není. Jiným aliasům a přejmenovaným médiím je nutné navrhnout konkrétní řešení. Statické HTML přesměrování není odpověď HTTP 301; [Google může okamžitý meta refresh chápat jako trvalý přechod](https://developers.google.com/search/docs/crawling-indexing/301-redirects), ale nelze tím tvrdit shodné chování všech vyhledávačů ani nahrazovat inventuru adres. Plošné přesměrování všeho na homepage není vhodné.

Připojení vlastní domény ke **stejnému** Pages webu by změnilo také chování dnešní adresy `github.io`, která přesměruje na vlastní doménu. Pro zachování nezávislého náhledu je potřeba oddělený produkční cíl. Popis viz [GitHub a vlastní domény](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages).

Po samostatném schválení této varianty:

1. Ověřit produkční režim připraveného workflow a konkrétní artefakt. Výchozí cíl zůstává náhled, produkce vyžaduje výslovnou proměnnou a povolený běh na `main`.
2. V nastavení účtu Majkey25 → Pages ověřit doménu pomocí GitHubem vygenerovaného TXT. Hodnotu nevymýšlet; TXT ponechat. Viz [ověření domény](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages).
3. Před směrováním DNS nastavit u cílového repozitáře Settings → Pages → Custom domain na `www.skloservis-brod.cz`.
4. `www` CNAME nasměrovat přímo na `Majkey25.github.io`, bez jména repozitáře. Pro hlavní doménu současný oficiální návod uvádí čtyři A záznamy `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`, případně podporované ALIAS/ANAME. Před akcí hodnoty znovu ověřit. Odstranit pouze konfliktní webové záznamy a zkontrolovat případné AAAA. Nepoužívat wildcard. Poštovní záznamy zachovat.
5. Po úspěšné DNS a certifikátové kontrole zapnout Enforce HTTPS, otestovat apex → `www` a všechny cesty. U Actions publikování se soubor CNAME nepoužívá jako nastavení domény.

6. V předem schváleném okamžiku publikovat ověřený produkční artefakt s kořenem `/`, indexovatelnými známými stránkami a canonical na `https://www.skloservis-brod.cz`. Dnešní náhledový artefakt má prefix repozitáře a `noindex`, proto jej nelze pouze připojit k nové doméně. Publikuje se nastavením `SITE_DEPLOY_TARGET=production` a ručním během popsaným výše. Každý další push na `main`, včetně CMS commitů, pak publikuje produkci se stejnými kontrolami.
7. Po přechodu ověřit HTTPS, hlavní doménu i `www`, všechna historická URL, skutečné 404, média, metadata, sitemap, kontakty a CMS nasazování. Odeslat skutečnou produkční sitemap přes stávající účty vyhledávačů, sledovat chyby a návštěvnost a ponechat připravený návrat. Nový skutečný testovací e-mail vyžaduje další výslovné povolení.

Přesné DNS hodnoty a pořadí znovu ověřit v [aktuálním návodu GitHubu](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site). Tento dokument nic nenastavuje a neopravňuje provést přepnutí nyní.
