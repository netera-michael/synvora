import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const { token, password } = body ?? {};

  if (!token || !password || typeof token !== "string" || typeof password !== "string") {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ message: "Password must be at least 8 characters" }, { status: 400 });
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true }
  });

  if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
    return NextResponse.json(
      { message: "This reset link is invalid or has expired. Please request a new one." },
      { status: 400 }
    );
  }

  const hashed = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashed }
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true }
    })
  ]);

  return NextResponse.json({ message: "Password updated successfully." });
}
