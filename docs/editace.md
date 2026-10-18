# Úpravy webu

Obsah se upravuje přes [Pages CMS](https://app.pagescms.org/). Přihlaste se účtem, který má přístup do repozitáře `Majkey25/skloservis-brod`, a vyberte větev `main`. Soubor `.pages.yml` určuje dostupné formuláře.

Přihlášení, uložení změny a její zveřejnění byly ověřeny 18. října 2026. [Editor tohoto repozitáře](https://app.pagescms.org/majkey25/skloservis-brod/main/file/settings) vytvořil commit se změnou českého i anglického textu galerie; [navazující kontroly a nasazení](https://github.com/Majkey25/skloservis-brod/actions/runs/39081477798) uspěly a oba texty byly ověřeny na veřejném webu. WordPress k úpravám nového webu nepoužívejte.

## Otevírací doba

V části otevírací doby upravte příslušný den. Časy zapisujte jako `08:00`, každý otevřený interval musí končit později, než začíná. Prázdný seznam intervalů znamená, že pro návštěvy není zveřejněná otevírací doba. Poznámka může uvádět například páteční montáže.

Pondělí až čtvrtek je otevřeno od 8:00 do 15:00. V pátek probíhají montáže. Majitel potvrdil, že v sobotu a neděli je zavřeno; pro domluvu návštěvníci mohou zavolat nebo napsat e-mail.

Volba „O českých svátcích zavřeno“ automaticky zahrnuje i pohyblivý Velký pátek a Velikonoční pondělí v dalších letech. Konkrétní datovaná výjimka má před tímto pravidlem přednost.

Výjimka pro dovolenou nebo svátek nahrazuje běžnou otevírací dobu i poznámky ve vybraném období. Vyplňte obě data jako `RRRR-MM-DD`; první i poslední den do období patří. Prázdné intervaly znamenají, že nejsou uvedené návštěvní hodiny. Pro dovolenou proto doplňte výslovnou poznámku o uzavření česky i anglicky. Období výjimek se nesmí překrývat ani společným krajním dnem. Poznámky k otevírací době vyplňujte vždy v obou jazycích.

## Informační hlášky

Přidejte oznámení, zapněte jeho zobrazování a vyberte závažnost `info`, `attention` nebo `warning`. Napište český i anglický text. Datum „od“ i „do“ zahrnuje celý uvedený den podle českého času.

Například dovolená od 20. do 27. prosince zahrnuje oba tyto dny. Samotná hláška nemění otevírací dobu. Pro zavřenou provozovnu doplňte také výjimku otevírací doby.

Prázdné datum „od“ nebo „do“ znamená neomezený začátek nebo konec. Bez obou dat platí zapnutá hláška trvale. Budoucí hlášky a výjimky se ukládají do veřejných dat stránky už při zveřejnění, nepoužívejte je pro neveřejné informace. Prohlížeč jejich platnost přepočítává podle pásma `Europe/Prague` při načtení, návratu na stránku a každých 30 sekund, když je stránka viditelná. Není potřeba každodenní nasazení. Bez JavaScriptu zůstávají dostupné rozpisy a zapnuté hlášky s uvedenými daty; aktuální stav se automaticky nefiltruje. Vyhodnocení závisí na správném čase zařízení návštěvníka.

## Galerie a obsah

Fotografii nahrajte do médií galerie a přidejte ji do seznamu galerie. Vyplňte věcný český i anglický popis a správnou kategorii. Nevkládejte jména zákazníků, adresy zakázek ani jiné soukromé údaje bez souhlasu. Pořadí položek určuje pořadí fotografií.

Kategorie osmi výrobků propojují fotografie s jejich detailními stránkami. Detail ukazuje všechny fotografie svého výrobku; první je úvodní a v mřížce se neopakuje. Kliknutím na fotografii otevřete prohlížeč pouze této kategorie. Bez fotografií se zobrazí zpráva o prázdné kategorii.

Pro další doložené náměty slouží `vitriny` (vitríny a skleněné police), `sklo-na-nabytek`, `zrcadla` a `krbova-skla`. Jsou to pouze kategorie galerie, nevytvářejí nové produktové stránky. Celá galerie nabízí filtry s počty fotografií; odkazy na kategorie fungují i bez JavaScriptu. Po přidání nebo změně kategorie zkontrolujte její obsah v obou jazycích.

Stejně lze upravit firemní údaje, texty, produkty a popisy pro vyhledávače. Stabilní adresy produktových stránek zachovejte. Jejich změna může poškodit existující odkazy a vyžaduje plán přesměrování.

U výrobků ponechte „Stručný úvod“ krátký, používá se také na přehledových kartách. Volitelné „Podrobnosti výrobku“ obsahují nejvýše čtyři oddíly. Každý potřebuje nadpis i text česky a anglicky. Zobrazují se v zadaném pořadí pouze na detailu výrobku, také bez JavaScriptu. Uvádějte jen potvrzené možnosti a parametry. Pro odstranění oddílu smažte celou položku; nevyplněný nebo neúplně přeložený oddíl zastaví kontroly. Prázdný seznam je v pořádku.

V kontaktu lze upravit odkaz na Google Maps a volitelnou URL vložené mapy. Z Google Maps → Sdílet → Vložení mapy zkopírujte pouze adresu `src`, ne celý HTML kód, a ověřte polohu provozovny. Prázdná URL vložení mapu vypne. Mapa se načítá až po souhlasu návštěvníka; externí odkaz funguje i bez JavaScriptu.

Firemní údaje zahrnují zkušenosti, roční čísla a čtyři skupiny služeb. Hodnocení Firmy.cz uvádí zdroj, počet a datum ověření; při změně ověřte aktuální profil. Vymazáním všech jeho polí se hodnocení skryje. Nedoplňujte neověřená ocenění nebo certifikace.

Hodnocení Google opište z veřejného profilu firmy na Google Maps: odkaz `https://www.google.com/maps?cid=…`, průměr, počet recenzí a datum, kdy jste je zkontrolovali. Nejvýše čtyři vybrané recenze vkládejte doslova, s počtem hvězd a autorem ve tvaru jméno a iniciála. Smazaná nebo změněná recenze na Google znamená, že ji odstraníte nebo upravíte i zde. Pokud autor požádá o odstranění citace, smažte ji. Vymazáním všech polí se blok Google skryje.

V části „Soukromí a právní informace“ lze upravit české i anglické dokumenty. Změna zásad musí odpovídat skutečnému fungování firmy. Běžné vyřízené poptávky mají podle potvrzené politiky lhůtu jeden měsíc od vyřízení; zákazník může e-mailem požádat o odůvodněné prodloužení nebo o výmaz elektronických i papírových podkladů. Zákonné povinnosti uchování zůstávají zachované. Web sám nemaže firemní schránku ani fyzické dokumenty.

## Zveřejnění

1. Uložte změnu v CMS do větve `main`. Uložení, které vytvoří commit v této větvi, automaticky spustí [workflow Site](https://github.com/Majkey25/skloservis-brod/actions/workflows/site.yml). Změna v jiné větvi se sama nezveřejní.
2. V GitHub Actions otevřete běh odpovídající uloženému commitu. Úloha **Verify and build** nainstaluje závislosti a ověří formátování, typy, testy a sestavení včetně schémat obsahu a obrázků.
3. Teprve po úspěchu všech kontrol úloha **Publish preview** zveřejní tentýž sestavený artefakt na [GitHub Pages](https://majkey25.github.io/skloservis-brod/). Po dokončení zkontrolujte českou i anglickou stránku s úpravou; případně ji znovu načtěte.

Uložení do repozitáře samo nepotvrzuje zveřejnění. Neplatná data, například neexistující datum, překrývající se výjimky, chybějící povinný překlad nebo neplatná adresa produktu, zastaví kontroly. Při selhání kontrol se nový artefakt nepublikuje a nasazení se nespustí; dostupná zůstává poslední úspěšná verze. V protokolu neúspěšné úlohy zjistěte příčinu, opravte obsah a znovu uložte do `main`. Také chyba formátování, typů nebo sestavení zveřejnění zablokuje.

Oprávněný správce může spustit **Run workflow** nad větví `main` a zapnout volbu `publish`. Ruční publikace provede všechny stejné kontroly a použije jejich artefakt bez dalšího sestavení. Výchozí vypnutá volba `publish` spustí jen kontroly. Pull requesty a ruční běhy jiných větví nepublikují.

Tento postup popisuje konfiguraci workflow. Přihlášení do CMS, oprávnění účtu a skutečný průchod uložením až po nasazení vyžadují oprávněný účet. Kontaktní formulář předává zprávy přes FormSubmit na `skloservis.brod@gmail.com`. Majitel potvrdil aktivaci i přijetí jediného povoleného testu; klient při něm nedostal do 15 sekund odpověď relaye. Další test vyžaduje nové povolení. Změna kontaktního e-mailu mění i příjemce formuláře a vyžaduje novou aktivaci a ověření. HTTP přijetí relé není důkaz doručení do schránky. Samostatný e-mailový odkaz otevírá poštovní aplikaci návštěvníka.

Náhled na GitHub Pages se nemá indexovat ve vyhledávačích. Doména `skloservis-brod.cz` a současný WordPress zůstávají beze změny.
