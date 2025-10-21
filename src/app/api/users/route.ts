import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().optional().nullable(),
  role: z.enum(["ADMIN", "USER"]).optional(),
  venueIds: z.array(z.number().int().positive()).optional()
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      venues: true
    }
  });

  return NextResponse.json({
    users: users.map((user) => ({
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
    }))
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password, venueIds = [], role = "USER" } = parsed.data;
  const name = parsed.data.name?.trim() || null;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
        venues: venueIds.length
          ? {
              connect: venueIds.map((id) => ({ id }))
            }
          : undefined
      },
      include: {
        venues: true
      }
    });

    return NextResponse.json(
      {
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
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error && error.message.includes("Unique constraint failed")
        ? "A user with this email already exists"
        : "Unable to create user";

    return NextResponse.json({ message }, { status: 400 });
  }
}
