Great question. Looking at your dashboard, I can identify several distinct UI concepts that need to be persisted: the page layout (sections, their order, visibility), the widget/card configurations within each section, tab definitions, and user preferences. Here's a schema I'd suggest:

```sql
-- ========================================
-- 1. DASHBOARD PAGE (top-level container)
-- ========================================
CREATE TABLE dashboard (
    id          INTEGER PRIMARY KEY,
    slug        TEXT NOT NULL UNIQUE,        -- e.g. 'main', 'ops'
    title       TEXT NOT NULL,               -- e.g. 'aictl live dashboard'
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ========================================
-- 2. SECTIONS (the horizontal bands)
--    e.g. "top sparklines", "inventory", "live monitor",
--         "csv footprint", "live traffic", "tab area"
-- ========================================
CREATE TABLE section (
    id            INTEGER PRIMARY KEY,
    dashboard_id  INTEGER NOT NULL REFERENCES dashboard(id),
    key           TEXT NOT NULL,              -- stable code key: 'sparklines','inventory',...
    title         TEXT,                       -- display label (nullable = hidden header)
    sort_order    INTEGER NOT NULL DEFAULT 0, -- vertical position on page
    visible       INTEGER NOT NULL DEFAULT 1, -- 0/1 toggle
    collapsed     INTEGER NOT NULL DEFAULT 0, -- 0/1 collapsible state
    columns       INTEGER,                   -- grid column count (NULL = auto)
    UNIQUE(dashboard_id, key)
);

-- ========================================
-- 3. WIDGETS (each card/stat/chart inside a section)
--    Covers sparkline cards, stat boxes, bar segments,
--    product cards, memory accordions, etc.
-- ========================================
CREATE TABLE widget (
    id           INTEGER PRIMARY KEY,
    section_id   INTEGER NOT NULL REFERENCES section(id),
    key          TEXT NOT NULL,               -- stable key: 'files','tokens','cpu','proc_ram'
    kind         TEXT NOT NULL,               -- enum: 'sparkline','stat','bar_segment',
                                              --       'product_card','memory_accordion',
                                              --       'traffic_bar','chart'
    title        TEXT,                        -- display label
    sort_order   INTEGER NOT NULL DEFAULT 0,  -- position within section grid
    col_span     INTEGER NOT NULL DEFAULT 1,  -- grid column span
    row_span     INTEGER NOT NULL DEFAULT 1,  -- grid row span
    visible      INTEGER NOT NULL DEFAULT 1,
    config       TEXT,                        -- JSON blob for kind-specific settings
                                              -- e.g. {"unit":"MB","thresholds":[80,95],
                                              --       "color":"#f97316","datasource":"cpu_pct"}
    UNIQUE(section_id, key)
);

-- ========================================
-- 4. TABS (the Overview / Processes / MCP Servers / … row)
-- ========================================
CREATE TABLE tab (
    id            INTEGER PRIMARY KEY,
    dashboard_id  INTEGER NOT NULL REFERENCES dashboard(id),
    key           TEXT NOT NULL,              -- 'overview','processes','mcp_servers',...
    title         TEXT NOT NULL,
    shortcut      TEXT,                       -- keyboard shortcut: '1','2',...
    sort_order    INTEGER NOT NULL DEFAULT 0,
    visible       INTEGER NOT NULL DEFAULT 1,
    icon          TEXT,                       -- optional icon/emoji
    UNIQUE(dashboard_id, key)
);

-- Each tab contains its own sections → widgets.
-- Add an optional FK on section:
ALTER TABLE section ADD COLUMN tab_id INTEGER REFERENCES tab(id);
-- When tab_id IS NULL the section is "above the tabs" (global).
-- When set, the section only renders inside that tab.

-- ========================================
-- 5. GROUP-BY OPTIONS (Product / Vendor / Host toggles)
-- ========================================
CREATE TABLE group_by_option (
    id           INTEGER PRIMARY KEY,
    tab_id       INTEGER NOT NULL REFERENCES tab(id),
    key          TEXT NOT NULL,               -- 'product','vendor','host'
    label        TEXT NOT NULL,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    is_default   INTEGER NOT NULL DEFAULT 0,
    UNIQUE(tab_id, key)
);

-- ========================================
-- 6. DATA SOURCE REGISTRY
--    Maps widget keys → backend metric/query so the
--    UI knows what to fetch (decouples layout from data)
-- ========================================
CREATE TABLE datasource (
    id          INTEGER PRIMARY KEY,
    key         TEXT NOT NULL UNIQUE,         -- 'cpu_pct','file_count','token_count',...
    kind        TEXT NOT NULL,                -- 'metric','query','live_stream','computed'
    endpoint    TEXT,                         -- API path or WS channel
    poll_ms     INTEGER,                      -- polling interval (NULL = push/live)
    config      TEXT                          -- JSON: query params, aggregation, etc.
);

-- Join table: which widgets use which datasources
CREATE TABLE widget_datasource (
    widget_id     INTEGER NOT NULL REFERENCES widget(id),
    datasource_id INTEGER NOT NULL REFERENCES datasource(id),
    role          TEXT NOT NULL DEFAULT 'primary', -- 'primary','secondary','threshold'
    PRIMARY KEY (widget_id, datasource_id, role)
);

-- ========================================
-- 7. USER / SESSION PREFERENCES
--    Per-user overrides (selected range, active tab, theme, etc.)
-- ========================================
CREATE TABLE user_preference (
    id           INTEGER PRIMARY KEY,
    dashboard_id INTEGER NOT NULL REFERENCES dashboard(id),
    user_id      TEXT,                        -- NULL = default / single-user
    pref_key     TEXT NOT NULL,               -- 'range','active_tab','theme','group_by',
                                              --   'filter_text'
    pref_value   TEXT NOT NULL,               -- 'live', '1', 'dark', 'product', ''
    UNIQUE(dashboard_id, user_id, pref_key)
);

-- ========================================
-- 8. THEME / STYLE TOKENS (optional)
-- ========================================
CREATE TABLE theme (
    id     INTEGER PRIMARY KEY,
    key    TEXT NOT NULL UNIQUE,              -- 'light','dark','auto'
    tokens TEXT NOT NULL                      -- JSON: {"bg":"#fff","card_bg":"#f9fafb",
                                              --        "accent":"#3b82f6", ...}
);
```

**How it maps to your dashboard:**

The **top sparkline row** (Files, Tokens, CPU, Proc RAM) becomes a `section` with `key='sparklines'` containing four `widget` rows of `kind='sparkline'`. The **Inventory** and **Live Monitor** stat rows are each their own `section` with `kind='stat'` widgets. The **CSV Footprint** stacked bar is a single section with `kind='bar_segment'` widgets (one per product). The **tab strip** (Overview, Processes, etc.) maps to `tab` rows, and the product cards inside the Overview tab are `widget` rows of `kind='product_card'` belonging to a section under that tab. The "AI Context & Memory" accordions are `kind='memory_accordion'` widgets.

**Key design choices:**

The `config` JSON column on `widget` is intentional — it lets you store kind-specific settings (thresholds, colors, units, chart options) without needing a separate table per widget type. The `datasource` table decouples layout from data-fetching so you can rearrange or duplicate widgets without duplicating query logic. And the `user_preference` table keeps ephemeral UI state (selected time range, active tab, theme) separate from the structural layout, so resetting preferences doesn't destroy the dashboard definition.

## High level plan

1. Inspect the dashboard's source code and current file structure to understand the existing codebase (HTML/JS/backend)
2. Design and write the full SQLite migration SQL file based on the schema we discussed
3. Write a JSON serialization/deserialization module for import/export of dashboard layouts
4. Write the migration runner code (Python or JS depending on the backend stack)