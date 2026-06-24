# The Ledger

Cloud-synced bookkeeping & rental-management app for JMC Investments, Penciled Properties, and JECO Realty.

Built with React + Vite + Supabase + Tailwind.

---

## Deploying to Vercel (the only setup that matters)

### 1. Push this folder to GitHub

Same way you did with The Pipeline. Create a new repo (e.g. `the-ledger`), upload all these files, push.

**Do not push `.env.local`** — `.gitignore` already excludes it. The keys go into Vercel as environment variables (next step), not into the code.

### 2. Connect Vercel to the repo

1. Go to vercel.com, click **Add New… → Project**
2. Import the new GitHub repo
3. Vercel will auto-detect this as a **Vite** project — leave the defaults
4. Before clicking Deploy, expand **Environment Variables** and add the two below

### 3. Set environment variables in Vercel

Add these two — the values are the same ones from `.env.local`:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://qqatuxfoczfnkoyozwnk.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | (your long `eyJ...` anon key) |

### 4. Deploy

Click **Deploy**. After 1-2 minutes you'll have a URL like `the-ledger.vercel.app`.

### 5. Update Supabase's "Site URL"

In Supabase: **Authentication → URL Configuration → Site URL** — change from `http://localhost:5173` to your Vercel URL (e.g. `https://the-ledger.vercel.app`). This is needed for email-confirmation links to work.

### 6. Sign in for the first time

Open the Vercel URL → click "Need an account? Create one" → enter your email + a password. That same login is what Mercedes will use on her devices.

If Supabase requires email confirmation by default and you'd rather skip it: go to Supabase **Authentication → Sign In / Up → Email** and turn off "Confirm email." That lets you sign up and sign right in.

### 7. Import your existing data

After signing in, go to the **Companies** tab in The Ledger. There's a Backup & Restore section. Click **Restore from File** and pick the JSON backup file you exported from the old version. (If you haven't exported one yet, do that first from the browser-based version before this cloud one goes live.)

### 8. Add the URL to The Pipeline's quick launch

Once you have the Vercel URL, you can add a tile linking to it in The Pipeline.

---

## Notes

- Data lives in your Supabase project (`qqatuxfoczfnkoyozwnk`). Tables: `companies`, `bills`, `properties`, `tenants`, `payments`, `flips`, `payrolls`, `company_notes`.
- Anyone with the URL must sign in. You and Mercedes share one account.
- Browser sessions persist — sign in once per device.
