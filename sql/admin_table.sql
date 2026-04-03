-- ============================================================
--  ADMIN TABLE — DroneOps Role-Based Access Control (RBAC)
--  3 Roles: superadmin | admin | viewer
-- ============================================================

-- ============================================================
-- ROLE PRIVILEGE MATRIX
-- ============================================================
--
--  ACTION                  superadmin   admin    viewer
--  ─────────────────────────────────────────────────────
--  Login                      ✅          ✅       ✅
--  View dashboard             ✅          ✅       ✅
--  View drones                ✅          ✅       ✅
--  View hubs                  ✅          ✅       ✅
--  View orders                ✅          ✅       ✅
--  View packages              ✅          ✅       ✅
--  View SQL log               ✅          ✅       ✅
--  Add drone                  ✅          ✅       ❌
--  Edit drone                 ✅          ✅       ❌
--  Delete drone               ✅          ❌       ❌
--  Add hub                    ✅          ✅       ❌
--  Edit hub                   ✅          ✅       ❌
--  Delete hub                 ✅          ❌       ❌
--  Update order status        ✅          ✅       ❌
--  Assign drone to order      ✅          ✅       ❌
--  Dispatch order             ✅          ✅       ❌
--  Manage admin users         ✅          ❌       ❌
--
-- ============================================================


-- ============================================================
-- ADMIN TABLE
-- ============================================================
CREATE TABLE admin (
    admin_id        SERIAL        PRIMARY KEY,
    admin_name      VARCHAR(100)  NOT NULL,
    username        VARCHAR(50)   NOT NULL UNIQUE,
    email           VARCHAR(200)  NOT NULL UNIQUE,
    password        VARCHAR(255)  NOT NULL,
    role            VARCHAR(20)   NOT NULL DEFAULT 'viewer'
                                  CHECK (role IN ('superadmin', 'admin', 'viewer')),
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    last_logged_in  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_username_length CHECK (char_length(username) >= 4)
);


-- ============================================================
-- ADMIN PERMISSIONS TABLE
-- Stores what each role can do — makes it easy to change later
-- ============================================================
CREATE TABLE admin_permission (
    permission_id   SERIAL        PRIMARY KEY,
    role            VARCHAR(20)   NOT NULL
                                  CHECK (role IN ('superadmin', 'admin', 'viewer')),
    resource        VARCHAR(50)   NOT NULL,  -- drones, hubs, orders, packages, admin
    can_view        BOOLEAN       NOT NULL DEFAULT TRUE,
    can_create      BOOLEAN       NOT NULL DEFAULT FALSE,
    can_update      BOOLEAN       NOT NULL DEFAULT FALSE,
    can_delete      BOOLEAN       NOT NULL DEFAULT FALSE,

    UNIQUE (role, resource)
);


-- ============================================================
-- INSERT PERMISSIONS PER ROLE
-- ============================================================

-- superadmin — full access to everything
INSERT INTO admin_permission (role, resource, can_view, can_create, can_update, can_delete) VALUES
('superadmin', 'drones',   TRUE, TRUE, TRUE, TRUE),
('superadmin', 'hubs',     TRUE, TRUE, TRUE, TRUE),
('superadmin', 'orders',   TRUE, TRUE, TRUE, TRUE),
('superadmin', 'packages', TRUE, TRUE, TRUE, TRUE),
('superadmin', 'admin',    TRUE, TRUE, TRUE, TRUE);

-- admin — can view, create, update but NOT delete and NOT manage admins
INSERT INTO admin_permission (role, resource, can_view, can_create, can_update, can_delete) VALUES
('admin', 'drones',   TRUE, TRUE,  TRUE,  FALSE),
('admin', 'hubs',     TRUE, TRUE,  TRUE,  FALSE),
('admin', 'orders',   TRUE, FALSE, TRUE,  FALSE),
('admin', 'packages', TRUE, FALSE, FALSE, FALSE),
('admin', 'admin',    FALSE, FALSE, FALSE, FALSE);

-- viewer — read only, no changes
INSERT INTO admin_permission (role, resource, can_view, can_create, can_update, can_delete) VALUES
('viewer', 'drones',   TRUE,  FALSE, FALSE, FALSE),
('viewer', 'hubs',     TRUE,  FALSE, FALSE, FALSE),
('viewer', 'orders',   TRUE,  FALSE, FALSE, FALSE),
('viewer', 'packages', TRUE,  FALSE, FALSE, FALSE),
('viewer', 'admin',    FALSE, FALSE, FALSE, FALSE);


-- ============================================================
-- INSERT SAMPLE ADMINS
-- ============================================================
INSERT INTO admin (admin_id, admin_name, username, email, password, role, is_active) VALUES
(1, 'Super Admin',  'admin',  'admin@droneops.com',  'admin123',  'superadmin', TRUE),
(2, 'Ravi Sharma',  'ravi',   'ravi@droneops.com',   'ravi123',   'admin',      TRUE),
(3, 'Neha Gupta',   'neha',   'neha@droneops.com',   'neha456',   'admin',      TRUE),
(4, 'Amit Patil',   'amit',   'amit@droneops.com',   'amit789',   'viewer',     TRUE),
(5, 'Priya Menon',  'priya',  'priya@droneops.com',  'priya321',  'viewer',     TRUE);

SELECT setval('admin_admin_id_seq', 5);


-- ============================================================
-- QUERY: GET PERMISSIONS FOR A ROLE (use in backend)
-- ============================================================
-- SELECT resource, can_view, can_create, can_update, can_delete
-- FROM admin_permission
-- WHERE role = 'admin';


-- ============================================================
-- QUERY: CHECK SPECIFIC PERMISSION (use in backend middleware)
-- ============================================================
-- SELECT can_delete FROM admin_permission
-- WHERE role = 'viewer' AND resource = 'drones';
-- Returns FALSE — viewer cannot delete drones


-- ============================================================
-- USEFUL ADMIN MANAGEMENT QUERIES
-- ============================================================

-- View all admins with role
-- SELECT admin_id, admin_name, username, email, role, is_active, last_logged_in
-- FROM admin ORDER BY admin_id;

-- Change a user's role
-- UPDATE admin SET role = 'admin', updated_at = NOW() WHERE username = 'amit';

-- Add new admin
-- INSERT INTO admin (admin_name, username, email, password, role)
-- VALUES ('John Doe', 'johndoe', 'john@droneops.com', 'john123', 'admin');

-- Deactivate admin
-- UPDATE admin SET is_active = FALSE, updated_at = NOW() WHERE admin_id = 5;

-- Reset password
-- UPDATE admin SET password = 'newpassword', updated_at = NOW() WHERE admin_id = 1;