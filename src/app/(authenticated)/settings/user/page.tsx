"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function UserSettingsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [form, setForm] = useState({
    name: session?.user.name ?? "",
    email: session?.user.email ?? "",
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: ""
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (status === "loading") {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8">Loading...</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    // Validation
    if (form.newPassword && form.newPassword !== form.confirmNewPassword) {
      setError("New passwords do not match");
      setLoading(false);
      return;
    }

    if (form.newPassword && form.newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/users/${session?.user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim() || null,
          email: form.email.trim(),
          ...(form.newPassword && { 
            currentPassword: form.currentPassword,
            newPassword: form.newPassword 
          }),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Failed to update profile");
        setLoading(false);
        return;
      }

      // Update the session with new data
      await update({
        ...session,
        user: {
          ...session?.user,
          name: form.name.trim() || null,
          email: form.email.trim(),
        }
      });

      setSuccess("Profile updated successfully!");
      // Clear password fields after successful update
      setForm(prev => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: ""
      }));
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">User Settings</h1>
        <p className="mt-2 text-sm text-slate-500">Manage your account information and security settings.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-slate-900">Personal Information</h2>
            
            <div className="space-y-3">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Full Name
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                  placeholder="Your name"
                />
              </label>
              
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Email Address
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                  placeholder="your.email@example.com"
                />
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-medium text-slate-900">Password</h2>
            
            <div className="space-y-3">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Current Password
                <input
                  type="password"
                  value={form.currentPassword}
                  onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                  placeholder="Enter your current password"
                />
              </label>
              
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                New Password
                <input
                  type="password"
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                  placeholder="Enter a new password"
                />
              </label>
              
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Confirm New Password
                <input
                  type="password"
                  value={form.confirmNewPassword}
                  onChange={(e) => setForm({ ...form, confirmNewPassword: e.target.value })}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                  placeholder="Confirm your new password"
                />
              </label>
            </div>
          </div>
        </div>

        {error && <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}
        {success && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-600">{success}</div>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg bg-synvora-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-synvora-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Updating..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}