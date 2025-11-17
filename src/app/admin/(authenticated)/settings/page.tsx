import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ClientSettingsPage from "./client-page";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const isAdmin = session.user.role === "ADMIN";

  if (!isAdmin) {
    // Redirect regular users to their user settings page
    redirect("/settings/user");
  }

  // Only render the admin settings page if user is an admin
  return <ClientSettingsPage />;
}