# Google Calendar Integration Setup (3 minutes)

## Step 1: Create OAuth Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select existing) — name it "CareHQ"
3. Navigate to **APIs & Services → Library**
4. Search for "Google Calendar API" and **Enable** it
5. Navigate to **APIs & Services → Credentials**
6. Click **+ Create Credentials → OAuth client ID**
7. If prompted, configure the **OAuth consent screen** first:
   - User Type: **External**
   - App name: **CareHQ**
   - User support email: your email
   - Scopes: add `https://www.googleapis.com/auth/calendar` and `https://www.googleapis.com/auth/userinfo.email`
   - Test users: add your email
   - Save
8. Back on Credentials, create **OAuth client ID**:
   - Application type: **Web application**
   - Name: **CareHQ Web**
   - Authorized JavaScript origins:
     - `http://localhost:5180`
     - `https://carehq-app.vercel.app`
     - `https://mycare-hq.com` (if using custom domain)
   - Authorized redirect URIs:
     - `http://localhost:5180`
     - `https://carehq-app.vercel.app`
   - Click **Create**
9. Copy the **Client ID** (looks like `123456789-abc.apps.googleusercontent.com`)

## Step 2: Configure the app

### Web app (Vercel)
```bash
# Local development
echo "VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE" > .env

# Vercel production
vercel env add VITE_GOOGLE_CLIENT_ID
# Paste your Client ID when prompted
```

### Mobile app (Expo)
Add to `mobile/app.json` under `expo.extra`:
```json
"extra": {
  "googleClientId": "YOUR_CLIENT_ID_HERE"
}
```

## Step 3: Test

1. Run the web app: `npm run dev`
2. Go to the Calendar page
3. Click "Connect Google Calendar"
4. Sign in with your Google account
5. The app will automatically:
   - Create a dedicated "CareHQ — Robert's Care" calendar
   - Populate it with the full care schedule
   - Sync all future changes bidirectionally

## What happens under the hood

- A **separate calendar** is created on your Google account (not your primary calendar)
- All CareHQ events live on this dedicated calendar
- The calendar shows up in your Google Calendar sidebar as "CareHQ — Robert's Care"
- Each care team member's access level controls what they can see/edit
- Events include metadata (type, assigned caregiver, color coding) stored in Google Calendar's extended properties
