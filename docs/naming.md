# App name: Turnstone

Status: chosen
Date: 2026-09-10

## Decision

**Turnstone** for the read-only SSH/SFTP code explorer (see
[investigation.md](investigation.md)).

Why it fits: a turnstone is a small shorebird that flips pebbles to see what
is underneath, without changing anything. Exploring without modifying is the
product's core promise (FR9).

Store availability (verified 2026-09-10):

- Google Play: no exact-name app; search returns only fuzzy matches (Hearthstone, Spellstone, TunyStones). Effectively available as an Android app name.
- iOS App Store: one exact-name app, "Turnstone - Hourglass Merge" (Games, solo developer). Different category and no naming policy conflict for a Developer Tools app, but expect to share search results with it.

## Known collisions (accepted with eyes open)

| Where         | What                                                                                                                                 | Impact                                                                                                                                    |
|---------------|--------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| GitHub        | `turnstonelabs/turnstone`, 1,263 stars, very active, self-described "gives LLMs tools: shell, files, search"                         | Biggest residual risk: it will own "turnstone" in developer-facing GitHub search. No store or legal overlap.                              |
| npm           | `turnstone` v2.2.0, a React autocomplete component (188 stars)                                                                       | Package name unavailable; publish as a scope, e.g. `@turnstone-app/*`                                                                     |
| Exact domains | turnstone.com (Turnstone Capital), turnstone.dev (parking SaaS), turnstone.app (deal-screening SaaS), all in active use              | Exact domains gone; variants below are free                                                                                               |
| Trademarks    | Turnstone: Steelcase office-furniture brand since 1993 (furniture class); Turnstone Biologics (biotech); Turnstone Capital (finance) | Different classes from consumer software; low risk for an indie dev tool. Not legal advice; screen formally before any commercial launch. |

## Variant domains (RDAP-checked 2026-09-10)

| Domain           | Status     |
|------------------|------------|
| turnstoneapp.com | available  |
| turnstoneapp.dev | available  |
| getturnstone.dev | available  |
| useturnstone.dev | available  |
| useturnstone.com | available  |
| getturnstone.com | registered |

Preferred: `turnstoneapp.dev` (short, reads as "the Turnstone app", standard
price, HTTPS-only .dev).

## Alternatives evaluated (all checks run 2026-09-10)

| Name      | Verdict         | Deciding evidence                                                                                                                    |
|-----------|-----------------|--------------------------------------------------------------------------------------------------------------------------------------|
| Turnstone | chosen          | Play clean; one unrelated iOS game; GitHub/npm/domain collisions accepted as above                                                   |
| Catsh     | free everywhere | No store apps, npm free, catsh.dev + catsh.app unregistered; pun, but autocorrects to "catch" and SEO-weak                           |
| Avocet    | soft conflict   | Clean stores/GitHub, but all domains registered (avocet.app is a Mac dev-tools studio, avocet.dev claimed 3 weeks ago, npm squatted) |
| Deckhand  | soft conflict   | Marine-only store apps, but "Deckhand AI" is a live mobile-dev tool; npm taken, no domains                                           |
| Peruse    | soft conflict   | Read/browse app collisions (RSS Peruse, PDF Peruse, KDE Peruse); dictionary-word discoverability                                     |
| Porthole  | soft conflict   | Established name in port-forwarding niche; no domains                                                                                |
| Loupe     | taken           | Exact-name iOS Developer Tools app (Mysk), terminal-centric Mac dev tool at loupe.build, chaijs `loupe` on npm                       |
| Gander    | taken           | 912-star Android read-only markdown/code viewer named Gander heading to Play, plus three other exact-name apps                       |
| Skerry    | taken           | SkerrySSH (SSH client with Android build), npm claimed 2026-08, exact-name iOS weather app                                           |

## Defensive moves (when committing)

1. Register `turnstoneapp.dev` (or `.com`) before anything public.
2. Claim the Android application id and iOS bundle id at first build (e.g. `com.turnstoneapp` / `com.turnstoneapp.ios`); application ids are first-come-first-served, unlike listing names.
3. Reserve the GitHub org `turnstone-app` (or similar) for the repo.
4. If publishing npm packages, use the `@turnstone-app` scope.