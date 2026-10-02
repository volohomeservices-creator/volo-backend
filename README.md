# VOLO Backend API Service

Next.js 16 Production Backend API Server for VOLO Home Services.

## Tech Stack
- Next.js 16 (App Router / Route Handlers)
- Firebase Admin SDK (Firestore, Auth, Messaging)
- Supabase (PostgreSQL, Storage)
- Razorpay API (Payments & Webhooks)
- OpenStreetMap / OSRM & Google Maps Hybrid Routing

## Environment Setup
1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Populate the environment variables in `.env.local`.

## Development
```bash
npm install
npm run dev
```

## Production Build & Start
```bash
npm run build
npm run start
```
