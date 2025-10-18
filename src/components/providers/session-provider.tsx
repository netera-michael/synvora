"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import type { ReactNode } from "react";

type SessionProviderProps = {
  children: ReactNode;
  session?: Session | null;
};

export function SynvoraSessionProvider({ children, session }: SessionProviderProps) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
