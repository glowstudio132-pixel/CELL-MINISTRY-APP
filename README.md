# Campus Ministry BLW Zone B: Cell Management Platform

A web app for the 5 groups and 26 chapters of Campus Ministry BLW Zone B. Cell leaders run their
cell (members, attendance, first timers, offerings, activities and photos, weekly reports, growth
trends). Group and Zonal administrators see the figures for their scope.

The site files sit in one flat folder (plus `supabase/schema.sql`), so it can be hosted as-is on any static host.

## Get it running

**Read [`SETUP.md`](SETUP.md).** In short: create a Supabase project, run
`supabase/schema.sql`, paste your two keys into `supabase-config.js`, turn on Google sign-in,
upload the folder, and invite your first administrator.

## How it works

- **Frontend:** plain HTML, CSS and JavaScript (no build step).
- **Database, login and photo storage:** Supabase (Postgres, Auth, Storage).
- **Sign in:** email + password, or Google. Roles come from the database. Administrators are
  invited by email and cannot be self-registered.
- **Security:** Row Level Security in the database. A cell leader only receives their own cell's
  data; a group administrator only their group's; a zonal administrator everything. The 30-minute
  report edit window and the 3-photos-per-activity limit are also enforced there.
- **No ministry data in the browser.** The browser only keeps the Supabase sign-in token and two
  display preferences (light/dark theme, sidebar collapsed).

## Files

| File | Purpose |
| --- | --- |
| `supabase/schema.sql` | Tables, security rules, storage buckets, seed groups and chapters |
| `supabase-config.js` | Your Supabase URL and anon key (you fill these in) |
| `auth.js` | Sign in/up/out, Google, password reset, page bootstrap (`bootPage`) |
| `data.js` | Loads data from Supabase into memory; reads are instant, writes are saved to the database |
| `login.html`, `register.html`, `complete-profile.html`, `reset-password.html` | Account pages |
| `leader-*.html` | Cell Leader portal: dashboard, My Cell, members, attendance, offerings, growth, activities, reports, notifications, settings |
| `admin-*.html` | Administrator portal: dashboard, groups, chapters, cells, leaders, members, attendance, offerings, growth, activities, reports, analytics, notifications, settings |
| `components.js`, `charts.js`, `utils.js`, `theme.js`, `app.js` | Shared UI code |
| `style.css`, `components.css`, `responsive.css` | Styles |

## Feature notes

- **Attendance:** Wednesday, Sunday, Friday Prayer Meeting and Leaders Meeting (leaders only), by week.
  Past days can be reopened and edited. First timers are submitted once per week.
- **Reports:** can be corrected for 30 minutes after submitting, until an administrator reviews them.
- **Activities:** up to 3 photos per activity, visible to the cell's administrators.
- **Growth (leader and admin):** weekly trends for members, first timers, offerings and attendance rate.
- **Profile:** name, phone and a profile picture can be edited. Email is the login and is read-only.
