export type PayoutDto = {
  id: number;
  amount: number;
  currency: string;
  status: string;
  description: string;
  account: string;
  bank?: string | null;
  period?: string | null;
  processedAt: string;
  notes?: string | null;
  venueId?: number | null;
  venue?: {
    id: number;
    name: string;
    slug: string;
  } | null;
  createdById?: number | null;
  createdBy?: {
    id: number;
    name: string | null;
    email: string | null;
  } | null;
  mercuryTransactionId?: string | null;
  syncedToMercury?: boolean;
  syncedAt?: string | null;
};

export type VenueBalance = {
  id: number;
  name: string;
  slug: string;
  balanceAdjustment: number;
  totalOrdersPayout: number;
  totalPaidOut: number;
  pendingBalance: number;
};
