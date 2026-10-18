# Úpravy webu

Obsah se upravuje přes [Pages CMS](https://app.pagescms.org/). Přihlaste se účtem, který má přístup do repozitáře `Majkey25/skloservis-brod`, a vyberte větev `main`. Soubor `.pages.yml` určuje dostupné formuláře.

Přihlášení, uložení změny a její zveřejnění byly ověřeny 18. října 2026. [Editor tohoto repozitáře](https://app.pagescms.org/majkey25/skloservis-brod/main/file/settings) vytvořil commit se změnou českého i anglického textu galerie; [navazující kontroly a nasazení](https://github.com/Majkey25/skloservis-brod/actions/runs/39081477798) uspěly a oba texty byly ověřeny na veřejném webu. WordPress k úpravám nového webu nepoužívejte.

## Otevírací doba

V části otevírací doby upravte příslušný den. Časy zapisujte jako `08:00`, každý otevřený interval musí končit později, než začíná. Prázdný seznam intervalů znamená, že pro návštěvy není zveřejněná otevírací doba. Poznámka může uvádět například páteční montáže.

Pondělí až čtvrtek jsou podle současné kontaktní stránky otevřené od 8:00 do 15:00. V pátek probíhají montáže. Víkendové hodiny nejsou v původním zdroji uvedené; nepotvrzené hodnoty nepovažujte za ověřenou dostupnost.

Výjimka pro dovolenou nebo svátek nahrazuje běžnou otevírací dobu i poznámky ve vybraném období. Vyplňte obě data jako `RRRR-MM-DD`; první i poslední den do období patří. Prázdné intervaly znamenají, že nejsou uvedené návštěvní hodiny. Pro dovolenou proto doplňte výslovnou poznámku o uzavření česky i anglicky. Období výjimek se nesmí překrývat ani společným krajním dnem. Poznámky k otevírací době vyplňujte vždy v obou jazycích.

## Informační hlášky

Přidejte oznámení, zapněte jeho zobrazování a vyberte závažnost `info`, `attention` nebo `warning`. Napište český i anglický text. Datum „od“ i „do“ zahrnuje celý uvedený den podle českého času.

Například dovolená od 20. do 27. prosince zahrnuje oba tyto dny. Samotná hláška nemění otevírací dobu. Pro zavřenou provozovnu doplňte také výjimku otevírací doby.

Prázdné datum „od“ nebo „do“ znamená neomezený začátek nebo konec. Bez obou dat platí zapnutá hláška trvale. Budoucí hlášky a výjimky se ukládají do veřejných dat stránky už při zveřejnění, nepoužívejte je pro neveřejné informace. Prohlížeč jejich platnost přepočítává podle pásma `Europe/Prague` při načtení, návratu na stránku a každých 30 sekund, když je stránka viditelná. Není potřeba každodenní nasazení. Bez JavaScriptu zůstávají dostupné rozpisy a zapnuté hlášky s uvedenými daty; aktuální stav se automaticky nefiltruje. Vyhodnocení závisí na správném čase zařízení návštěvníka.

## Galerie a obsah

Fotografii nahrajte do médií galerie a přidejte ji do seznamu galerie. Vyplňte věcný český i anglický popis a správnou kategorii. Nevkládejte jména zákazníků, adresy zakázek ani jiné soukromé údaje bez souhlasu. Pořadí položek určuje pořadí fotografií.

Stejně lze upravit firemní údaje, texty, produkty a popisy pro vyhledávače. Stabilní adresy produktových stránek zachovejte. Jejich změna může poškodit existující odkazy a vyžaduje plán přesměrování.

V části „Soukromí a právní informace“ lze upravit české i anglické dokumenty. Změna zásad musí odpovídat skutečnému fungování firmy. Běžné vyřízené poptávky mají podle potvrzené politiky lhůtu jeden měsíc od vyřízení; zákazník může e-mailem požádat o odůvodněné prodloužení nebo o výmaz elektronických i papírových podkladů. Zákonné povinnosti uchování zůstávají zachované. Web sám nemaže firemní schránku ani fyzické dokumenty.

## Zveřejnění

1. Uložte změnu v CMS do větve `main`. Uložení, které vytvoří commit v této větvi, automaticky spustí [workflow Site](https://github.com/Majkey25/skloservis-brod/actions/workflows/site.yml). Změna v jiné větvi se sama nezveřejní.
2. V GitHub Actions otevřete běh odpovídající uloženému commitu. Úloha **Verify and build** nainstaluje závislosti a ověří formátování, typy, testy a sestavení včetně schémat obsahu a obrázků.
3. Teprve po úspěchu všech kontrol úloha **Publish preview** zveřejní tentýž sestavený artefakt na [GitHub Pages](https://majkey25.github.io/skloservis-brod/). Po dokončení zkontrolujte českou i anglickou stránku s úpravou; případně ji znovu načtěte.

Uložení do repozitáře samo nepotvrzuje zveřejnění. Neplatná data, například neexistující datum, překrývající se výjimky, chybějící povinný překlad nebo neplatná adresa produktu, zastaví kontroly. Při selhání kontrol se nový artefakt nepublikuje a nasazení se nespustí; dostupná zůstává poslední úspěšná verze. V protokolu neúspěšné úlohy zjistěte příčinu, opravte obsah a znovu uložte do `main`. Také chyba formátování, typů nebo sestavení zveřejnění zablokuje.

Oprávněný správce může spustit **Run workflow** nad větví `main` a zapnout volbu `publish`. Ruční publikace provede všechny stejné kontroly a použije jejich artefakt bez dalšího sestavení. Výchozí vypnutá volba `publish` spustí jen kontroly. Pull requesty a ruční běhy jiných větví nepublikují.

Tento postup popisuje konfiguraci workflow. Přihlášení do CMS, oprávnění účtu a skutečný průchod uložením až po nasazení vyžadují oprávněný účet. Kontaktní formulář předává zprávy přes FormSubmit na `skloservis.brod@gmail.com`. Majitel potvrdil aktivaci i přijetí jediného povoleného testu; klient při něm nedostal do 15 sekund odpověď relaye. Další test vyžaduje nové povolení. Změna kontaktního e-mailu mění i příjemce formuláře a vyžaduje novou aktivaci a ověření. HTTP přijetí relé není důkaz doručení do schránky. Samostatný e-mailový odkaz otevírá poštovní aplikaci návštěvníka.

Náhled na GitHub Pages se nemá indexovat ve vyhledávačích. Doména `skloservis-brod.cz` a současný WordPress zůstávají beze změny.
