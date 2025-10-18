# Synvora Admin Dashboard

Synvora is a Shopify-inspired admin panel that consolidates order operations, internal order capture, and external Shopify synchronization in one place. The current milestone focuses on Orders management while leaving hooks for future modules (Products, Analytics, Customers, Settings).

## Feature Highlights

- **Shopify-grade UI:** Responsive dashboard shell, top navigation, and card/table layout mirroring Shopify’s admin orders experience.
- **Authentication:** Credential-based login (NextAuth) with a seeded admin user (`admin@synvora.com / Admin123!`).
- **Orders CRUD:** Create, view, edit, and delete orders with rich metadata (statuses, notes, tags, line items).
- **Filtering & Printing:** Month selector filters orders server-side; any filtered view can be printed directly from the UI.
- **Shopify Sync:** Import real Shopify orders via Admin API token, persist them locally, and keep them editable.
- **SQLite + Prisma:** Portable database with schema ready for migrations and future expansion.

## Tech Stack

- **Next.js 14 (App Router) + React 18**
- **TypeScript**
- **Tailwind CSS** for styling
- **NextAuth** for authentication
- **Prisma + SQLite** (file-based DB)
- **SWR** for client-side data fetching

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Copy environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Update `NEXTAUTH_SECRET` with a strong random string (`openssl rand -hex 32`).

3. **Set up the database**
   ```bash
   npx prisma migrate dev --name init
   npm run db:seed
   ```

4. **Run the dev server**
   ```bash
   npm run dev
   ```
   The dashboard is available at [http://localhost:3000](http://localhost:3000).

## Default Access

- Email: `admin@synvora.com`
- Password: `Admin123!`

Log in, then head to the **Orders** page. Months selector filters server-side; use the **Print** button to render current filters in print layout.

## Shopify Import

1. From **Orders**, click **Sync Shopify**.
2. Enter your `store-domain.myshopify.com` and an Admin API access token (with `read_orders` scope).
3. Optionally provide a `since_id` to limit imports.

The token is stored in the database (encrypt at rest for production). Re-running sync updates existing orders (matched via Shopify `id`) and upserts line items.

## Database Schema Overview

- `User` – basic credential auth (email + hashed password).
- `Order` – core entity, tracks Shopify and Synvora-originated orders.
- `OrderLineItem` – nested line items.
- `ShopifyStore` – stores API tokens per shop for syncing.

Use `npx prisma studio` for a GUI view.

## Roadmap Hooks

- Placeholder pages for Products, Analytics, Customers, and Settings.
- `DashboardShell` keeps layout logic centralized for future modules.
- Shopify sync endpoint ready for scheduling/background jobs.

## Deployment Notes

- Swap SQLite for Postgres by editing `prisma/schema.prisma` and updating `DATABASE_URL`.
- Harden authentication (multi-user, password resets) and encrypt Shopify tokens before production.
- Tailwind configuration already exposes brand colors under the `synvora` namespace for bespoke branding.

---

Reach out with the next set of requirements (theme customization, additional reports, automation, etc.) and we can layer them on top of this foundation.
