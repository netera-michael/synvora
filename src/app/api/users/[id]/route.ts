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
  email: z.string().email().optional(),
  currentPassword: z.string().optional(), // Required when changing password
  newPassword: z.string().min(8, "New password must be at least 8 characters").optional(),
  role: z.enum(["ADMIN", "USER"]).optional(),
  venueIds: z.array(z.number().int().positive()).optional()
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
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

  // Check if user is trying to update their own profile or if they are an admin
  const isOwnProfile = Number(session.user.id) === userId;
  const isAdmin = session.user.role === "ADMIN";

  if (!isAdmin && !isOwnProfile) {
    return NextResponse.json({ message: "Unauthorized to update this user" }, { status: 401 });
  }

  // For non-admins trying to update restricted fields
  if (!isAdmin) {
    // Only allow name, email, and password changes for self-updates
    if (parsed.data.role || parsed.data.venueIds) {
      return NextResponse.json({ message: "Unauthorized to update these fields" }, { status: 401 });
    }

    // If changing email, verify current password
    if (parsed.data.email && parsed.data.currentPassword === undefined) {
      return NextResponse.json({ message: "Current password required to change email" }, { status: 400 });
    }

    // If changing password, verify current password and validate new password
    if (parsed.data.newPassword) {
      if (!parsed.data.currentPassword) {
        return NextResponse.json({ message: "Current password required to change password" }, { status: 400 });
      }
      
      // Fetch current user to verify current password
      const currentUser = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!currentUser) {
        return NextResponse.json({ message: "User not found" }, { status: 404 });
      }
      
      const isCurrentPasswordValid = await bcrypt.compare(parsed.data.currentPassword, currentUser.password);
      if (!isCurrentPasswordValid) {
        return NextResponse.json({ message: "Current password is incorrect" }, { status: 400 });
      }
    }
  }

  const data: Prisma.UserUpdateInput = {};

  if (parsed.data.name !== undefined) {
    const trimmed = parsed.data.name?.trim();
    data.name = trimmed && trimmed.length ? trimmed : null;
  }

  if (parsed.data.email) {
    data.email = parsed.data.email;
  }

  // Handle password update
  if (parsed.data.newPassword) {
    data.password = await bcrypt.hash(parsed.data.newPassword, 10);
  } else if (parsed.data.password) {  // For backward compatibility in case someone sends 'password' instead of 'newPassword'
    data.password = await bcrypt.hash(parsed.data.password, 10);
  }

  if (isAdmin && parsed.data.role) {
    data.role = parsed.data.role;
  }

  if (isAdmin && parsed.data.venueIds) {
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
    const message = 
      error instanceof Error && error.message.includes("Unique constraint failed") 
        ? "A user with this email already exists" 
        : "Unable to update user";
    return NextResponse.json({ message }, { status: 400 });
  }
}
