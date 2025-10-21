import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const updateUserSchema = z.object({
  name: z.string().optional().nullable(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  role: z.enum(["ADMIN", "USER"]).optional(),
  venueIds: z.array(z.number().int().positive()).optional()
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const userId = Number(params.id);
  if (Number.isNaN(userId)) {
    return NextResponse.json({ message: "Invalid user id" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const data: Prisma.UserUpdateInput = {};

  if (parsed.data.name !== undefined) {
    const trimmed = parsed.data.name?.trim();
    data.name = trimmed && trimmed.length ? trimmed : null;
  }

  if (parsed.data.password) {
    data.password = await bcrypt.hash(parsed.data.password, 10);
  }

  if (parsed.data.role) {
    data.role = parsed.data.role;
  }

  if (parsed.data.venueIds) {
    data.venues = {
      set: parsed.data.venueIds.map((id) => ({ id }))
    };
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      include: {
        venues: true
      }
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        venueIds: user.venues.map((venue) => venue.id),
        venues: user.venues.map((venue) => ({
          id: venue.id,
          name: venue.name,
          slug: venue.slug
        }))
      }
    });
  } catch (error: unknown) {
    return NextResponse.json({ message: "Unable to update user" }, { status: 400 });
  }
}
