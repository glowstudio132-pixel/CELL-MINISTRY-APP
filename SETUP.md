# Setting up the live app (Supabase + Google sign-in)

The app is plain HTML/CSS/JavaScript, with **Supabase** as its database, login
system and photo storage. Follow these steps once. It takes about 20 minutes.

> Do these in order. Steps 1 to 4 are only clicking and pasting. No coding.

---

## 1. Create the Supabase project

1. Go to <https://supabase.com>, sign in, and click **New project**.
2. Pick a name (e.g. `campus-ministry-blw-zone-b`), set a **database password**
   (save it somewhere safe), choose the region nearest your users, and click
   **Create new project**. Wait about two minutes.

## 2. Create the database

1. In your project, open **SQL Editor > New query**.
2. Open the file `supabase/schema.sql` from this folder, copy **everything**,
   paste it into the editor, and click **Run**.
3. You should see "Success. No rows returned". It is safe to run again later.

This creates every table (cells, members, attendance, first timers, offerings,
activities, activity photos, reports), the 5 groups and 26 chapters, the
security rules (Row Level Security), and two private photo buckets.

> **Already ran `schema.sql` before this update?** Also run `supabase/speed-patch.sql` once
> (same place, same way). It makes the security rules fast on large tables. Fresh installs
> don't need it, because `schema.sql` already includes it.

## 3. Connect the app to Supabase

1. Open **Project Settings > API**.
2. Copy the **Project URL** and the **anon public** key.
3. Open `supabase-config.js` in this folder and paste them in place of the two
   `PASTE_...` values. (Never paste the `service_role` key anywhere in the app.)

## 4. Turn on Google sign-in

1. Go to <https://console.cloud.google.com> and create (or pick) a project.
2. **APIs & Services > OAuth consent screen**: choose *External*, fill in the app
   name (Campus Ministry BLW Zone B) and your email, and save.
3. **APIs & Services > Credentials > Create credentials > OAuth client ID**:
   - Application type: **Web application**
   - **Authorized redirect URIs**: add
     `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
     (Supabase shows the exact address on its Google provider page, next to a copy button.)
   - Click **Create** and copy the **Client ID** and **Client secret**.
4. In Supabase: **Authentication > Providers > Google**. Switch it on, paste the
   Client ID and Client secret, and save.
5. In Supabase: **Authentication > URL Configuration**:
   - **Site URL**: your website address (e.g. `https://campus-blw.netlify.app`).
   - **Redirect URLs**: add `https://your-site/login.html` and
     `https://your-site/reset-password.html`. For testing on your own computer also add
     `http://localhost:5500/login.html` and `http://localhost:5500/reset-password.html`.

**Email + password sign-in** is already on. Leave **Authentication > Providers > Email >
Confirm email** switched **on**: it makes sure people really own the email they sign up with
(this also protects the administrator invitations below).

## 5. Put the site online

The folder is a static website. Upload it as it is to any static host, for example
**Netlify** (drag the folder onto <https://app.netlify.com/drop>), Cloudflare Pages,
Vercel or GitHub Pages. Use the address it gives you in step 4.5.

To try it on your own computer first, run `python3 -m http.server 5500` inside the
folder (or use the VS Code "Live Server" extension) and open `http://localhost:5500`.
Opening the files by double-click will **not** work, because Google needs a real web address.

## 6. Make the first administrator

Administrators are never created from the sign-up page (otherwise anyone could make
themselves one). You invite them by email. In **SQL Editor** run:

```sql
-- Zonal administrator: sees every group
insert into public.admin_invites (email, admin_type)
values ('your-email@example.com', 'zonal_admin');

-- Group administrator: sees one group (nau, grace, supernatural, unn or luxuriant)
insert into public.admin_invites (email, admin_type, group_id)
values ('group-admin@example.com', 'group_admin', 'nau');
```

Then that person signs in at `login.html` with **Google or email + password using that exact
email**. They land on the Administrator dashboard automatically. The email must be verified
(Google emails always are; for email + password they click the confirmation link first).

To remove someone's admin access later:

```sql
update public.profiles set role = 'cell_leader', admin_type = null, group_id = null
where email = 'person@example.com';
```

## How people use it

- **Cell leaders** open `register.html` (email) or press *Sign up with Google*, choose
  their group, chapter and cell name, and start working. With Google, a short
  "Set up your cell" page appears after the first sign-in.
- Everyone signs in at `login.html`. "Forgot password?" sends a reset link.
- A cell leader only ever receives **their own cell's** data. A group administrator
  receives only their group's data. This is enforced by the database, not by the
  web page, so it cannot be bypassed by editing the page.

## What is stored where

| Thing | Where |
| --- | --- |
| Accounts and passwords | Supabase Auth |
| Profiles, cells, members, attendance, first timers, offerings, activities, reports | Supabase database |
| Profile pictures and activity photos | Supabase Storage (private buckets, viewed through short-lived links) |
| In the browser | Only the Supabase sign-in token, plus two display settings: light/dark theme and whether the sidebar is collapsed. No ministry data is kept in the browser. |

## Troubleshooting

| You see | What to do |
| --- | --- |
| "Supabase isn't connected yet" | Paste the URL and anon key into `supabase-config.js` (step 3). |
| Google says `redirect_uri_mismatch` | The redirect URI in Google Cloud must be exactly the `.../auth/v1/callback` address from Supabase's Google provider page. |
| "Google sign-in isn't switched on" | Finish step 4.4 (enable the provider and paste the ID and secret). |
| After Google sign-in you return to the login page with an error | Add that exact page address to **Redirect URLs** (step 4.5). |
| Confirmation or reset emails don't arrive | Supabase's built-in email sender is limited to a few emails per hour. For real use, add your own SMTP under **Project Settings > Authentication > SMTP Settings**. |
| "You don't have permission to do that" | The security rules refused it. Check that the person is signed in as the right role and that the report's 30-minute edit window hasn't ended. |
| Photos don't appear | Make sure step 2 ran fully (it creates the `avatars` and `activity-photos` buckets). |
| A leader has no cell and no way in | They are sent to "Set up your cell" automatically after signing in. |

## Notes for later

- **Speed:** each page loads only the data it shows, and the groups/chapters are built into
  `data.js` (they must match the seed in `schema.sql` if you ever change them). The included
  `vercel.json` lets browsers keep scripts and images for 10 minutes, so changing pages doesn't
  re-download them. After you upload a new version, hard-refresh (Ctrl+Shift+R) to see it at once.
- Pages load everything the signed-in person is allowed to see when they open. This is fine for
  a zone of this size. If it ever feels slow for the zonal administrator, the next improvement is
  to load attendance and offerings by date range.
- The 30-minute report editing window and the "3 photos per activity" limit are enforced in the
  database (`supabase/schema.sql`), not just on screen.
