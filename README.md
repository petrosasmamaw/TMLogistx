# TMLogistx

Staff movement and fleet management platform (web portal, mobile app, API).

## Structure

- `server/` — Node.js API (Express, Neon Postgres)
- `web-app/` — Logistics / admin portal (Vite + React)
- `mobile-app/` — Staff & driver mobile app (Expo)

## Quick start

1. Copy `server/.env.example` to `server/.env` and set `DATABASE_URL`, `JWT_SECRET`, etc.
2. `cd server && npm install && npm run dev`
3. `cd web-app && npm install && npm run dev`
4. `cd mobile-app && npm install && npx expo start`
