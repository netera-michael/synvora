export type PayoutDto = {
  id: number;
  amount: number;
  currency: string;
  status: string;
  description: string;
  account: string;
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
};
