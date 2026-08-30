# Wtyczka WordPress „Lista Przebojów Radia MORS” — Plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Przepisać backend aplikacji Radia MORS (Node/Express/Prisma/PostgreSQL) na natywną wtyczkę WordPress w PHP, odzyskując istniejący frontend SPA.

**Architecture:** Jedna wtyczka PHP z autoloaderem PSR-4. Trzy warstwy: repozytoria (jedyny dostęp do `$wpdb`), domena (czysta logika: silnik notowania, głosowanie, serializacja), REST (cienka warstwa `register_rest_route` z `permission_callback`). Własne tabele MySQL (InnoDB). Autoryzacja panelu przez konta WP + capabilities + nonce; głosujący anonimowi (hash IP). Frontend SPA ładowany shortcodem.

**Tech Stack:** PHP 7.4+, WordPress 6.x, MySQL/InnoDB, `$wpdb`, WP REST API, Composer (autoload + dev), PHPUnit + WordPress test suite (via `wp-env` lub `install-wp-tests`), Tailwind (skompilowany, statyczny).

**Spec:** [docs/superpowers/specs/2026-08-30-radio-mors-wordpress-plugin-design.md](../specs/2026-08-30-radio-mors-wordpress-plugin-design.md)

## Global Constraints

- **Prefiks tabel:** `{$wpdb->prefix}mors_` (np. `wp_mors_tracks`). Zawsze przez `$wpdb->prefix`, nigdy zaszyty `wp_`.
- **Prefiks kodu:** namespace `Mors\`, stałe `MORS_`, opcje/transienty `mors_`, capabilities `mors_edit_music` / `mors_present` / `mors_manage_editors`.
- **Namespace REST:** `mors/v1`. Kształt odpowiedzi 1:1 z obecnym API: `{ success: bool, message?: string, ... }`.
- **Klucze główne:** UUID `CHAR(36)`, generowane `wp_generate_uuid4()`.
- **Enumy jako `VARCHAR` + stałe PHP.** Wartości dokładnie: TrackStatus `WAITING_ROOM|CHART|ARCHIVED|REJECTED`; EditionStatus `DRAFT|ACTIVE|FROZEN|BROADCASTING|ARCHIVED`; TrendDirection `NEW|UP|DOWN|SAME|REENTRY`.
- **Transakcje:** `$wpdb->query('START TRANSACTION')` / `COMMIT` / `ROLLBACK` (wymaga InnoDB).
- **Bez twardych FOREIGN KEY** (dbDelta ich nie tworzy) — integralność i kaskady w kodzie repo.
- **Sanityzacja/escaping:** każde wejście przez `sanitize_*`; każde zapytanie z parametrem przez `$wpdb->prepare()`; wyjście przez REST (auto-JSON).
- **Cooldown głosowania:** 24 h. **Rate-limit transportu:** 30 żądań / 1 h per hash. **Wybór:** 1–3 utwory, bez duplikatów.
- **Hash głosującego:** `hash('sha256', 'ip:'.$realny_ip)` — User-Agent celowo poza kluczem.

---

## Struktura plików (mapa)

```
radio-mors/
├── radio-mors.php                     # Nagłówek + bootstrap + rejestracja aktywacji
├── uninstall.php                      # Usunięcie tabel/opcji przy odinstalowaniu
├── composer.json                      # Autoload PSR-4 (Mors\) + dev: phpunit
├── .wp-env.json                       # Środowisko testowe/dev
├── phpunit.xml.dist                   # Konfiguracja testów
├── includes/
│   ├── class-plugin.php               # Kompozycja, rejestracja hooków
│   ├── class-activator.php            # dbDelta + capabilities + seed
│   ├── class-deactivator.php          # Zdejmowanie capabilities
│   ├── constants.php                  # Stałe enumów + role
│   ├── db/
│   │   ├── class-schema.php           # SQL dla dbDelta (6 tabel)
│   │   ├── class-repo.php             # Baza: uchwyt $wpdb, tx(), table()
│   │   ├── class-editions-repo.php
│   │   ├── class-tracks-repo.php
│   │   ├── class-entries-repo.php
│   │   └── class-votes-repo.php       # votes + voters + audit_log
│   ├── domain/
│   │   ├── class-serializer.php
│   │   ├── class-vote-service.php
│   │   └── class-chart-engine.php
│   ├── rest/
│   │   ├── class-rest-chart.php
│   │   ├── class-rest-votes.php
│   │   └── class-rest-admin.php
│   ├── auth/
│   │   ├── class-capabilities.php
│   │   └── class-request-identity.php # ustalanie IP + hash głosującego
│   ├── admin/
│   │   └── class-admin-page.php
│   └── frontend/
│       └── class-shortcode.php
├── assets/
│   ├── js/app.js                      # z app/public/app.js (zmodyfikowany)
│   └── css/styles.css                 # z app/public/styles.css
└── tests/
    ├── bootstrap.php
    ├── test-activator.php
    ├── test-repos.php
    ├── test-serializer.php
    ├── test-vote-service.php
    ├── test-chart-engine.php
    └── test-rest-*.php
```

Katalog roboczy wtyczki: `wp-plugin/radio-mors/` w repozytorium (żeby nie mieszać z istniejącą aplikacją Node w `app/`). W środowisku `wp-env` montowany jako aktywna wtyczka.

---

### Task 1: Szkielet wtyczki + środowisko testowe

**Files:**
- Create: `wp-plugin/radio-mors/radio-mors.php`
- Create: `wp-plugin/radio-mors/includes/constants.php`
- Create: `wp-plugin/radio-mors/includes/class-plugin.php`
- Create: `wp-plugin/radio-mors/composer.json`
- Create: `wp-plugin/radio-mors/.wp-env.json`
- Create: `wp-plugin/radio-mors/phpunit.xml.dist`
- Create: `wp-plugin/radio-mors/tests/bootstrap.php`
- Create: `wp-plugin/radio-mors/tests/test-plugin.php`

**Interfaces:**
- Produces: stała `MORS_VERSION`, `MORS_PLUGIN_DIR`, `MORS_PLUGIN_URL`; klasa `Mors\Plugin` z metodą statyczną `instance()` i `boot()`; autoload PSR-4 mapujący `Mors\` → `includes/`.

- [ ] **Step 1: Napisz test szkieletu**

`tests/test-plugin.php`:
```php
<?php
class Test_Plugin extends WP_UnitTestCase {
    public function test_constants_defined() {
        $this->assertTrue( defined( 'MORS_VERSION' ) );
        $this->assertNotEmpty( MORS_PLUGIN_DIR );
    }
    public function test_plugin_class_loads_via_autoload() {
        $this->assertTrue( class_exists( '\\Mors\\Plugin' ) );
        $this->assertInstanceOf( '\\Mors\\Plugin', \Mors\Plugin::instance() );
    }
}
```

- [ ] **Step 2: Uruchom test — ma się nie powieść**

Run: `composer install && vendor/bin/phpunit --filter Test_Plugin`
Expected: FAIL — `class '\Mors\Plugin' not found` / brak stałych.

- [ ] **Step 3: Napisz composer.json (autoload)**

`composer.json`:
```json
{
  "name": "radio-mors/plugin",
  "type": "wordpress-plugin",
  "require": { "php": ">=7.4" },
  "require-dev": {
    "phpunit/phpunit": "^9",
    "yoast/phpunit-polyfills": "^2"
  },
  "autoload": {
    "psr-4": { "Mors\\": "includes/" }
  }
}
```
Konwencja plików: klasa `Mors\Db\Tracks_Repo` → `includes/db/class-tracks-repo.php`. Ponieważ nazwy plików WP (`class-*.php`) nie odpowiadają PSR-4 domyślnie, w `composer.json` używamy `"classmap"` zamiast `psr-4` dla `includes/`:
```json
  "autoload": { "classmap": ["includes/"] }
```
(Zastąp blok `psr-4` powyższym — classmap radzi sobie z konwencją `class-*.php`.)

- [ ] **Step 4: Napisz plik główny wtyczki**

`radio-mors.php`:
```php
<?php
/**
 * Plugin Name: Lista Przebojów Radia MORS
 * Description: Lista przebojów z głosowaniem słuchaczy i panelem redakcji.
 * Version: 1.0.0
 * Requires PHP: 7.4
 * Text Domain: radio-mors
 */
if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'MORS_VERSION', '1.0.0' );
define( 'MORS_PLUGIN_FILE', __FILE__ );
define( 'MORS_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'MORS_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once MORS_PLUGIN_DIR . 'includes/constants.php';
$mors_autoload = MORS_PLUGIN_DIR . 'vendor/autoload.php';
if ( file_exists( $mors_autoload ) ) { require_once $mors_autoload; }

\Mors\Plugin::instance()->boot();
```

- [ ] **Step 5: Napisz constants.php i class-plugin.php**

`includes/constants.php`:
```php
<?php
// Statusy i trendy (VARCHAR w DB, stałe w kodzie).
final class Mors_Enum {
    const TRACK_STATUSES   = [ 'WAITING_ROOM', 'CHART', 'ARCHIVED', 'REJECTED' ];
    const EDITION_STATUSES = [ 'DRAFT', 'ACTIVE', 'FROZEN', 'BROADCASTING', 'ARCHIVED' ];
    const TRENDS           = [ 'NEW', 'UP', 'DOWN', 'SAME', 'REENTRY' ];
    const CAP_EDIT_MUSIC   = 'mors_edit_music';
    const CAP_PRESENT      = 'mors_present';
    const CAP_MANAGE       = 'mors_manage_editors';
}
```
`includes/class-plugin.php`:
```php
<?php
namespace Mors;
class Plugin {
    private static $instance;
    public static function instance() {
        if ( ! self::$instance ) { self::$instance = new self(); }
        return self::$instance;
    }
    public function boot() {
        // Kolejne taski dokładają tu rejestracje (rest_api_init, shortcode, admin_menu).
    }
}
```

- [ ] **Step 6: Konfiguracja testów i środowiska**

`.wp-env.json`:
```json
{ "plugins": [ "." ], "phpVersion": "7.4" }
```
`phpunit.xml.dist`:
```xml
<?xml version="1.0"?>
<phpunit bootstrap="tests/bootstrap.php" colors="true">
  <testsuites>
    <testsuite name="radio-mors">
      <directory prefix="test-" suffix=".php">./tests/</directory>
    </testsuite>
  </testsuites>
</phpunit>
```
`tests/bootstrap.php`:
```php
<?php
$_tests_dir = getenv( 'WP_TESTS_DIR' ) ?: '/tmp/wordpress-tests-lib';
require_once $_tests_dir . '/includes/functions.php';
tests_add_filter( 'muplugins_loaded', function () {
    require dirname( __DIR__ ) . '/radio-mors.php';
} );
require $_tests_dir . '/includes/bootstrap.php';
```

- [ ] **Step 7: Uruchom test — ma przejść**

Run: `composer dump-autoload && vendor/bin/phpunit --filter Test_Plugin`
Expected: PASS (2 testy).

- [ ] **Step 8: Commit**

```bash
git add wp-plugin/radio-mors
git commit -m "feat(mors): szkielet wtyczki + środowisko testowe"
```

---

### Task 2: Schema, aktywator, capabilities, seed

**Files:**
- Create: `wp-plugin/radio-mors/includes/db/class-schema.php`
- Create: `wp-plugin/radio-mors/includes/class-activator.php`
- Create: `wp-plugin/radio-mors/includes/class-deactivator.php`
- Create: `wp-plugin/radio-mors/includes/auth/class-capabilities.php`
- Modify: `wp-plugin/radio-mors/radio-mors.php` (rejestracja hooków aktywacji)
- Test: `wp-plugin/radio-mors/tests/test-activator.php`

**Interfaces:**
- Produces:
  - `Mors\Db\Schema::table_names(): array` — mapa logicznych nazw → pełne nazwy tabel z prefiksem (`editions`,`tracks`,`entries`,`voters`,`votes`,`audit_log`).
  - `Mors\Db\Schema::create_tables(): void` — `dbDelta` dla 6 tabel.
  - `Mors\Activator::activate(): void` — tworzy tabele, nadaje capabilities, seeduje 1. edycję jeśli brak.
  - `Mors\Deactivator::deactivate(): void`.
  - `Mors\Auth\Capabilities::add(): void` / `::remove(): void`.

- [ ] **Step 1: Napisz test aktywacji**

`tests/test-activator.php`:
```php
<?php
class Test_Activator extends WP_UnitTestCase {
    public function test_tables_created_and_edition_seeded() {
        global $wpdb;
        \Mors\Activator::activate();
        $tables = \Mors\Db\Schema::table_names();
        foreach ( $tables as $t ) {
            $found = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $t ) );
            $this->assertSame( $t, $found, "Brak tabeli $t" );
        }
        $count = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$tables['editions']}" );
        $this->assertGreaterThanOrEqual( 1, $count );
    }
    public function test_admin_role_gets_capabilities() {
        \Mors\Activator::activate();
        $admin = get_role( 'administrator' );
        $this->assertTrue( $admin->has_cap( Mors_Enum::CAP_EDIT_MUSIC ) );
        $this->assertTrue( $admin->has_cap( Mors_Enum::CAP_MANAGE ) );
    }
}
```

- [ ] **Step 2: Uruchom — ma się nie powieść**

Run: `vendor/bin/phpunit --filter Test_Activator`
Expected: FAIL — klasy `Schema`/`Activator` nie istnieją.

- [ ] **Step 3: Napisz Schema (dbDelta)**

`includes/db/class-schema.php`:
```php
<?php
namespace Mors\Db;
class Schema {
    public static function table_names() {
        global $wpdb;
        $p = $wpdb->prefix . 'mors_';
        return [
            'editions'  => $p . 'editions',
            'tracks'    => $p . 'tracks',
            'entries'   => $p . 'entries',
            'voters'    => $p . 'voters',
            'votes'     => $p . 'votes',
            'audit_log' => $p . 'audit_log',
        ];
    }
    public static function create_tables() {
        global $wpdb;
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        $charset = $wpdb->get_charset_collate();
        $t = self::table_names();
        $sql = [];
        $sql[] = "CREATE TABLE {$t['editions']} (
            id CHAR(36) NOT NULL,
            edition_number INT NOT NULL,
            title VARCHAR(191) NOT NULL,
            voting_starts_at DATETIME NOT NULL,
            voting_ends_at DATETIME NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
            is_current TINYINT(1) NOT NULL DEFAULT 0,
            published_at DATETIME NULL,
            created_at DATETIME NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY edition_number (edition_number),
            KEY is_current (is_current)
        ) ENGINE=InnoDB $charset;";
        $sql[] = "CREATE TABLE {$t['tracks']} (
            id CHAR(36) NOT NULL,
            title VARCHAR(191) NOT NULL,
            artist VARCHAR(191) NOT NULL,
            album VARCHAR(191) NULL,
            genre VARCHAR(191) NULL,
            cover_image_url TEXT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'WAITING_ROOM',
            duration_seconds INT NOT NULL DEFAULT 210,
            total_weeks_on_chart INT NOT NULL DEFAULT 0,
            peak_position INT NULL,
            bpm INT NULL,
            audio_key VARCHAR(50) NULL DEFAULT 'synth_chill',
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            PRIMARY KEY (id),
            KEY status (status)
        ) ENGINE=InnoDB $charset;";
        $sql[] = "CREATE TABLE {$t['entries']} (
            id CHAR(36) NOT NULL,
            edition_id CHAR(36) NOT NULL,
            track_id CHAR(36) NOT NULL,
            position INT NULL,
            previous_position INT NULL,
            trend VARCHAR(10) NOT NULL DEFAULT 'NEW',
            votes_count INT NOT NULL DEFAULT 0,
            weeks_on_chart INT NOT NULL DEFAULT 1,
            is_waiting TINYINT(1) NOT NULL DEFAULT 0,
            tag VARCHAR(50) NULL,
            PRIMARY KEY (id),
            UNIQUE KEY edition_track (edition_id, track_id),
            KEY edition_waiting (edition_id, is_waiting)
        ) ENGINE=InnoDB $charset;";
        $sql[] = "CREATE TABLE {$t['voters']} (
            id CHAR(36) NOT NULL,
            voter_hash VARCHAR(64) NOT NULL,
            email VARCHAR(191) NULL,
            is_verified TINYINT(1) NOT NULL DEFAULT 0,
            last_voted_at DATETIME NOT NULL,
            next_eligible_vote_at DATETIME NOT NULL,
            trust_score FLOAT NOT NULL DEFAULT 1.0,
            created_at DATETIME NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY voter_hash (voter_hash)
        ) ENGINE=InnoDB $charset;";
        $sql[] = "CREATE TABLE {$t['votes']} (
            id CHAR(36) NOT NULL,
            edition_id CHAR(36) NOT NULL,
            track_id CHAR(36) NOT NULL,
            voter_id CHAR(36) NOT NULL,
            ip_address VARCHAR(64) NOT NULL,
            user_agent TEXT NULL,
            fingerprint_hash VARCHAR(64) NOT NULL,
            created_at DATETIME NOT NULL,
            PRIMARY KEY (id),
            KEY edition_id (edition_id),
            KEY voter_id (voter_id)
        ) ENGINE=InnoDB $charset;";
        $sql[] = "CREATE TABLE {$t['audit_log']} (
            id CHAR(36) NOT NULL,
            admin_id BIGINT UNSIGNED NOT NULL,
            action VARCHAR(50) NOT NULL,
            metadata LONGTEXT NULL,
            created_at DATETIME NOT NULL,
            PRIMARY KEY (id),
            KEY admin_id (admin_id)
        ) ENGINE=InnoDB $charset;";
        foreach ( $sql as $s ) { dbDelta( $s ); }
    }
}
```

- [ ] **Step 4: Napisz Capabilities, Activator, Deactivator**

`includes/auth/class-capabilities.php`:
```php
<?php
namespace Mors\Auth;
class Capabilities {
    public static function add() {
        $admin = get_role( 'administrator' );
        if ( $admin ) {
            $admin->add_cap( \Mors_Enum::CAP_EDIT_MUSIC );
            $admin->add_cap( \Mors_Enum::CAP_PRESENT );
            $admin->add_cap( \Mors_Enum::CAP_MANAGE );
        }
    }
    public static function remove() {
        foreach ( [ 'administrator' ] as $r ) {
            $role = get_role( $r );
            if ( ! $role ) { continue; }
            $role->remove_cap( \Mors_Enum::CAP_EDIT_MUSIC );
            $role->remove_cap( \Mors_Enum::CAP_PRESENT );
            $role->remove_cap( \Mors_Enum::CAP_MANAGE );
        }
    }
}
```
`includes/class-activator.php`:
```php
<?php
namespace Mors;
use Mors\Db\Schema;
use Mors\Auth\Capabilities;
class Activator {
    public static function activate() {
        Schema::create_tables();
        Capabilities::add();
        self::seed_first_edition();
    }
    private static function seed_first_edition() {
        global $wpdb;
        $t = Schema::table_names();
        $exists = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$t['editions']}" );
        if ( $exists > 0 ) { return; }
        $now = current_time( 'mysql', true );
        $ends = gmdate( 'Y-m-d H:i:s', time() + 7 * DAY_IN_SECONDS );
        $wpdb->insert( $t['editions'], [
            'id' => wp_generate_uuid4(),
            'edition_number' => 1,
            'title' => 'Notowanie 1 • Wydanie Główne',
            'voting_starts_at' => $now,
            'voting_ends_at' => $ends,
            'status' => 'ACTIVE',
            'is_current' => 1,
            'created_at' => $now,
        ] );
    }
}
```
`includes/class-deactivator.php`:
```php
<?php
namespace Mors;
use Mors\Auth\Capabilities;
class Deactivator {
    public static function deactivate() { Capabilities::remove(); }
}
```

- [ ] **Step 5: Zarejestruj hooki aktywacji**

W `radio-mors.php` przed wywołaniem `boot()` dodaj:
```php
register_activation_hook( __FILE__, [ '\\Mors\\Activator', 'activate' ] );
register_deactivation_hook( __FILE__, [ '\\Mors\\Deactivator', 'deactivate' ] );
```

- [ ] **Step 6: Uruchom testy — mają przejść**

Run: `vendor/bin/phpunit --filter Test_Activator`
Expected: PASS (2 testy: tabele + seed, capabilities).

- [ ] **Step 7: Commit**

```bash
git add wp-plugin/radio-mors
git commit -m "feat(mors): schema (6 tabel), aktywator, capabilities, seed edycji"
```

---

### Task 3: Repozytoria + baza z transakcjami

**Files:**
- Create: `wp-plugin/radio-mors/includes/db/class-repo.php`
- Create: `wp-plugin/radio-mors/includes/db/class-editions-repo.php`
- Create: `wp-plugin/radio-mors/includes/db/class-tracks-repo.php`
- Create: `wp-plugin/radio-mors/includes/db/class-entries-repo.php`
- Create: `wp-plugin/radio-mors/includes/db/class-votes-repo.php`
- Test: `wp-plugin/radio-mors/tests/test-repos.php`

**Interfaces:**
- Produces:
  - `Mors\Db\Repo` (bazowa): `wpdb()`, `tx(callable $fn)` (wykonuje w transakcji, rollback na wyjątku), `new_id(): string`, `now(): string` (UTC mysql).
  - `Editions_Repo`: `current(): ?array` (rekord z `is_current=1`), `create(array $data): array`, `update(string $id, array $data): void`.
  - `Tracks_Repo`: `find(string $id): ?array`, `all(array $args=[]): array`, `create(array $data): array`, `update(string $id, array $data): void`, `delete(string $id): void`.
  - `Entries_Repo`: `for_edition(string $editionId, bool $waiting): array` (JOIN track, sort `votes_count DESC`), `by_ids(array $ids, string $editionId): array`, `create(array $data): array`, `increment_votes(string $entryId): void`.
  - `Votes_Repo`: `find_voter(string $hash): ?array`, `upsert_voter(string $hash, string $now, string $next): array`, `insert_vote(array $data): void`, `log(int $adminId, string $action, array $meta=[]): void`.

- [ ] **Step 1: Napisz test repozytoriów (i transakcji)**

`tests/test-repos.php`:
```php
<?php
class Test_Repos extends WP_UnitTestCase {
    public function setUp(): void { parent::setUp(); \Mors\Activator::activate(); }

    public function test_current_edition_returned() {
        $ed = ( new \Mors\Db\Editions_Repo() )->current();
        $this->assertNotNull( $ed );
        $this->assertSame( 'ACTIVE', $ed['status'] );
        $this->assertSame( 1, (int) $ed['is_current'] );
    }
    public function test_track_crud_roundtrip() {
        $repo = new \Mors\Db\Tracks_Repo();
        $t = $repo->create( [ 'title' => 'A', 'artist' => 'B', 'status' => 'WAITING_ROOM' ] );
        $this->assertNotEmpty( $t['id'] );
        $repo->update( $t['id'], [ 'title' => 'C' ] );
        $this->assertSame( 'C', $repo->find( $t['id'] )['title'] );
        $repo->delete( $t['id'] );
        $this->assertNull( $repo->find( $t['id'] ) );
    }
    public function test_tx_rolls_back_on_exception() {
        $repo = new \Mors\Db\Tracks_Repo();
        $before = count( $repo->all() );
        try {
            $repo->tx( function () use ( $repo ) {
                $repo->create( [ 'title' => 'X', 'artist' => 'Y' ] );
                throw new \RuntimeException( 'boom' );
            } );
        } catch ( \RuntimeException $e ) {}
        $this->assertSame( $before, count( $repo->all() ) );
    }
}
```

- [ ] **Step 2: Uruchom — ma się nie powieść**

Run: `vendor/bin/phpunit --filter Test_Repos`
Expected: FAIL — repozytoria nie istnieją.

- [ ] **Step 3: Napisz Repo (bazowa) z transakcją**

`includes/db/class-repo.php`:
```php
<?php
namespace Mors\Db;
abstract class Repo {
    protected function wpdb() { global $wpdb; return $wpdb; }
    protected function t() { return Schema::table_names(); }
    public function new_id() { return wp_generate_uuid4(); }
    public function now() { return gmdate( 'Y-m-d H:i:s' ); }
    /** Wykonuje $fn w transakcji; COMMIT po sukcesie, ROLLBACK i re-throw na wyjątku. */
    public function tx( callable $fn ) {
        $db = $this->wpdb();
        $db->query( 'START TRANSACTION' );
        try {
            $result = $fn();
            $db->query( 'COMMIT' );
            return $result;
        } catch ( \Throwable $e ) {
            $db->query( 'ROLLBACK' );
            throw $e;
        }
    }
}
```

- [ ] **Step 4: Napisz Editions_Repo i Tracks_Repo**

`includes/db/class-editions-repo.php`:
```php
<?php
namespace Mors\Db;
class Editions_Repo extends Repo {
    public function current() {
        $db = $this->wpdb(); $t = $this->t();
        $row = $db->get_row(
            "SELECT * FROM {$t['editions']} WHERE is_current = 1 LIMIT 1", ARRAY_A );
        return $row ?: null;
    }
    public function create( array $data ) {
        $db = $this->wpdb(); $t = $this->t();
        $data = array_merge( [
            'id' => $this->new_id(), 'status' => 'ACTIVE',
            'is_current' => 0, 'created_at' => $this->now(),
        ], $data );
        $db->insert( $t['editions'], $data );
        return $data;
    }
    public function update( $id, array $data ) {
        $db = $this->wpdb(); $t = $this->t();
        $db->update( $t['editions'], $data, [ 'id' => $id ] );
    }
}
```
`includes/db/class-tracks-repo.php`:
```php
<?php
namespace Mors\Db;
class Tracks_Repo extends Repo {
    public function find( $id ) {
        $db = $this->wpdb(); $t = $this->t();
        $row = $db->get_row(
            $db->prepare( "SELECT * FROM {$t['tracks']} WHERE id = %s", $id ), ARRAY_A );
        return $row ?: null;
    }
    public function all( array $args = [] ) {
        $db = $this->wpdb(); $t = $this->t();
        $where = ''; $params = [];
        if ( ! empty( $args['status'] ) ) { $where = 'WHERE status = %s'; $params[] = $args['status']; }
        $sql = "SELECT * FROM {$t['tracks']} $where ORDER BY created_at DESC";
        if ( $params ) { $sql = $db->prepare( $sql, $params ); }
        return $db->get_results( $sql, ARRAY_A ) ?: [];
    }
    public function create( array $data ) {
        $db = $this->wpdb(); $t = $this->t();
        $data = array_merge( [
            'id' => $this->new_id(), 'status' => 'WAITING_ROOM',
            'duration_seconds' => 210, 'total_weeks_on_chart' => 0,
            'audio_key' => 'synth_chill',
            'created_at' => $this->now(), 'updated_at' => $this->now(),
        ], $data );
        $db->insert( $t['tracks'], $data );
        return $data;
    }
    public function update( $id, array $data ) {
        $db = $this->wpdb(); $t = $this->t();
        $data['updated_at'] = $this->now();
        $db->update( $t['tracks'], $data, [ 'id' => $id ] );
    }
    public function delete( $id ) {
        $db = $this->wpdb(); $t = $this->t();
        // Kaskada logiczna: usuń wpisy i głosy tego utworu.
        $db->delete( $t['entries'], [ 'track_id' => $id ] );
        $db->delete( $t['votes'], [ 'track_id' => $id ] );
        $db->delete( $t['tracks'], [ 'id' => $id ] );
    }
}
```

- [ ] **Step 5: Napisz Entries_Repo i Votes_Repo**

`includes/db/class-entries-repo.php`:
```php
<?php
namespace Mors\Db;
class Entries_Repo extends Repo {
    public function for_edition( $editionId, $waiting ) {
        $db = $this->wpdb(); $t = $this->t();
        $sql = $db->prepare(
            "SELECT e.*, tr.title, tr.artist, tr.album, tr.genre, tr.cover_image_url,
                    tr.audio_key, tr.bpm, tr.duration_seconds, tr.peak_position,
                    tr.total_weeks_on_chart
             FROM {$t['entries']} e
             JOIN {$t['tracks']} tr ON tr.id = e.track_id
             WHERE e.edition_id = %s AND e.is_waiting = %d
             ORDER BY e.votes_count DESC",
            $editionId, $waiting ? 1 : 0 );
        return $db->get_results( $sql, ARRAY_A ) ?: [];
    }
    public function by_ids( array $ids, $editionId ) {
        if ( ! $ids ) { return []; }
        $db = $this->wpdb(); $t = $this->t();
        $ph = implode( ',', array_fill( 0, count( $ids ), '%s' ) );
        $sql = $db->prepare(
            "SELECT * FROM {$t['entries']} WHERE id IN ($ph) AND edition_id = %s",
            array_merge( $ids, [ $editionId ] ) );
        return $db->get_results( $sql, ARRAY_A ) ?: [];
    }
    public function create( array $data ) {
        $db = $this->wpdb(); $t = $this->t();
        $data = array_merge( [ 'id' => $this->new_id(), 'trend' => 'NEW',
            'votes_count' => 0, 'weeks_on_chart' => 1, 'is_waiting' => 0 ], $data );
        $db->insert( $t['entries'], $data );
        return $data;
    }
    public function increment_votes( $entryId ) {
        $db = $this->wpdb(); $t = $this->t();
        $db->query( $db->prepare(
            "UPDATE {$t['entries']} SET votes_count = votes_count + 1 WHERE id = %s", $entryId ) );
    }
}
```
`includes/db/class-votes-repo.php`:
```php
<?php
namespace Mors\Db;
class Votes_Repo extends Repo {
    public function find_voter( $hash ) {
        $db = $this->wpdb(); $t = $this->t();
        $row = $db->get_row( $db->prepare(
            "SELECT * FROM {$t['voters']} WHERE voter_hash = %s", $hash ), ARRAY_A );
        return $row ?: null;
    }
    /** Blokada wiersza wewnątrz transakcji (FOR UPDATE) — używane przez Vote_Service. */
    public function find_voter_for_update( $hash ) {
        $db = $this->wpdb(); $t = $this->t();
        $row = $db->get_row( $db->prepare(
            "SELECT * FROM {$t['voters']} WHERE voter_hash = %s FOR UPDATE", $hash ), ARRAY_A );
        return $row ?: null;
    }
    public function upsert_voter( $hash, $now, $next ) {
        $db = $this->wpdb(); $t = $this->t();
        $existing = $this->find_voter( $hash );
        if ( $existing ) {
            $db->update( $t['voters'],
                [ 'last_voted_at' => $now, 'next_eligible_vote_at' => $next ],
                [ 'id' => $existing['id'] ] );
            return $this->find_voter( $hash );
        }
        $row = [ 'id' => $this->new_id(), 'voter_hash' => $hash,
            'last_voted_at' => $now, 'next_eligible_vote_at' => $next,
            'trust_score' => 1.0, 'created_at' => $now ];
        $db->insert( $t['voters'], $row );
        return $row;
    }
    public function insert_vote( array $data ) {
        $db = $this->wpdb(); $t = $this->t();
        $data = array_merge( [ 'id' => $this->new_id(), 'created_at' => $this->now() ], $data );
        $db->insert( $t['votes'], $data );
    }
    public function log( $adminId, $action, array $meta = [] ) {
        $db = $this->wpdb(); $t = $this->t();
        $db->insert( $t['audit_log'], [
            'id' => $this->new_id(), 'admin_id' => $adminId, 'action' => $action,
            'metadata' => wp_json_encode( $meta ), 'created_at' => $this->now() ] );
    }
}
```

- [ ] **Step 6: Uruchom testy — mają przejść**

Run: `vendor/bin/phpunit --filter Test_Repos`
Expected: PASS (3 testy).

- [ ] **Step 7: Commit**

```bash
git add wp-plugin/radio-mors
git commit -m "feat(mors): repozytoria + transakcje na \$wpdb"
```

---

### Task 4: Serializer (kształt JSON zgodny z SPA)

**Files:**
- Create: `wp-plugin/radio-mors/includes/domain/class-serializer.php`
- Test: `wp-plugin/radio-mors/tests/test-serializer.php`

**Interfaces:**
- Consumes: wiersze z `Entries_Repo::for_edition` (JOIN z track), rekord edycji z `Editions_Repo`.
- Produces:
  - `Mors\Domain\Serializer::entry(array $row): array` — pojedynczy wpis w kształcie SPA.
  - `Serializer::edition(array $edition, array $chartEntries, array $waitingEntries): array`.

**Uwaga:** dokładny kształt odczytać z `app/src/services/chartSerializer.js` i `app/public/app.js` (nazwy pól, camelCase). Test poniżej fiksuje kluczowe pola; przy implementacji uzupełnić resztę zgodnie z oryginałem.

- [ ] **Step 1: Napisz test serializera**

`tests/test-serializer.php`:
```php
<?php
class Test_Serializer extends WP_UnitTestCase {
    public function test_entry_shape() {
        $row = [
            'id' => 'e1', 'track_id' => 't1', 'position' => 3, 'previous_position' => 5,
            'trend' => 'UP', 'votes_count' => 12, 'weeks_on_chart' => 4, 'is_waiting' => 0,
            'title' => 'Song', 'artist' => 'Band', 'album' => null, 'genre' => 'Rock',
            'cover_image_url' => null, 'audio_key' => 'funk_bass', 'bpm' => 120,
            'duration_seconds' => 200, 'peak_position' => 2, 'total_weeks_on_chart' => 9,
        ];
        $out = \Mors\Domain\Serializer::entry( $row );
        $this->assertSame( 'e1', $out['id'] );
        $this->assertSame( 3, $out['position'] );
        $this->assertSame( 'UP', $out['trend'] );
        $this->assertSame( 12, $out['votes'] );
        $this->assertSame( 'Song', $out['title'] );
        $this->assertSame( 'funk_bass', $out['audioKey'] );
    }
}
```

- [ ] **Step 2: Uruchom — ma się nie powieść**

Run: `vendor/bin/phpunit --filter Test_Serializer`
Expected: FAIL — `Serializer` nie istnieje.

- [ ] **Step 3: Napisz Serializer**

`includes/domain/class-serializer.php`:
```php
<?php
namespace Mors\Domain;
class Serializer {
    public static function entry( array $r ) {
        return [
            'id'            => $r['id'],
            'trackId'       => $r['track_id'],
            'position'      => isset( $r['position'] ) ? (int) $r['position'] : null,
            'previousPosition' => isset( $r['previous_position'] ) ? (int) $r['previous_position'] : null,
            'trend'         => $r['trend'],
            'votes'         => (int) $r['votes_count'],
            'weeksOnChart'  => (int) $r['weeks_on_chart'],
            'isInWaitingRoom' => (bool) $r['is_waiting'],
            'title'         => $r['title'],
            'artist'        => $r['artist'],
            'album'         => $r['album'],
            'genre'         => $r['genre'],
            'coverImageUrl' => $r['cover_image_url'],
            'audioKey'      => $r['audio_key'] ?: 'synth_chill',
            'bpm'           => isset( $r['bpm'] ) ? (int) $r['bpm'] : null,
            'durationSeconds' => (int) $r['duration_seconds'],
            'peakPosition'  => isset( $r['peak_position'] ) ? (int) $r['peak_position'] : null,
            'totalWeeksOnChart' => (int) $r['total_weeks_on_chart'],
        ];
    }
    public static function edition( array $ed, array $chart, array $waiting ) {
        return [
            'edition' => [
                'id' => $ed['id'],
                'editionNumber' => (int) $ed['edition_number'],
                'title' => $ed['title'],
                'status' => $ed['status'],
                'votingEndsAt' => $ed['voting_ends_at'],
            ],
            'chart'   => array_map( [ self::class, 'entry' ], $chart ),
            'waitingRoom' => array_map( [ self::class, 'entry' ], $waiting ),
        ];
    }
}
```

- [ ] **Step 4: Uruchom — ma przejść. Zweryfikuj kształt względem SPA**

Run: `vendor/bin/phpunit --filter Test_Serializer`
Expected: PASS. Następnie porównaj pola z `app/public/app.js` (jak SPA czyta `chart`/`waitingRoom`, nazwy pól) i dostosuj, jeśli oryginał używa innych nazw. Zaktualizuj test o brakujące pola i ponownie uruchom.

- [ ] **Step 5: Commit**

```bash
git add wp-plugin/radio-mors
git commit -m "feat(mors): serializer JSON zgodny z frontendem SPA"
```

---

### Task 5: Publiczne REST — chart/current, chart/waiting-room, votes/status

**Files:**
- Create: `wp-plugin/radio-mors/includes/auth/class-request-identity.php`
- Create: `wp-plugin/radio-mors/includes/rest/class-rest-chart.php`
- Create: `wp-plugin/radio-mors/includes/rest/class-rest-votes.php`
- Modify: `wp-plugin/radio-mors/includes/class-plugin.php` (rejestracja `rest_api_init`)
- Test: `wp-plugin/radio-mors/tests/test-rest-public.php`

**Interfaces:**
- Produces:
  - `Mors\Auth\Request_Identity::voter_hash(\WP_REST_Request $req): string` — `sha256('ip:'.IP)`.
  - `Mors\Auth\Request_Identity::client_ip(): string` — `REMOTE_ADDR`, z opcją zaufanego nagłówka.
  - `Mors\Rest\Chart` — rejestruje `GET /chart/current`, `GET /chart/waiting-room`.
  - `Mors\Rest\Votes` — rejestruje `GET /votes/status` (Task 7 dokłada `POST /votes/cast`).
- Consumes: `Editions_Repo`, `Entries_Repo`, `Serializer`, `Votes_Repo`.

- [ ] **Step 1: Napisz test publicznego REST**

`tests/test-rest-public.php`:
```php
<?php
class Test_Rest_Public extends WP_UnitTestCase {
    public function setUp(): void {
        parent::setUp();
        \Mors\Activator::activate();
        do_action( 'rest_api_init' );
    }
    public function test_chart_current_returns_success() {
        $req = new WP_REST_Request( 'GET', '/mors/v1/chart/current' );
        $res = rest_do_request( $req );
        $this->assertSame( 200, $res->get_status() );
        $data = $res->get_data();
        $this->assertTrue( $data['success'] );
        $this->assertArrayHasKey( 'chart', $data );
    }
    public function test_votes_status_returns_eligibility() {
        $req = new WP_REST_Request( 'GET', '/mors/v1/votes/status' );
        $res = rest_do_request( $req );
        $this->assertSame( 200, $res->get_status() );
        $this->assertArrayHasKey( 'canVote', $res->get_data() );
    }
}
```

- [ ] **Step 2: Uruchom — ma się nie powieść**

Run: `vendor/bin/phpunit --filter Test_Rest_Public`
Expected: FAIL — trasy niezarejestrowane (404 `rest_no_route`).

- [ ] **Step 3: Napisz Request_Identity**

`includes/auth/class-request-identity.php`:
```php
<?php
namespace Mors\Auth;
class Request_Identity {
    /** Realny IP klienta. Domyślnie REMOTE_ADDR; za zaufanym proxy można włączyć nagłówek. */
    public static function client_ip() {
        $trust_header = apply_filters( 'mors_trusted_ip_header', '' ); // np. 'HTTP_CF_CONNECTING_IP'
        if ( $trust_header && ! empty( $_SERVER[ $trust_header ] ) ) {
            return sanitize_text_field( wp_unslash( $_SERVER[ $trust_header ] ) );
        }
        return isset( $_SERVER['REMOTE_ADDR'] )
            ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
    }
    public static function voter_hash( $req = null ) {
        return hash( 'sha256', 'ip:' . self::client_ip() );
    }
}
```

- [ ] **Step 4: Napisz Rest\Chart i Rest\Votes (status)**

`includes/rest/class-rest-chart.php`:
```php
<?php
namespace Mors\Rest;
use Mors\Db\Editions_Repo;
use Mors\Db\Entries_Repo;
use Mors\Domain\Serializer;
class Chart {
    public function register() {
        register_rest_route( 'mors/v1', '/chart/current', [
            'methods' => 'GET', 'permission_callback' => '__return_true',
            'callback' => [ $this, 'current' ],
        ] );
        register_rest_route( 'mors/v1', '/chart/waiting-room', [
            'methods' => 'GET', 'permission_callback' => '__return_true',
            'callback' => [ $this, 'waiting' ],
        ] );
    }
    public function current() {
        $ed = ( new Editions_Repo() )->current();
        if ( ! $ed ) {
            return new \WP_REST_Response( [ 'success' => false, 'message' => 'Brak aktywnego notowania.' ], 200 );
        }
        $entries = new Entries_Repo();
        $payload = Serializer::edition(
            $ed,
            $entries->for_edition( $ed['id'], false ),
            $entries->for_edition( $ed['id'], true )
        );
        return new \WP_REST_Response( array_merge( [ 'success' => true ], $payload ), 200 );
    }
    public function waiting() {
        $ed = ( new Editions_Repo() )->current();
        if ( ! $ed ) { return new \WP_REST_Response( [ 'success' => false ], 200 ); }
        $rows = ( new Entries_Repo() )->for_edition( $ed['id'], true );
        return new \WP_REST_Response(
            [ 'success' => true, 'waitingRoom' => array_map( [ Serializer::class, 'entry' ], $rows ) ], 200 );
    }
}
```
`includes/rest/class-rest-votes.php`:
```php
<?php
namespace Mors\Rest;
use Mors\Auth\Request_Identity;
use Mors\Db\Votes_Repo;
class Votes {
    public function register() {
        register_rest_route( 'mors/v1', '/votes/status', [
            'methods' => 'GET', 'permission_callback' => '__return_true',
            'callback' => [ $this, 'status' ],
        ] );
        // POST /votes/cast dokładany w Tasku 7.
    }
    public function status() {
        $hash = Request_Identity::voter_hash();
        $voter = ( new Votes_Repo() )->find_voter( $hash );
        $canVote = true; $next = null;
        if ( $voter && strtotime( $voter['next_eligible_vote_at'] . ' UTC' ) > time() ) {
            $canVote = false; $next = $voter['next_eligible_vote_at'];
        }
        return new \WP_REST_Response( [ 'canVote' => $canVote, 'nextEligibleVoteAt' => $next ], 200 );
    }
}
```

- [ ] **Step 5: Zarejestruj trasy w Plugin::boot**

W `includes/class-plugin.php`, w `boot()`:
```php
add_action( 'rest_api_init', function () {
    ( new \Mors\Rest\Chart() )->register();
    ( new \Mors\Rest\Votes() )->register();
} );
```

- [ ] **Step 6: Uruchom testy — mają przejść**

Run: `vendor/bin/phpunit --filter Test_Rest_Public`
Expected: PASS (2 testy).

- [ ] **Step 7: Commit**

```bash
git add wp-plugin/radio-mors
git commit -m "feat(mors): publiczne REST chart/* + votes/status + tożsamość głosującego"
```

---

### Task 6: Shortcode + enqueue + adaptacja frontendu SPA

**Files:**
- Create: `wp-plugin/radio-mors/includes/frontend/class-shortcode.php`
- Create: `wp-plugin/radio-mors/assets/js/app.js` (skopiowany i zmodyfikowany z `app/public/app.js`)
- Create: `wp-plugin/radio-mors/assets/css/styles.css` (skopiowany z `app/public/styles.css`)
- Modify: `wp-plugin/radio-mors/includes/class-plugin.php` (rejestracja shortcode)
- Test: `wp-plugin/radio-mors/tests/test-shortcode.php`

**Interfaces:**
- Produces: shortcode `[lista_przebojow_mors]` → kontener `<div id="mors-app">` + enqueue skryptu/stylu; `wp_localize_script('mors-app','morsData',[ 'restUrl','nonce' ])`.
- Consumes: nic z backendu (SPA sama woła REST).

- [ ] **Step 1: Napisz test shortcode**

`tests/test-shortcode.php`:
```php
<?php
class Test_Shortcode extends WP_UnitTestCase {
    public function setUp(): void { parent::setUp(); \Mors\Frontend\Shortcode::register(); }
    public function test_shortcode_registered_and_outputs_container() {
        $this->assertTrue( shortcode_exists( 'lista_przebojow_mors' ) );
        $html = do_shortcode( '[lista_przebojow_mors]' );
        $this->assertStringContainsString( 'id="mors-app"', $html );
    }
}
```

- [ ] **Step 2: Uruchom — ma się nie powieść**

Run: `vendor/bin/phpunit --filter Test_Shortcode`
Expected: FAIL — klasa `Shortcode` nie istnieje.

- [ ] **Step 3: Napisz Shortcode**

`includes/frontend/class-shortcode.php`:
```php
<?php
namespace Mors\Frontend;
class Shortcode {
    public static function register() {
        add_shortcode( 'lista_przebojow_mors', [ self::class, 'render' ] );
        add_action( 'wp_enqueue_scripts', [ self::class, 'assets' ] );
    }
    public static function assets() {
        wp_register_style( 'mors-app', MORS_PLUGIN_URL . 'assets/css/styles.css', [], MORS_VERSION );
        wp_register_script( 'mors-app', MORS_PLUGIN_URL . 'assets/js/app.js', [], MORS_VERSION, true );
        wp_localize_script( 'mors-app', 'morsData', [
            'restUrl' => esc_url_raw( rest_url( 'mors/v1' ) ),
            'nonce'   => wp_create_nonce( 'wp_rest' ),
            'isEditor' => current_user_can( \Mors_Enum::CAP_EDIT_MUSIC ),
        ] );
    }
    public static function render() {
        wp_enqueue_style( 'mors-app' );
        wp_enqueue_script( 'mors-app' );
        return '<div id="mors-app"></div>';
    }
}
```

- [ ] **Step 4: Skopiuj i zaadaptuj SPA**

```bash
cp app/public/app.js wp-plugin/radio-mors/assets/js/app.js
cp app/public/styles.css wp-plugin/radio-mors/assets/css/styles.css
```
W `assets/js/app.js`:
- Zmień `const API_BASE = '/api/v1';` na `const API_BASE = (window.morsData && window.morsData.restUrl) || '/wp-json/mors/v1';`.
- W każdym `fetch(...)` dla żądań piszących/panelu dodaj nagłówek `'X-WP-Nonce': window.morsData.nonce`.
- Zostaw `credentials: 'include'`.
- Usuń ewentualny `<script src="cdn.tailwind">` — style idą z `styles.css`.
- Silnik Web Audio i generator kart social — bez zmian.

- [ ] **Step 5: Zarejestruj shortcode w Plugin::boot**

W `boot()`:
```php
\Mors\Frontend\Shortcode::register();
```

- [ ] **Step 6: Uruchom test + ręczny smoke**

Run: `vendor/bin/phpunit --filter Test_Shortcode`
Expected: PASS. Następnie: `wp-env start`, utwórz stronę z `[lista_przebojow_mors]`, otwórz — lista i poczekalnia z seedowanej edycji renderują się (na tym etapie pusta lista/poczekalnia bez wpisów jest OK).

- [ ] **Step 7: Commit**

```bash
git add wp-plugin/radio-mors
git commit -m "feat(mors): shortcode + enqueue + adaptacja SPA (API_BASE, nonce)"
```

---

### Task 7: Vote_Service + POST /votes/cast

**Files:**
- Create: `wp-plugin/radio-mors/includes/domain/class-vote-service.php`
- Modify: `wp-plugin/radio-mors/includes/rest/class-rest-votes.php` (dodaj `POST /votes/cast`)
- Test: `wp-plugin/radio-mors/tests/test-vote-service.php`

**Interfaces:**
- Consumes: `Editions_Repo`, `Entries_Repo`, `Votes_Repo`, `Request_Identity`.
- Produces:
  - `Mors\Domain\Vote_Service::cast(array $trackIds, string $hash, string $ip, string $ua): array` — zwraca `[ 'success'=>true, 'nextEligibleVoteAt'=>..., 'updatedEntries'=>[...] ]` albo rzuca `Mors\Domain\Vote_Exception` z `code` (`INVALID`,`CLOSED`,`NOT_IN_EDITION`,`COOLDOWN`) i `http`/`nextEligibleVoteAt`.

- [ ] **Step 1: Napisz testy głosowania**

`tests/test-vote-service.php`:
```php
<?php
class Test_Vote_Service extends WP_UnitTestCase {
    private $editionId; private $entryIds;
    public function setUp(): void {
        parent::setUp();
        \Mors\Activator::activate();
        // Przygotuj edycję z 3 wpisami.
        $ed = ( new \Mors\Db\Editions_Repo() )->current();
        $this->editionId = $ed['id'];
        $tracks = new \Mors\Db\Tracks_Repo();
        $entries = new \Mors\Db\Entries_Repo();
        $this->entryIds = [];
        foreach ( [ 'A', 'B', 'C' ] as $name ) {
            $tr = $tracks->create( [ 'title' => $name, 'artist' => 'X', 'status' => 'CHART' ] );
            $e = $entries->create( [ 'edition_id' => $this->editionId, 'track_id' => $tr['id'], 'position' => 1 ] );
            $this->entryIds[] = $e['id'];
        }
    }
    public function test_cast_increments_votes_and_sets_cooldown() {
        $svc = new \Mors\Domain\Vote_Service();
        $out = $svc->cast( [ $this->entryIds[0], $this->entryIds[1] ], 'hashA', '1.2.3.4', 'UA' );
        $this->assertTrue( $out['success'] );
        $this->assertNotEmpty( $out['nextEligibleVoteAt'] );
        $voter = ( new \Mors\Db\Votes_Repo() )->find_voter( 'hashA' );
        $this->assertNotNull( $voter );
    }
    public function test_rejects_more_than_three() {
        $this->expectException( \Mors\Domain\Vote_Exception::class );
        ( new \Mors\Domain\Vote_Service() )->cast(
            array_merge( $this->entryIds, [ 'x' ] ), 'h', '1.1.1.1', 'UA' );
    }
    public function test_rejects_duplicates() {
        $this->expectException( \Mors\Domain\Vote_Exception::class );
        ( new \Mors\Domain\Vote_Service() )->cast(
            [ $this->entryIds[0], $this->entryIds[0] ], 'h', '1.1.1.1', 'UA' );
    }
    public function test_cooldown_blocks_second_vote() {
        $svc = new \Mors\Domain\Vote_Service();
        $svc->cast( [ $this->entryIds[0] ], 'hashB', '2.2.2.2', 'UA' );
        try {
            $svc->cast( [ $this->entryIds[1] ], 'hashB', '2.2.2.2', 'UA' );
            $this->fail( 'Powinien rzucić COOLDOWN' );
        } catch ( \Mors\Domain\Vote_Exception $e ) {
            $this->assertSame( 'COOLDOWN', $e->code );
        }
    }
}
```

- [ ] **Step 2: Uruchom — ma się nie powieść**

Run: `vendor/bin/phpunit --filter Test_Vote_Service`
Expected: FAIL — `Vote_Service`/`Vote_Exception` nie istnieją.

- [ ] **Step 3: Napisz Vote_Exception i Vote_Service**

`includes/domain/class-vote-service.php`:
```php
<?php
namespace Mors\Domain;
use Mors\Db\Editions_Repo;
use Mors\Db\Entries_Repo;
use Mors\Db\Votes_Repo;

class Vote_Exception extends \Exception {
    public $code; public $http; public $nextEligibleVoteAt;
    public function __construct( $code, $message, $http = 400, $next = null ) {
        parent::__construct( $message );
        $this->code = $code; $this->http = $http; $this->nextEligibleVoteAt = $next;
    }
}

class Vote_Service {
    public function cast( array $trackIds, $hash, $ip, $ua ) {
        // Walidacja wejścia (1–3, bez duplikatów).
        $trackIds = array_values( $trackIds );
        if ( count( $trackIds ) < 1 || count( $trackIds ) > 3 ) {
            throw new Vote_Exception( 'INVALID', 'Wybierz od 1 do 3 utworów, aby oddać głos.' );
        }
        if ( count( array_unique( $trackIds ) ) !== count( $trackIds ) ) {
            throw new Vote_Exception( 'INVALID', 'Wykryto zduplikowane utwory w głosowaniu.' );
        }
        $edRepo = new Editions_Repo();
        $edition = $edRepo->current();
        if ( ! $edition || $edition['status'] !== 'ACTIVE' ) {
            throw new Vote_Exception( 'CLOSED', 'Głosowanie w tym notowaniu jest obecnie zamknięte.', 409 );
        }
        $entriesRepo = new Entries_Repo();
        $entries = $entriesRepo->by_ids( $trackIds, $edition['id'] );
        if ( count( $entries ) !== count( $trackIds ) ) {
            throw new Vote_Exception( 'NOT_IN_EDITION',
                'Jeden lub więcej wybranych utworów nie należy do bieżącego notowania.' );
        }
        $votesRepo = new Votes_Repo();
        $now  = gmdate( 'Y-m-d H:i:s' );
        $next = gmdate( 'Y-m-d H:i:s', time() + DAY_IN_SECONDS );

        // Cooldown + zapis w jednej transakcji (FOR UPDATE eliminuje wyścig).
        $updated = $votesRepo->tx( function () use ( $votesRepo, $entriesRepo, $entries, $edition, $hash, $ip, $ua, $now, $next ) {
            $existing = $votesRepo->find_voter_for_update( $hash );
            if ( $existing && strtotime( $existing['next_eligible_vote_at'] . ' UTC' ) > time() ) {
                throw new Vote_Exception( 'COOLDOWN',
                    'Twój limit głosów na 24h jest obecnie aktywny.', 429, $existing['next_eligible_vote_at'] );
            }
            $voter = $votesRepo->upsert_voter( $hash, $now, $next );
            foreach ( $entries as $e ) {
                $entriesRepo->increment_votes( $e['id'] );
                $votesRepo->insert_vote( [
                    'edition_id' => $edition['id'], 'track_id' => $e['track_id'],
                    'voter_id' => $voter['id'], 'ip_address' => $ip,
                    'user_agent' => $ua, 'fingerprint_hash' => $hash,
                ] );
            }
            $ids = array_map( function ( $e ) { return $e['id']; }, $entries );
            return $entriesRepo->by_ids( $ids, $edition['id'] );
        } );

        return [
            'success' => true,
            'message' => 'Głosy zostały pomyślnie zarejestrowane. Dziękujemy!',
            'nextEligibleVoteAt' => $next,
            'updatedEntries' => array_map( function ( $e ) {
                return [ 'id' => $e['id'], 'votes' => (int) $e['votes_count'] ];
            }, $updated ),
        ];
    }
}
```

- [ ] **Step 4: Uruchom testy serwisu — mają przejść**

Run: `vendor/bin/phpunit --filter Test_Vote_Service`
Expected: PASS (4 testy).

- [ ] **Step 5: Dodaj endpoint POST /votes/cast (z rate-limitem)**

W `includes/rest/class-rest-votes.php`, w `register()` dodaj:
```php
register_rest_route( 'mors/v1', '/votes/cast', [
    'methods' => 'POST',
    'permission_callback' => [ $this, 'can_cast' ],
    'callback' => [ $this, 'cast' ],
] );
```
oraz metody:
```php
public function can_cast( $req ) {
    // Nonce dla żądania piszącego + rate-limit transportu (30/h per hash).
    $nonce = $req->get_header( 'x_wp_nonce' );
    if ( ! $nonce || ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
        return new \WP_Error( 'mors_bad_nonce', 'Nieprawidłowy token żądania.', [ 'status' => 403 ] );
    }
    $hash = \Mors\Auth\Request_Identity::voter_hash();
    $key = 'mors_rl_' . $hash;
    $count = (int) get_transient( $key );
    if ( $count >= 30 ) {
        return new \WP_Error( 'mors_rate', 'Zbyt wiele żądań głosowania. Spróbuj później.', [ 'status' => 429 ] );
    }
    set_transient( $key, $count + 1, HOUR_IN_SECONDS );
    return apply_filters( 'mors_votes_can_cast', true, $req ); // hook Turnstile
}
public function cast( $req ) {
    $body = $req->get_json_params();
    $trackIds = isset( $body['trackIds'] ) && is_array( $body['trackIds'] ) ? $body['trackIds'] : [];
    $trackIds = array_map( 'sanitize_text_field', $trackIds );
    $hash = \Mors\Auth\Request_Identity::voter_hash();
    $ip   = \Mors\Auth\Request_Identity::client_ip();
    $ua   = sanitize_text_field( $req->get_header( 'user_agent' ) ?: '' );
    try {
        $out = ( new \Mors\Domain\Vote_Service() )->cast( $trackIds, $hash, $ip, $ua );
        return new \WP_REST_Response( $out, 200 );
    } catch ( \Mors\Domain\Vote_Exception $e ) {
        $payload = [ 'success' => false, 'message' => $e->getMessage() ];
        if ( $e->nextEligibleVoteAt ) { $payload['nextEligibleVoteAt'] = $e->nextEligibleVoteAt; }
        return new \WP_REST_Response( $payload, $e->http );
    }
}
```

- [ ] **Step 6: Napisz test REST cast (happy path + cooldown 429)**

Dopisz do `tests/test-rest-public.php`:
```php
public function test_cast_then_cooldown_returns_429() {
    // Przygotuj wpis w bieżącej edycji.
    $ed = ( new \Mors\Db\Editions_Repo() )->current();
    $tr = ( new \Mors\Db\Tracks_Repo() )->create( [ 'title' => 'T', 'artist' => 'A', 'status' => 'CHART' ] );
    $e  = ( new \Mors\Db\Entries_Repo() )->create( [ 'edition_id' => $ed['id'], 'track_id' => $tr['id'], 'position' => 1 ] );
    $nonce = wp_create_nonce( 'wp_rest' );
    $mk = function () use ( $e, $nonce ) {
        $r = new WP_REST_Request( 'POST', '/mors/v1/votes/cast' );
        $r->set_header( 'X-WP-Nonce', $nonce );
        $r->set_body_params( [ 'trackIds' => [ $e['id'] ] ] );
        return rest_do_request( $r );
    };
    $this->assertSame( 200, $mk()->get_status() );
    $this->assertSame( 429, $mk()->get_status() );
}
```
Run: `vendor/bin/phpunit --filter Test_Rest_Public`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add wp-plugin/radio-mors
git commit -m "feat(mors): głosowanie (Vote_Service + POST /votes/cast, cooldown, rate-limit)"
```

---

### Task 8: Admin REST — CRUD utworów + upload (capabilities)

**Files:**
- Create: `wp-plugin/radio-mors/includes/rest/class-rest-admin.php`
- Modify: `wp-plugin/radio-mors/includes/class-plugin.php` (rejestracja Rest\Admin)
- Test: `wp-plugin/radio-mors/tests/test-rest-admin.php`

**Interfaces:**
- Produces: `Mors\Rest\Admin::register()` — `GET/POST(upload)/PUT/DELETE /admin/tracks*`. Wspólny `permission_callback` `require_cap('mors_edit_music')` (sprawdza `current_user_can` + nonce).
- Consumes: `Tracks_Repo`, `Votes_Repo::log`.

- [ ] **Step 1: Napisz test uprawnień + CRUD**

`tests/test-rest-admin.php`:
```php
<?php
class Test_Rest_Admin extends WP_UnitTestCase {
    public function setUp(): void {
        parent::setUp(); \Mors\Activator::activate(); do_action( 'rest_api_init' );
    }
    private function req( $method, $route, $body = null ) {
        $r = new WP_REST_Request( $method, $route );
        $r->set_header( 'X-WP-Nonce', wp_create_nonce( 'wp_rest' ) );
        if ( $body !== null ) { $r->set_body_params( $body ); }
        return rest_do_request( $r );
    }
    public function test_anonymous_cannot_list_tracks() {
        wp_set_current_user( 0 );
        $this->assertSame( 403, $this->req( 'GET', '/mors/v1/admin/tracks' )->get_status() );
    }
    public function test_editor_can_create_and_delete_track() {
        $uid = self::factory()->user->create( [ 'role' => 'administrator' ] );
        wp_set_current_user( $uid );
        $create = $this->req( 'POST', '/mors/v1/admin/tracks', [ 'title' => 'Nowy', 'artist' => 'Zespół' ] );
        $this->assertSame( 200, $create->get_status() );
        $id = $create->get_data()['track']['id'];
        $del = $this->req( 'DELETE', '/mors/v1/admin/tracks/' . $id );
        $this->assertSame( 200, $del->get_status() );
    }
}
```

- [ ] **Step 2: Uruchom — ma się nie powieść**

Run: `vendor/bin/phpunit --filter Test_Rest_Admin`
Expected: FAIL — trasy admin niezarejestrowane.

- [ ] **Step 3: Napisz Rest\Admin (CRUD; upload jako osobna metoda)**

`includes/rest/class-rest-admin.php`:
```php
<?php
namespace Mors\Rest;
use Mors\Db\Tracks_Repo;
use Mors\Db\Votes_Repo;
class Admin {
    public function register() {
        $cap = [ $this, 'require_cap' ];
        register_rest_route( 'mors/v1', '/admin/tracks', [
            [ 'methods' => 'GET',  'permission_callback' => $cap, 'callback' => [ $this, 'list_tracks' ] ],
            [ 'methods' => 'POST', 'permission_callback' => $cap, 'callback' => [ $this, 'create_track' ] ],
        ] );
        register_rest_route( 'mors/v1', '/admin/tracks/(?P<id>[a-f0-9-]+)', [
            [ 'methods' => 'PUT',    'permission_callback' => $cap, 'callback' => [ $this, 'update_track' ] ],
            [ 'methods' => 'DELETE', 'permission_callback' => $cap, 'callback' => [ $this, 'delete_track' ] ],
        ] );
        register_rest_route( 'mors/v1', '/admin/tracks/upload', [
            'methods' => 'POST', 'permission_callback' => $cap, 'callback' => [ $this, 'upload_track' ] ] );
    }
    public function require_cap( $req ) {
        $nonce = $req->get_header( 'x_wp_nonce' );
        if ( ! $nonce || ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
            return new \WP_Error( 'mors_bad_nonce', 'Nieprawidłowy token.', [ 'status' => 403 ] );
        }
        if ( ! current_user_can( \Mors_Enum::CAP_EDIT_MUSIC ) ) {
            return new \WP_Error( 'mors_forbidden', 'Brak uprawnień.', [ 'status' => 403 ] );
        }
        return true;
    }
    public function list_tracks( $req ) {
        $args = [];
        if ( $req->get_param( 'status' ) ) { $args['status'] = sanitize_text_field( $req->get_param( 'status' ) ); }
        return new \WP_REST_Response( [ 'success' => true, 'tracks' => ( new Tracks_Repo() )->all( $args ) ], 200 );
    }
    public function create_track( $req ) {
        $data = $this->sanitize_track( $req->get_params() );
        $track = ( new Tracks_Repo() )->create( $data );
        ( new Votes_Repo() )->log( get_current_user_id(), 'TRACK_CREATE', [ 'trackId' => $track['id'] ] );
        return new \WP_REST_Response( [ 'success' => true, 'track' => $track ], 200 );
    }
    public function update_track( $req ) {
        $id = $req['id'];
        $repo = new Tracks_Repo();
        if ( ! $repo->find( $id ) ) { return new \WP_REST_Response( [ 'success' => false, 'message' => 'Utwór nie istnieje.' ], 404 ); }
        $repo->update( $id, $this->sanitize_track( $req->get_params() ) );
        ( new Votes_Repo() )->log( get_current_user_id(), 'TRACK_UPDATE', [ 'trackId' => $id ] );
        return new \WP_REST_Response( [ 'success' => true, 'track' => $repo->find( $id ) ], 200 );
    }
    public function delete_track( $req ) {
        $id = $req['id'];
        $repo = new Tracks_Repo();
        if ( ! $repo->find( $id ) ) { return new \WP_REST_Response( [ 'success' => false, 'message' => 'Utwór nie istnieje.' ], 404 ); }
        $repo->delete( $id );
        ( new Votes_Repo() )->log( get_current_user_id(), 'TRACK_DELETE', [ 'trackId' => $id ] );
        return new \WP_REST_Response( [ 'success' => true ], 200 );
    }
    public function upload_track( $req ) {
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';
        $data = $this->sanitize_track( $req->get_params() );
        if ( ! empty( $_FILES['cover'] ) ) {
            $cover_id = media_handle_upload( 'cover', 0 );
            if ( ! is_wp_error( $cover_id ) ) { $data['cover_image_url'] = wp_get_attachment_url( $cover_id ); }
        }
        if ( ! empty( $_FILES['audio'] ) ) {
            $audio_id = media_handle_upload( 'audio', 0 );
            if ( ! is_wp_error( $audio_id ) ) { $data['audio_key'] = 'upload:' . $audio_id; }
        }
        $track = ( new Tracks_Repo() )->create( $data );
        ( new Votes_Repo() )->log( get_current_user_id(), 'TRACK_UPLOAD', [ 'trackId' => $track['id'] ] );
        return new \WP_REST_Response( [ 'success' => true, 'track' => $track ], 200 );
    }
    private function sanitize_track( array $in ) {
        $out = [];
        foreach ( [ 'title', 'artist', 'album', 'genre', 'audio_key' ] as $f ) {
            if ( isset( $in[ $f ] ) ) { $out[ $f ] = sanitize_text_field( $in[ $f ] ); }
        }
        foreach ( [ 'duration_seconds', 'bpm', 'peak_position' ] as $f ) {
            if ( isset( $in[ $f ] ) ) { $out[ $f ] = (int) $in[ $f ]; }
        }
        if ( isset( $in['status'] ) && in_array( $in['status'], \Mors_Enum::TRACK_STATUSES, true ) ) {
            $out['status'] = $in['status'];
        }
        return $out;
    }
}
```

- [ ] **Step 4: Zarejestruj Rest\Admin w Plugin::boot**

W `rest_api_init` (obok Chart/Votes):
```php
( new \Mors\Rest\Admin() )->register();
```

- [ ] **Step 5: Uruchom testy — mają przejść**

Run: `vendor/bin/phpunit --filter Test_Rest_Admin`
Expected: PASS (2 testy: anonim 403, edytor CRUD 200).

- [ ] **Step 6: Commit**

```bash
git add wp-plugin/radio-mors
git commit -m "feat(mors): admin REST CRUD utworów + upload (capabilities + nonce)"
```

---

### Task 9: Chart_Engine — freeze + reset-and-publish + audit; REST admin

**Files:**
- Create: `wp-plugin/radio-mors/includes/domain/class-chart-engine.php`
- Modify: `wp-plugin/radio-mors/includes/rest/class-rest-admin.php` (dodaj `POST /admin/chart/freeze`, `/admin/chart/reset-and-publish`)
- Modify: `wp-plugin/radio-mors/includes/db/class-editions-repo.php` (dodaj `create_next`) — jeśli potrzebne
- Test: `wp-plugin/radio-mors/tests/test-chart-engine.php`

**Interfaces:**
- Consumes: `Editions_Repo`, `Entries_Repo`, `Tracks_Repo`, `Votes_Repo`.
- Produces:
  - `Mors\Domain\Chart_Engine::freeze(int $adminId): array` — ustawia bieżącą edycję na FROZEN.
  - `Chart_Engine::reset_and_publish(int $adminId): array` — pełen algorytm (patrz spec §4), zwraca `[ 'success'=>true, 'edition'=>[...] ]`.

- [ ] **Step 1: Napisz testy silnika notowania**

`tests/test-chart-engine.php`:
```php
<?php
class Test_Chart_Engine extends WP_UnitTestCase {
    private $ed;
    public function setUp(): void {
        parent::setUp(); \Mors\Activator::activate();
        $this->ed = ( new \Mors\Db\Editions_Repo() )->current();
    }
    private function add_chart_entry( $pos, $votes, $waiting = false, $weeks = 1 ) {
        $tr = ( new \Mors\Db\Tracks_Repo() )->create( [ 'title' => 'T'.$pos.($waiting?'w':''), 'artist' => 'A', 'status' => $waiting ? 'WAITING_ROOM' : 'CHART' ] );
        return ( new \Mors\Db\Entries_Repo() )->create( [
            'edition_id' => $this->ed['id'], 'track_id' => $tr['id'],
            'position' => $waiting ? null : $pos, 'votes_count' => $votes,
            'is_waiting' => $waiting ? 1 : 0, 'weeks_on_chart' => $weeks ] );
    }
    public function test_freeze_sets_status() {
        $out = ( new \Mors\Domain\Chart_Engine() )->freeze( 1 );
        $this->assertTrue( $out['success'] );
        $this->assertSame( 'FROZEN', ( new \Mors\Db\Editions_Repo() )->current()['status'] );
    }
    public function test_reset_creates_new_edition_and_carries_top_and_promotes() {
        // 20 wpisów listy + 5 poczekalni.
        for ( $i = 1; $i <= 20; $i++ ) { $this->add_chart_entry( $i, 100 - $i ); }
        for ( $i = 1; $i <= 5; $i++ ) { $this->add_chart_entry( $i, 50 - $i, true ); }
        $engine = new \Mors\Domain\Chart_Engine();
        $out = $engine->reset_and_publish( 1 );
        $this->assertTrue( $out['success'] );
        $newEd = ( new \Mors\Db\Editions_Repo() )->current();
        $this->assertSame( (int) $this->ed['edition_number'] + 1, (int) $newEd['edition_number'] );
        $chart = ( new \Mors\Db\Entries_Repo() )->for_edition( $newEd['id'], false );
        // Top 18 przeniesione + 2 promocje = 20 na liście.
        $this->assertSame( 20, count( $chart ) );
        $waiting = ( new \Mors\Db\Entries_Repo() )->for_edition( $newEd['id'], true );
        // Poczekalnia dopełniona do 25 (3 pozostałe + 22 placeholdery).
        $this->assertSame( 25, count( $waiting ) );
        // Wszystkie nowe głosy wyzerowane.
        foreach ( $chart as $c ) { $this->assertSame( 0, (int) $c['votes_count'] ); }
    }
}
```

- [ ] **Step 2: Uruchom — ma się nie powieść**

Run: `vendor/bin/phpunit --filter Test_Chart_Engine`
Expected: FAIL — `Chart_Engine` nie istnieje.

- [ ] **Step 3: Napisz Chart_Engine**

`includes/domain/class-chart-engine.php`:
```php
<?php
namespace Mors\Domain;
use Mors\Db\Editions_Repo;
use Mors\Db\Entries_Repo;
use Mors\Db\Tracks_Repo;
use Mors\Db\Votes_Repo;

class Chart_Engine {
    public function freeze( $adminId ) {
        $edRepo = new Editions_Repo();
        $ed = $edRepo->current();
        if ( ! $ed ) { throw new \RuntimeException( 'Brak aktywnego notowania.' ); }
        $edRepo->update( $ed['id'], [ 'status' => 'FROZEN' ] );
        ( new Votes_Repo() )->log( $adminId, 'CHART_FREEZE', [ 'editionId' => $ed['id'] ] );
        return [ 'success' => true, 'edition' => [ 'id' => $ed['id'], 'status' => 'FROZEN' ] ];
    }

    public function reset_and_publish( $adminId ) {
        $edRepo = new Editions_Repo();
        $entriesRepo = new Entries_Repo();
        $tracksRepo = new Tracks_Repo();
        $votesRepo = new Votes_Repo();

        $ed = $edRepo->current();
        if ( ! $ed ) { throw new \RuntimeException( 'Brak aktywnego notowania.' ); }

        // for_edition już sortuje malejąco po votes_count.
        $chart   = $entriesRepo->for_edition( $ed['id'], false );
        $waiting = $entriesRepo->for_edition( $ed['id'], true );
        $promoted = array_slice( $waiting, 0, 2 );
        $remainingWaiting = array_slice( $waiting, 2 );

        $now  = gmdate( 'Y-m-d H:i:s' );
        $ends = gmdate( 'Y-m-d H:i:s', time() + 7 * DAY_IN_SECONDS );
        $newNumber = (int) $ed['edition_number'] + 1;

        return $votesRepo->tx( function () use (
            $edRepo, $entriesRepo, $tracksRepo, $votesRepo,
            $ed, $chart, $promoted, $remainingWaiting, $now, $ends, $newNumber, $adminId
        ) {
            $newEd = $edRepo->create( [
                'edition_number' => $newNumber,
                'title' => "Notowanie {$newNumber} • Wydanie Główne",
                'voting_starts_at' => $now, 'voting_ends_at' => $ends,
                'status' => 'ACTIVE', 'is_current' => 1, 'created_at' => $now,
            ] );
            $edRepo->update( $ed['id'], [ 'is_current' => 0, 'status' => 'ARCHIVED' ] );

            // Top 18 → pozycje 1–18, trend z porównania pozycji.
            $top18 = array_slice( $chart, 0, 18 );
            foreach ( $top18 as $i => $entry ) {
                $newPos = $i + 1;
                $oldPos = isset( $entry['position'] ) ? (int) $entry['position'] : null;
                $trend = 'SAME';
                if ( $oldPos !== null && $oldPos > $newPos ) { $trend = 'UP'; }
                elseif ( $oldPos !== null && $oldPos < $newPos ) { $trend = 'DOWN'; }
                $entriesRepo->create( [
                    'edition_id' => $newEd['id'], 'track_id' => $entry['track_id'],
                    'position' => $newPos, 'previous_position' => $oldPos, 'trend' => $trend,
                    'votes_count' => 0, 'weeks_on_chart' => (int) $entry['weeks_on_chart'] + 1,
                    'is_waiting' => 0,
                ] );
                $peak = $entry['peak_position'] !== null
                    ? min( (int) $entry['peak_position'], $newPos ) : $newPos;
                $tracksRepo->update( $entry['track_id'], [
                    'peak_position' => $peak,
                    'total_weeks_on_chart' => (int) $entry['weeks_on_chart'] + 1,
                    'status' => 'CHART',
                ] );
            }

            // Promocja 2 z poczekalni → pozycje 19–20.
            foreach ( $promoted as $i => $entry ) {
                $newPos = 19 + $i;
                $entriesRepo->create( [
                    'edition_id' => $newEd['id'], 'track_id' => $entry['track_id'],
                    'position' => $newPos, 'previous_position' => null, 'trend' => 'NEW',
                    'votes_count' => 0, 'weeks_on_chart' => 1, 'is_waiting' => 0,
                ] );
                $tracksRepo->update( $entry['track_id'], [
                    'peak_position' => $newPos, 'total_weeks_on_chart' => 1, 'status' => 'CHART',
                ] );
            }

            // Reszta poczekalni przechodzi dalej.
            foreach ( $remainingWaiting as $entry ) {
                $entriesRepo->create( [
                    'edition_id' => $newEd['id'], 'track_id' => $entry['track_id'],
                    'position' => null, 'trend' => 'NEW', 'votes_count' => 0,
                    'weeks_on_chart' => (int) $entry['weeks_on_chart'] + 1,
                    'is_waiting' => 1, 'tag' => isset( $entry['tag'] ) ? $entry['tag'] : null,
                ] );
            }

            // Dopełnienie poczekalni do 25.
            $totalWaiting = count( $remainingWaiting );
            $toPad = max( 0, 25 - $totalWaiting );
            for ( $i = 0; $i < $toPad; $i++ ) {
                $idNum = $totalWaiting + $i + 1;
                $newTrack = $tracksRepo->create( [
                    'title' => "Nowa Propozycja #{$idNum}", 'artist' => 'Młoda Fala UG',
                    'status' => 'WAITING_ROOM', 'duration_seconds' => 195,
                ] );
                $entriesRepo->create( [
                    'edition_id' => $newEd['id'], 'track_id' => $newTrack['id'],
                    'position' => null, 'trend' => 'NEW', 'votes_count' => 0,
                    'weeks_on_chart' => 1, 'is_waiting' => 1,
                ] );
            }

            $votesRepo->log( $adminId, 'CHART_RESET_PUBLISH',
                [ 'fromEdition' => $ed['id'], 'toEdition' => $newEd['id'] ] );

            return [ 'success' => true, 'edition' => [
                'id' => $newEd['id'], 'editionNumber' => $newNumber, 'status' => 'ACTIVE' ] ];
        } );
    }
}
```

- [ ] **Step 4: Uruchom testy silnika — mają przejść**

Run: `vendor/bin/phpunit --filter Test_Chart_Engine`
Expected: PASS (2 testy). Jeśli liczności (20/25) się nie zgadzają, porównaj z `app/src/routes/admin.js` i skoryguj granice `array_slice`.

- [ ] **Step 5: Dodaj endpointy admina chart/*, przetestuj przez REST**

W `includes/rest/class-rest-admin.php`, w `register()`:
```php
register_rest_route( 'mors/v1', '/admin/chart/freeze', [
    'methods' => 'POST', 'permission_callback' => [ $this, 'require_cap' ], 'callback' => [ $this, 'freeze' ] ] );
register_rest_route( 'mors/v1', '/admin/chart/reset-and-publish', [
    'methods' => 'POST', 'permission_callback' => [ $this, 'require_cap' ], 'callback' => [ $this, 'reset_publish' ] ] );
```
Metody:
```php
public function freeze() {
    try {
        return new \WP_REST_Response( ( new \Mors\Domain\Chart_Engine() )->freeze( get_current_user_id() ), 200 );
    } catch ( \RuntimeException $e ) {
        return new \WP_REST_Response( [ 'success' => false, 'message' => $e->getMessage() ], 409 );
    }
}
public function reset_publish() {
    try {
        return new \WP_REST_Response( ( new \Mors\Domain\Chart_Engine() )->reset_and_publish( get_current_user_id() ), 200 );
    } catch ( \RuntimeException $e ) {
        return new \WP_REST_Response( [ 'success' => false, 'message' => $e->getMessage() ], 409 );
    }
}
```
Dopisz test w `tests/test-rest-admin.php`:
```php
public function test_editor_can_freeze() {
    $uid = self::factory()->user->create( [ 'role' => 'administrator' ] );
    wp_set_current_user( $uid );
    $res = $this->req( 'POST', '/mors/v1/admin/chart/freeze' );
    $this->assertSame( 200, $res->get_status() );
    $this->assertTrue( $res->get_data()['success'] );
}
```
Run: `vendor/bin/phpunit --filter Test_Rest_Admin`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add wp-plugin/radio-mors
git commit -m "feat(mors): silnik notowania (freeze + reset-and-publish) + audit + REST"
```

---

### Task 10: Endpointy /admin/editors (użytkownicy WP z capability)

**Files:**
- Modify: `wp-plugin/radio-mors/includes/rest/class-rest-admin.php`
- Test: `wp-plugin/radio-mors/tests/test-rest-editors.php`

**Interfaces:**
- Produces: `GET /admin/editors` (lista userów z `mors_edit_music`), `POST /admin/editors` (nadaj cap userowi po `user_id` lub `email`), `DELETE /admin/editors/{id}` (odbierz). `permission_callback` = `require_manage` (`mors_manage_editors`).

- [ ] **Step 1: Napisz test**

`tests/test-rest-editors.php`:
```php
<?php
class Test_Rest_Editors extends WP_UnitTestCase {
    public function setUp(): void { parent::setUp(); \Mors\Activator::activate(); do_action( 'rest_api_init' ); }
    private function req( $m, $r, $b = null ) {
        $x = new WP_REST_Request( $m, $r );
        $x->set_header( 'X-WP-Nonce', wp_create_nonce( 'wp_rest' ) );
        if ( $b !== null ) { $x->set_body_params( $b ); }
        return rest_do_request( $x );
    }
    public function test_manager_can_grant_and_revoke_editor() {
        $admin = self::factory()->user->create( [ 'role' => 'administrator' ] );
        wp_set_current_user( $admin );
        $target = self::factory()->user->create( [ 'role' => 'subscriber' ] );
        $grant = $this->req( 'POST', '/mors/v1/admin/editors', [ 'user_id' => $target ] );
        $this->assertSame( 200, $grant->get_status() );
        $this->assertTrue( user_can( $target, \Mors_Enum::CAP_EDIT_MUSIC ) );
        $revoke = $this->req( 'DELETE', '/mors/v1/admin/editors/' . $target );
        $this->assertSame( 200, $revoke->get_status() );
        $this->assertFalse( user_can( $target, \Mors_Enum::CAP_EDIT_MUSIC ) );
    }
}
```

- [ ] **Step 2: Uruchom — ma się nie powieść**

Run: `vendor/bin/phpunit --filter Test_Rest_Editors`
Expected: FAIL — trasy editors nie istnieją.

- [ ] **Step 3: Dodaj trasy i metody editors**

W `register()`:
```php
register_rest_route( 'mors/v1', '/admin/editors', [
    [ 'methods' => 'GET',  'permission_callback' => [ $this, 'require_manage' ], 'callback' => [ $this, 'list_editors' ] ],
    [ 'methods' => 'POST', 'permission_callback' => [ $this, 'require_manage' ], 'callback' => [ $this, 'add_editor' ] ],
] );
register_rest_route( 'mors/v1', '/admin/editors/(?P<id>\d+)', [
    'methods' => 'DELETE', 'permission_callback' => [ $this, 'require_manage' ], 'callback' => [ $this, 'remove_editor' ] ] );
```
Metody:
```php
public function require_manage( $req ) {
    $nonce = $req->get_header( 'x_wp_nonce' );
    if ( ! $nonce || ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
        return new \WP_Error( 'mors_bad_nonce', 'Nieprawidłowy token.', [ 'status' => 403 ] );
    }
    if ( ! current_user_can( \Mors_Enum::CAP_MANAGE ) ) {
        return new \WP_Error( 'mors_forbidden', 'Brak uprawnień.', [ 'status' => 403 ] );
    }
    return true;
}
public function list_editors() {
    $users = get_users( [ 'capability' => [ \Mors_Enum::CAP_EDIT_MUSIC ] ] );
    $out = array_map( function ( $u ) {
        return [ 'id' => $u->ID, 'name' => $u->display_name, 'email' => $u->user_email ];
    }, $users );
    return new \WP_REST_Response( [ 'success' => true, 'editors' => $out ], 200 );
}
public function add_editor( $req ) {
    $user_id = (int) $req->get_param( 'user_id' );
    if ( ! $user_id && $req->get_param( 'email' ) ) {
        $u = get_user_by( 'email', sanitize_email( $req->get_param( 'email' ) ) );
        $user_id = $u ? $u->ID : 0;
    }
    $user = $user_id ? get_user_by( 'id', $user_id ) : null;
    if ( ! $user ) { return new \WP_REST_Response( [ 'success' => false, 'message' => 'Nie znaleziono użytkownika.' ], 404 ); }
    $user->add_cap( \Mors_Enum::CAP_EDIT_MUSIC );
    $user->add_cap( \Mors_Enum::CAP_PRESENT );
    ( new \Mors\Db\Votes_Repo() )->log( get_current_user_id(), 'EDITOR_ADD', [ 'userId' => $user_id ] );
    return new \WP_REST_Response( [ 'success' => true, 'editor' => [ 'id' => $user->ID, 'email' => $user->user_email ] ], 200 );
}
public function remove_editor( $req ) {
    $user = get_user_by( 'id', (int) $req['id'] );
    if ( ! $user ) { return new \WP_REST_Response( [ 'success' => false, 'message' => 'Nie znaleziono użytkownika.' ], 404 ); }
    $user->remove_cap( \Mors_Enum::CAP_EDIT_MUSIC );
    $user->remove_cap( \Mors_Enum::CAP_PRESENT );
    ( new \Mors\Db\Votes_Repo() )->log( get_current_user_id(), 'EDITOR_REMOVE', [ 'userId' => $user->ID ] );
    return new \WP_REST_Response( [ 'success' => true ], 200 );
}
```

- [ ] **Step 4: Uruchom test — ma przejść**

Run: `vendor/bin/phpunit --filter Test_Rest_Editors`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add wp-plugin/radio-mors
git commit -m "feat(mors): zarządzanie edytorami przez capabilities WP"
```

---

### Task 11: Podstrona panelu w menu WP

**Files:**
- Create: `wp-plugin/radio-mors/includes/admin/class-admin-page.php`
- Modify: `wp-plugin/radio-mors/includes/class-plugin.php` (rejestracja `admin_menu`)
- Test: `wp-plugin/radio-mors/tests/test-admin-page.php`

**Interfaces:**
- Produces: `Mors\Admin\Admin_Page::register()` — `add_menu_page` pod capability `mors_edit_music`, hostuje panel SPA (ten sam `assets/js/app.js`, tryb panelu wykryty po `morsData.isEditor`/kontenerze).

- [ ] **Step 1: Napisz test rejestracji menu**

`tests/test-admin-page.php`:
```php
<?php
class Test_Admin_Page extends WP_UnitTestCase {
    public function test_menu_added_for_capable_user() {
        $uid = self::factory()->user->create( [ 'role' => 'administrator' ] );
        wp_set_current_user( $uid );
        set_current_screen( 'dashboard' );
        \Mors\Admin\Admin_Page::register();
        do_action( 'admin_menu' );
        global $menu;
        $slugs = wp_list_pluck( (array) $menu, 2 );
        $this->assertContains( 'radio-mors', $slugs );
    }
}
```

- [ ] **Step 2: Uruchom — ma się nie powieść**

Run: `vendor/bin/phpunit --filter Test_Admin_Page`
Expected: FAIL — `Admin_Page` nie istnieje.

- [ ] **Step 3: Napisz Admin_Page**

`includes/admin/class-admin-page.php`:
```php
<?php
namespace Mors\Admin;
class Admin_Page {
    public static function register() {
        add_action( 'admin_menu', [ self::class, 'menu' ] );
        add_action( 'admin_enqueue_scripts', [ self::class, 'assets' ] );
    }
    public static function menu() {
        add_menu_page(
            'Radio MORS', 'Radio MORS', \Mors_Enum::CAP_EDIT_MUSIC,
            'radio-mors', [ self::class, 'render' ], 'dashicons-microphone', 30 );
    }
    public static function assets( $hook ) {
        if ( $hook !== 'toplevel_page_radio-mors' ) { return; }
        wp_enqueue_style( 'mors-app', MORS_PLUGIN_URL . 'assets/css/styles.css', [], MORS_VERSION );
        wp_enqueue_script( 'mors-app', MORS_PLUGIN_URL . 'assets/js/app.js', [], MORS_VERSION, true );
        wp_localize_script( 'mors-app', 'morsData', [
            'restUrl' => esc_url_raw( rest_url( 'mors/v1' ) ),
            'nonce'   => wp_create_nonce( 'wp_rest' ),
            'isEditor' => true, 'isAdminPanel' => true,
        ] );
    }
    public static function render() {
        echo '<div class="wrap"><div id="mors-app" data-mode="admin"></div></div>';
    }
}
```

- [ ] **Step 4: Zarejestruj w Plugin::boot**

```php
if ( is_admin() ) { \Mors\Admin\Admin_Page::register(); }
```

- [ ] **Step 5: Uruchom test + ręczny smoke panelu**

Run: `vendor/bin/phpunit --filter Test_Admin_Page`
Expected: PASS. Następnie w `wp-env`: zaloguj się jako admin → menu „Radio MORS" → panel ładuje SPA; sprawdź, że SPA w trybie `data-mode="admin"` pokazuje zarządzanie utworami (dostosuj przełącznik trybu w `app.js`, jeśli oryginał używał innego sygnału).

- [ ] **Step 6: Commit**

```bash
git add wp-plugin/radio-mors
git commit -m "feat(mors): podstrona panelu redakcji w menu WP"
```

---

### Task 12: Hartowanie, uninstall, readme, smoke E2E

**Files:**
- Create: `wp-plugin/radio-mors/uninstall.php`
- Create: `wp-plugin/radio-mors/readme.txt`
- Modify: pliki REST (przegląd sanityzacji/limitów uploadu)
- Test: `wp-plugin/radio-mors/tests/test-uninstall.php` (opcjonalnie), checklista ręczna

**Interfaces:**
- Produces: `uninstall.php` usuwający tabele + opcje + capabilities (za flagą `mors_delete_data_on_uninstall`).

- [ ] **Step 1: Napisz uninstall.php**

`uninstall.php`:
```php
<?php
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) { exit; }
// Domyślnie NIE usuwamy danych; włączane opcją.
if ( ! get_option( 'mors_delete_data_on_uninstall' ) ) { return; }
global $wpdb;
require_once __DIR__ . '/includes/constants.php';
require_once __DIR__ . '/includes/db/class-schema.php';
foreach ( \Mors\Db\Schema::table_names() as $t ) {
    $wpdb->query( "DROP TABLE IF EXISTS $t" );
}
delete_option( 'mors_delete_data_on_uninstall' );
```

- [ ] **Step 2: Napisz readme.txt**

`readme.txt` (skrót formatu WP):
```
=== Lista Przebojów Radia MORS ===
Contributors: radiomors
Requires at least: 6.0
Tested up to: 6.6
Requires PHP: 7.4
Stable tag: 1.0.0

Lista przebojów z głosowaniem słuchaczy (1–3 głosy / 24h) i panelem redakcji.

== Instalacja ==
1. Wgraj katalog radio-mors do wp-content/plugins.
2. Aktywuj wtyczkę (utworzy tabele i pierwszą edycję).
3. Wstaw [lista_przebojow_mors] na stronie.
4. Panel: menu „Radio MORS" (rola z uprawnieniem mors_edit_music).
```

- [ ] **Step 3: Przegląd bezpieczeństwa (hartowanie)**

Sprawdź i popraw inline:
- Upload: ogranicz MIME (`image/*` dla cover, `audio/*` dla audio) i rozmiar; odrzuć inne.
- Każdy `$wpdb->get_results/get_row/query` z parametrem używa `prepare()`.
- Wszystkie wejścia REST przez `sanitize_*`; parametry ścieżki (`id`) regexem trasy.
- `permission_callback` nigdy `true` dla tras admina; publiczne piszące mają nonce + rate-limit.

- [ ] **Step 4: Uruchom pełny zestaw testów**

Run: `vendor/bin/phpunit`
Expected: PASS — wszystkie testy zielone.

- [ ] **Step 5: Ręczny smoke E2E na czystym WP**

W `wp-env` (czysta instalacja):
1. Aktywacja → tabele + edycja 1 istnieją.
2. Strona z `[lista_przebojow_mors]` → lista i poczekalnia renderują się.
3. Panel → dodaj kilka utworów do listy i poczekalni.
4. Front → oddaj głos (1–3 utwory) → licznik rośnie; drugi głos z tego samego IP → komunikat 24h.
5. Panel → „Zamroź" → głosowanie zamknięte.
6. Panel → „Reset i publikuj" → nowa edycja: top przeniesiony, 2 promocje, poczekalnia dopełniona do 25, głosy wyzerowane.
7. Zweryfikuj wpisy w `mors_audit_log`.

- [ ] **Step 6: Commit**

```bash
git add wp-plugin/radio-mors
git commit -m "feat(mors): uninstall, readme, hartowanie, smoke E2E"
```

---

## Self-Review (autor planu)

**Pokrycie specu:**
- §2 architektura/struktura → Task 1 (szkielet) + rozkład plików we wszystkich taskach. ✅
- §3 model danych (6 tabel) → Task 2. ✅
- §4 silnik notowania (freeze + reset-and-publish) → Task 9. ✅
- §5 głosowanie (walidacja, hash IP, cooldown, transakcja, rate-limit) → Task 7 (+ Request_Identity w Task 5). ✅
- §6 REST API (mapa endpointów) → publiczne Task 5+7, admin Task 8–10. ✅
- §7 autoryzacja/capabilities → Task 2 (nadanie) + `require_cap`/`require_manage` w Task 8/10. ✅
- §8 upload (Media Library) → Task 8. ✅
- §9 frontend (API_BASE, nonce, styl) → Task 6. ✅
- §10 testy (jednostkowe + REST + smoke) → wplecione w każdy task + Task 12. ✅
- §11 kolejność faz → tasksy 1–12 odzwierciedlają fazy 1–7. ✅
- §12 poza zakresem (Turnstile hook, brak WS/Redis) → hook w Task 7 `mors_votes_can_cast`; brak WS/Redis (polling + transienty) — zgodnie. ✅

**Skan placeholderów:** brak „TBD/TODO"; jedyne miejsca „dostosuj do oryginału" (serializer Task 4 kształt pól, przełącznik trybu panelu Task 11, granice `array_slice` Task 9) mają konkretny kod bazowy + wskazany plik referencyjny i test — to weryfikacja względem istniejącego kodu, nie brak treści.

**Spójność typów:** nazwy metod repo (`current`, `for_edition`, `by_ids`, `increment_votes`, `find_voter_for_update`, `upsert_voter`, `insert_vote`, `log`, `create`/`update`/`delete`/`find`/`all`) użyte spójnie w Task 3 i konsumentach (Task 5,7,8,9,10). `Vote_Exception` z polami `code`/`http`/`nextEligibleVoteAt` spójne między Task 7 def a użyciem. Enumy przez `\Mors_Enum::*` wszędzie tak samo.

## Uwagi wykonawcze

- **Wymagany działający WP test suite** (`wp-env` lub `bin/install-wp-tests.sh`) przed Task 1 kroku 7 — bez niego testy integracyjne `WP_UnitTestCase` nie ruszą.
- **Serializer (Task 4)** to jedyne miejsce wymagające sczytania dokładnych nazw pól z `app/public/app.js` — zrobić przed Task 6, bo SPA na nim polega.
- **Ustalanie IP za proxy** (`mors_trusted_ip_header`) skonfigurować świadomie w środowisku produkcyjnym (anty-fraud).
