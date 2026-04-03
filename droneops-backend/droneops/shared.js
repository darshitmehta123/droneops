// ============================================================
//  shared.js — DroneOps frontend API connector
//  Every action now calls the real Node.js backend
//  which updates PostgreSQL in real time
// ============================================================

const API = 'http://localhost:3000/api';

// ── AUTH ──
function requireAuth() {
  if (sessionStorage.getItem('droneops_admin') !== 'true') {
    window.location.href = 'main.html';
  }
}
function doLogout() {
  sessionStorage.removeItem('droneops_admin');
  navigateTo('main.html');
}

// ── SMOOTH PAGE TRANSITION ──
function navigateTo(url) {
  document.body.style.transition = 'opacity .18s ease';
  document.body.style.opacity = '0';
  setTimeout(() => { window.location.href = url; }, 170);
}

// Intercept all nav-item clicks for smooth transition
document.addEventListener('click', e => {
  const link = e.target.closest('.nav-item');
  if (link && link.href && !link.href.includes(window.location.pathname.split('/').pop())) {
    e.preventDefault();
    navigateTo(link.href);
  }
});

// ── FETCH HELPER ──
async function api(method, path, body = null) {
  try {
    const role = sessionStorage.getItem('admin_role') || 'viewer';
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-role': role,          // sent with every request for permission check
        'x-admin-id':   sessionStorage.getItem('admin_id') || '',
      }
    };
    if (body) options.body = JSON.stringify(body);
    const res  = await fetch(API + path, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');

    // ── AUTO LOG SQL from server response ──
    if (data._sql) {
      (Array.isArray(data._sql) ? data._sql : [data._sql]).forEach(s => logSQL(s));
    } else {
      // Generate descriptive SQL from the request itself
      logSQL(buildSQLFromRequest(method, path, body));
    }

    return data;
  } catch (err) {
    toast(err.message, 'error');
    throw err;
  }
}

// Build a readable SQL description from API method + path
function buildSQLFromRequest(method, path, body) {
  const p = path.replace('/','');
  const parts = p.split('/');
  const table = parts[0];   // drones, orders, hubs, etc
  const id    = parts[1];   // optional ID

  // Map API paths to SQL
  if (method === 'GET') {
    if (table === 'drones')   return `SELECT d.*, h.hub_name, h.city FROM drone d JOIN hub h ON h.hub_id = d.hub_id ORDER BY d.drone_id;`;
    if (table === 'orders')   return `SELECT o.*, c.full_name AS customer_name, h.hub_name, h.city FROM "order" o JOIN customer c ON c.customer_id = o.customer_id JOIN hub h ON h.hub_id = o.hub_id ORDER BY o.placed_at DESC;`;
    if (table === 'hubs')     return `SELECT h.*, COUNT(d.drone_id) AS drone_count FROM hub h LEFT JOIN drone d ON d.hub_id = h.hub_id GROUP BY h.hub_id ORDER BY h.hub_id;`;
    if (table === 'packages') return `SELECT p.*, o.status AS order_status FROM package p JOIN "order" o ON o.order_id = p.order_id ORDER BY p.package_id;`;
    if (table === 'customers')return `SELECT * FROM customer ORDER BY customer_id;`;
    return `SELECT * FROM ${table};`;
  }
  if (method === 'POST') {
    const cols = body ? Object.keys(body).join(', ') : '...';
    const vals = body ? Object.values(body).map(v => typeof v === 'string' ? `'${v}'` : v).join(', ') : '...';
    return `INSERT INTO ${table.replace(/s$/,'')} (${cols}) VALUES (${vals}) RETURNING *;`;
  }
  if (method === 'PUT') {
    if (parts[2] === 'status')  return `UPDATE "order" SET status='${body?.status}', updated_at=NOW() WHERE order_id=${id};`;
    if (parts[2] === 'assign')  return body?.drone_id
      ? `UPDATE "order" SET assigned_drone_id=${body.drone_id}, status='confirmed', updated_at=NOW() WHERE order_id=${id};`
      : `UPDATE "order" SET assigned_drone_id=NULL, status='pending', updated_at=NOW() WHERE order_id=${id};`;
    if (parts[2] === 'dispatch')return `UPDATE "order" SET status='dispatched', updated_at=NOW() WHERE order_id=${id};
UPDATE drone SET status='in-flight' WHERE drone_id=(SELECT assigned_drone_id FROM "order" WHERE order_id=${id});`;
    const sets = body ? Object.entries(body).map(([k,v]) => `${k}=${typeof v==='string'?`'${v}'`:v}`).join(', ') : '...';
    return `UPDATE ${table.replace(/s$/,'')} SET ${sets} WHERE ${table.replace(/s$/,'')}_id=${id} RETURNING *;`;
  }
  if (method === 'DELETE') {
    return `DELETE FROM ${table.replace(/s$/,'')} WHERE ${table.replace(/s$/,'')}_id=${id};`;
  }
  return `${method} ${path}`;
}

const GET    = (path)       => api('GET',    path);
const POST   = (path, body) => api('POST',   path, body);
const PUT    = (path, body) => api('PUT',    path, body);
const DEL    = (path)       => api('DELETE', path);

// ── PERMISSION HELPERS ──
const ROLE_PERMISSIONS = {
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

function getRole()  { return sessionStorage.getItem('admin_role') || 'viewer'; }
function can(resource, action) {
  return ROLE_PERMISSIONS[getRole()]?.[resource]?.[action] === true;
}

// Show role badge in topbar
function getRoleBadge() {
  const role = getRole();
  const styles = {
    superadmin: 'color:#000;background:var(--accent);',
    admin:      'color:#000;background:var(--green);',
    viewer:     'color:var(--text2);background:rgba(255,255,255,.08);border:1px solid var(--border2);',
  };
  return `<span style="font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;padding:3px 10px;border-radius:20px;text-transform:uppercase;${styles[role]||styles.viewer}">${role}</span>`;
}

// Show a "no permission" toast instead of silently failing
function noPermission(action, resource) {
  const role = getRole();
  toast(`${role.charAt(0).toUpperCase()+role.slice(1)} role cannot ${action} ${resource}`, 'error');
}

// ── SQL LOG — uses localStorage so it persists across all pages ──
function logSQL(sql) {
  const ts   = new Date().toLocaleTimeString();
  const date = new Date().toLocaleDateString('en-IN');
  const logs = JSON.parse(localStorage.getItem('droneops_sqllog') || '[]');
  logs.unshift({ ts, date, sql });
  if (logs.length > 200) logs.pop();
  localStorage.setItem('droneops_sqllog', JSON.stringify(logs));
}
function getSQLLog()  {
  return JSON.parse(localStorage.getItem('droneops_sqllog') || '[]');
}
function clearSQLLog() {
  localStorage.removeItem('droneops_sqllog');
}
function fmtSQL(sql) {
  return sql
    .replace(/\b(SELECT|INSERT INTO|UPDATE|DELETE FROM|FROM|SET|WHERE|VALUES|JOIN|LEFT JOIN|ON|ORDER BY|LIMIT|AND|OR|RETURNING|GROUP BY|COUNT|NULL|NOW)\b/g,
      '<span class="kw">$1</span>')
    .replace(/'([^']*)'/g, "<span class='val'>'$1'</span>");
}

// ── HELPERS ──
function shortId(id) { return id || '—'; }
function statusBadge(s) {
  const map = {
    available:'green', delivered:'green', 'in-flight':'blue', 'in-transit':'blue',
    confirmed:'blue', dispatched:'blue', pending:'amber', charging:'amber',
    maintenance:'red', cancelled:'gray', failed:'red', retired:'gray'
  };
  return `<span class="badge badge-${map[s]||'gray'}">${s}</span>`;
}
function batteryBar(pct) {
  const color = pct > 60 ? 'var(--green)' : pct > 25 ? 'var(--amber)' : 'var(--red)';
  return `<div style="display:flex;align-items:center;gap:7px;">
    <div class="bar-wrap"><div class="bar-fill" style="width:${pct}%;background:${color};"></div></div>
    <span class="mono" style="font-size:11px;">${pct}%</span>
  </div>`;
}

// ── TOAST ──
function toast(msg, type = 'success') {
  const icons = { success:'✅', error:'❌', info:'ℹ️' };
  let container = document.getElementById('toasts');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.id = 'toasts';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span style="font-size:16px;">${icons[type]}</span>${msg}`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ── SIDEBAR ──
function buildSidebar(activePage) {
  const icons = {
    dashboard: `<svg width="16" height="16" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="10" height="10" rx="2" fill="currentColor" opacity="0.9"/><rect x="16" y="2" width="10" height="10" rx="2" fill="currentColor" opacity="0.5"/><rect x="2" y="16" width="10" height="10" rx="2" fill="currentColor" opacity="0.5"/><rect x="16" y="16" width="10" height="10" rx="2" fill="currentColor" opacity="0.7"/></svg>`,
    drones:    `<svg width="16" height="16" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="11" width="8" height="6" rx="1.5" fill="currentColor"/><ellipse cx="5" cy="9" rx="4" ry="1.8" stroke="currentColor" stroke-width="1.5"/><ellipse cx="23" cy="9" rx="4" ry="1.8" stroke="currentColor" stroke-width="1.5"/><ellipse cx="5" cy="19" rx="4" ry="1.8" stroke="currentColor" stroke-width="1.5"/><ellipse cx="23" cy="19" rx="4" ry="1.8" stroke="currentColor" stroke-width="1.5"/><line x1="10" y1="12.5" x2="5" y2="9" stroke="currentColor" stroke-width="1.2"/><line x1="18" y1="12.5" x2="23" y2="9" stroke="currentColor" stroke-width="1.2"/><line x1="10" y1="15.5" x2="5" y2="19" stroke="currentColor" stroke-width="1.2"/><line x1="18" y1="15.5" x2="23" y2="19" stroke="currentColor" stroke-width="1.2"/><line x1="14" y1="17" x2="14" y2="21" stroke="currentColor" stroke-width="1" stroke-dasharray="1.5 1"/><rect x="11.5" y="21" width="5" height="3.5" rx="1" fill="currentColor" opacity="0.7"/></svg>`,
    hubs:      `<svg width="16" height="16" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 3L25 9V19L14 25L3 19V9L14 3Z" stroke="currentColor" stroke-width="1.5"/><circle cx="14" cy="14" r="3" fill="currentColor"/><line x1="14" y1="11" x2="14" y2="3" stroke="currentColor" stroke-width="1" opacity="0.5"/><line x1="14" y1="17" x2="14" y2="25" stroke="currentColor" stroke-width="1" opacity="0.5"/><line x1="11.4" y1="12.5" x2="4.5" y2="8.5" stroke="currentColor" stroke-width="1" opacity="0.5"/><line x1="16.6" y1="15.5" x2="23.5" y2="19.5" stroke="currentColor" stroke-width="1" opacity="0.5"/><line x1="16.6" y1="12.5" x2="23.5" y2="8.5" stroke="currentColor" stroke-width="1" opacity="0.5"/><line x1="11.4" y1="15.5" x2="4.5" y2="19.5" stroke="currentColor" stroke-width="1" opacity="0.5"/></svg>`,
    orders:    `<svg width="16" height="16" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="20" height="20" rx="2.5" stroke="currentColor" stroke-width="1.5"/><line x1="8" y1="10" x2="20" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="8" y1="14" x2="17" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="8" y1="18" x2="13" y2="18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="21" cy="18" r="4" fill="#0a0c0f" stroke="currentColor" stroke-width="1.2"/><polyline points="19,18 20.5,19.5 23,17" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    assign:    `<svg width="16" height="16" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="14" r="4" stroke="currentColor" stroke-width="1.5"/><circle cx="20" cy="7" r="3.5" fill="currentColor" opacity="0.8"/><circle cx="20" cy="21" r="3.5" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="13" x2="16.5" y2="9" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 1.5"/><line x1="12" y1="15" x2="16.5" y2="19" stroke="currentColor" stroke-width="1.2"/><polyline points="14.5,17 16.5,19 14.5,21" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    packages:  `<svg width="16" height="16" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 3L24 8V20L14 25L4 20V8L14 3Z" stroke="currentColor" stroke-width="1.5"/><line x1="14" y1="3" x2="14" y2="25" stroke="currentColor" stroke-width="1" opacity="0.4"/><line x1="4" y1="8" x2="24" y2="8" stroke="currentColor" stroke-width="1" opacity="0.4"/><line x1="9" y1="5.5" x2="9" y2="16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/><path d="M9 5.5 L14 3 L19 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    sqllog:    `<svg width="16" height="16" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="22" height="22" rx="3" stroke="currentColor" stroke-width="1.5"/><line x1="3" y1="9" x2="25" y2="9" stroke="currentColor" stroke-width="1" opacity="0.4"/><circle cx="6.5" cy="6" r="1" fill="currentColor" opacity="0.6"/><circle cx="10" cy="6" r="1" fill="currentColor" opacity="0.4"/><circle cx="13.5" cy="6" r="1" fill="currentColor" opacity="0.2"/><polyline points="7,14 10,17 7,20" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><line x1="13" y1="20" x2="21" y2="20" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity="0.7"/></svg>`,
  };
  const links = [
    { group:'Overview',   items:[{ href:'dashboard.html', icon:icons.dashboard, label:'Dashboard',    key:'dashboard' }] },
    { group:'Fleet',      items:[
      { href:'drones.html',   icon:icons.drones,   label:'Drones',        key:'drones'   },
      { href:'hubs.html',     icon:icons.hubs,     label:'Hubs',          key:'hubs'     },
    ]},
    { group:'Operations', items:[
      { href:'orders.html',   icon:icons.orders,   label:'Orders',        key:'orders'   },
      { href:'assign.html',   icon:icons.assign,   label:'Assign Drones', key:'assign'   },
      { href:'packages.html', icon:icons.packages, label:'Packages',      key:'packages' },
    ]},
    { group:'System',     items:[
      { href:'sqllog.html',   icon:icons.sqllog,   label:'SQL Log',       key:'sqllog'   },
    ]},
  ];
  const navHtml = links.map(g => `
    <div class="nav-section">${g.group}</div>
    ${g.items.map(i => `
      <a class="nav-item ${activePage===i.key?'active':''}" href="${i.href}">
        <span class="icon" style="display:flex;align-items:center;color:currentColor;">${i.icon}</span>${i.label}
      </a>`).join('')}
  `).join('');
  return `
    <aside class="sidebar">
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon" style="background:transparent;">
          <img src="logo.svg" style="width:32px;height:32px;object-fit:contain;"/>
        </div>
        <div class="sidebar-logo-text">Drone<span>Ops</span></div>
      </div>
      <nav class="sidebar-nav">${navHtml}</nav>
      <div class="sidebar-footer">
        <div class="admin-badge">
          <div class="admin-avatar">AD</div>
          <div class="admin-info">
            <div class="name">${sessionStorage.getItem('admin_name')||'Admin'}</div>
            <div class="role">${(sessionStorage.getItem('admin_role')||'superadmin').toUpperCase()}</div>
          </div>
        </div>
        <button class="logout-btn" onclick="doLogout()">⏏ LOGOUT</button>
      </div>
    </aside>`;
}
function buildTopbar(pageTitle) {
  return `
    <div class="topbar">
      <div class="topbar-title">DroneOps <span>/ ${pageTitle}</span></div>
      <div class="topbar-right">
        ${getRoleBadge()}
        <div class="status-dot"></div>
        <div class="topbar-db">postgres://localhost:5432/droneops</div>
      </div>
    </div>`;
}
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }