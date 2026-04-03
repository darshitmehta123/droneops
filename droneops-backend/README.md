# 🚁 DroneOps — Drone Delivery Administration System

A full-stack web application for managing a drone delivery system. Built with **Node.js + Express** backend, **PostgreSQL** database, and a pure **HTML/CSS/JS** frontend with a glassmorphism dark UI.

---

## 📸 Features

- **Admin Login** with role-based access control (superadmin / admin / viewer)
- **Live Dashboard** with real-time stats — total drones, active orders, in-flight, maintenance
- **Drone Fleet Management** — add, edit, delete drones with full validation
- **Hub Network** — manage delivery hubs across cities
- **Order Management** — view, filter, update order status with pagination
- **Assign Drones** — assign drones to orders and mark them dispatched
- **Package Tracker** — view all packages with category filters
- **SQL Log** — real-time log of every query executed, with filter and copy
- **Pagination** — 10 records per page across all tables
- **Smooth page transitions** and glassmorphism UI

---

## 🗂️ Project Structure

```
DroneOps/
│
├── droneops-backend/          # Node.js backend
│   ├── server.js              # Express API server
│   ├── package.json
│   ├── node_modules/
│   └── droneops/              # Frontend (served by Express)
│       ├── main.html          # Login page
│       ├── dashboard.html     # Live dashboard
│       ├── drones.html        # Drone fleet management
│       ├── hubs.html          # Hub network
│       ├── orders.html        # Order management
│       ├── assign.html        # Assign drones to orders
│       ├── packages.html      # Package tracker
│       ├── sqllog.html        # SQL execution log
│       ├── shared.js          # Shared API calls, permissions, utilities
│       ├── styles.css         # Global glassmorphism styles
│       ├── logo.svg           # DroneOps logo
│       └── favicon.svg        # Browser tab icon
│
└── sql/
    ├── drone_delivery_schema.sql   # Create all tables
    ├── drone_delivery_insert.sql   # Insert sample data
    └── admin_table.sql             # Admin + permissions tables
```

---

## 🗄️ Database Schema

### Tables

| Table | Type | Description |
|---|---|---|
| `customer` | Strong | Customers who place orders |
| `hub` | Strong | Delivery hubs across cities |
| `drone` | Strong | Drone fleet linked to hubs |
| `order` | Strong | Orders placed by customers |
| `package` | Weak | Packages belonging to orders |
| `admin` | Strong | Admin users with roles |
| `admin_permission` | — | Role-based permission matrix |

### Relationships

- `customer` → `order` — 1:N
- `hub` → `drone` — 1:N
- `hub` → `order` — 1:N
- `drone` → `order` — 1:N (assigned drone)
- `order` → `package` — 1:N (weak entity)

---

## 🔐 Role-Based Access Control

| Action | superadmin | admin | viewer |
|---|---|---|---|
| View all pages | ✅ | ✅ | ✅ |
| Add drone / hub | ✅ | ✅ | ❌ |
| Edit drone / hub | ✅ | ✅ | ❌ |
| Delete drone / hub | ✅ | ❌ | ❌ |
| Update order status | ✅ | ✅ | ❌ |
| Assign / dispatch drone | ✅ | ✅ | ❌ |
| Manage admin users | ✅ | ❌ | ❌ |

### Demo Credentials

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | superadmin |
| `ravi` | `ravi123` | admin |
| `neha` | `neha456` | admin |
| `amit` | `amit789` | viewer |
| `priya` | `priya321` | viewer |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [PostgreSQL](https://www.postgresql.org/) v14+
- [pgAdmin](https://www.pgadmin.org/) (recommended for database management)

---

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/droneops.git
cd droneops
```

---

### 2. Set Up the Database

Open **pgAdmin** and:

1. Create a new database named `droneops`
2. Open the **Query Tool**
3. Run the SQL files **in this order**:

```sql
-- Step 1: Create all tables
-- Run: sql/drone_delivery_schema.sql

-- Step 2: Insert sample data
-- Run: sql/drone_delivery_insert.sql

-- Step 3: Create admin table and permissions
-- Run: sql/admin_table.sql
```

---

### 3. Configure the Backend

Open `droneops-backend/server.js` and update the database connection:

```js
const pool = new Pool({
  host:     'localhost',
  port:     5432,
  database: 'droneops',     // your database name
  user:     'postgres',     // your pgAdmin username
  password: 'yourpassword', // your PostgreSQL password
});
```

---

### 4. Install Dependencies

```bash
cd droneops-backend
npm install
```

---

### 5. Start the Server

```bash
node server.js
```

You should see:

```
✅ Connected to PostgreSQL successfully!
🚀 DroneOps running at http://localhost:3000
```

---

### 6. Open the App

Open your browser and go to:

```
http://localhost:3000
```

Login with `admin` / `admin123` to get started.

---

## 🛠️ API Endpoints

### Admin
| Method | Endpoint | Permission | Description |
|---|---|---|---|
| POST | `/api/admin/login` | Public | Login |
| GET | `/api/permissions` | Any | Get role permissions |

### Drones
| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/api/drones` | view | Get all drones |
| POST | `/api/drones` | create | Add new drone |
| PUT | `/api/drones/:id` | update | Update drone |
| DELETE | `/api/drones/:id` | delete | Delete drone |

### Hubs
| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/api/hubs` | view | Get all hubs |
| POST | `/api/hubs` | create | Add new hub |
| PUT | `/api/hubs/:id` | update | Update hub |
| DELETE | `/api/hubs/:id` | delete | Delete hub |

### Orders
| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/api/orders` | view | Get all orders |
| PUT | `/api/orders/:id/status` | update | Update order status |
| PUT | `/api/orders/:id/assign` | update | Assign drone to order |
| PUT | `/api/orders/:id/dispatch` | update | Dispatch order |

### Packages & Customers
| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/api/packages` | view | Get all packages |
| GET | `/api/customers` | view | Get all customers |

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| DB Client | pg (node-postgres) |
| Styling | Custom glassmorphism CSS |
| Fonts | Space Mono, DM Sans (Google Fonts) |

---

## 📋 Sample Data

The project includes 10 rows of sample data for each table:

- 10 customers across Mumbai, Pune, Delhi, Chennai, Hyderabad, Bangalore, Kolkata
- 10 hubs in major Indian cities
- 10 drones (DJI Matrice 300, Zipline P2, DJI FlyCart 30, Skydio 2+)
- 10 orders with various statuses
- 10 packages with different categories
- 5 admin users with different roles

---

## 📝 License

MIT License — free to use and modify.

---

## 👨‍💻 Author

Built as a Database Management Systems (DBMS) project demonstrating:
- Entity-Relationship modeling
- Strong and weak entities
- All relationship types (1:1, 1:N, M:N)
- All constraint types (PK, FK, UNIQUE, CHECK, NOT NULL, DEFAULT)
- Role-Based Access Control (RBAC)
- Full-stack web development