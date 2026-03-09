import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { calculatePayoutFromOrder } from "@/lib/order-utils";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const accessibleVenueIds = (session.user.venueIds ?? [])
    .map((id) => Number(id))
    .filter((id) => !Number.isNaN(id));

  // Determine which venues to compute balances for
  let venueIds: number[];
  if (isAdmin) {
    const allVenues = await prisma.venue.findMany({ select: { id: true } });
    venueIds = allVenues.map((v) => v.id);
  } else {
    if (!accessibleVenueIds.length) {
      return NextResponse.json({ venues: [] });
    }
    venueIds = accessibleVenueIds;
  }

  const venues = await prisma.venue.findMany({
    where: { id: { in: venueIds } },
    select: { id: true, name: true, slug: true, balanceAdjustment: true }
  });

  const results = await Promise.all(
    venues.map(async (venue) => {
      const [orders, payouts] = await Promise.all([
        prisma.order.findMany({
          where: { venueId: venue.id },
          select: { totalAmount: true, originalAmount: true, aedEgpRate: true }
        }),
        prisma.payout.findMany({
          where: { venueId: venue.id },
          select: { amount: true }
        })
      ]);

      const totalOrdersPayout = orders.reduce(
        (sum, order) => sum + calculatePayoutFromOrder(order),
        0
      );
      const totalPaidOut = payouts.reduce((sum, p) => sum + p.amount, 0);
      const pendingBalance = totalOrdersPayout + venue.balanceAdjustment - totalPaidOut;

      return {
        id: venue.id,
        name: venue.name,
        slug: venue.slug,
        balanceAdjustment: venue.balanceAdjustment,
        totalOrdersPayout,
        totalPaidOut,
        pendingBalance
      };
    })
  );

  return NextResponse.json({ venues: results });
}
