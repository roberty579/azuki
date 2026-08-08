-- HISTORICAL — not applied, not authoritative.
--
-- The hand-written schema this project started from. It was converted once into
-- src/db/schema.ts, which is now the source of truth: migrations are generated
-- from that file into drizzle/, and the TypeScript types come from it too.
--
-- Kept for reference, the same way requirements/initial_requirements.md is.
-- Editing this file changes nothing. What the running database actually has
-- differs from it in several ways the application requires — products.slug,
-- summary and details columns, orders.idempotency_key, first/last name split,
-- 'pickup' rather than 'local_dropoff', and constraints the original lacked.
-- See docs/backend.md for why each changed.

-- =========================================================
-- CROCHET BUSINESS SITE — DATABASE SCHEMA
-- PostgreSQL (local dev now, Supabase-compatible later)
-- Run top to bottom — tables are ordered so every foreign
-- key reference already exists.
-- =========================================================

-- ---------------------------------------------------------
-- 1. COMMISSIONS (Forms page — custom commission requests)
--    Core "job" record for a custom piece — covers form
--    submission through final delivery. This table doubles
--    as your admin cost-tracking spreadsheet.
-- ---------------------------------------------------------
CREATE TABLE commissions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Client info
    first_name          TEXT NOT NULL,
    last_name           TEXT NOT NULL,
    email               TEXT NOT NULL,
    phone               TEXT,

    -- Project specs
    yarn_color          TEXT NOT NULL,
    yarn_type           TEXT NOT NULL,
    yarn_thickness      TEXT NOT NULL,
    item_description    TEXT NOT NULL,             -- "what item"
    is_gift             BOOLEAN NOT NULL DEFAULT false,

    -- Payment
    payment_method      TEXT CHECK (payment_method IN ('zelle', 'venmo', 'cash')),
    payment_status      TEXT NOT NULL DEFAULT 'unpaid'
                         CHECK (payment_status IN ('unpaid', 'partial', 'paid')),

    -- Fulfillment
    fulfillment_type    TEXT NOT NULL CHECK (fulfillment_type IN ('shipping', 'local_dropoff')),
    shipping_address_line1 TEXT,
    shipping_address_line2 TEXT,
    shipping_city       TEXT,
    shipping_state      TEXT,
    shipping_zip        TEXT,
    dropoff_location_name    TEXT,             -- e.g. "My house", "Craft Fair booth"
    dropoff_location_address TEXT,

    -- Terms
    terms_accepted      BOOLEAN NOT NULL DEFAULT false,
    terms_accepted_at   TIMESTAMPTZ,

    -- Pipeline status — this IS your admin "spreadsheet" status column
    status               TEXT NOT NULL DEFAULT 'submitted'
                          CHECK (status IN (
                              'submitted',       -- form submitted, awaiting consult
                              'consulted',       -- consult call happened
                              'quoted',          -- pricing/timeline sent
                              'confirmed',       -- client signed + paid
                              'in_progress',     -- being made
                              'completed',       -- finished
                              'shipped',         -- sent out / picked up
                              'cancelled'
                          )),

    -- Pricing/timeline (set after consult)
    final_price           NUMERIC(10,2),
    materials_cost         NUMERIC(10,2),          -- admin cost tracking
    shipping_cost           NUMERIC(10,2),
    deadline                 DATE,

    -- Contract
    contract_signed          BOOLEAN NOT NULL DEFAULT false,
    contract_signed_at        TIMESTAMPTZ,
    contract_document_url     TEXT,                -- link to generated/uploaded pricing+timeline doc

    admin_notes                TEXT,

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------
-- 2. BOOKINGS (Schedule page — consultation calls)
--    References commissions since a booking is usually made
--    to discuss a specific commission request.
-- ---------------------------------------------------------
CREATE TABLE bookings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name       TEXT NOT NULL,
    customer_email      TEXT NOT NULL,
    customer_phone      TEXT,

    scheduled_date      DATE NOT NULL,
    scheduled_time      TIME NOT NULL,

    meeting_platform    TEXT NOT NULL CHECK (meeting_platform IN ('google_meet', 'discord', 'zoom')),
    meeting_link        TEXT,                     -- populated after generation (Meet/Zoom API, or manual Discord link)
    google_calendar_event_id TEXT,                -- reference back to the created calendar event

    status              TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),

    commission_id       UUID REFERENCES commissions(id) ON DELETE SET NULL,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------
-- 3. PRODUCTS (Shop items + Build-a-Bunny bases/accessories)
--    One table, differentiated by category, keeps admin
--    "add item" flow consistent across Shop and Bunny add-ons.
-- ---------------------------------------------------------
CREATE TABLE products (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    description         TEXT,
    category            TEXT NOT NULL CHECK (category IN (
                             'shop_item',          -- general shop gallery item
                             'bunny_base',          -- naked/outfitted bunny base
                             'bunny_outfit',         -- outfit color/style options
                             'bunny_addon'            -- extra clothes/accessories
                         )),
    base_price          NUMERIC(10,2) NOT NULL,
    stock_quantity      INTEGER DEFAULT 0,          -- ignored/unused for made-to-order items
    is_made_to_order    BOOLEAN NOT NULL DEFAULT true,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    designer_credit     TEXT,                        -- if pattern is by another designer
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE product_images (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id          UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url           TEXT NOT NULL,
    alt_text            TEXT,
    display_order       INTEGER DEFAULT 0
);

-- Color/style options per product (e.g. bunny colors, outfit colors)
CREATE TABLE product_options (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id          UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    option_type         TEXT NOT NULL,               -- e.g. 'color'
    option_value        TEXT NOT NULL,               -- e.g. 'lavender'
    price_modifier      NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------
-- 4. ORDERS (Shop purchases + Build-a-Bunny checkouts)
--    Commissions are NOT in here — they have their own
--    table/lifecycle above.
-- ---------------------------------------------------------
CREATE TABLE orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_type          TEXT NOT NULL CHECK (order_type IN ('shop', 'build_a_bunny')),

    customer_name       TEXT NOT NULL,
    customer_email      TEXT NOT NULL,
    customer_phone      TEXT,

    payment_method      TEXT CHECK (payment_method IN ('zelle', 'venmo', 'cash', 'card')),
    payment_status      TEXT NOT NULL DEFAULT 'unpaid'
                         CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),

    fulfillment_type    TEXT NOT NULL CHECK (fulfillment_type IN ('shipping', 'local_dropoff')),
    shipping_address_line1 TEXT,
    shipping_address_line2 TEXT,
    shipping_city       TEXT,
    shipping_state      TEXT,
    shipping_zip        TEXT,
    dropoff_location_name    TEXT,
    dropoff_location_address TEXT,

    subtotal            NUMERIC(10,2) NOT NULL,
    shipping_cost       NUMERIC(10,2) DEFAULT 0,
    total_price         NUMERIC(10,2) NOT NULL,

    status              TEXT NOT NULL DEFAULT 'received'
                         CHECK (status IN ('received', 'in_progress', 'completed', 'shipped', 'cancelled')),
    deadline            DATE,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Line items per order — handles both a simple Shop item
-- and a fully-configured Build-a-Bunny (base + outfit + addons)
CREATE TABLE order_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id          UUID REFERENCES products(id),        -- base product (bunny base or shop item)
    quantity            INTEGER NOT NULL DEFAULT 1,
    unit_price          NUMERIC(10,2) NOT NULL,
    -- Selected options for this line item (e.g. bunny color, outfit color)
    -- stored as JSON so Build-a-Bunny configuration doesn't need a rigid schema
    selected_options    JSONB DEFAULT '[]'::jsonb
);

-- ---------------------------------------------------------
-- 5. PORTFOLIO (public-facing past work showcase)
-- ---------------------------------------------------------
CREATE TABLE portfolio_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title               TEXT NOT NULL,
    category            TEXT NOT NULL CHECK (category IN (
                             'clothing', 'plushie', 'crochet', 'engineering', 'jewelry'
                         )),
    description         TEXT,
    yarn_type           TEXT,
    yarn_color          TEXT,
    designer_credit     TEXT,
    is_featured         BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE portfolio_images (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_item_id   UUID NOT NULL REFERENCES portfolio_items(id) ON DELETE CASCADE,
    image_url            TEXT NOT NULL,
    display_order          INTEGER DEFAULT 0
);

-- ---------------------------------------------------------
-- 6. ADMIN USER (local dev placeholder — Supabase Auth
--    replaces this table's purpose once you migrate, but
--    useful to have locally for testing role-gated routes)
-- ---------------------------------------------------------
CREATE TABLE admin_users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email               TEXT NOT NULL UNIQUE,
    password_hash       TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------
-- INDEXES (query patterns you'll actually hit)
-- ---------------------------------------------------------
CREATE INDEX idx_commissions_status ON commissions(status);
CREATE INDEX idx_commissions_deadline ON commissions(deadline);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_bookings_date ON bookings(scheduled_date);
CREATE INDEX idx_product_images_product_id ON product_images(product_id);
CREATE INDEX idx_portfolio_images_item_id ON portfolio_images(portfolio_item_id);
