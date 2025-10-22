import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

/**
 * POST /api/venues/merge-duplicates
 * Merges duplicate venues with the same name (case-insensitive)
 * Keeps the venue with more orders and transfers all data to it
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
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

    // Group venues by normalized name (lowercase, trimmed)
    const venueGroups = new Map<string, typeof venues>();
    for (const venue of venues) {
      const normalizedName = venue.name.toLowerCase().trim();
      if (!venueGroups.has(normalizedName)) {
        venueGroups.set(normalizedName, []);
      }
      venueGroups.get(normalizedName)!.push(venue);
    }

    const mergeResults = [];

    // Process each group of duplicate venues
    for (const [normalizedName, group] of venueGroups.entries()) {
      if (group.length <= 1) {
        continue; // No duplicates for this name
      }

      // Sort by order count (descending), then by ID (ascending)
      group.sort((a, b) => {
        const orderDiff = b._count.orders - a._count.orders;
        if (orderDiff !== 0) return orderDiff;
        return a.id - b.id;
      });

      const primaryVenue = group[0];
      const duplicates = group.slice(1);

      console.log(`Merging duplicates for "${normalizedName}"`);
      console.log(`  Primary venue: ID ${primaryVenue.id} with ${primaryVenue._count.orders} orders`);
      console.log(`  Duplicates: ${duplicates.map(v => `ID ${v.id} (${v._count.orders} orders)`).join(', ')}`);

      for (const duplicate of duplicates) {
        // Transfer all orders from duplicate to primary
        const ordersUpdated = await prisma.order.updateMany({
          where: { venueId: duplicate.id },
          data: { venueId: primaryVenue.id }
        });

        // Transfer all payouts from duplicate to primary
        const payoutsUpdated = await prisma.payout.updateMany({
          where: { venueId: duplicate.id },
          data: { venueId: primaryVenue.id }
        });

        // Transfer user associations (need to handle many-to-many)
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
        }

        // Delete the duplicate venue
        await prisma.venue.delete({
          where: { id: duplicate.id }
        });

        mergeResults.push({
          duplicateId: duplicate.id,
          duplicateName: duplicate.name,
          mergedInto: primaryVenue.id,
          ordersTransferred: ordersUpdated.count,
          payoutsTransferred: payoutsUpdated.count
        });

        console.log(`  Merged venue ID ${duplicate.id} into ${primaryVenue.id}`);
      }
    }

    if (mergeResults.length === 0) {
      return NextResponse.json({
        message: "No duplicate venues found",
        merged: []
      });
    }

    return NextResponse.json({
      message: `Successfully merged ${mergeResults.length} duplicate venue(s)`,
      merged: mergeResults
    });

  } catch (error) {
    console.error("Error merging venues:", error);
    return NextResponse.json(
      { message: "Failed to merge duplicate venues", error: String(error) },
      { status: 500 }
    );
  }
}
