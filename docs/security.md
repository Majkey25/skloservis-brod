# Browser security

`src/layouts/Base.astro` places a resource Content Security Policy and an explicit
`strict-origin-when-cross-origin` referrer policy before its bootstrap script.
The referrer policy retains same-origin navigation context and sends only the
origin on cross-origin HTTPS requests. It sends no referrer on HTTPS downgrades.
See the [HTML referrer policy standard](https://html.spec.whatwg.org/multipage/semantics.html#meta-referrer).

## Resource restrictions

The CSP denies document base changes, object embeds, workers and inline event
handler attributes. Images, fonts, media and manifests must use the same origin.
Connections allow this origin and `https://formsubmit.co`. Form submissions allow
only FormSubmit. Frames allow only `https://www.google.com/maps/embed`.

Allowing the map origin does not load a map or implement consent. `MapPreview.astro`
still creates the iframe only after the visitor chooses to load it, and removes it
when closed. The iframe has its own `no-referrer` policy. Its external content is
a separate document; the parent's asset restrictions do not govern that content.

## Script and style limitation

This resource policy deliberately has no `default-src`, `script-src` or `style-src`.
It does not restrict script elements or style elements and attributes. It is not
a complete XSS defense or a hash-based script policy. Existing inline bootstrap,
component style attributes and client navigation remain available.

Astro 7.4.0 has native build-time CSP hashing, but both its installed types and
[official CSP documentation](https://docs.astro.build/en/reference/configuration-reference/#securitycsp)
explicitly exclude `ClientRouter`. The installed router also injects a `data:`
module sentinel when replaying inline modules. Enabling the native policy without
addressing these constraints could break navigation. Broad `unsafe-inline` or
`data:` script allowances would weaken protection and have not been added.

A complete hash policy needs a supported solution for the router, bootstrap and
style attributes, followed by a fresh build and browser checks across both
languages and all page styles. Native CSP is not enforced in Astro dev mode, so
testing only the dev server would not establish compatibility.

## HTTP header limits

These are HTML meta policies, not HTTP response headers. They apply after the
browser processes their elements. They do not provide `X-Content-Type-Options`,
`Permissions-Policy`, HSTS or clickjacking protection. In particular,
[`frame-ancestors` cannot be enforced in a meta CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors).
It requires an HTTP header. `X-Frame-Options` also requires an HTTP header.

This static Pages deployment has no response-header handler in the repository.
Adding `_headers`, HTML header lookalikes or JavaScript framebusting would not
establish these protections. Header hardening needs a separately configured host
or response-header layer and verification of actual responses. No such deployment
or infrastructure change is part of the resource policy.

## FormSubmit and CAPTCHA

The checked [FormSubmit documentation](https://formsubmit.co/documentation) recommends
its default reCAPTCHA and documents `_captcha=false` as an opt-out. The
[AJAX documentation](https://formsubmit.co/ajax-documentation) shows JSON requests
but does not document CAPTCHA token verification or an AJAX challenge protocol.
This does not prove AJAX CAPTCHA is impossible; compatibility remains unverified.

The current form supplies `_captcha=false` in HTML and AJAX. Client validation and
the honeypot can be bypassed by a caller that submits directly to the provider.
Removing a client-controlled flag alone would not prove that the provider requires
CAPTCHA for every request to this recipient.

The minimum documented route without a new backend, service or credentials is
ordinary browser POST to the existing FormSubmit action, with its default CAPTCHA
and `_honey` field. That would change the JavaScript submission flow and privacy
description, so it requires coordinated implementation. Provider confirmation or
an explicitly authorized validation is still needed before claiming protection
against callers that disable CAPTCHA. No form flow, CAPTCHA setting or recipient
activation has changed, and no real submission is needed for these source checks.

## Repository publishing permissions

The `main` branch has an active GitHub ruleset blocking branch deletion and
non-fast-forward pushes, with no bypass actors. Normal fast-forward content
commits from Pages CMS remain permitted. The Pages deployment environment is
limited to `main`, and the deployment job runs only after verification succeeds.

This does not add an independent human approval requirement for every publish.
Requiring a pull request or approval for every CMS commit would change the current
save-to-deploy workflow. A trusted repository writer still controls published
content and source. Restrict account and CMS access accordingly; a content form
is not a sandbox for an untrusted repository administrator.

## Verification

`node --test tests/security.test.ts` checks the resource allowlist and placement.
It does not demonstrate browser enforcement. Integration must verify the built
pages, no requests to Google before consent, consent load/close, client navigation,
theme, draft preservation, no-JavaScript content and intercepted form responses.
Do not send a real enquiry as part of routine security checks.
