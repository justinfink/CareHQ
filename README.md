# CareHQ

An **AI-native care coordinator** for families managing eldercare or chronic care at home.

> Most caregiving tools help the family *coordinate* the work of caring for a loved one. CareHQ *does* the work — schedule reconciliation, medication follow-ups, doctor-visit prep, insurance navigation — under the family's supervision.

## Status

Early build. Web app, mobile (Expo), and landing site exist. The Supabase backend, schema, auth, and agent runtime are being stood up in place of the previous mocked-data prototype. Specifics, roadmap, and decisions live in the project plan and `CLAUDE.md`.

The four pillars guiding the redesign:

1. **Agentic, not coordinative** — an always-on agent with persistent memory of the care recipient.
2. **Multi-channel, voice-first** — phone, SMS, email, voice are first-class; the app is one of several surfaces.
3. **Granular permissions** as a first-class data model — enforced at the database, not in the UI.
4. **Connected** via API integrations where they exist and agent-driven browser/voice flows where they don't.

V1 is being built for the **family coordinator** persona (adult-child-of-aging-parent). The agent operates on a "routine auto, sensitive gated" autonomy model — it acts on its own for routine reminders and digests, and queues anything that touches a clinician, insurer, finances, or external party for the Owner's one-tap approval.

## Stack

- **Web:** Vite + React 19, TanStack Query, Zustand, Tailwind, Framer Motion. Deployed to Vercel.
- **Mobile:** Expo + React Native + NativeWind. Deployed via EAS.
- **Backend:** Supabase (Postgres, Auth, Storage, Realtime, Edge Functions). RLS on every table.
- **Agent runtime:** Anthropic SDK via Vercel Edge Functions. Prompt caching on the recipient "brain."
- **Channels:** Twilio (SMS + voice — wiring in progress), Gmail-forward parsing, Apple Health.

## Repo

```
src/        Web app
mobile/     Expo app
landing/    Marketing site (mycare-hq.com)
api/        Vercel serverless functions (e.g. /api/agent)
public/     Web static assets
```

## Local dev

```
cp .env .env.local      # if you want overrides
npm install
npm run dev             # http://localhost:5180
```

```
cd mobile
npm install
npm start               # Expo dev tools
```

## Environment

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — Supabase project credentials.
- `VITE_GOOGLE_CLIENT_ID` — Google OAuth client ID for the calendar integration.
- `ANTHROPIC_API_KEY` — server-only; required for `/api/agent`.

## Notes for AI collaborators

See `CLAUDE.md` for the product thesis, schema, conventions, and things to avoid when editing.
