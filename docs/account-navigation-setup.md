# AuditMap Login Launch Guide

## What is implemented

- Public place guides and published community chatter remain readable without an account.
- Posting or replying, thanking a contributor, reporting a problem, and leaving a Crumb require sign-in.
- The sign-in screen explains the account benefits: community participation, saved-place sync, and contribution impact.
- Google and Apple buttons are already wired to Supabase OAuth. A button appears only after its provider is included in `SUPABASE_AUTH_PROVIDERS`.
- Email magic-link sign-in is available even when no social provider is exposed.
- Password sign-in remains tucked behind a disclosure for existing or support-managed accounts; it is not a primary launch method.
- Saved places sync to the signed-in Supabase user.

The public launch order should be: **Google, Apple, email link, then passkey for returning members.** Do not add GitHub to the public provider list.

## Current production state

Production intentionally uses:

```text
SUPABASE_AUTH_PROVIDERS=none
```

That is why the live screen currently shows only email link. Keep this value until the matching Google or Apple credentials have been saved and enabled in Supabase. If the setting is missing, AuditMap now safely exposes no social-login button.

Supabase project callback URL:

```text
https://lbjnziaitypthkxkfdwe.supabase.co/auth/v1/callback
```

Never put a provider secret or the Supabase service-role key in `config.js` or GitHub.

## Step 1: finish the shared Supabase URL settings

In the Supabase project, open **Authentication → URL Configuration**.

1. Set **Site URL** to `https://www.auditmap.org`.
2. Add these redirect URLs:
   - `https://www.auditmap.org/**`
   - `https://auditmap.org/**`
   - the Vercel preview pattern used by this project
   - `http://127.0.0.1:4175/**`
   - `http://localhost:4175/**`
3. Keep email authentication enabled.

These are the places AuditMap may return a person to after Google, Apple, or email authentication.

## Step 2: turn on Google first

In **Google Cloud → Google Auth Platform**:

1. Create or select the AuditMap project.
2. Complete **Branding** with the AuditMap name, logo, homepage, privacy-policy URL, terms URL, and support email.
3. Set the audience to external users.
4. In **Data Access**, request only `openid`, email, and profile.
5. Create a client with application type **Web application**.
6. Add these authorized JavaScript origins:
   - `https://www.auditmap.org`
   - `https://auditmap.org`
7. Add this exact authorized redirect URI:

   ```text
   https://lbjnziaitypthkxkfdwe.supabase.co/auth/v1/callback
   ```

8. Copy the Google client ID and client secret.

Then in **Supabase → Authentication → Providers → Google**:

1. Paste the client ID and secret.
2. Enable Google and save.
3. Test the Google flow directly in Supabase before exposing the AuditMap button.

When the provider works, set the Vercel Production environment variable to:

```text
SUPABASE_AUTH_PROVIDERS=google
```

Redeploy production, open a private browser window, and complete one Google sign-in from beginning to end.

## Step 3: add Apple

An active Apple Developer membership is required for web Sign in with Apple.

In the **Apple Developer** portal:

1. Create or select an App ID for AuditMap and enable **Sign in with Apple**.
2. Create a **Services ID** for the website.
3. Configure its web domain as `www.auditmap.org`.
4. Configure this return URL exactly:

   ```text
   https://lbjnziaitypthkxkfdwe.supabase.co/auth/v1/callback
   ```

5. Create a Sign in with Apple key, download the `.p8` file once, and securely record the Team ID and Key ID.
6. Generate the Apple OAuth client secret required by Supabase.

Then in **Supabase → Authentication → Providers → Apple**:

1. Enter the Services ID/client ID and generated secret.
2. Enable Apple and save.
3. Test Apple sign-in before exposing its AuditMap button.

After Google and Apple both pass, change Vercel Production to:

```text
SUPABASE_AUTH_PROVIDERS=google,apple
```

Redeploy and test both methods. Apple web OAuth secrets expire every six months, so create a recurring rotation reminder and keep the `.p8` file secure.

## Step 4: polish email-link delivery

The email-link flow works through Supabase today. Before inviting meaningful traffic:

1. Connect a custom SMTP provider in **Supabase → Authentication → Email**.
2. Use an AuditMap sender address on the verified AuditMap domain.
3. Brand the magic-link template and keep the copy short.
4. Test Gmail, Apple Mail, and Outlook on both phone and desktop.
5. Confirm the link returns to the page where sign-in began.

Email remains the universal fallback if someone does not use Google or Apple.

## Step 5: add passkeys as a second launch

Passkeys should come after Google, Apple, and email are stable. Supabase passkeys are currently experimental, require `@supabase/supabase-js` 2.105 or newer, and require explicit client opt-in. A confirmed user must sign in once before creating a passkey.

In **Supabase → Authentication → Passkeys**:

1. Enable passkey authentication.
2. Set **Relying Party Display Name** to `AuditMap`.
3. Set the permanent **Relying Party ID** to `auditmap.org`.
4. Set allowed origins to:

   ```text
   https://auditmap.org,https://www.auditmap.org
   ```

Do not casually change the Relying Party ID later; doing so invalidates previously enrolled passkeys.

The remaining AuditMap passkey product work is a separate, explicit release:

- add the supported Supabase browser client with experimental passkeys enabled;
- show **Use a passkey** on the signed-out screen;
- show **Create a passkey** and passkey management only after a confirmed sign-in;
- test iCloud Keychain, Google Password Manager, Windows Hello, 1Password, and security keys;
- keep email/social recovery available during the experimental period.

Do not show a non-working passkey button before this release is complete.

## Final launch check

For each enabled method:

1. Start from a private browser window on `https://www.auditmap.org`.
2. Sign in from the main account button and from a reply or Crumb prompt.
3. Confirm the person returns to the page they started on.
4. Confirm their name/email appears in the account drawer.
5. Save a place and verify it remains after signing out and back in on another device.
6. Post and reply, then confirm the contribution is tied to the signed-in account.
7. Sign out and confirm public facts and chatter remain readable while participation prompts for sign-in.

Only expose `google` or `apple` in `SUPABASE_AUTH_PROVIDERS` after that provider passes its test.
