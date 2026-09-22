# Cell Ministry App — Christ Embassy Campus Ministry

All files are flat in this one folder — no subfolders — so it can be deployed as-is.

## Recent fixes

- **Hero headline is now mega-bold**: huge, tight-leading, ultra-bold display type (inspired by a bold reference landing page you shared), with small floating accent badges around it and a stat line ("Built for 5 groups and 26 chapters...") beneath the subtitle.
- **Two real photos added**: a cell-meeting photo now anchors a full-bleed "This is what a cell meeting looks like" band right under the hero, and a community group photo now fills the avatar in the "Anyone in the ministry" section — both are the images you uploaded, resized and compressed for web (`community-cell.jpg`, `community-group.jpg`). The other two persona sections (Cell Leaders, Administrators) keep icon-style avatars, not photos, per your note that icon/illustrated avatars are fine there.
- Added a two-card intro block (pink + black) right under the hero for extra visual punch, matching the reference layout's card pairing.
- **Landing page redesign**: bolder, more colorful visual language (sticker badges, a scrolling group-name marquee, alternating full-bleed color panels for each feature, big persona sections for Cell Leaders/Administrators/anyone new, a giant ghost-text footer wordmark). One deliberate change from the reference style: it avoids the word "magic" for a church product, using bold color and energy instead to keep the tone appropriate for a ministry audience.
- **Sidebar is now theme-aware**: it used to be hardcoded dark navy in both light and dark mode. It now switches to a light surface in light mode and back to navy in dark mode, using the same token system as the rest of the app (`--sidebar-bg`, `--sidebar-text`, etc. in `style.css`).
- **Sidebar can now collapse on desktop**: a toggle button in the sidebar header shrinks it to an icon-only rail (with hover tooltips) and remembers the choice across page loads (`components.js`, `initSidebarCollapse`). Mobile keeps its existing drawer behavior.
- **Renamed** the app to **Cell Ministry App** throughout (nav/sidebar brand, page titles).
- **Fixed a real bug**: `leader-dashboard.html`, `admin-dashboard.html`, `admin-groups.html`, `admin-group-detail.html`, `index.html`, `login.html` and `register.html` weren't all loading the same three stylesheets, which caused the oversized logo in the sidebar drawer and the boxy/bordered dark-mode toggle button. Every page now loads `style.css` + `components.css` + `responsive.css` consistently.
- **Fixed dark mode text visibility**: headings, summary card values, and a few other text colors were hardcoded to `--navy-950` (a fixed dark navy that never changes), so they were invisible against dark backgrounds. They now use the theme-aware `--ink-900` token; `--navy-950` is reserved for intentionally-always-dark surfaces (sidebar in dark mode, primary buttons, toasts).
- **Fixed the mobile topbar overlap**: the topbar had a fixed height, so a wrapping greeting (long name + emoji) would overflow and overlap the content below. It's now auto-height, the profile name/role text collapses to just the avatar on mobile, and the greeting/icons shrink slightly on small screens.
- Added a thin custom sidebar scrollbar (native scrollbar was bulky), a left accent bar on the active sidebar link, and body-scroll-lock while the mobile drawer is open.

## What's working now

- **Landing page** (`index.html`) — nav, hero, features, how-it-works flow, real Group/Chapter counts, CTA, footer. Dark mode toggle. No animated hero visual yet — waiting on what you send next.
- **Login** (`login.html`) — simplified centered card, role selector (Cell Leader / Administrator), show/hide password, loading + success state, inline validation, forgot-password modal (honest "not connected yet" message, no fake reset), "Continue with Google" button (shows an honest message — no fake success; wire up a real OAuth provider later), link to registration.
- **Registration** (`register.html`) — Cell Leader signups pick a real Group → Chapter (cascading selects) and name their cell; Administrator signups skip those fields. Validates required fields, email format, password match/length, and duplicate email. **A Cell Leader registration actually creates a real cell + leader record**, so the new account's dashboard is immediately populated instead of empty.
- **Cell Leader Dashboard** (`leader-dashboard.html`) — dynamic greeting with rotating tips, profile dropdown (avatar/name/role → Profile, Account Settings, Help, Sign Out), 5 summary cards, attendance trend chart, recent activities, quick actions. Shows a clean empty state if no cell is linked yet.
- **Administrator Dashboard** (`admin-dashboard.html`) — greeting + rotating tip, profile dropdown, ministry-wide stats (cells, leaders, members, average attendance, total offering, groups, chapters, reports submitted), cells-by-chapter bar chart, cell-status donut, "cells needing attention" table — all with graceful empty states since no cells exist yet.
- **Admin → Groups** (`admin-groups.html`) — the 5 real groups as cards with live stats, linking into:
- **Admin → Group detail** (`admin-group-detail.html?group=<id>`) — real chapters for that group with per-chapter cell/member counts.
- **Dark mode** — a real dark navy palette (not an inversion), no flash on load (theme is applied by an inline script in `<head>` before paint, reads `localStorage` then falls back to `prefers-color-scheme`), toggle button on every page, persists across pages.
- **Authentication** (`auth.js`) — `login()`, `logout()`, `getCurrentUser()`, `requireAuth()`, `requireRole()`, `isAdmin()`, `isCellLeader()`, `redirectByRole()`, a `PERMISSIONS` map per role, and `hasPermission()`. Session is stored via `localStorage` (Remember me) or `sessionStorage` (not checked), never both. All of it is clearly commented as frontend-only.

## Real ministry data

`data.js` now contains the actual supplied structure — nothing invented:

- **NAU GROUP** → BLW NAU 1, BLW NAU 2, BLW SOPA, BLW CHS
- **GRACE GROUP** → BLW ULI, BLW IGBARIAM, BLW LEGACY, BLW UMUNZE, BLW TANSIAN, BLW NOCEN, BLW MTI, BLW GRUNDTVIG
- **SUPERNATURAL GROUP** → BLW UNEC, BLW ESUT, BLW PARKLANE, BLW ESECT, BLW DENTAL
- **UNN GROUP** → BLW UNN 1, BLW UNN 2, BLW SUMAS, BLW MADUKA, BLW PACESETTERS CHURCH NSUKKA
- **LUXURIANT GROUP** → BLW EBSU, BLW FUNAI, BLW DUFUS, BLW SITs

Cells, leaders and members are **not yet supplied**, so those arrays start empty — every page shows a proper empty state instead of invented records. They fill in naturally as Cell Leaders register (which creates a real cell) or as future Admin "Add Cell" flows are built.

## Branding

`blw-logo.png` is the app logo — used small (not oversized) in the landing nav, login/register icon, and browser tab context. Dashboards intentionally keep it out of the way so the user's own data leads.

## Still to build (next stages)

This stage focused on the foundation (real data, auth, dark mode, dashboards, Groups). Still queued, in roughly this order:

- Cell Leader: My Cell, Members (+ Member Profile), Attendance, Offerings, Growth, Activities, Reports, Notifications, Settings, Profile
- Admin: Chapter detail, Cells, Cell Leaders, Members, Attendance, Offerings, Growth, Activities, Reports, Analytics, Notifications, Settings, Profile
- "Complete Your Profile" onboarding step for Google sign-in, once a real OAuth provider is connected
- A working "+ Add Cell" flow from the Group/Chapter detail pages

Every sidebar/bottom-nav link to a page that isn't built yet shows a small "This section isn't available yet" toast rather than a dead link or a "Coming Soon" label.

## Data architecture

Everything reads and writes through named functions in `data.js` (`getGroups`, `getChapters`, `getGroupStats`, `addCell`, `addLeader`, `addMember`, `recordAttendance`, `submitReport`, etc.) — never through the underlying `demoData` object directly. To connect a real backend later, keep every function's name and signature the same and replace each body with an API/database call; no other file should need to change.

## Security note

Authentication is entirely client-side and **not secure** — it exists only to demonstrate the UI flow (this is called out directly in the `auth.js` comments). Real authentication, role-based permissions, validation, and database security rules must be implemented server-side before any real deployment.
