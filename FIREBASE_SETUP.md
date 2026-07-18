# Firebase Setup Guide

One-time setup to switch Monarchy's live sync over to Firebase Realtime Database.
Takes about 10 minutes, needs nothing but a Google account, and stays on the free
**Spark** plan indefinitely — no credit card, no trial period, no time limit.

## Before you start

You need:
- A Google account (any Gmail works — including the one already tied to your old
  Apps Script, if you want to reuse it)
- The three files already updated in your repo: `src/index.html`,
  `src/js/09-session-sync.js`, `src/js/10-gm-tools.js`

## Step 1 — Create a Firebase project

1. Go to **console.firebase.google.com** and sign in.
2. Click **Add project** (or **Create a project**).
3. Give it any name — e.g. `monarchy-companion`. Firebase generates a project ID
   underneath it automatically; you won't need to touch that.
4. You'll be asked about Google Analytics — you don't need it here. Toggle it off
   (or leave it on and ignore it — either way, this app never uses it).
5. Click through to finish creating the project.

## Step 2 — Create the Realtime Database

1. In the left sidebar, go to **Databases & Storage → Realtime Database**.
2. Click **Create Database**.
3. Pick a location close to you and your players — doesn't need to be exact, it
   only affects raw latency by a handful of milliseconds.
4. You'll be asked to pick a starting rules mode, **locked** or **test**. Either
   is fine — you're about to replace it in the next step regardless. Don't skip
   Step 3, even if "test mode" looks like it already works.

## Step 3 — Lock in your actual rules (don't skip this)

This is the step that actually matters long-term. Firebase's "test mode" is
**not a permanent setting** — it's a temporary default that automatically
switches to deny-everything after a trial period if you never touch it. Skip
this step and your sync will quietly stop working days or weeks from now, with
no warning beyond an email you might not even see.

1. On the Realtime Database page, click the **Rules** tab.
2. Delete whatever's there and paste this instead:

```json
{
  "rules": {
    "servers": {
      "$serverId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

3. Click **Publish**.

This is a permanent rule, not a trial default. It matches the same "anyone with
the table ID can read/write" trust model your old Apps Script setup already
had — not a downgrade in security, and it never expires on its own.

## Step 4 — Register a web app and grab your config

1. Go back to **Project Overview** (the house icon at the top of the left
   sidebar).
2. Under "Get started by adding Firebase to your app," click the **`</>`** (web)
   icon.
3. Give the app any nickname (e.g. `monarchy-desktop`). You do **not** need to
   check "Also set up Firebase Hosting."
4. Click **Register app**. Firebase shows you a code block that looks like this:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "monarchy-companion.firebaseapp.com",
  databaseURL: "https://monarchy-companion-default-rtdb.firebaseio.com",
  projectId: "monarchy-companion",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

Copy the whole `firebaseConfig` object. (The extra fields —
`storageBucket`/`messagingSenderId`/`appId` — are harmless whether you keep or
drop them; this app only actually reads `apiKey`, `authDomain`, `databaseURL`,
and `projectId`.)

## Step 5 — Paste it into your code

Open `src/js/09-session-sync.js` and find this block near the very top of the
file:

```js
const firebaseConfig = {
  apiKey:      "PASTE_YOUR_API_KEY",
  authDomain:  "PASTE_YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://PASTE_YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId:   "PASTE_YOUR_PROJECT"
};
```

Replace it with what you copied in Step 4. That's the entire code change —
this object isn't a secret and doesn't need to be hidden or kept out of source
control. Firebase's actual access control comes from the rules you published
in Step 3, not from hiding this object.

## Step 6 — Build and test

1. From the project root: `npm start` — this rebuilds `dist/monarchy.html` from
   `src/` automatically, then launches the app.
2. Open a second copy of the app (or run it on a second machine) — one as GM,
   one as Player — and confirm changes show up on the other side within a
   second or so.
3. Keep the Realtime Database **Data** tab open in the Firebase console while
   you test. You should see a `servers` node appear and update live as you
   play — a good sign everything's wired up correctly.

## Troubleshooting

- **"Permission denied" in the console (press F12 → Console)** — your rules
  didn't actually publish. Go back to Step 3 and confirm you clicked
  **Publish**, not just typed the rules in and navigated away.
- **Nothing syncs, but no errors either** — double check all four values in
  `firebaseConfig` exactly match the console. A typo in `databaseURL`
  specifically can fail silently.
- **Works for you, not for a player elsewhere** — almost always their
  internet/firewall, not Firebase. Have them try from a different network to
  confirm before assuming it's a code problem.
- **"Firebase SDK did not load" in the console** — no internet at launch, or
  the two `gstatic.com` script tags near the top of `index.html` got removed.
  Everything else in the app (character sheet, solo combat tracker) still
  works fine without it — only live sync needs those two tags and a
  connection.

## What this actually costs

Nothing, indefinitely. The free Spark plan has no time limit and needs no card
on file — you're capped at 100 simultaneous connections, 1GB stored, and 10GB
downloaded a month, which is enormous headroom for a homebrew TTRPG group. If
Monarchy somehow outgrows that (think: dozens of tables all playing at the
exact same moment), the fix is adding a "bring your own Firebase project"
option for GMs rather than paying anyone — worth revisiting only if you
actually get there.
