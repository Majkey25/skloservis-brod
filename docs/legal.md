# Legal content and implementation

Updated 18 October 2026.

The site is a Czech business presentation and enquiry service, with an English translation. The legal work follows that actual scope. No universal compliance certification is claimed.

## Verified business identity

The official [ARES record](https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/02596491), retrieved on 17 October 2026, identifies SKLOSERVIS-BROD s.r.o., IČO 02596491, DIČ CZ02596491, registered office č.p. 314, 760 01 Březnice, Czech Republic. Its register-source data lists section C, entry 81823, KSBR. The [published contact page](https://www.skloservis-brod.cz/kontakt/) separately identifies the workshop at Prakšická 281, 688 01 Uherský Brod and phone +420 608 031 206. Keep the registered office distinct from the workshop.

## Pages and links

- Preserve `/ochrana-osobnich-udaju/`; English counterpart `/en/privacy/`.
- Cookies/storage: `/cookies/` and `/en/cookies/`.
- Company, complaints and consumer ADR: `/pravni-informace/` and `/en/legal/`.
- Every public layout needs visible links to these pages, plus legal name and IČO. Enquiry actions must link the relevant privacy notice before personal data is collected.
- `Legal.astro` uses the shared layout, navigation, theme and footer without changing the legal facts or hiding disclosures.

## Confirmed retention policy and remaining supplier checks

The owner confirmed that only the company owner accesses the contact mailbox. A later correction sets ordinary resolved enquiry retention to **one month after resolution**, for retrieval. Customers may request a justified extension and may request erasure of electronic and physical material by emailing `skloservis.brod@gmail.com`. Preserve statutory records and information needed for specific lawful claims; never promise unconditional destruction of every document. Successful project records have separate performance, claim and statutory purposes.

The website does not configure the Gmail inbox or destroy physical records. The owner must apply the published policy operationally. Do not represent a policy file as tested mailbox deletion. Account-specific provider terms, transfer safeguards, backup handling and any processor agreement remain unverified; no Google Workspace subscription is established.

Current host information and actual privacy practices can be documented independently. A website request exposes technical connection data to GitHub Pages. The homepage's “Napsat e-mail” / “Write an email” button navigates to Contact. On Contact, that button and the footer “Napsat e-mail” / “Write an email” link on every page decode the address on click and use `mailto:` to open the visitor's mail application with the recipient filled in; they do not send mail. The separate web form uses Web3Forms to relay name, email and message to the mailbox associated with its public access key. Verify that recipient independently of the displayed contact email. The historical authorized FormSubmit test does not establish delivery through Web3Forms. No further real test is authorized; endpoint acceptance is not inbox proof.

The form validates input, POSTs only on submission, omits provider cookies in AJAX requests, and preserves input when acceptance is not confirmed. It loads no external CAPTCHA or analytics script. Public contact values remain encoded; the Web3Forms access key is deliberately public and is not an authentication secret. Without JavaScript or a configured key the form is hidden; the public business listing remains available. Query parameters never establish success. [Web3Forms privacy terms](https://web3forms.com/privacy) describe international processing and spam-checking providers. On 20 October 2026, the lead saved and reload-verified the form's seven-day submission retention, company recipient and free Plain notification template in the company account. Provider retention is separate from the owner's one-month period after resolution. Keep public copy aligned with the actual account setting. A configured period does not prove execution of every deletion or legal compliance.

## Quoted reviews

The Google rating block repeats the public average, count and check date and links to the Google profile. It loads nothing from Google. Quoted reviews are copied verbatim from the public profile with the author's first name and initial only. Remove a quote when the author asks or when the review changes or disappears on Google.

## Optional Google Maps embed

The owner selected Google Maps, replacing the unshipped Mapy candidate. `src/components/MapPreview.astro` uses the official Share → Embed a map URL. This integration uses no API key or new account and requires no purchase; do not introduce a paid Maps API or billing configuration.

The component creates no iframe, active map `src`, preconnect or map-provider request before an explicit “Souhlasit a načíst mapu” / “Agree and load the map” click. Keep “Bez mapy” / “Without the map” equally accessible. Address and external map link remain available without consent or JavaScript. Opening the external Google Maps link is a separate visitor action governed by Google's policies.

Consent lasts only for the currently open map. No consent key is saved in cookies, localStorage or sessionStorage. Close removes the iframe; page navigation destroys the embed. Reopening requires another explicit click. Closing stops the embed but does not erase provider cookies, undo prior processing or impose a retention period on Google.

After loading, Google receives IP and technical browser/request information and may use cookies or similar storage. Google processes data under its own [privacy policy](https://policies.google.com/privacy) and [cookie policy](https://policies.google.com/technologies/cookies), checked on 18 October 2026. The policies describe provider purposes and possible processing outside the EEA, including the USA; they are not proof of this site's legal compliance. Actual storage depends on browser restrictions, account state, provider behavior and the visitor's Google choices. Do not publish a fixed cookie inventory or lifetime from general provider examples as if observed in this embed.

The lead must verify actual network and storage behavior before and after consent, decline, close and navigation in a real browser. Runtime cookie inventory remains pending that verification; this copy and source inspection do not establish an observed inventory. Keep both privacy and cookie pages aligned with the resulting evidence.

## Runtime checks owed after frontend integration

- Preference storage uses `skloservis-theme` and `skloservis-language` only after a manual choice, with a fixed 180-day expiry that visits do not renew. Automatic device defaults are not saved. Both cookie pages document the keys, expiry and browser clearing. Recheck this inventory whenever scripts or external services change.
- Functional preference storage must remain limited to the visitor's requested choice. Do not treat every localStorage use as exempt. No analytics, advertising or embedded third-party media without appropriate assessment and prior choice when required.
- Confirm the selected email/relay provider's real terms, recipients, retention and international-transfer arrangements. No SMTP/API secrets in browser output.
- An ordinary quote request does not automatically require a forced consent checkbox. Select the appropriate legal basis for its actual purpose and show the privacy information.
- Test footer links, both languages, keyboard access, contrast and reduced motion. Do not claim audited accessibility conformance or a company-size exemption without evidence.

## Official sources

- [GDPR, especially Articles 5, 6 and 12–13](https://eur-lex.europa.eu/legal-content/EN/TXT/?qid=1526560528451&uri=CELEX%3A32016R0679).
- [ÚOOÚ cookies and equivalent browser storage guidance](https://uoou.gov.cz/verejnost/qa-otazky-a-odpovedi/cookies).
- [Czech Civil Code, section 435](https://e-sbirka.gov.cz/sb/2012/89) and [Business Corporations Act, section 7](https://e-sbirka.gov.cz/sb/2012/90).
- [ČOI business ADR guidance](https://coi.gov.cz/pro-podnikatele/informace-pro-prodejce-zbozi-a-sluzeb/mimosoudni-reseni-spotrebitelskych-sporu-adr/).
- [ODR platform closure](https://consumer-redress.ec.europa.eu/site-relocation_en). Do not add the obsolete EU ODR link; Czech ADR information remains relevant.
- [MPO accessibility scope guidance](https://mpo.gov.cz/cz/podnikani/pristupnost-vyrobku-a-sluzeb/pristupnost-vyrobku-a-sluzeb-po-ucinnosti-zakona--286983/). The real contracting journey and enterprise status determine conditional obligations; neither a cart's absence nor the word "small" proves exemption.

Public legal wording must match actual operations. Source research and draft pages are not proof of operational or legal compliance.
