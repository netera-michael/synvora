# Venue Duplicate Fix

## Issue
There are 2 venues with the same name "CICCIO" in the database:
- One with 15 orders
- One with 427 orders

This happened because the `name` field wasn't enforcing uniqueness (only `slug` was unique).

## Solution Implemented

### 1. Merge Duplicate Venues API
Created `/api/venues/merge-duplicates` endpoint that will:
- Find all duplicate venues (by case-insensitive name matching)
- Keep the venue with the most orders
- Transfer all orders, payouts, and user associations to the primary venue
- Delete the duplicate venue(s)

### 2. Prevent Future Duplicates
- Added `@unique` constraint to `Venue.name` in Prisma schema
- Updated venue creation API to check for case-insensitive name conflicts
- Updated venue update API to prevent renaming to existing names

## How to Fix Your Database

### Step 1: Merge the Duplicate Venues

Make a POST request to merge duplicates:

```bash
curl -X POST http://localhost:3000/api/venues/merge-duplicates \
  -H "Cookie: your-session-cookie"
```

Or use the browser console while logged in as admin:

```javascript
fetch('/api/venues/merge-duplicates', {
  method: 'POST',
  credentials: 'include'
}).then(r => r.json()).then(console.log);
```

This will:
- Merge both CICCIO venues into one
- Transfer all 442 orders (15 + 427) to the primary venue
- Delete the duplicate venue
- Return a summary of what was merged

### Step 2: Apply Database Migration

After merging duplicates, apply the schema changes:

```bash
npx prisma migrate dev --name add_unique_constraint_to_venue_name
```

This will add the unique constraint to prevent future duplicates.

### Step 3: Verify

Check your venues in the admin settings - you should now see only 1 CICCIO venue with all 442 orders.

## What Changed

**Schema (`prisma/schema.prisma`):**
```prisma
model Venue {
  name String @unique  // ← Added unique constraint
  slug String @unique
  // ... rest of fields
}
```

**API Changes:**
- `POST /api/venues` - Now checks for duplicate names (case-insensitive)
- `PATCH /api/venues/[id]` - Prevents renaming to existing names
- `POST /api/venues/merge-duplicates` - New endpoint to fix existing duplicates

## Important Notes

- The merge operation is safe - it transfers all data before deleting duplicates
- The venue with the most orders is kept as the primary
- All orders, payouts, and user associations are preserved
- Future attempts to create duplicate venue names will be rejected

## Troubleshooting

If the merge fails:
1. Check that you're logged in as an ADMIN user
2. Verify the database connection is working
3. Check server logs for detailed error messages
4. Contact support if issues persist
