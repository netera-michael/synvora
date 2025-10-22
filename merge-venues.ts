import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function mergeVenues() {
  try {
    console.log('Starting venue merge process...\n');

    // Get all venues
    const venues = await prisma.venue.findMany({
      include: {
        _count: {
          select: {
            orders: true,
            users: true,
            payouts: true
          }
        }
      }
    });

    console.log(`Found ${venues.length} venues:\n`);
    venues.forEach(venue => {
      console.log(`  ID: ${venue.id}, Name: "${venue.name}", Slug: "${venue.slug}", Orders: ${venue._count.orders}`);
    });

    // Group venues by normalized name (lowercase, trimmed)
    const venueGroups = new Map<string, typeof venues>();
    for (const venue of venues) {
      const normalizedName = venue.name.toLowerCase().trim();
      if (!venueGroups.has(normalizedName)) {
        venueGroups.set(normalizedName, []);
      }
      venueGroups.get(normalizedName)!.push(venue);
    }

    let totalMerged = 0;

    // Process each group of duplicate venues
    for (const [normalizedName, group] of venueGroups.entries()) {
      if (group.length <= 1) {
        continue; // No duplicates for this name
      }

      console.log(`\n=== Merging duplicates for "${normalizedName}" ===`);

      // Sort by order count (descending), then by ID (ascending)
      group.sort((a, b) => {
        const orderDiff = b._count.orders - a._count.orders;
        if (orderDiff !== 0) return orderDiff;
        return a.id - b.id;
      });

      const primaryVenue = group[0];
      const duplicates = group.slice(1);

      console.log(`Primary venue: ID ${primaryVenue.id} with ${primaryVenue._count.orders} orders`);
      console.log(`Duplicates: ${duplicates.map(v => `ID ${v.id} (${v._count.orders} orders)`).join(', ')}`);

      for (const duplicate of duplicates) {
        console.log(`\nMerging venue ID ${duplicate.id} into ${primaryVenue.id}...`);

        // Transfer all orders from duplicate to primary
        const ordersResult = await prisma.order.updateMany({
          where: { venueId: duplicate.id },
          data: { venueId: primaryVenue.id }
        });
        console.log(`  ✓ Transferred ${ordersResult.count} orders`);

        // Transfer all payouts from duplicate to primary
        const payoutsResult = await prisma.payout.updateMany({
          where: { venueId: duplicate.id },
          data: { venueId: primaryVenue.id }
        });
        console.log(`  ✓ Transferred ${payoutsResult.count} payouts`);

        // Transfer user associations
        const duplicateWithUsers = await prisma.venue.findUnique({
          where: { id: duplicate.id },
          include: { users: true }
        });

        if (duplicateWithUsers?.users.length) {
          for (const user of duplicateWithUsers.users) {
            // Check if user is already connected to primary venue
            const connection = await prisma.user.findFirst({
              where: {
                id: user.id,
                venues: {
                  some: { id: primaryVenue.id }
                }
              }
            });

            // If not connected, connect them
            if (!connection) {
              await prisma.user.update({
                where: { id: user.id },
                data: {
                  venues: {
                    connect: { id: primaryVenue.id }
                  }
                }
              });
            }

            // Disconnect from duplicate
            await prisma.user.update({
              where: { id: user.id },
              data: {
                venues: {
                  disconnect: { id: duplicate.id }
                }
              }
            });
          }
          console.log(`  ✓ Transferred ${duplicateWithUsers.users.length} user associations`);
        }

        // Delete the duplicate venue
        await prisma.venue.delete({
          where: { id: duplicate.id }
        });
        console.log(`  ✓ Deleted duplicate venue ID ${duplicate.id}`);

        totalMerged++;
      }
    }

    if (totalMerged === 0) {
      console.log('\n✓ No duplicate venues found!');
    } else {
      console.log(`\n✓ Successfully merged ${totalMerged} duplicate venue(s)!`);
    }

    // Show final state
    const finalVenues = await prisma.venue.findMany({
      include: {
        _count: {
          select: {
            orders: true,
            users: true,
            payouts: true
          }
        }
      }
    });

    console.log(`\n=== Final Venue List ===`);
    finalVenues.forEach(venue => {
      console.log(`  ID: ${venue.id}, Name: "${venue.name}", Orders: ${venue._count.orders}, Users: ${venue._count.users}, Payouts: ${venue._count.payouts}`);
    });

  } catch (error) {
    console.error('Error merging venues:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

mergeVenues();
