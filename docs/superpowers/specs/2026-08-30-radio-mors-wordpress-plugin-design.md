# Projekt: Wtyczka WordPress „Lista Przebojów Radia MORS”

**Data:** 2026-08-30
**Status:** Zatwierdzony do napisania planu wdrożenia
**Autor:** tballaun@gmail.com (projekt), Claude (opracowanie)

## 1. Cel i kontekst

Istniejąca aplikacja „Lista Przebojów Radia MORS” to full-stack: SPA (Tailwind + Web
Audio) + backend Node.js/Express/Prisma/PostgreSQL. Celem jest przepisanie warstwy
serwerowej do **natywnej wtyczki WordPress w PHP** (droga A — pełny port), przy
maksymalnym odzysku istniejącego frontendu.

WordPress działa na PHP + MySQL, więc kod Node nie zostaje uruchomiony — cała logika
serwerowa jest reimplementowana w PHP. Frontend SPA (`app/public/app.js`) odzyskujemy
niemal w całości, zmieniając głównie bazowy URL API i dokładając nonce.

### Ustalenia (zatwierdzone w brainstormingu)

- **Autoryzacja/role:** konta WordPress + capabilities (nie własny JWT).
- **Frontend:** shortcode `[lista_przebojow_mors]`; panel admina jako podstrona menu WP.
- **Zakres:** jedna instalacja (Radio MORS), bez rygoru publikacji w katalogu wordpress.org.
- **Głosujący:** anonimowi, identyfikowani hashem (bez kont WP).
- **Kanoniczny frontend:** `app/public/app.js` (55 KB, łączy się z `/api/v1`).
  Root `app.js` to starszy prototyp z zaszytymi danymi — pomijamy.

## 2. Architektura

Jedna wtyczka PHP, autoloader PSR-4, prefiks `mors_` / namespace `Mors\`. Własne tabele
MySQL (dane relacyjne — nie CPT). REST API pod `wp-json/mors/v1`. Autoryzacja panelu przez
sesję WP + nonce + capabilities. SPA ładowana shortcodem przez `wp_enqueue_script`.

### Warstwy i granice odpowiedzialności

- **Repozytoria (`includes/db/`)** — jedyna warstwa dotykająca `$wpdb`. Reszta nie zna SQL.
- **Domena (`includes/domain/`)** — czysta logika biznesowa (silnik notowania, głosowanie,
  serializacja). Zależy wyłącznie od repozytoriów. Warstwa testowana jednostkowo.
- **REST (`includes/rest/`)** — cienka: walidacja wejścia, `permission_callback`
  (nonce/capability), wywołanie domeny, serializacja odpowiedzi. Bez logiki biznesowej.
- **Auth/Frontend/Admin** — integracja z WordPress (capabilities, shortcode, podstrona).

### Odwzorowanie technologii

| Node / oryginał | WordPress / PHP |
|---|---|
| Express router | `register_rest_route` |
| Prisma ORM | repozytoria na `$wpdb` (`$wpdb->prefix.'mors_*'`) |
| `prisma.$transaction` | `START TRANSACTION` / `COMMIT` / `ROLLBACK` (InnoDB) |
| multer + sharp | `media_handle_upload` + `add_image_size` |
| JWT + bcrypt + cookie | sesja WP + `wp_verify_nonce` + `current_user_can` |
| express-rate-limit | transients (klucz = hash głosującego) |

### Struktura plików

```
radio-mors/
├── radio-mors.php                # Nagłówek wtyczki, stałe, bootstrap, hooki aktywacji
├── uninstall.php                 # Sprzątanie (opcjonalne usuwanie tabel)
├── includes/
│   ├── class-plugin.php          # Rejestracja hooków, kompozycja zależności, wersjonowanie
│   ├── class-activator.php       # dbDelta(): 6 tabel + role/capabilities + seed 1. edycji
│   ├── class-deactivator.php
│   ├── db/
│   │   ├── class-schema.php       # Definicje CREATE TABLE (dbDelta)
│   │   ├── class-editions-repo.php
│   │   ├── class-tracks-repo.php
│   │   ├── class-entries-repo.php
│   │   └── class-votes-repo.php   # obsługuje też voters
│   ├── domain/
│   │   ├── class-chart-engine.php # freeze + reset-and-publish
│   │   ├── class-vote-service.php # walidacja 1–3, cooldown 24h, transakcja, anty-fraud
│   │   └── class-serializer.php   # kształt JSON zgodny z obecnym API
│   ├── rest/
│   │   ├── class-rest-chart.php    # /chart/current, /chart/waiting-room
│   │   ├── class-rest-votes.php    # /votes/status, /votes/cast
│   │   └── class-rest-admin.php    # tracks CRUD+upload, freeze, reset-and-publish, editors
│   ├── auth/
│   │   └── class-capabilities.php # mors_edit_music, mors_present, mors_manage_editors
│   ├── admin/
│   │   └── class-admin-page.php    # podstrona menu WP hostująca panel SPA
│   └── frontend/
│       └── class-shortcode.php     # [lista_przebojow_mors] + enqueue + nonce
├── assets/
│   ├── js/app.js                   # z app/public/app.js: API_BASE→wp-json/mors/v1, nonce
│   ├── js/admin.js                 # logika panelu (wydzielona z SPA, jeśli potrzeba)
│   └── css/styles.css              # z app/public/styles.css (Tailwind skompilowany)
└── readme.txt
```

## 3. Model danych — 6 tabel MySQL (prefiks `wp_mors_`)

`AdminUser` z Prismy **znika** — zastępują go konta WP + capabilities. Pozostaje 6 tabel.

| Tabela | Z Prisma | Uwagi |
|---|---|---|
| `mors_editions` | ChartEdition | `edition_number UNIQUE`, `status VARCHAR(20)`, `is_current TINYINT`, daty `DATETIME` |
| `mors_tracks` | Track | `status`, `cover_image_url`, `audio_key`, `peak_position`, `total_weeks_on_chart`, `bpm` |
| `mors_entries` | ChartEntry | `UNIQUE(edition_id, track_id)`, `trend VARCHAR(10)`, indeks `(edition_id, is_waiting)` |
| `mors_voters` | Voter | `voter_hash` UNIQUE, `next_eligible_vote_at DATETIME`, `trust_score FLOAT` |
| `mors_votes` | Vote | `ip_address`, `user_agent`, `fingerprint_hash`, `edition_id`, `track_id`, `voter_id` |
| `mors_audit_log` | AuditLog | `admin_id` = **ID użytkownika WP**, `action VARCHAR`, `metadata LONGTEXT` (JSON) |

### Decyzje mapowania

- **Klucze:** zachowujemy UUID (`CHAR(36)`, `wp_generate_uuid4()`). Frontend operuje na
  stringowych `id`, więc kształt JSON i SPA pozostają bez zmian.
- **Brak twardych FOREIGN KEY** — `dbDelta()` ich nie tworzy. Integralność w kodzie repo;
  kaskadowe usuwanie `Track` (jego wpisy i głosy) realizowane jawnie w transakcji.
- **Transakcje:** `$wpdb->query('START TRANSACTION')` / `COMMIT` / `ROLLBACK` (InnoDB).
- **Enumy** jako `VARCHAR` + walidacja stałymi PHP (łatwiejsze migracje niż natywny ENUM).
- **Wartości enum** (zachowane 1:1):
  - `TrackStatus`: WAITING_ROOM, CHART, ARCHIVED, REJECTED
  - `EditionStatus`: DRAFT, ACTIVE, FROZEN, BROADCASTING, ARCHIVED
  - `TrendDirection`: NEW, UP, DOWN, SAME, REENTRY

## 4. Silnik notowania — `Chart_Engine`

Wierne odwzorowanie `app/src/routes/admin.js`.

### `freeze()`

Zmiana statusu bieżącej edycji na `FROZEN`. Głosowanie zamyka się automatycznie
(`votes/cast` wymaga `status === ACTIVE`). Wpis do audit logu.

### `reset_and_publish()` — jedna transakcja

1. Pobierz wpisy bieżącej edycji (lista `is_waiting=0` oraz poczekalnia `is_waiting=1`),
   posortuj malejąco po `votes_count`.
2. Utwórz nową edycję: `edition_number + 1`, tytuł „Notowanie N • Wydanie Główne”,
   `status=ACTIVE`, okno głosowania `now … now+7 dni`, `is_current=1`.
3. Starą edycję → `is_current=0`, `status=ARCHIVED`.
4. **Top 18** → pozycje 1–18. `trend` liczony z `position` vs `new_pos`:
   `position > new_pos` → UP; `position < new_pos` → DOWN; równe → SAME.
   Aktualizacja `peak_position` (min z dotychczasowego i nowej pozycji),
   `total_weeks_on_chart`, `weeks_on_chart + 1`, `status=CHART`. Nowy `votes_count=0`.
5. **Top 2 z poczekalni** → pozycje 19–20, `trend=NEW`, `weeks_on_chart=1`,
   `previous_position=null`, `status=CHART`.
6. Reszta poczekalni przechodzi dalej jako `is_waiting=1` (zachowany `tag`),
   `weeks_on_chart + 1`, `position=null`, `trend=NEW`.
7. **Dopełnienie poczekalni do 25** placeholderami: tytuł „Nowa Propozycja #N”,
   wykonawca „Młoda Fala UG”, `status=WAITING_ROOM`, `duration_seconds=195`.
8. Wszystkie nowe wpisy `votes_count=0`.
9. Wpis do `mors_audit_log` (`action=CHART_RESET_PUBLISH`).

## 5. Głosowanie — `Vote_Service`

Wierne odwzorowanie `app/src/routes/votes.js`.

- **Wejście:** 1–3 `trackIds` (to `ChartEntry.id`), bez duplikatów; wszystkie muszą
  należeć do bieżącej edycji o statusie `ACTIVE`.
- **Hash głosującego** — odwzorowanie `voterHashFor`: oryginał to
  `sha256("ip:" + realny_IP_klienta)`. **User-Agent celowo NIE wchodzi do klucza**
  (był trywialnie podmieniany). W WordPressie realny IP ustalamy ostrożnie
  (`REMOTE_ADDR`; jeśli za Cloudflare/proxy — z zaufanego nagłówka, konfigurowalnie),
  aby nie dało się fałszować nagłówkiem.
- **Cooldown 24h:** sprawdzenie `next_eligible_vote_at` i zapis w **jednej transakcji**
  (eliminacja race condition — blokada wiersza głosującego `SELECT ... FOR UPDATE`).
  Przekroczony limit → HTTP 429 z `nextEligibleVoteAt`.
- **Zapis:** `upsert` głosującego (`last_voted_at`, `next_eligible_vote_at = now+24h`),
  inkrement `votes_count` każdego wybranego wpisu, wstawienie rekordów `mors_votes`.
- **Rate-limit transportu** (obrona w głąb): transient per hash głosującego —
  odpowiednik `castLimiter` (30 żądań / 1h).
- **Turnstile** (obecne w specyfikacji technicznej) — **poza zakresem MVP**; w
  `permission_callback` zostaje hook umożliwiający późniejsze dołożenie weryfikacji.

## 6. REST API — `wp-json/mors/v1`

Kształt odpowiedzi 1:1 z obecnym API (`success`, `message`, dane) — dzięki temu SPA działa
bez zmian logiki.

| Metoda + trasa | `permission_callback` |
|---|---|
| `GET /chart/current` | publiczny |
| `GET /chart/waiting-room` | publiczny |
| `GET /votes/status` | publiczny (hash z żądania) |
| `POST /votes/cast` | publiczny + rate-limit + hook Turnstile + nonce `wp_rest` |
| `GET /admin/tracks` | `current_user_can('mors_edit_music')` |
| `POST /admin/tracks/upload` | `mors_edit_music` |
| `PUT /admin/tracks/{id}` | `mors_edit_music` |
| `DELETE /admin/tracks/{id}` | `mors_edit_music` |
| `POST /admin/chart/freeze` | `mors_edit_music` |
| `POST /admin/chart/reset-and-publish` | `mors_edit_music` |
| `GET/POST/DELETE /admin/editors` | `mors_manage_editors` |

Endpointy `/auth/*` (login/logout/me) **znikają** — logowanie realizuje WordPress. SPA
odczytuje stan z osadzonego `nonce` oraz (dla panelu) capability przekazanej w
`wp_localize_script`.

## 7. Autoryzacja i role

- **Publiczne żądania piszące** (`votes/cast`): nonce `wp_rest` + rate-limit + walidacja;
  głosujący anonimowi (hash).
- **Panel:** użytkownik zalogowany w WP; każde żądanie niesie nagłówek `X-WP-Nonce`;
  `permission_callback` sprawdza capability.
- **Capabilities** (nadawane w aktywatorze, czyszczone w deaktywatorze):
  - `mors_present` → rola „Prezenter” (podgląd).
  - `mors_edit_music` → „Redaktor Muzyczny” (CRUD utworów, freeze/publish); przyznawany
    także roli Administrator.
  - `mors_manage_editors` → tylko Administrator (zarządza przyznawaniem powyższych).
- **`/editors`** = lista użytkowników WP z capability `mors_edit_music` +
  nadawanie/odbieranie (zamiast osobnej tabeli `AdminUser`).

## 8. Upload plików

`media_handle_upload()` dla okładki i audio — pliki trafiają do **Media Library** WP.
W tabeli `mors_tracks` trzymamy URL/attachment ID (`cover_image_url`, ewentualnie
`audio` attachment). Miniatury okładek przez `add_image_size('mors_cover', …)` (zamiast
`sharp`). Walidacja MIME i limitu rozmiaru w handlerze uploadu.

## 9. Frontend — odzysk SPA

Z `app/public/`, minimalne zmiany:

1. `API_BASE = '/api/v1'` → `API_BASE = morsData.restUrl` (`wp-json/mors/v1`),
   wstrzyknięte przez `wp_localize_script`.
2. Do każdego `fetch` panelu dodać nagłówek `X-WP-Nonce: morsData.nonce`.
3. `credentials: 'include'` zostaje (cookie sesji WP).
4. Silnik audio (Web Audio, procedural wg `audioKey`) i generator kart social — bez zmian.
   Audio dwutrybowe: syntetyczny snippet + opcjonalny wgrany plik (`new Audio(src)`).
5. `styles.css` (skompilowany Tailwind) przez `wp_enqueue_style` — bez CDN Tailwind.
6. Shortcode `[lista_przebojow_mors]` renderuje kontener SPA. Panel admina to ta sama baza
   kodu na podstronie `add_menu_page`.

## 10. Testy

- **Jednostkowe** (PHPUnit + WP test suite / Brain Monkey):
  - `Chart_Engine::reset_and_publish` — scenariusze: top 18, promocja 2 z poczekalni,
    dopełnienie do 25, obliczanie trendów (UP/DOWN/SAME/NEW), aktualizacja peak/weeks.
  - `Vote_Service` — 1–3 utwory, odrzucenie duplikatów, wpisy spoza bieżącej edycji,
    cooldown 24h, zachowanie transakcji przy równoległych żądaniach.
- **Integracyjne REST** (`WP_UnitTestCase` + `rest_do_request`): każdy endpoint w wariancie
  publicznym vs z capability; kody 400/403/409/429.
- **Ręczny smoke** (LocalWP / `wp-env`): aktywacja → seed → głos → freeze → publish →
  weryfikacja przeliczenia notowania.

## 11. Kolejność wdrożenia (fazy → osobne jednostki pracy)

1. **Szkielet + aktywator + 6 tabel + seed** — aktywacja tworzy tabele i pierwszą edycję.
2. **Repozytoria + serializer** — kształt JSON zgodny z SPA.
3. **REST publiczne** (`chart/*`, `votes/status`) + shortcode ładujący SPA — lista widoczna.
4. **`Vote_Service` + `votes/cast`** — działające głosowanie z cooldownem.
5. **Auth/capabilities + REST admin (CRUD + upload)** + podstrona panelu.
6. **`Chart_Engine`** (freeze + reset-and-publish) + audit log.
7. **Testy, hartowanie bezpieczeństwa, `readme.txt`**, smoke na czystym WP.

## 12. Poza zakresem (YAGNI dla MVP)

- Cloudflare Turnstile (tylko hook do dołożenia później).
- WebSocket/SSE „live ranking” z pierwotnej specyfikacji technicznej — SPA odświeża przez
  polling REST jak obecnie.
- Kolejki/worker audio (BullMQ/FFmpeg) — audio jest proceduralne w przeglądarce.
- Publikacja w katalogu wordpress.org (pełne i18n, macierz wersji) — budujemy pod jedną stronę.
- Redis — cache/limit realizowane transientami WP.

## 13. Znane ryzyka i uwagi

- **Ustalanie IP** za proxy/Cloudflare wymaga świadomej konfiguracji, by hash głosującego
  nie był fałszowalny nagłówkiem — to warstwa anty-fraud, traktujemy priorytetowo.
- **Brak twardych FK** — dyscyplina kaskad musi być w repo (testy pokrywają usuwanie utworu).
- **Transakcje** działają tylko na InnoDB — aktywator powinien to zweryfikować.
- **Repozytorium git nie jest zainicjowane** w katalogu projektu — spec nie został
  zacommitowany automatycznie; do rozważenia `git init` przed rozpoczęciem implementacji.
