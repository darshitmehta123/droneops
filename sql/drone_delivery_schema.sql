-- ============================================================
--  DRONE DELIVERY SYSTEM — PostgreSQL Schema  (FINAL FIXED)
--  Primary Keys: SERIAL integers (1, 2, 3 ...)
--  Tables: customer, hub, drone, order, package
-- ============================================================


-- ============================================================
-- 1. CUSTOMER
-- ============================================================
CREATE TABLE customer (
    customer_id   SERIAL        PRIMARY KEY,
    full_name     VARCHAR(120)  NOT NULL,
    email         VARCHAR(200)  NOT NULL UNIQUE,
    phone         VARCHAR(20)   NOT NULL UNIQUE
                                CHECK (phone ~ '^\+?[0-9]{7,15}$'),
    address       VARCHAR(300)  NOT NULL,
    city          VARCHAR(100)  NOT NULL,
    date_of_birth DATE          CHECK (date_of_birth < CURRENT_DATE),
    is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 2. HUB
-- ============================================================
CREATE TABLE hub (
    hub_id         SERIAL        PRIMARY KEY,
    hub_name       VARCHAR(120)  NOT NULL UNIQUE,
    address        VARCHAR(300)  NOT NULL,
    city           VARCHAR(100)  NOT NULL,
    latitude       NUMERIC(9,6)  NOT NULL CHECK (latitude  BETWEEN -90  AND  90),
    longitude      NUMERIC(9,6)  NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    drone_capacity SMALLINT      NOT NULL DEFAULT 10 CHECK (drone_capacity > 0),
    contact_phone  VARCHAR(20),
    is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 3. DRONE
-- ============================================================
CREATE TABLE drone (
    drone_id            SERIAL        PRIMARY KEY,
    hub_id              INT           NOT NULL,
    model               VARCHAR(100)  NOT NULL,
    serial_number       VARCHAR(80)   NOT NULL UNIQUE,
    max_payload_kg      NUMERIC(5,2)  NOT NULL CHECK (max_payload_kg > 0),
    battery_capacity_wh NUMERIC(7,2)  NOT NULL CHECK (battery_capacity_wh > 0),
    max_range_km        NUMERIC(6,2)  NOT NULL CHECK (max_range_km > 0),
    current_battery_pct SMALLINT      NOT NULL DEFAULT 100
                                      CHECK (current_battery_pct BETWEEN 0 AND 100),
    status              VARCHAR(20)   NOT NULL DEFAULT 'available'
                                      CHECK (status IN (
                                          'available', 'in-flight',
                                          'charging', 'maintenance', 'retired'
                                      )),
    last_service_at     TIMESTAMPTZ,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_drone_hub
        FOREIGN KEY (hub_id) REFERENCES hub(hub_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);


-- ============================================================
-- 4. ORDER  ← assigned_drone_id column added here
-- ============================================================
CREATE TABLE "order" (
    order_id             SERIAL         PRIMARY KEY,
    customer_id          INT            NOT NULL,
    hub_id               INT            NOT NULL,
    assigned_drone_id    INT            DEFAULT NULL,        -- ← links to drone
    placed_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    scheduled_delivery   TIMESTAMPTZ,
    status               VARCHAR(25)    NOT NULL DEFAULT 'pending'
                                        CHECK (status IN (
                                            'pending', 'confirmed', 'dispatched',
                                            'in-transit', 'delivered',
                                            'cancelled', 'failed'
                                        )),
    total_weight_kg      NUMERIC(7,3)   NOT NULL CHECK (total_weight_kg > 0),
    total_price          NUMERIC(12,2)  NOT NULL CHECK (total_price >= 0),
    delivery_fee         NUMERIC(8,2)   NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
    delivery_address     VARCHAR(300)   NOT NULL,
    special_instructions TEXT,
    updated_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_order_customer
        FOREIGN KEY (customer_id) REFERENCES customer(customer_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_order_hub
        FOREIGN KEY (hub_id) REFERENCES hub(hub_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_order_drone
        FOREIGN KEY (assigned_drone_id) REFERENCES drone(drone_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);


-- ============================================================
-- 5. PACKAGE
-- ============================================================
CREATE TABLE package (
    package_id      SERIAL          PRIMARY KEY,
    order_id        INT             NOT NULL,
    weight_kg       NUMERIC(6,3)    NOT NULL CHECK (weight_kg > 0 AND weight_kg <= 25),
    length_cm       NUMERIC(6,2)    NOT NULL CHECK (length_cm  > 0),
    width_cm        NUMERIC(6,2)    NOT NULL CHECK (width_cm   > 0),
    height_cm       NUMERIC(6,2)    NOT NULL CHECK (height_cm  > 0),
    is_fragile      BOOLEAN         NOT NULL DEFAULT FALSE,
    description     VARCHAR(300),
    category        VARCHAR(60)     CHECK (category IN (
                        'electronics', 'food', 'medicine',
                        'clothing', 'documents', 'household', 'other'
                    )),
    declared_value  NUMERIC(12,2)   CHECK (declared_value >= 0),
    tracking_number VARCHAR(60)     UNIQUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_package_order
        FOREIGN KEY (order_id) REFERENCES "order"(order_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


-- ============================================================
--  INDEXES
-- ============================================================
CREATE INDEX idx_drone_hub      ON drone(hub_id);
CREATE INDEX idx_drone_status   ON drone(status);
CREATE INDEX idx_order_customer ON "order"(customer_id);
CREATE INDEX idx_order_hub      ON "order"(hub_id);
CREATE INDEX idx_order_status   ON "order"(status);
CREATE INDEX idx_order_drone    ON "order"(assigned_drone_id);
CREATE INDEX idx_package_order  ON package(order_id);