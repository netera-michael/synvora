"use client";

import { useState, useEffect } from "react";
import useSWR, { type KeyedMutator } from "swr";
import { useSession } from "next-auth/react";

const fetcher = (url: string) =>
  fetch(url).then((response) => {
    if (!response.ok) {
      throw new Error("Request failed");
    }
    return response.json();
  });

type VenueSummary = {
  id: number;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  userCount: number;
  orderCount: number;
};

type VenuesResponse = {
  venues: VenueSummary[];
};

type UserSummary = {
  id: number;
  email: string;
  name: string | null;
  role: "ADMIN" | "USER";
  createdAt: string;
  venueIds: number[];
  venues: Array<{ id: number; name: string; slug: string }>;
};

type UsersResponse = {
  users: UserSummary[];
};

export default function ClientSettingsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "ADMIN";

  const venuesSWR = useSWR<VenuesResponse>(isAdmin ? "/api/venues" : null, fetcher);
  const usersSWR = useSWR<UsersResponse>(isAdmin ? "/api/users" : null, fetcher);

  return (
    <div className="space-y-8">
      <VenuesSection
        venues={venuesSWR.data?.venues ?? []}
        isLoading={venuesSWR.isLoading}
        mutate={venuesSWR.mutate}
      />
      <UsersSection
        venues={venuesSWR.data?.venues ?? []}
        users={usersSWR.data?.users ?? []}
        isLoading={usersSWR.isLoading}
        mutate={usersSWR.mutate}
      />
      <MercurySection />
    </div>
  );
}

type VenuesSectionProps = {
  venues: VenueSummary[];
  isLoading: boolean;
  mutate: KeyedMutator<VenuesResponse>;
};

function VenuesSection({ venues, isLoading, mutate }: VenuesSectionProps) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("A venue name is required");
      return;
    }

    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/venues", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name: trimmed })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.message ?? "Unable to create venue");
      setSubmitting(false);
      return;
    }

    setName("");
    setSubmitting(false);
    mutate();
  };

  const handleRename = async (venue: VenueSummary) => {
    const nextName = prompt("Rename venue", venue.name)?.trim();
    if (!nextName || nextName === venue.name) {
      return;
    }

    await fetch(`/api/venues/${venue.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name: nextName })
    });

    mutate();
  };

  const handleDelete = async (venue: VenueSummary) => {
    if (venue.orderCount > 0) {
      alert("This venue still has orders and cannot be removed.");
      return;
    }

    if (!confirm(`Delete venue “${venue.name}”? This cannot be undone.`)) {
      return;
    }

    await fetch(`/api/venues/${venue.id}`, { method: "DELETE" });
    mutate();
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-6 flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-slate-900">Venues</h2>
        <p className="text-sm text-slate-500">
          Create venues and keep their names up to date. Venues control which orders a user can access.
        </p>
      </header>

      <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="New venue name"
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
        />
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-lg bg-synvora-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-synvora-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {submitting ? "Creating…" : "Add venue"}
        </button>
      </form>
      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Venue</th>
              <th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3">Users</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {isLoading && venues.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  Loading venues…
                </td>
              </tr>
            ) : null}
            {venues.map((venue) => (
              <tr key={venue.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{venue.name}</td>
                <td className="px-4 py-3 text-slate-600">{venue.orderCount}</td>
                <td className="px-4 py-3 text-slate-600">{venue.userCount}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleRename(venue)}
                    className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-synvora-primary hover:text-synvora-primary"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(venue)}
                    className="ml-2 inline-flex items-center rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={venue.orderCount > 0}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && venues.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  No venues yet. Create one to get started.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type UsersSectionProps = {
  venues: VenueSummary[];
  users: UserSummary[];
  isLoading: boolean;
  mutate: KeyedMutator<UsersResponse>;
};

function UsersSection({ venues, users, isLoading, mutate }: UsersSectionProps) {
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "USER" as "ADMIN" | "USER",
    venueIds: [] as number[]
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [editingUser, setEditingUser] = useState<UserSummary | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    password: "",
    role: "USER" as "ADMIN" | "USER",
    venueIds: [] as number[]
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const toggleVenueSelection = (state: number[], venueId: number) =>
    state.includes(venueId) ? state.filter((id) => id !== venueId) : [...state, venueId];

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);

    if (!createForm.email.trim()) {
      setCreateError("Email is required");
      return;
    }

    if (!createForm.password || createForm.password.length < 8) {
      setCreateError("Password must be at least 8 characters");
      return;
    }

    setCreating(true);

    const response = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: createForm.email.trim(),
        password: createForm.password,
        name: createForm.name.trim() || undefined,
        role: createForm.role,
        venueIds: createForm.venueIds
      })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setCreateError(payload?.message ?? "Unable to create user");
      setCreating(false);
      return;
    }

    setCreateForm({ name: "", email: "", password: "", role: "USER", venueIds: [] });
    setCreating(false);
    mutate();
  };

  const startEdit = (user: UserSummary) => {
    setEditingUser(user);
    setEditForm({
      name: user.name ?? "",
      password: "",
      role: user.role,
      venueIds: user.venueIds
    });
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditForm({ name: "", password: "", role: "USER", venueIds: [] });
    setEditError(null);
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingUser) {
      return;
    }

    setEditError(null);
    setUpdating(true);

    const payload: Record<string, unknown> = {
      name: editForm.name.trim() || null,
      role: editForm.role,
      venueIds: editForm.venueIds
    };

    if (editForm.password) {
      if (editForm.password.length < 8) {
        setEditError("Password must be at least 8 characters");
        setUpdating(false);
        return;
      }
      payload.password = editForm.password;
    }

    const response = await fetch(`/api/users/${editingUser.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const message = await response.json().catch(() => null);
      setEditError(message?.message ?? "Unable to update user");
      setUpdating(false);
      return;
    }

    setUpdating(false);
    setEditingUser(null);
    setEditForm({ name: "", password: "", role: "USER", venueIds: [] });
    mutate();
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-6 flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-slate-900">Users</h2>
        <p className="text-sm text-slate-500">
          Invite teammates, assign venues, and control who can manage orders.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleCreate} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Create user</h3>
          <div className="mt-4 space-y-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Name
              <input
                value={createForm.name}
                onChange={(event) => setCreateForm((state) => ({ ...state, name: event.target.value }))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                value={createForm.email}
                onChange={(event) => setCreateForm((state) => ({ ...state, email: event.target.value }))}
                required
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Temporary password
              <input
                type="password"
                value={createForm.password}
                onChange={(event) => setCreateForm((state) => ({ ...state, password: event.target.value }))}
                required
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
              />
              <span className="text-xs font-normal text-slate-400">Share this password securely with the user.</span>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Role
              <select
                value={createForm.role}
                onChange={(event) =>
                  setCreateForm((state) => ({ ...state, role: event.target.value as "ADMIN" | "USER" }))
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
              >
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
            </label>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-slate-700">Venue access</legend>
              {venues.length === 0 ? (
                <p className="text-xs text-slate-500">Create a venue first to assign access.</p>
              ) : (
                <div className="grid gap-1">
                  {venues.map((venue) => {
                    const checked = createForm.venueIds.includes(venue.id);
                    return (
                      <label key={venue.id} className="inline-flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setCreateForm((state) => ({
                              ...state,
                              venueIds: toggleVenueSelection(state.venueIds, venue.id)
                            }))
                          }
                          className="h-4 w-4 rounded border-slate-300 text-synvora-primary focus:ring-synvora-primary/40"
                        />
                        {venue.name}
                      </label>
                    );
                  })}
                </div>
              )}
            </fieldset>
          </div>
          {createError ? <p className="mt-3 text-sm text-rose-600">{createError}</p> : null}
          <button
            type="submit"
            disabled={creating}
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-synvora-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-synvora-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {creating ? "Creating…" : "Invite user"}
          </button>
        </form>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">Team members</h3>
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Venues</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {isLoading && users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                      Loading users…
                    </td>
                  </tr>
                ) : null}
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div className="flex flex-col">
                        <span>{user.name ?? "Untitled user"}</span>
                        <span className="text-xs text-slate-500">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{user.role}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {user.venues.length ? user.venues.map((venue) => venue.name).join(", ") : "No venues"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => startEdit(user)}
                        className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-synvora-primary hover:text-synvora-primary"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {!isLoading && users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                      No users yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {editingUser ? (
            <form onSubmit={handleUpdate} className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h4 className="text-sm font-semibold text-slate-900">Edit {editingUser.email}</h4>
              <div className="mt-4 space-y-3">
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Name
                  <input
                    value={editForm.name}
                    onChange={(event) => setEditForm((state) => ({ ...state, name: event.target.value }))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Role
                  <select
                    value={editForm.role}
                    onChange={(event) => setEditForm((state) => ({ ...state, role: event.target.value as "ADMIN" | "USER" }))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                  >
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Reset password
                  <input
                    type="password"
                    value={editForm.password}
                    onChange={(event) => setEditForm((state) => ({ ...state, password: event.target.value }))}
                    placeholder="Leave blank to keep current password"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                  />
                </label>
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-slate-700">Venue access</legend>
                  <div className="grid gap-1">
                    {venues.map((venue) => {
                      const checked = editForm.venueIds.includes(venue.id);
                      return (
                        <label key={venue.id} className="inline-flex items-center gap-2 text-sm text-slate-600">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setEditForm((state) => ({
                                ...state,
                                venueIds: toggleVenueSelection(state.venueIds, venue.id)
                              }))
                            }
                            className="h-4 w-4 rounded border-slate-300 text-synvora-primary focus:ring-synvora-primary/40"
                          />
                          {venue.name}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </div>
              {editError ? <p className="mt-3 text-sm text-rose-600">{editError}</p> : null}
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={updating}
                  className="inline-flex items-center justify-center rounded-lg bg-synvora-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-synvora-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {updating ? "Saving…" : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="text-sm font-semibold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}