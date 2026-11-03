# Installable app (EAS Build)

Logged in as: run `npx expo whoami`.

## 1. API URL for a real phone

`10.0.2.2` only works on the Android **emulator**. For an APK on your phone, set your **deployed** API (Render):

```bash
cd mobile-app
API is already set in `eas.json` for preview/production: `https://tmlogistx.onrender.com`.

To override via EAS dashboard env instead:

npx eas env:create --name EXPO_PUBLIC_API_BASE_URL --value "https://tmlogistx.onrender.com/api" --environment preview --visibility plaintext
npx eas env:create --name EXPO_PUBLIC_SOCKET_URL --value "https://tmlogistx.onrender.com" --environment preview --visibility plaintext
```

Optional keys (maps): `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`, `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` the same way.

### Expo Go on your phone (SDK 57)

This project uses **Expo SDK 57** — match **Expo Go 57.x** on your phone.

1. Stop any old Metro process (Ctrl+C), then from `mobile-app`:
   ```bash
   npm start
   ```
   (`npm start` uses **`--lan`** so the QR code shows your PC’s Wi‑Fi IP, not `127.0.0.1`.)
2. Phone and PC on the **same Wi‑Fi**; scan the QR in **Expo Go** (Android) or Camera (iOS).
3. If login/API fails on device, set in `.env` your PC LAN IP (not `localhost`):
   - `EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:5000/api`
   - `EXPO_PUBLIC_SOCKET_URL=http://192.168.x.x:5000`
4. For Chrome only: `npm run dev:web` or `npm run web`.

### Web dev reload

- **Browser:** `npm run dev:web` (opens http://localhost:8081). Save files for fast refresh, or **F5** in the browser.
- Terminal **`r`** only works when a client is connected (browser tab open, or Expo Go on a phone). If you see *No apps connected*, press **`w`** in the Expo terminal to open/reconnect web, then **`r`** again.
- From another terminal: `npm run reload` (sends Metro `/reload` while the dev server is running).

## 2. Link EAS project (once)

```bash
npx eas init
```

## 3. Build APK (download + install on Android)

```bash
npm run build:android:preview
```

When the build finishes, open the link in the terminal or run:

```bash
npm run build:status
```

Download the `.apk`, copy to your phone (or scan the QR), allow “Install unknown apps”, install.

## 4. iPhone

Requires Apple Developer ($). Use `eas build --platform ios --profile preview` and install via TestFlight or internal distribution.

## Local dev (unchanged)

```bash
npm start
```

Use `EXPO_PUBLIC_API_BASE_URL` in `.env` with your PC LAN IP for Expo Go on Wi‑Fi.
