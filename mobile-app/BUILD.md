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

Optional keys (maps): `EXPO_PUBLIC_GEOAPIFY_API_KEY`, `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` the same way.

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
