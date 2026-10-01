# FTP Zones Implementation Design

**Date:** 2026-10-01  
**Project:** Bike Training Manager  
**Feature:** Add FTP-based training zones as alternative to LTHR

---

## 1. Overview

Currently the application supports LTHR (Lactate Threshold Heart Rate) based heart rate zones. Users set LTHR in their profile, and the training modal displays 7 zones (z1–z5c) calculated as percentages of LTHR, shown in bpm.

This feature adds FTP (Functional Threshold Power) as an alternative zone calculation method:
- Users can choose in their profile whether zones are based on **LTHR (bpm)** or **FTP (W)**
- When FTP is selected, the same 7 zone codes (z1–z5c) are used but calculated from Coggan's 7-level power zone model
- Zone codes remain unchanged in `training_zone_times` — no schema migration needed
- The statistics page uses a neutral title ("Tempo per zona") since the same codes apply to both methods

---

## 2. Database Changes (`schema.sql`)

```sql
-- users table additions
ftp INT DEFAULT NULL,
zone_method ENUM('lthr','ftp') DEFAULT 'lthr',
```

> Note: The user requested only `schema.sql` updates; the database will be recreated from scratch.

---

## 3. API Changes (`server/routes/profileRoutes.js`)

**GET /api/profile** — Add `ftp, zone_method` to SELECT.

**PUT /api/profile** — Add `ftp` and `zone_method` to UPDATE:
- `ftp`: parseInt, allow null
- `zone_method`: validate against `('lthr','ftp')`, default `'lthr'` (same pattern as `preferred_discipline || 'MTB'`)

---

## 4. Profile Page (`public/profile.html` + `public/js/profile.js`)

**HTML changes:**
- New form row with two fields side-by-side:
  - `FTP (W)` — number input, min 0, max 1200
  - `LTHR (bpm)` — existing field (moved to same row)
- New select `pZoneMethod` — "Riferimento per le zone":
  - `LTHR (bpm)`
  - `FTP (W)`

**JavaScript (`profile.js`):**
- On load: populate `pLthr`, `pFtp`, `pZoneMethod` from `currentUser`
- On submit: include `ftp: parseInt(...) || null` and `zone_method: select.value`

---

## 5. Training Zones (`public/js/trainings.js`)

**Zone definitions:**

```javascript
// Existing HR zones (unchanged values, renamed)
const HR_ZONE_DEFS = [
    { code: 'z1', name: 'Recupero', lo: 0, hi: 0.82 },
    { code: 'z2', name: 'Aerobico', lo: 0.82, hi: 0.89 },
    { code: 'z3', name: 'Tempo', lo: 0.89, hi: 0.94 },
    { code: 'z4', name: 'Sotto-soglia', lo: 0.94, hi: 1.0 },
    { code: 'z5a', name: 'Sopra-soglia', lo: 1.0, hi: 1.03 },
    { code: 'z5b', name: 'Capacità aerobica', lo: 1.03, hi: 1.06 },
    { code: 'z5c', name: 'Capacità anaerobica', lo: 1.06, hi: 999 }
];

// New Coggan 7-level power zones
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

**Functions:**
- `computeZoneBounds(value)` — unchanged, generic (uses only `def.lo`)
- `formatZoneRange(bounds, idx, unit)` — add `unit` parameter ('bpm' | 'W')
- `buildZoneSection(method, value)` — picks correct defs + unit + hint text:
  - method `'lthr'`: HR_ZONE_DEFS, 'bpm', hint "— imposta LTHR nel profilo"
  - method `'ftp'`: POWER_ZONE_DEFS, 'W', hint "— imposta FTP nel profilo"
- On `DOMContentLoaded`: call `buildZoneSection(currentUser.zone_method || 'lthr', currentUser.zone_method === 'ftp' ? currentUser.ftp : currentUser.lthr)`

---

## 6. Statistics Page (`public/js/statistics.js` + `public/statistics.html`)

- Card title: "Tempo per zona cardiaca" → "Tempo per zona"
- Empty state: "Nessun dato per le zone cardiache questo mese" → "Nessun dato per le zone questo mese"
- Zone labels/colors: unchanged — same 7 names for z1–z5c, shared between both methods
- No other changes needed (zone codes are identical)

---

## 7. Error Handling / Edge Cases

| Scenario | Behavior |
|----------|----------|
| `zone_method = 'ftp'` but `ftp` is null | Show hint "— imposta FTP nel profilo", no zones displayed |
| `zone_method = 'lthr'` but `lthr` is null | Show hint "— imposta LTHR nel profilo", no zones displayed (existing behavior) |
| `zone_method` missing/legacy value | Default to `'lthr'` |
| Invalid `zone_method` from client | Server validates, falls back to `'lthr'` |

---

## 8. Testing

No automated test framework in the repository. Manual verification steps:
1. Recreate database from `schema.sql`
2. Register/login a user
3. In Profile: set FTP = 250, select "FTP (W)" as zone reference, save
4. Open "Nuovo allenamento" modal → verify zones show in watts (e.g., Z1: 0–135 W, Z2: 141–172 W, etc.)
5. Switch profile to "LTHR (bpm)", set LTHR = 165, save
6. Reopen modal → verify zones show in bpm
7. Statistics page: verify title "Tempo per zona" and zone list works for both methods

---

## 9. Files to Modify

1. `schema.sql` — add `ftp`, `zone_method` to `users`
2. `server/routes/profileRoutes.js` — SELECT/UPDATE new fields
3. `public/profile.html` — add FTP input + zone method select
4. `public/js/profile.js` — handle new fields
5. `public/js/trainings.js` — add POWER_ZONE_DEFS, update buildZoneSection
6. `public/statistics.html` — update card title text
7. `public/js/statistics.js` — update empty-state text

---

## 10. Out of Scope

- Server-side zone computation endpoint (unnecessary: `checkAuth()` already returns full profile)
- Separate zone codes per method (unnecessary: 1-to-1 mapping works)
- Historical zone recalculation (zone codes are method-agnostic)