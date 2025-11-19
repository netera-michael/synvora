import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const settingsSchema = z.object({
  apiKey: z.string().min(1),
  accountId: z.string().optional().nullable(),
  enabled: z.boolean().optional()
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.mercurySettings.findFirst();
  
  if (!settings) {
    return NextResponse.json({
      apiKey: "",
      accountId: null,
      enabled: false
    });
  }

  // Don't return the full API key for security
  return NextResponse.json({
    apiKey: settings.apiKey ? "***" + settings.apiKey.slice(-4) : "",
    accountId: settings.accountId,
    enabled: settings.enabled
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = settingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Get existing settings to preserve API key if not being updated
  const existing = await prisma.mercurySettings.findFirst();
  
  // If API key is masked (starts with ***), keep the existing one
  const apiKey = parsed.data.apiKey.startsWith("***") && existing
    ? existing.apiKey
    : parsed.data.apiKey;

  const settings = existing
    ? await prisma.mercurySettings.update({
        where: { id: existing.id },
        data: {
          apiKey,
          accountId: parsed.data.accountId ?? null,
          enabled: parsed.data.enabled ?? false
        }
      })
    : await prisma.mercurySettings.create({
        data: {
          apiKey,
          accountId: parsed.data.accountId ?? null,
          enabled: parsed.data.enabled ?? false
        }
      });

  return NextResponse.json({
    apiKey: "***" + settings.apiKey.slice(-4),
    accountId: settings.accountId,
    enabled: settings.enabled
  });
}

