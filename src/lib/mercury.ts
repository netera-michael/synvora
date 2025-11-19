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
  private baseUrl = "https://api.mercury.com/api";

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
    try {
      const response = await this.request<{ accounts: MercuryAccount[] }>("/v1/accounts");
      return response.accounts || [];
    } catch (error: any) {
      // Fallback: try without /v1 prefix
      if (error.message?.includes('404') || error.message?.includes('notFound')) {
        try {
          const response = await this.request<{ accounts: MercuryAccount[] }>("/accounts");
          return response.accounts || [];
        } catch (altError) {
          throw error; // Throw original error
        }
      }
      throw error;
    }
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
   * Mercury API: GET /accounts/{accountId}/transactions
   */
  async getTransactions(params: {
    accountId: string;
    startDate?: string;
    endDate?: string;
  }): Promise<MercuryTransaction[]> {
    // Try /accounts/{accountId}/transactions first (matching the accounts endpoint format)
    const endpoint = `/accounts/${params.accountId}/transactions`;
    const queryParams = new URLSearchParams();
    
    // Mercury API expects dates in YYYY-MM-DD format
    if (params.startDate) {
      // Convert ISO string to YYYY-MM-DD if needed
      const startDate = params.startDate.includes('T') 
        ? params.startDate.split('T')[0]
        : params.startDate;
      queryParams.append("start", startDate);
    }
    if (params.endDate) {
      // Convert ISO string to YYYY-MM-DD if needed
      const endDate = params.endDate.includes('T')
        ? params.endDate.split('T')[0]
        : params.endDate;
      queryParams.append("end", endDate);
    }

    const url = queryParams.toString() 
      ? `${endpoint}?${queryParams.toString()}`
      : endpoint;

    try {
      const response = await this.request<{ transactions: MercuryTransaction[] }>(url);
      return response.transactions || [];
    } catch (error: any) {
      // If 404, try with /v1 prefix as fallback
      if (error.message?.includes('404') || error.message?.includes('notFound')) {
        const altEndpoint = `/v1/accounts/${params.accountId}/transactions`;
        const altUrl = queryParams.toString() 
          ? `${altEndpoint}?${queryParams.toString()}`
          : altEndpoint;
        try {
          const response = await this.request<{ transactions: MercuryTransaction[] }>(altUrl);
          return response.transactions || [];
        } catch (altError) {
          throw error; // Throw original error with more context
        }
      }
      throw error;
    }
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

