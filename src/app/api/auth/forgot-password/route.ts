import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY ?? "");
  const { email } = await request.json().catch(() => ({ email: null }));

  // Always return the same response to avoid leaking whether an email exists
  const successResponse = NextResponse.json({
    message: "If an account exists for this email, a reset link has been sent."
  });

  if (!email || typeof email !== "string") return successResponse;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) return successResponse;

  // Invalidate any existing unused tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, used: false },
    data: { used: true }
  });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt }
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/admin/reset-password?token=${token}`;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@synvora-psi.vercel.app";

  await resend.emails.send({
    from: fromEmail,
    to: user.email,
    subject: "Reset your Synvora password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px">
          <div style="width:36px;height:36px;background:#4f46e5;border-radius:8px;display:flex;align-items:center;justify-content:center">
            <span style="color:#fff;font-weight:700;font-size:16px">S</span>
          </div>
          <span style="font-size:16px;font-weight:600;color:#111">Synvora</span>
        </div>
        <h1 style="font-size:20px;font-weight:600;margin:0 0 8px">Reset your password</h1>
        <p style="font-size:14px;color:#555;margin:0 0 24px;line-height:1.6">
          We received a request to reset the password for your account (<strong>${user.email}</strong>).
          Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.
        </p>
        <a href="${resetUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">
          Reset password
        </a>
        <p style="font-size:12px;color:#999;margin:24px 0 0;line-height:1.6">
          If you didn't request a password reset, you can ignore this email. Your password won't change.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
        <p style="font-size:11px;color:#bbb;margin:0">
          Synvora · Unified Commerce Operations
        </p>
      </div>
    `
  });

  return successResponse;
}
