# FTP Zones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add FTP-based training zones as an alternative to LTHR. Users select the zone reference (LTHR or FTP) in their profile; training modal shows zones in bpm or watts accordingly; statistics page uses neutral title.

**Architecture:** Client-side zone computation using two zone definition tables (HR_ZONE_DEFS for LTHR, POWER_ZONE_DEFS for FTP). Profile stores `ftp` (watts) and `zone_method` ('lthr'|'ftp'). No schema migration needed — zone codes z1–z5c shared. Statistics page unchanged except title/text.

**Tech Stack:** Node.js (Express), MySQL, vanilla JS frontend, no test framework.

## Global Constraints

- Only modify `schema.sql` (no ALTER TABLE; DB recreated from scratch)
- Server-side validation: `zone_method` must be `'lthr'` or `'ftp'`, default `'lthr'`
- `computeZoneBounds(value)` stays generic (uses only `def.lo`)
- Zone names/codes identical for both methods (z1–z5c)
- No new API endpoints; `checkAuth()` already returns full profile
- Manual verification only (no test framework in repo)

---

### Task 1: Update Database Schema

**Files:**
- Modify: `schema.sql:1-15`

**Interfaces:**
- Produces: `users` table with new columns `ftp INT DEFAULT NULL`, `zone_method ENUM('lthr','ftp') DEFAULT 'lthr'`

- [ ] **Step 1: Edit schema.sql to add columns to users table**

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    weight DECIMAL(4,1),
    height DECIMAL(4,1),
    lthr INT DEFAULT NULL,
    ftp INT DEFAULT NULL,
    zone_method ENUM('lthr','ftp') DEFAULT 'lthr',
    preferred_discipline ENUM('MTB','strada','gravel','indoor') DEFAULT 'MTB',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

- [ ] **Step 2: Commit**

```bash
git add schema.sql
git commit -m "db: add ftp and zone_method to users table"
```

---

### Task 2: Update Profile API Routes

**Files:**
- Modify: `server/routes/profileRoutes.js:1-52`

**Interfaces:**
- Consumes: `db` (MySQL pool), `authenticateToken` middleware
- Produces: GET `/api/profile` returns `{ ftp, zone_method }`; PUT `/api/profile` accepts `ftp` (int|null), `zone_method` ('lthr'|'ftp')

- [ ] **Step 1: Modify GET /api/profile SELECT to include new columns**

```javascript
const [rows] = await db.execute(
    'SELECT id, first_name, last_name, email, weight, height, lthr, ftp, zone_method, preferred_discipline, created_at FROM users WHERE id = ?',
    [req.user.userId]
);
```

- [ ] **Step 2: Modify PUT /api/profile to accept and validate ftp and zone_method**

```javascript
const { first_name, last_name, weight, height, lthr, ftp, zone_method, preferred_discipline } = req.body;
const validatedZoneMethod = (zone_method === 'ftp' || zone_method === 'lthr') ? zone_method : 'lthr';
await db.execute(
    'UPDATE users SET first_name = ?, last_name = ?, weight = ?, height = ?, lthr = ?, ftp = ?, zone_method = ?, preferred_discipline = ? WHERE id = ?',
    [first_name, last_name, weight || null, height || null, lthr || null, parseInt(ftp) || null, validatedZoneMethod, preferred_discipline || 'MTB', req.user.userId]
);
```

- [ ] **Step 3: Commit**

```bash
git add server/routes/profileRoutes.js
git commit -m "api: add ftp and zone_method to profile endpoints"
```

---

### Task 3: Update Profile HTML

**Files:**
- Modify: `public/profile.html:1-129`

**Interfaces:**
- Consumes: None (static HTML)
- Produces: Form with FTP input and zone method select

- [ ] **Step 1: Replace the form-row with LTHR (lines 68-83) to include FTP input and zone method select**

```html
<div class="form-row">
    <div class="form-group">
        <label for="pLthr"><i class="fa-solid fa-heart-pulse"></i> LTHR (bpm)</label>
        <input type="number" id="pLthr" class="form-control" min="0" max="210" placeholder="Frequenza cardiaca di soglia">
    </div>
    <div class="form-group">
        <label for="pFtp"><i class="fa-solid fa-bolt"></i> FTP (W)</label>
        <input type="number" id="pFtp" class="form-control" min="0" max="1200" placeholder="Potenza di soglia">
    </div>
</div>
<div class="form-row">
    <div class="form-group">
        <label for="pZoneMethod"><i class="fa-solid fa-gauge"></i> Riferimento per le zone</label>
        <select id="pZoneMethod" class="form-control">
            <option value="lthr">LTHR (bpm)</option>
            <option value="ftp">FTP (W)</option>
        </select>
    </div>
    <div class="form-group">
        <label for="pDiscipline"><i class="fa-solid fa-person-biking"></i> Disciplina preferita</label>
        <select id="pDiscipline" class="form-control">
            <option value="MTB">MTB</option>
            <option value="strada">Strada</option>
            <option value="gravel">Gravel</option>
            <option value="indoor">Indoor</option>
        </select>
    </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add public/profile.html
git commit -m "ui: add FTP input and zone method selector to profile"
```

---

### Task 4: Update Profile JavaScript

**Files:**
- Modify: `public/js/profile.js:1-84`

**Interfaces:**
- Consumes: `currentUser` from `checkAuth()` (has `ftp`, `zone_method`)
- Produces: Form populated with new fields; submit sends `ftp` and `zone_method`

- [ ] **Step 1: Populate new fields on load (after line 16)**

```javascript
document.getElementById('pFtp').value = currentUser.ftp || '';
document.getElementById('pZoneMethod').value = currentUser.zone_method || 'lthr';
```

- [ ] **Step 2: Include new fields in submit data (replace lines 21-28)**

```javascript
const data = {
    first_name: document.getElementById('pFirstName').value,
    last_name: document.getElementById('pLastName').value,
    weight: parseFloat(document.getElementById('pWeight').value) || null,
    height: parseFloat(document.getElementById('pHeight').value) || null,
    lthr: parseInt(document.getElementById('pLthr').value) || null,
    ftp: parseInt(document.getElementById('pFtp').value) || null,
    zone_method: document.getElementById('pZoneMethod').value,
    preferred_discipline: document.getElementById('pDiscipline').value
};
```

- [ ] **Step 3: Commit**

```bash
git add public/js/profile.js
git commit -m "js: handle FTP and zone_method in profile form"
```

---

### Task 5: Update Training Zones Logic

**Files:**
- Modify: `public/js/trainings.js:1-355`

**Interfaces:**
- Consumes: `currentUser` (has `lthr`, `ftp`, `zone_method`), `ZONE_DEFS` (renamed)
- Produces: `HR_ZONE_DEFS`, `POWER_ZONE_DEFS`, updated `buildZoneSection(method, value)`

- [ ] **Step 1: Rename ZONE_DEFS to HR_ZONE_DEFS and add POWER_ZONE_DEFS (replace lines 39-47)**

```javascript
const HR_ZONE_DEFS = [
    { code: 'z1', name: 'Recupero', lo: 0, hi: 0.82 },
    { code: 'z2', name: 'Aerobico', lo: 0.82, hi: 0.89 },
    { code: 'z3', name: 'Tempo', lo: 0.89, hi: 0.94 },
    { code: 'z4', name: 'Sotto-soglia', lo: 0.94, hi: 1.0 },
    { code: 'z5a', name: 'Sopra-soglia', lo: 1.0, hi: 1.03 },
    { code: 'z5b', name: 'Capacità aerobica', lo: 1.03, hi: 1.06 },
    { code: 'z5c', name: 'Capacità anaerobica', lo: 1.06, hi: 999 }
];

const POWER_ZONE_DEFS = [
    { code: 'z1', name: 'Recupero', lo: 0, hi: 0.54 },
    { code: 'z2', name: 'Aerobico', lo: 0.56, hi: 0.69 },
    { code: 'z3', name: 'Tempo', lo: 0.70, hi: 0.84 },
    { code: 'z4', name: 'Sotto-soglia', lo: 0.85, hi: 1.03 },
    { code: 'z5a', name: 'Sopra-soglia', lo: 1.05, hi: 1.20 },
    { code: 'z5b', name: 'Capacità aerobica', lo: 1.20, hi: 1.40 },
    { code: 'z5c', name: 'Capacità anaerobica', lo: 1.40, hi: 999 }
];
```

- [ ] **Step 2: Update formatZoneRange to accept unit parameter (replace lines 56-63)**

```javascript
function formatZoneRange(bounds, idx, unit) {
    if (!bounds) return '';
    const lo = bounds[idx];
    const hi = bounds[idx + 1];
    const u = unit || 'bpm';
    if (idx === 0) return '0-' + hi + ' ' + u;
    if (hi === Infinity) return '> ' + lo + ' ' + u;
    return (lo + 1) + '-' + hi + ' ' + u;
}
```

- [ ] **Step 3: Update buildZoneSection to accept method and value, pick correct defs/unit/hint (replace lines 65-88)**

```javascript
function buildZoneSection(method, value) {
    const container = document.getElementById('zoneSection');
    const isFTP = method === 'ftp';
    const defs = isFTP ? POWER_ZONE_DEFS : HR_ZONE_DEFS;
    const unit = isFTP ? 'W' : 'bpm';
    const hint = isFTP ? 'imposta FTP nel profilo' : 'imposta LTHR nel profilo';
    const icon = isFTP ? 'fa-bolt' : 'fa-heart-pulse';
    const label = isFTP ? 'Zone di potenza' : 'Zone cardiache';

    if (!value) {
        container.innerHTML = '<div class="zone-section"><div class="zone-header" style="cursor:default;color:#6C757D;"><i class="fa-solid ' + icon + '"></i> ' + label + ' <small style="font-weight:400;">— ' + hint + '</small></div></div>';
        return;
    }
    const bounds = computeZoneBounds(value);
    let html = '<div class="zone-section"><div class="zone-header" onclick="toggleZoneSection()"><i class="fa-solid ' + icon + '"></i> ' + label + ' <span class="zone-toggle">&#9654;</span></div><div class="zone-body hidden">';
    defs.forEach((def, idx) => {
        html += '<div class="zone-row" data-zone="' + def.code + '">' +
            '<span class="zone-badge">' + def.code + '</span>' +
            '<span class="zone-name">' + def.name + '</span>' +
            '<span class="zone-range">' + formatZoneRange(bounds, idx, unit) + '</span>' +
            '<input type="number" class="zone-h" min="0" step="1" placeholder="h">' +
            '<span class="zone-unit">h</span>' +
            '<input type="number" class="zone-m" min="0" max="59" step="1" placeholder="m">' +
            '<span class="zone-unit">m</span>' +
            '<input type="number" class="zone-s" min="0" max="59" step="1" placeholder="s">' +
            '<span class="zone-unit">s</span>' +
            '</div>';
    });
    html += '</div></div>';
    container.innerHTML = html;
}
```

- [ ] **Step 4: Update DOMContentLoaded to call buildZoneSection with currentUser values (replace line 313)**

```javascript
const method = currentUser.zone_method || 'lthr';
const value = method === 'ftp' ? currentUser.ftp : currentUser.lthr;
buildZoneSection(method, value);
```

- [ ] **Step 5: Commit**

```bash
git add public/js/trainings.js
git commit -m "js: add POWER_ZONE_DEFS and update zone section for FTP/LTHR"
```

---

### Task 6: Update Statistics Page HTML

**Files:**
- Modify: `public/statistics.html:1-...`

**Interfaces:**
- Consumes: None
- Produces: Updated card title and empty state text

- [ ] **Step 1: Change card title (line 83 in statistics.html)**

```html
<div class="card-title"><i class="fa-solid fa-gauge-high"></i> Tempo per zona</div>
```

- [ ] **Step 2: Commit**

```bash
git add public/statistics.html
git commit -m "ui: neutral zone title in statistics"
```

---

### Task 7: Update Statistics JavaScript

**Files:**
- Modify: `public/js/statistics.js:1-146`

**Interfaces:**
- Consumes: None
- Produces: Updated empty state message

- [ ] **Step 1: Change empty state text (replace line 83)**

```javascript
document.getElementById('zoneChart').innerHTML = '<div class="empty-state"><p>Nessun dato per le zone questo mese.</p></div>';
```

- [ ] **Step 2: Commit**

```bash
git add public/js/statistics.js
git commit -m "js: neutral empty state for zones in statistics"
```

---

### Task 8: Manual Verification

**Files:** (none)

- [ ] **Step 1: Recreate database from schema.sql**

```bash
mysql -u root -p < schema.sql
```

- [ ] **Step 2: Start server**

```bash
npm start
# or: node server/server.js
```

- [ ] **Step 3: Register/login, set FTP=250, zone_method=ftp, verify zones in watts**

Open http://localhost:3000/trainings.html → "Nuovo allenamento" → check Z1 shows ~0-135 W, Z2 ~141-172 W, etc.

- [ ] **Step 4: Switch to LTHR, set LTHR=165, verify zones in bpm**

Profile → "LTHR (bpm)" → save → trainings → check Z1 shows ~0-135 bpm, etc.

- [ ] **Step 5: Check statistics page title shows "Tempo per zona"**

http://localhost:3000/statistics.html

- [ ] **Step 6: Commit verification note (optional)**

```bash
git commit --allow-empty -m "test: manual verification passed for FTP zones"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Every spec section (1-10) maps to tasks 1-8
- [x] **No placeholders:** All code blocks are complete, no "TBD" or "similar to"
- [x] **Type consistency:** `zone_method` is string 'lthr'|'ftp'; `ftp` is int|null; `value` passed to `buildZoneSection` is number|null
- [x] **Task granularity:** Each task is one logical unit with testable outcome
- [x] **File paths exact:** All paths match the repo structure