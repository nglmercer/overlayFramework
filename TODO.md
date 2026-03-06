# TODO — Profile / Instance Management

> Feature: Multi-device sync via instance profiles  
> Started: 2026-03-06

---

## 📦 Backend

### Step 1 — `backend/src/db.ts`

- [x] Add `profiles` store to the DB schema (`{ id, name, createdAt, lastSeen, color }`)
- [x] Bump DB version from `2` → `3`
- [x] Add `profiles` store proxy to `dbManager`
- [x] Add `saveProfile`, `getProfile`, `listProfiles`, `touchProfile`, `deleteProfile` helpers

### Step 2 — `backend/src/constants.ts`

- [x] Add ApiPath entries for profile routes:
  - `PROFILES: '/profiles'`
  - `PROFILE_BY_ID: '/profiles/:id'`
  - `PROFILE_EXPORT: '/profiles/:id/export'`
  - `PROFILE_IMPORT: '/profiles/:id/import'`

### Step 3 — `backend/src/routes/profiles.ts` _(NEW)_

- [x] `GET /profiles` — list all registered profiles
- [x] `GET /profiles/:id` — check if profile exists (200 / 404)
- [x] `POST /profiles/:id` — upsert profile metadata (register/update)
- [x] `GET /profiles/:id/export` — export full DB snapshot for that instance
- [x] `POST /profiles/:id/import` — import/merge data from a new device

### Step 4 — `backend/src/router.ts`

- [x] Import `registerProfileRoutes` from `./routes/profiles`
- [x] Call `registerProfileRoutes(router)` before `registerSystemRoutes`

---

## 🖥️ Frontend

### Step 5 — `src/lib/profile-manager.ts` _(NEW)_

- [x] Define `Profile` interface `{ id, name, createdAt, color? }`
- [x] `isFirstRun()` — returns `true` if no active profile in localStorage
- [x] `getActiveProfileId()` — returns current instanceId or null
- [x] `getActiveProfile()` — full profile object or null
- [x] `createProfile(name, color?)` — generates fresh instanceId, saves locally + backend
- [x] `setActiveProfile(id, name)` — link to an existing instance, verifies with backend
- [x] `switchProfile(id)` — switch locally without reload
- [x] `listProfiles()` — get all locally known profiles
- [x] `deleteLocalProfile(id)` — remove from localStorage list
- [x] `updateLocalProfile(id, updates)` — update name/color locally
- [x] `syncFromInstance(id)` — `GET /profiles/:id/export` → import into local IndexedDB
- [x] `pushToBackend()` — export local data → `POST /profiles/:id/import`

### Step 6 — `src/lib/config.ts`

- [x] Update `getInstanceId()` to read from `overlay-active-profile-id` key first
- [x] Keep legacy fallback for backward compat

### Step 7 — `src/components/profile/ProfileSetupModal.ts` _(NEW)_

- [x] Lit component `<app-profile-setup>`
- [x] Two-panel UI: "Sync existing" + "Create new"
- [x] "Sync existing" panel:
  - [x] Input for instance ID
  - [x] "Check" button → `GET /profiles/:id` (validates ID exists)
  - [x] Confirmation with instance preview info
  - [x] "Sync & Import" button → `syncFromInstance()`
- [x] "Create new" panel:
  - [x] Name input (pre-filled with device hint)
  - [x] Color picker (6 preset colors)
  - [x] "Create Profile" button → `createProfile()`
- [x] Emits `profile-ready` custom event when done

### Step 8 — `src/components/profile/ProfileSetupModal.css` _(NEW)_

- [x] Dark glassmorphism full-screen overlay
- [x] Two-column card layout
- [x] Smooth entrance animation

### Step 9 — `src/components/profile/ProfileSwitcher.ts` _(NEW)_

- [x] Dropdown showing active profile name + color dot
- [x] Lists all local profiles
- [x] "Switch" action → switch active profile + reload page
- [x] "Link another instance" action → emits `profile-add-requested`
- [x] "Push data to backend" action → calls `pushToBackend()`
- [x] Closes on outside click

### Step 10 — `src/components/index.ts`

- [x] Export/register `ProfileSetupModal` and `ProfileSwitcher`

### Step 11 — `src/main.ts`

- [x] Import `profileManager`
- [x] In `firstUpdated()`: check `profileManager.isFirstRun()`
- [x] If first run → set `currentView = 'profile-setup'`
- [x] Handle `profile-ready` event → proceed to dashboard
- [x] Handle `profile-add-requested` → open setup modal again
- [x] Add `'profile-setup'` case in `render()`

### Step 12 — `src/components/dashboard/Dashboard.ts`

- [x] Add `<app-profile-switcher>` to the header bar next to locale picker

---

## 🌐 Localization

### Step 13 — `src/locales/en.json`

- [ ] Add `profile.*` keys for all UI strings

### Step 14 — `src/locales/es.json`

- [ ] Spanish translations for all `profile.*` keys

---

## ✅ Validation / Tests

- [ ] Test: `ProfileManager.isFirstRun()` returns true on fresh localStorage
- [ ] Test: `ProfileManager.createProfile()` sets active ID in localStorage
- [ ] Test: Backend `GET /profiles/:id` returns 404 for unknown ID
- [ ] Test: Backend `GET /profiles/:id/export` returns full snapshot
- [ ] Test: Backend `POST /profiles/:id/import` merges data correctly
- [ ] Manual: Open on two browsers, create profile on one, sync on other

---

## 📋 Changelog entry

- [x] Written below

---

## 📊 Progress

| Section      | Done   | Total  |
| ------------ | ------ | ------ |
| Backend      | 10     | 10     |
| Frontend     | 22     | 22     |
| Localization | 0      | 4      |
| Tests        | 0      | 6      |
| **Total**    | **32** | **42** |
