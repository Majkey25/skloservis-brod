# Úpravy webu

Obsah se upravuje přes [Pages CMS](https://app.pagescms.org/). Přihlaste se účtem, který má přístup do repozitáře `Majkey25/skloservis-brod`, a vyberte větev `main`. Soubor `.pages.yml` určuje dostupné formuláře.

Přihlášení, oprávnění aplikace a skutečné uložení změny zatím nebyly ověřeny. Samotná přítomnost konfigurace CMS neznamená, že je přístup aktivovaný. WordPress k úpravám nového webu nepoužívejte.

## Otevírací doba

V části otevírací doby upravte příslušný den. Časy zapisujte jako `08:00`, každý otevřený interval musí končit později, než začíná. Prázdný seznam intervalů znamená, že pro návštěvy není zveřejněná otevírací doba. Poznámka může uvádět například páteční montáže.

Pondělí až čtvrtek jsou podle současné kontaktní stránky otevřené od 8:00 do 15:00. V pátek probíhají montáže. Víkendové hodiny nejsou v původním zdroji uvedené; nepotvrzené hodnoty nepovažujte za ověřenou dostupnost.

Výjimka pro dovolenou nebo svátek nahrazuje běžnou otevírací dobu ve vybraném období. Prázdné intervaly ve výjimce znamenají zavřeno. Období výjimek se nesmí překrývat.

## Informační hlášky

Přidejte oznámení, zapněte jeho zobrazování a vyberte závažnost `info`, `attention` nebo `warning`. Napište český i anglický text. Datum „od“ i „do“ zahrnuje celý uvedený den podle českého času.

Například dovolená od 20. do 27. prosince zahrnuje oba tyto dny. Samotná hláška nemění otevírací dobu. Pro zavřenou provozovnu doplňte také výjimku otevírací doby.

## Galerie a obsah

Fotografii nahrajte do médií galerie a přidejte ji do seznamu galerie. Vyplňte věcný český i anglický popis a správnou kategorii. Nevkládejte jména zákazníků, adresy zakázek ani jiné soukromé údaje bez souhlasu. Pořadí položek určuje pořadí fotografií.

Stejně lze upravit firemní údaje, texty, produkty a popisy pro vyhledávače. Stabilní adresy produktových stránek zachovejte. Jejich změna může poškodit existující odkazy a vyžaduje plán přesměrování.

## Zveřejnění

Uložení v CMS vytvoří změnu v GitHubu. Finální nasazovací postup musí před zveřejněním ověřit obsah, typy, testy a sestavení. Při chybě zůstává poslední úspěšná verze. Během přípravy je publikace záměrně ruční; automatické publikování změn zapne dokončovací běh po 21:05.

Náhled na GitHub Pages se nemá indexovat ve vyhledávačích. Doména `skloservis-brod.cz` a současný WordPress zůstávají beze změny.
