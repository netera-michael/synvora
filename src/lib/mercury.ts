/**
 * Mercury.com API Client
 * Documentation: https://mercury.com/api
 */

type MercuryTransaction = {
  id: string;
  amount: number;
  direction: "credit" | "debit";
  accountId: string;
  counterparty: {
    name: string;
  };
  category: string;
  merchant: {
    name: string;
  };
  memo?: string;
  postedAt: string;
  externalId?: string;
};

type CreateTransactionParams = {
  amount: number;
  direction: "credit" | "debit";
  accountId: string;
  counterpartyName: string;
  memo?: string;
  postedAt: string;
  externalId?: string;
};

type MercuryAccount = {
  id: string;
  name: string;
  type: string;
};

export class MercuryClient {
  private apiKey: string;
  private baseUrl = "https://api.mercury.com/api/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mercury API error: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get all accounts
   */
  async getAccounts(): Promise<MercuryAccount[]> {
    const response = await this.request<{ accounts: MercuryAccount[] }>("/accounts");
    return response.accounts;
  }

  /**
   * Create a transaction (payout) in Mercury
   */
  async createTransaction(params: CreateTransactionParams): Promise<MercuryTransaction> {
    const transaction = await this.request<MercuryTransaction>("/transactions", {
      method: "POST",
      body: JSON.stringify({
        amount: params.amount,
        direction: params.direction,
        accountId: params.accountId,
        counterparty: {
          name: params.counterpartyName,
        },
        memo: params.memo || `Payout: ${params.counterpartyName}`,
        postedAt: params.postedAt,
        externalId: params.externalId,
      }),
    });

    return transaction;
  }

  /**
   * Get a transaction by ID
   */
  async getTransaction(transactionId: string): Promise<MercuryTransaction> {
    return this.request<MercuryTransaction>(`/transactions/${transactionId}`);
  }

  /**
   * Get transactions for an account
   */
  async getTransactions(params: {
    accountId: string;
    startDate?: string;
    endDate?: string;
  }): Promise<MercuryTransaction[]> {
    const queryParams = new URLSearchParams();
    queryParams.append("accountId", params.accountId);
    if (params.startDate) {
      queryParams.append("startDate", params.startDate);
    }
    if (params.endDate) {
      queryParams.append("endDate", params.endDate);
    }

    const response = await this.request<{ transactions: MercuryTransaction[] }>(
      `/transactions?${queryParams.toString()}`
    );
    return response.transactions;
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getAccounts();
      return true;
    } catch (error) {
      console.error("Mercury connection test failed:", error);
      return false;
    }
  }
}

