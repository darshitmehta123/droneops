// dbConfig.js — centralized DB configuration
// Reads from environment variables where available; falls back to sensible defaults for local dev.
module.exports = {
  host: String(process.env.DB_HOST || 'localhost'),
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  database: String(process.env.DB_NAME || 'Drone_Delivery_Mangement'),
  user: String(process.env.DB_USER || 'postgres'),
  // Ensure password is always a string — pg's SASL implementation requires a string
  password: process.env.DB_PASS !== undefined ? String(process.env.DB_PASS) : ''
};
