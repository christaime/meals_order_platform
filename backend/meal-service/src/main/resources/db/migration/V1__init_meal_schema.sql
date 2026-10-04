-- ============================================================
-- MEAL SERVICE DATABASE SCHEMA
-- Multi-Vendor Meal Marketplace
-- Version: MVP (Phase 1) with Unified Moderation
--
-- CONVENTIONS
-- -----------
-- All identifiers (primary keys, foreign keys, actor references)
-- are stored as UUID.
--
-- Reserved actor UUID:
--   00000000-0000-0000-0000-000000000000
--   Used for automated actions, scheduled jobs, AI moderation,
--   and any operation without a real authenticated user.
--   See com.mealmarket.common.constant.UUIDConstant.ALL_ZERO
--
-- User references (created_by_id, performed_by_id, changed_by, etc.)
-- hold the Keycloak `sub` claim parsed as UUID.
-- No users table yet — deferred to Phase 2.
--
-- MEDIA
-- -----
-- Images are stored in MinIO. The DB only keeps the object key
-- (storage ref), never the URL. URLs are computed at read time
-- by MediaStoragePort (see MediaUrlResolver in the mapper layer).
-- Object keys look like "meal_image/<uuid>.jpg", "vendor_logo/<uuid>.png".
--
-- SOFT DELETE
-- -----------
-- Moderable entities (categories, ingredients, meals,
-- distribution_locations) treat moderation_status = 'DISABLED'
-- as DELETED:
--   1. Hibernate @SQLRestriction("moderation_status <> 'DISABLED'")
--      hides them from all JPA queries (including associations).
--   2. Unicity constraints are PARTIAL UNIQUE INDEXES with the
--      predicate `WHERE moderation_status <> 'DISABLED'`, so a
--      disabled row does not block the reuse of its natural key.
--
-- CITY (reference data)
-- ---------------------
-- Cities are admin-curated reference data. They are NOT moderable,
-- NOT soft-deleted, and have no `is_active` flag. Both vendors and
-- distribution locations reference a city by FK.
-- Coordinates live on distribution_locations, not here.
--
-- STATE MACHINES
-- --------------
-- The DB validates that a status column holds a legal ENUM VALUE.
-- The DB does NOT enforce legal TRANSITIONS (e.g. ACTIVE → BANNED
-- is allowed by the application's VendorState machine, but the DB
-- only requires that both values are members of the enum).
-- Transition rules live in the domain (VendorState.canTransitionTo,
-- ModerationService.mapDecision).
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 0. CITY (reference data — admin-managed, never moderated)
-- ============================================================
CREATE TABLE city (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(120) NOT NULL,
    region VARCHAR(120),
    country_code VARCHAR(2) NOT NULL,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_city_name_country UNIQUE (name, country_code)
);

CREATE INDEX idx_city_country ON city(country_code);
CREATE INDEX idx_city_name    ON city(LOWER(name));

-- Initial seed — Cameroon
INSERT INTO city (name, region, country_code) VALUES
    ('Douala',     'Littoral',      'CM'),
    ('Yaoundé',    'Centre',        'CM'),
    ('Bafoussam',  'Ouest',         'CM'),
    ('Bamenda',    'Nord-Ouest',    'CM'),
    ('Buea',       'Sud-Ouest',     'CM'),
    ('Kribi',      'Sud',           'CM'),
    ('Limbé',      'Sud-Ouest',     'CM'),
    ('Ngaoundéré', 'Adamaoua',      'CM'),
    ('Garoua',     'Nord',          'CM'),
    ('Maroua',     'Extrême-Nord',  'CM'),
    ('Bertoua',    'Est',           'CM'),
    ('Ebolowa',    'Sud',           'CM');

-- ============================================================
-- 1. CATEGORIES
-- Unified classification for cuisines AND dish types.
-- Moderable: always starts as PENDING.
-- ============================================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    icon_url VARCHAR(500),
    type VARCHAR(50) NOT NULL
        CHECK (type IN ('CUISINE', 'DISH_TYPE')),

    -- Origin
    created_by_type VARCHAR(20) NOT NULL
        CHECK (created_by_type IN ('ADMIN', 'VENDOR', 'CUSTOMER', 'SYSTEM')),
    created_by_id UUID NOT NULL,

    -- Moderation
    moderation_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (moderation_status IN ('PENDING', 'APPROVED', 'REJECTED', 'DISABLED')),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP

    -- NOTE: no inline UNIQUE constraint here.
    -- Unicity is enforced by partial unique indexes below, which
    -- exclude rows where moderation_status = 'DISABLED'.
);

-- Case-sensitive unicity among ACTIVE (non-disabled) rows
CREATE UNIQUE INDEX uk_categories_name_type_active
    ON categories (name, type)
    WHERE moderation_status <> 'DISABLED';

-- Case-insensitive unicity among ACTIVE (non-disabled) rows
CREATE UNIQUE INDEX uk_categories_name_type_lower_active
    ON categories (LOWER(name), type)
    WHERE moderation_status <> 'DISABLED';

CREATE INDEX idx_categories_type ON categories(type);
CREATE INDEX idx_categories_name ON categories(name);
CREATE INDEX idx_categories_moderation_status ON categories(moderation_status);
CREATE INDEX idx_categories_created_by ON categories(created_by_type, created_by_id);

-- ============================================================
-- 2. INGREDIENTS
-- Shared across meals. Moderable: always starts as PENDING.
-- ============================================================
CREATE TABLE ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    is_allergen BOOLEAN NOT NULL DEFAULT FALSE,

    -- Origin
    created_by_type VARCHAR(20) NOT NULL
        CHECK (created_by_type IN ('ADMIN', 'VENDOR', 'CUSTOMER', 'SYSTEM')),
    created_by_id UUID NOT NULL,

    -- Moderation
    moderation_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (moderation_status IN ('PENDING', 'APPROVED', 'REJECTED', 'DISABLED')),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP

    -- NOTE: no inline UNIQUE constraint — see partial indexes below.
);

CREATE UNIQUE INDEX uk_ingredients_name_active
    ON ingredients (name)
    WHERE moderation_status <> 'DISABLED';

CREATE UNIQUE INDEX uk_ingredients_name_lower_active
    ON ingredients (LOWER(name))
    WHERE moderation_status <> 'DISABLED';

CREATE INDEX idx_ingredients_name ON ingredients(name);
CREATE INDEX idx_ingredients_is_allergen ON ingredients(is_allergen);
CREATE INDEX idx_ingredients_moderation_status ON ingredients(moderation_status);
CREATE INDEX idx_ingredients_created_by ON ingredients(created_by_type, created_by_id);

-- ============================================================
-- 3. VENDORS
-- Business entity with state machine (separate from moderation).
-- NOT soft-deletable — status uses VendorStatus, not ModerationStatus.
-- Unicity here stays unconditional.
-- References city(id) — required.
-- ============================================================
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- External reference: Keycloak `sub` claim parsed as UUID
    user_id UUID NOT NULL UNIQUE,

    business_name VARCHAR(100) NOT NULL,
    owner_name VARCHAR(100) NOT NULL,
    description TEXT,
    address VARCHAR(255) NOT NULL,

    -- Reference city
    city_id UUID NOT NULL REFERENCES city(id),

    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50) NOT NULL,

    -- Subscription (not enforced yet — Phase 2)
    subscription_tier VARCHAR(20) NOT NULL DEFAULT 'FREE'
        CHECK (subscription_tier IN ('FREE', 'STARTER', 'PRO', 'ENTERPRISE')),

    -- Ratings
    rating_avg DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    total_ratings INTEGER NOT NULL DEFAULT 0,

    -- Current state (VendorState machine)
    -- Enum check only. Legal transitions are enforced by the domain layer.
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'BANNED', 'INACTIVE')),
    status_reason TEXT,
    status_changed_at TIMESTAMP WITH TIME ZONE,
    status_changed_by UUID,
    status_change_type VARCHAR(50)
        CHECK (status_change_type IN ('SYSTEM', 'ADMIN_ACTION', 'VENDOR_ACTION', 'AUTOMATIC')),

    -- Delivery
    delivery_radius INTEGER NOT NULL DEFAULT 10,
    pickup_address VARCHAR(255),

    -- Profile (MinIO object keys — URLs are derived at read time)
    profile_image_storage_ref   VARCHAR(512),
    cover_image_storage_ref     VARCHAR(512),
    id_card_front_storage_ref   VARCHAR(512),
    id_card_back_storage_ref    VARCHAR(512),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Case-sensitive uniqueness
    CONSTRAINT uk_vendors_business_name UNIQUE (business_name)
);

CREATE UNIQUE INDEX uk_vendors_business_name_lower
    ON vendors (LOWER(business_name));

CREATE INDEX idx_vendors_email ON vendors(email);
CREATE INDEX idx_vendors_user_id ON vendors(user_id);
CREATE INDEX idx_vendors_city ON vendors(city_id);
CREATE INDEX idx_vendors_status ON vendors(status);
CREATE INDEX idx_vendors_subscription_tier ON vendors(subscription_tier);
CREATE INDEX idx_vendors_rating_avg ON vendors(rating_avg);
CREATE INDEX idx_vendors_business_name ON vendors(business_name);

-- ============================================================
-- 4. DISTRIBUTION LOCATIONS
-- Fully owned by vendors. Moderable: starts as PENDING.
-- References city(id) — required.
-- ============================================================
CREATE TABLE distribution_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,

    -- Reference city
    city_id UUID NOT NULL REFERENCES city(id),

    address VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    delivery_radius INTEGER NOT NULL DEFAULT 10,

    -- Moderation
    -- Enum check only. Legal transitions are enforced by the domain layer.
    moderation_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (moderation_status IN ('PENDING', 'APPROVED', 'REJECTED', 'DISABLED')),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP

    -- NOTE: no inline UNIQUE constraint — see partial indexes below.
);

-- Case-sensitive unicity per vendor among ACTIVE rows
CREATE UNIQUE INDEX uk_distribution_locations_vendor_name_active
    ON distribution_locations (vendor_id, name)
    WHERE moderation_status <> 'DISABLED';

-- Case-insensitive unicity per vendor among ACTIVE rows
CREATE UNIQUE INDEX uk_distribution_locations_vendor_name_lower_active
    ON distribution_locations (vendor_id, LOWER(name))
    WHERE moderation_status <> 'DISABLED';

CREATE INDEX idx_distribution_locations_vendor_id
    ON distribution_locations(vendor_id);
CREATE INDEX idx_distribution_locations_city
    ON distribution_locations(city_id);
CREATE INDEX idx_distribution_locations_coordinates
    ON distribution_locations(latitude, longitude);
CREATE INDEX idx_distribution_locations_moderation_status
    ON distribution_locations(moderation_status);

-- ============================================================
-- 5. VENDOR STATUS HISTORY (Vendor state machine audit trail)
-- Append-only. Records every state transition on a vendor.
-- The domain enforces legal transitions; this table records them.
-- ============================================================
CREATE TABLE vendor_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    from_status VARCHAR(50)
        CHECK (from_status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'BANNED', 'INACTIVE')),
    to_status VARCHAR(50) NOT NULL
        CHECK (to_status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'BANNED', 'INACTIVE')),
    reason TEXT,
    changed_by UUID NOT NULL,
    change_type VARCHAR(50) NOT NULL
        CHECK (change_type IN ('SYSTEM', 'ADMIN_ACTION', 'VENDOR_ACTION', 'AUTOMATIC')),
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vsh_vendor_id ON vendor_status_history(vendor_id);
CREATE INDEX idx_vsh_changed_at ON vendor_status_history(changed_at DESC);
CREATE INDEX idx_vsh_to_status ON vendor_status_history(to_status);
CREATE INDEX idx_vsh_vendor_changed ON vendor_status_history(vendor_id, changed_at DESC);
CREATE INDEX idx_vsh_changed_by ON vendor_status_history(changed_by);

-- ============================================================
-- 6. VENDOR ↔ CATEGORY (Many-to-Many — CUISINE only)
-- ============================================================
CREATE TABLE vendors_categories (
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (vendor_id, category_id)
);

CREATE INDEX idx_vendors_categories_vendor_id ON vendors_categories(vendor_id);
CREATE INDEX idx_vendors_categories_category_id ON vendors_categories(category_id);

-- ============================================================
-- 7. VENDOR ↔ DISTRIBUTION LOCATION (Reference)
-- ============================================================
CREATE TABLE vendors_distribution_locations (
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    distribution_location_id UUID NOT NULL REFERENCES distribution_locations(id) ON DELETE CASCADE,
    PRIMARY KEY (vendor_id, distribution_location_id)
);

CREATE INDEX idx_vendors_dist_loc_vendor_id ON vendors_distribution_locations(vendor_id);
CREATE INDEX idx_vendors_dist_loc_location_id ON vendors_distribution_locations(distribution_location_id);

-- ============================================================
-- 8. MEALS
-- Core product. Moderable: starts as PENDING.
-- ============================================================
CREATE TABLE meals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,

    -- MinIO object key — URL derived at read time
    image_storage_ref VARCHAR(512),

    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    average_rating DECIMAL(3, 2) NOT NULL DEFAULT 0.00,
    total_ratings INTEGER NOT NULL DEFAULT 0,
    prep_time_minutes INTEGER,

    -- Moderation
    -- Enum check only. Legal transitions are enforced by the domain layer.
    moderation_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (moderation_status IN ('PENDING', 'APPROVED', 'REJECTED', 'DISABLED')),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP

    -- NOTE: no inline UNIQUE constraint — see partial indexes below.
);

-- Case-sensitive unicity per vendor among ACTIVE rows
CREATE UNIQUE INDEX uk_meals_vendor_name_active
    ON meals (vendor_id, name)
    WHERE moderation_status <> 'DISABLED';

-- Case-insensitive unicity per vendor among ACTIVE rows
CREATE UNIQUE INDEX uk_meals_vendor_name_lower_active
    ON meals (vendor_id, LOWER(name))
    WHERE moderation_status <> 'DISABLED';

CREATE INDEX idx_meals_vendor_id ON meals(vendor_id);
CREATE INDEX idx_meals_name ON meals(name);
CREATE INDEX idx_meals_is_available ON meals(is_available);
CREATE INDEX idx_meals_average_rating ON meals(average_rating);
CREATE INDEX idx_meals_price ON meals(price);
CREATE INDEX idx_meals_moderation_status ON meals(moderation_status);

-- ============================================================
-- 9. MEAL ↔ CATEGORY (Many-to-Many)
-- Contains both CUISINE and DISH_TYPE entries.
-- ============================================================
CREATE TABLE meals_categories (
    meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (meal_id, category_id)
);

CREATE INDEX idx_meals_categories_meal_id ON meals_categories(meal_id);
CREATE INDEX idx_meals_categories_category_id ON meals_categories(category_id);

-- ============================================================
-- 10. MEAL ↔ INGREDIENT (Many-to-Many)
-- ============================================================
CREATE TABLE meals_ingredients (
    meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    PRIMARY KEY (meal_id, ingredient_id)
);

CREATE INDEX idx_meals_ingredients_meal_id ON meals_ingredients(meal_id);
CREATE INDEX idx_meals_ingredients_ingredient_id ON meals_ingredients(ingredient_id);

-- ============================================================
-- 11. MEAL ↔ DISTRIBUTION LOCATION (Many-to-Many)
-- If empty, meal is available at all vendor locations.
-- ============================================================
CREATE TABLE meals_distribution_locations (
    meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    distribution_location_id UUID NOT NULL REFERENCES distribution_locations(id) ON DELETE CASCADE,
    PRIMARY KEY (meal_id, distribution_location_id)
);

CREATE INDEX idx_meals_dist_loc_meal_id ON meals_distribution_locations(meal_id);
CREATE INDEX idx_meals_dist_loc_location_id ON meals_distribution_locations(distribution_location_id);

-- ============================================================
-- 12. MODERATION DATA (Unified Audit Trail)
-- Append-only. Records every moderation action on any
-- moderable entity (Meal, Ingredient, Location, Category).
-- The domain enforces legal transitions; this table records them.
-- ============================================================
CREATE TABLE moderation_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Target
    target_type VARCHAR(50) NOT NULL
        CHECK (target_type IN (
            'MEAL',
            'INGREDIENT',
            'DISTRIBUTION_LOCATION',
            'CATEGORY'
        )),
    target_id UUID NOT NULL,

    -- Transition
    from_status VARCHAR(20)
        CHECK (from_status IN ('PENDING', 'APPROVED', 'REJECTED', 'DISABLED')),
    to_status VARCHAR(20) NOT NULL
        CHECK (to_status IN ('PENDING', 'APPROVED', 'REJECTED', 'DISABLED')),
    reason TEXT,

    -- Actor
    performed_by_type VARCHAR(20) NOT NULL
        CHECK (performed_by_type IN ('ADMIN', 'VENDOR', 'CUSTOMER', 'SYSTEM')),
    performed_by_id UUID NOT NULL,

    -- Timestamp
    performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_moderation_target
    ON moderation_data(target_type, target_id);
CREATE INDEX idx_moderation_performed_at
    ON moderation_data(performed_at DESC);
CREATE INDEX idx_moderation_performed_by
    ON moderation_data(performed_by_type, performed_by_id);
CREATE INDEX idx_moderation_to_status
    ON moderation_data(to_status);

-- ============================================================
-- END OF SCHEMA
-- ============================================================