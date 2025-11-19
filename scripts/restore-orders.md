# Restoring Deleted Orders from Neon Backups

Neon provides automatic backups and Point-in-Time Recovery (PITR) for your database. Here's how to restore deleted orders:

## Option 1: Using Neon Console (Recommended)

### Step 1: Access Neon Console
1. Go to [console.neon.tech](https://console.neon.tech)
2. Log in to your account
3. Select your project

### Step 2: Create a Time Travel Branch
1. Navigate to **Branches** in the left sidebar
2. Click **Create Branch**
3. Select **Time Travel** option
4. Choose a point in time **before** you deleted the orders
5. Create the branch (e.g., `restore-point-2025-12-15`)

### Step 3: Query Deleted Orders
1. Connect to the time travel branch using its connection string
2. Query the orders that were deleted:
   ```sql
   SELECT * FROM "Order" 
   WHERE id IN (5991, 5992, 5993) -- Replace with your deleted order IDs
   ORDER BY id DESC;
   ```

### Step 4: Export and Restore
1. Export the orders data from the time travel branch
2. Use the restore script (see below) or manually insert them back

## Option 2: Using Neon API or CLI

You can also use Neon's API or CLI to create time travel branches programmatically.

## Option 3: Using the Restore Script

See `scripts/restore-orders.ts` for an automated restore script.

## Important Notes

- **Time Travel Retention**: Neon keeps point-in-time recovery data for a limited time (typically 7 days on free tier, longer on paid plans)
- **Act Quickly**: The sooner you restore, the better chance you have of recovering the data
- **Test First**: Always test the restore on a branch before applying to production
- **Backup Current State**: Consider exporting current orders before restoring to avoid conflicts

## Finding Deleted Order IDs

If you don't remember the order IDs, you can:
1. Check your browser history/console logs
2. Check Vercel deployment logs
3. Use the time travel branch to see what orders existed at a specific time

