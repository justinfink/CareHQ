# CareHQ — Project notes for Claude

## Product thesis

CareHQ is being rebuilt as an **AI-native care coordinator** for families managing eldercare or chronic care at home. The thesis is that today's tools help the human caregiver coordinate; CareHQ *is* the coordinator.

Four pillars:
1. **Agentic, not coordinative** — an always-on agent with persistent memory of the care recipient that does follow-ups, scheduling, medication reconciliation, doctor-visit prep, and insurance navigation. Humans approve and supervise.
2. **Multi-channel, voice-first** — phone, SMS, WhatsApp, email, voice memo are first-class. The mobile/web app is *one* surface, not *the* surface.
3. **Granular permissions as a first-class data model** — every fact has per-relationship visibility plus an audit trail, enforced at Postgres via RLS. Roles: Owner / Coordinator / Family / Professional / Clinician / Observer, with per-attribute overrides.
4. **Connected via "agent integrations"** — APIs where they exist (Google Calendar, Apple Health, Twilio, Gmail), browser/voice-using agents where they don't (pharmacy portals, insurance forms).

V1 wedge: **family coordinator** (adult-child-of-aging-parent). Direct-to-consumer, paid per care recipient.

V1 agent autonomy: **routine auto, sensitive gated**. Reminders to family/caregivers, daily digests, schedule confirmations are auto. Anything touching a clinician/insurer/pharmacy, anything with financial/legal weight, anything escalating to a human is queued to `/inbox` for Owner approval.

V1 surface: **stream-led, fully new IA**. The 5-tab dashboard is being replaced with a Stream + composer + drill-down panes.

The full plan lives at `C:\Users\darks\.claude\plans\i-want-you-to-prancy-falcon.md` (not committed).

## Repo layout

- `src/` — Vite + React 19 web app (the main product surface).
- `api/` — Vercel Edge / serverless functions. `api/agent.ts` is the agent endpoint.
- `mobile/` — Expo + React Native app (parallel client; eventually shares logic via `@carehq/core`).
- `landing/` — static marketing site at `mycare-hq.com`.
- `supabase/` — *(planned)* migrations and edge functions checked into the repo. Migrations currently live only in the Supabase project (`qmxxbbzrcilqrtxwaaub`) — pull them locally as a follow-up.
- `android/`, `ios/` — Capacitor native shells (legacy; mobile direction is Expo).

## Backend

- **Supabase project:** `qmxxbbzrcilqrtxwaaub` (CareHQ, us-east-1).
- **Auth:** Supabase magic-link + Google OAuth on both web and mobile. The Google client lives in the dedicated `carehq-494900` Google Cloud project (Web client `607522867616-pcudf3v33mf4lt3u572lhrnpnn7n9s3p.apps.googleusercontent.com`); native iOS/Android clients are NOT required because the mobile flow uses `expo-web-browser`'s in-app browser + `setSession` — the existing Web client is sufficient. The Google project is in **Testing** mode; sign-in is restricted to test users until we publish (see Audience tab in Google Auth Platform).
- **Schema (key tables):**
  - `profiles` (1:1 with `auth.users`)
  - `care_recipients` — the care subject; one per household.
  - `care_teams` — members of the team. Has `member_role` enum: owner/coordinator/family/professional/clinician/observer.
  - `recipient_brain` — jsonb-rich persistent context (conditions, meds, providers, insurance, baselines, preferences, advance_directives) + rolling and long-term agent-maintained summaries. Versioned via `recipient_brain_revisions`.
  - `share_scopes` — per (recipient, member, scope_key) granular permission overrides. Defaults derive from role via `src/lib/scopes.ts`.
  - `events` — the timeline (medication_taken/missed, vitals, fall, behavior, note, message_sent/received, agent_action, etc.). Each row carries a `scope_key` for permission gating.
  - `messages` — multi-channel inbound/outbound log (sms, voice, email, app, whatsapp).
  - `integrations` — encrypted OAuth tokens per (recipient, provider). Providers: google_calendar, gmail, twilio, apple_health, pharmacy_browser.
  - `agent_runs` — every agent invocation: trigger, model, tools called, cost, status.
  - `agent_approvals` — the `/inbox`. Sensitive proposed actions awaiting Owner approval.
  - `audit_log` — every gated read/write; HIPAA-aligned auditability.
- **RLS:** `is_team_member(recipient_id)` + `is_owner(recipient_id)` SECURITY DEFINER helpers gate every table. Server-side enforcement; UI hides are cosmetic.

## Auth on web vs. mobile (parallel implementations, will be unified later)

Both surfaces are gated by Supabase auth, but they currently maintain separate copies of the auth code that should converge into `@carehq/core` in a follow-up:

- **Web:** [src/lib/supabase.ts](src/lib/supabase.ts) (browser localStorage) + [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx) + [src/pages/Auth.tsx](src/pages/Auth.tsx). Google sign-in uses `signInWithOAuth` and lets Supabase redirect the whole tab.
- **Mobile (Expo):** [mobile/src/lib/supabase.ts](mobile/src/lib/supabase.ts) (AsyncStorage) + [mobile/src/contexts/AuthContext.tsx](mobile/src/contexts/AuthContext.tsx) + [mobile/app/auth.tsx](mobile/app/auth.tsx). Google sign-in uses `signInWithOAuth({ skipBrowserRedirect: true })` then `WebBrowser.openAuthSessionAsync` and finishes by calling `setSession` (or `exchangeCodeForSession` for PKCE) with tokens parsed from the `carehq://auth/callback` deep-link return.

The `carehq://` URL scheme is configured in [mobile/app.json](mobile/app.json) and `carehq://**` is whitelisted in Supabase URL Configuration. New Auth-related changes should be made in lockstep on both surfaces until the shared package lands.

## Things to know when editing

- **Don't add new mock data.** Replace mock-backed surfaces with real Supabase calls. Mocks under `src/data/mock*.ts` and `mobile/src/data/mock*.ts` are being torn out.
- **Don't widen the agent's autonomy without updating the rules.** "Routine auto, sensitive gated" is policy; see `api/agent.ts` and the plan file. New tools must classify themselves.
- **Don't store secrets in `localStorage`.** Google Calendar tokens currently live there as a legacy; that migration to `public.integrations` is a tracked task. Don't add new clients of the localStorage token.
- **Don't add features behind the dashboard tabs.** The 5-tab IA (Dashboard / Care Team / Voice Log / Calendar / Insights) is being replaced by Stream + composer + drill-downs. New surfaces should fit the new IA.
- **Honest landing.** The public landing page (`landing/index.html`) currently makes claims (HIPAA-aligned, real-time sync, end-to-end encrypted, smart insights) that the product does not yet deliver. Do not add new aspirational claims; let the copy lag the product.

## Useful commands

```
npm run dev         # web dev (port via .claude/launch.json: 5180)
npm run build       # tsc -b && vite build
npm run lint
cd mobile && npm start   # Expo dev
```

## Environment

**Web (`.env` for dev, Vercel project env for prod):**
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — set in both.
- `VITE_GOOGLE_CLIENT_ID` — empty (the existing Google Calendar integration uses this; not yet wired to anything live).

**Server-side (Vercel only, never in `.env` or the bundle):**
- `ANTHROPIC_API_KEY` — required by `/api/agent`.

**Mobile (EAS env: production / preview / development, *not* `.env`):**
- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` — required by [mobile/src/lib/supabase.ts](mobile/src/lib/supabase.ts).
- `EXPO_PUBLIC_API_BASE` = `https://carehq-app.vercel.app` — base URL the mobile app will hit for `/api/agent`. Server-only secrets stay on Vercel; the mobile bundle never carries `ANTHROPIC_API_KEY`.

## Deployment

- Web → Vercel (auto from `master`).
- Mobile → EAS (manual `eas build` / OTA updates).
- Landing → static under `landing/`, deployed alongside web.
