
// ============================================================
//  DroneOps Backend — server.js
//  Run:  node server.js
//  Open: http://localhost:3000
// ============================================================

const express = require('express');
const { Pool } = require('pg');
const cors    = require('cors');
const path    = require('path');

// Load environment variables from a local .env file when present.
// Optional (install dotenv with `npm i dotenv`) — useful for local dev.
try { require('dotenv').config(); } catch (e) { /* dotenv not installed, continue */ }

const app = express();
app.use(cors());
app.use(express.json());

// Simple request logger to help debug routing issues
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.originalUrl);
  next();
});

// ── CONTENT SECURITY POLICY ──
// Serve a reasonable CSP header to avoid browser blocking of local scripts/styles
// Adjust the directives below if you deploy to a different host or tighten security.
app.use((req, res, next) => {
  // Development-friendly CSP — allow local scripts/styles, API calls to localhost,
  // and data URIs for images. Tighten these before deploying to production.
  const policy = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:3000",
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self' http://localhost:3000 ws://localhost:3000",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'self'"
  ].join('; ');
  res.setHeader('Content-Security-Policy', policy);
  next();
});
const PERMISSIONS = {
  superadmin: {
    drones:   { view:true,  create:true,  update:true,  delete:true  },
    hubs:     { view:true,  create:true,  update:true,  delete:true  },
    orders:   { view:true,  create:true,  update:true,  delete:true  },
    packages: { view:true,  create:true,  update:true,  delete:true  },
    admin:    { view:true,  create:true,  update:true,  delete:true  },
  },
  admin: {
    drones:   { view:true,  create:true,  update:true,  delete:false },
    hubs:     { view:true,  create:true,  update:true,  delete:false },
    orders:   { view:true,  create:false, update:true,  delete:false },
    packages: { view:true,  create:false, update:false, delete:false },
    admin:    { view:false, create:false, update:false, delete:false },
  },
  viewer: {
    drones:   { view:true,  create:false, update:false, delete:false },
    hubs:     { view:true,  create:false, update:false, delete:false },
    orders:   { view:true,  create:false, update:false, delete:false },
    packages: { view:true,  create:false, update:false, delete:false },
    admin:    { view:false, create:false, update:false, delete:false },
  },
};
// Check permission: can(role, resource, action)
function can(role, resource, action) {
  return PERMISSIONS[role]?.[resource]?.[action] === true;
}
 
// Middleware factory — attach to any route
function requirePermission(resource, action) {
  return (req, res, next) => {
    const role = req.headers['x-admin-role'];
    if (!role) {
      return res.status(401).json({ error: 'Not authenticated. Please login.' });
    }
    if (!can(role, resource, action)) {
      const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
      return res.status(403).json({
        error: `Access denied. ${roleLabel} role cannot ${action} ${resource}.`,
        role,
        required: action,
        resource
      });
    }
    next();
  };
}
// ── SERVE FRONTEND FILES ──
// droneops/ folder must be inside droneops-backend/
app.use(express.static(path.join(__dirname, 'droneops')));

// ── SILENCE CHROME DEVTOOLS PING (harmless, just stops 404 noise) ──
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.json({});
});

// ── HOME ROUTE → login page ──
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'droneops', 'main.html'));
});


// ── DATABASE CONNECTION ──
// Load DB configuration from a central file which reads environment variables.
// See .env.example for required vars. Do NOT commit a .env with real secrets.
const dbConfig = require('./dbConfig');
const pool = new Pool(dbConfig);

// Safer startup test using async/await and proper release handling
(async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL successfully!');
    client.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  }
})();

// Handle unexpected errors on idle clients
pool.on('error', (err) => {
  console.error('Unexpected idle client error', err);
});


// ============================================================
//  ADMIN ROUTES
// ============================================================

// POST /api/admin/login
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      `SELECT admin_id, admin_name, username, role
       FROM admin
       WHERE username = $1 AND password = $2 AND is_active = TRUE`,
      [username, password]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    await pool.query(
      `UPDATE admin SET last_logged_in = NOW(), updated_at = NOW() WHERE username = $1`,
      [username]
    );
    res.json({ success: true, admin: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 


// ============================================================
//  DRONE ROUTES
// ============================================================

/// GET all drones
app.get('/api/drones', requirePermission('drones','view'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.*, h.hub_name, h.city
       FROM drone d
       JOIN hub h ON h.hub_id = d.hub_id
       ORDER BY d.drone_id`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
// POST add new drone
app.post('/api/drones', requirePermission('drones','create'), async (req, res) => {
  const { hub_id, model, serial_number, max_payload_kg,
          battery_capacity_wh, max_range_km, current_battery_pct, status } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO drone
         (hub_id, model, serial_number, max_payload_kg,
          battery_capacity_wh, max_range_km, current_battery_pct, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [hub_id, model, serial_number, max_payload_kg,
       battery_capacity_wh, max_range_km,
       current_battery_pct || 100, status || 'available']
    );
    res.json({ success: true, drone: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 

// PUT update drone
app.put('/api/drones/:id', requirePermission('drones','update'), async (req, res) => {
  const { id } = req.params;
  const { hub_id, model, serial_number, max_payload_kg,
          battery_capacity_wh, max_range_km, current_battery_pct, status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE drone
       SET hub_id=$1, model=$2, serial_number=$3, max_payload_kg=$4,
           battery_capacity_wh=$5, max_range_km=$6,
           current_battery_pct=$7, status=$8
       WHERE drone_id=$9
       RETURNING *`,
      [hub_id, model, serial_number, max_payload_kg,
       battery_capacity_wh, max_range_km, current_battery_pct, status, id]
    );
    res.json({ success: true, drone: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 

// DELETE drone
app.delete('/api/drones/:id', requirePermission('drones','delete'), async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM drone WHERE drone_id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ============================================================
//  HUB ROUTES
// ============================================================
 
app.get('/api/hubs', requirePermission('hubs','view'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT h.*, COUNT(d.drone_id) AS drone_count
       FROM hub h
       LEFT JOIN drone d ON d.hub_id = h.hub_id
       GROUP BY h.hub_id
       ORDER BY h.hub_id`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
 
 
// ============================================================
//  ORDER ROUTES
// ============================================================
 
// GET all orders
app.get('/api/orders', requirePermission('orders','view'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, c.full_name AS customer_name, h.hub_name, h.city
       FROM "order" o
       JOIN customer c ON c.customer_id = o.customer_id
       JOIN hub h ON h.hub_id = o.hub_id
       ORDER BY o.placed_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
 
// PUT update order status
app.put('/api/orders/:id/status', requirePermission('orders','update'), async (req, res) => {
  const { id } = req.params;
  const { status, special_instructions } = req.body;
  try {
    const result = await pool.query(
      `UPDATE "order"
       SET status=$1,
           special_instructions=COALESCE($2, special_instructions),
           updated_at=NOW()
       WHERE order_id=$3
       RETURNING *`,
      [status, special_instructions, id]
    );
    if (status === 'delivered') {
      await pool.query(
        `UPDATE drone SET status='available'
         WHERE drone_id=(SELECT assigned_drone_id FROM "order" WHERE order_id=$1)`,
        [id]
      );
    }
    res.json({ success: true, order: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
// PUT assign OR unassign drone (drone_id=null means unassign)
app.put('/api/orders/:id/assign', requirePermission('orders','update'), async (req, res) => {
  const { id } = req.params;
  const { drone_id } = req.body;
  try {
    if (drone_id) {
      await pool.query(
        `UPDATE "order" SET assigned_drone_id=$1, status='confirmed', updated_at=NOW() WHERE order_id=$2`,
        [drone_id, id]
      );
    } else {
      await pool.query(
        `UPDATE "order" SET assigned_drone_id=NULL, status='pending', updated_at=NOW() WHERE order_id=$1`,
        [id]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
// PUT dispatch order
app.put('/api/orders/:id/dispatch', requirePermission('orders','update'), async (req, res) => {
  const { id } = req.params;
  try {
    const order = await pool.query(
      `UPDATE "order" SET status='dispatched', updated_at=NOW()
       WHERE order_id=$1 RETURNING assigned_drone_id`,
      [id]
    );
    const droneId = order.rows[0]?.assigned_drone_id;
    if (droneId) {
      await pool.query(
        `UPDATE drone SET status='in-flight' WHERE drone_id=$1`, [droneId]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
 
// ============================================================
//  PACKAGE ROUTES
// ============================================================
 
app.get('/api/packages', requirePermission('packages','view'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, o.status AS order_status
       FROM package p
       JOIN "order" o ON o.order_id = p.order_id
       ORDER BY p.package_id`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
 
// ============================================================
//  CUSTOMER ROUTES
// ============================================================
 
app.get(
  '/api/customers',
  requirePermission('orders', 'view'),
  requirePermission(false ? 'customers' : 'orders', 'view'),
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM customer ORDER BY customer_id`
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);
 
 
 
// ============================================================
//  HUB CRUD ROUTES
// ============================================================
 //add hub
app.post('/api/hubs', requirePermission('hubs','create'), async (req, res) => {
  const { hub_name, address, city, drone_capacity, latitude, longitude, contact_phone, is_active } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO hub (hub_name, address, city, drone_capacity, latitude, longitude, contact_phone, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [hub_name, address, city, drone_capacity, latitude, longitude, contact_phone||null, is_active!==undefined?is_active:true]
    );
    res.json({ success:true, hub: result.rows[0] });
  } catch(err) { res.status(500).json({ error: err.message }); }
});
// PUT update hub
app.put('/api/hubs/:id', requirePermission('hubs','update'), async (req, res) => {
  const { id } = req.params;
  const { hub_name, address, city, drone_capacity, latitude, longitude, contact_phone, is_active } = req.body;
  try {
    const result = await pool.query(
      `UPDATE hub SET hub_name=$1, address=$2, city=$3, drone_capacity=$4,
       latitude=$5, longitude=$6, contact_phone=$7, is_active=$8
       WHERE hub_id=$9 RETURNING *`,
      [hub_name, address, city, drone_capacity, latitude, longitude, contact_phone||null, is_active, id]
    );
    res.json({ success:true, hub: result.rows[0] });
  } catch(err) { res.status(500).json({ error: err.message }); }
});
 
// DELETE hub
app.delete('/api/hubs/:id', requirePermission('hubs','delete'), async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM hub WHERE hub_id=$1`, [id]);
    res.json({ success:true });
  } catch(err) { res.status(500).json({ error: err.message }); }
});
 
// ============================================================
//  START SERVER
// ============================================================
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 DroneOps running at http://localhost:${PORT}`);
  console.log(`📦 Serving frontend from: ${path.join(__dirname, 'droneops')}`);
  console.log(`🗄️  Connected to PostgreSQL on port 5432\n`);
});