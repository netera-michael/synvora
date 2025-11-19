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
  private baseUrl = "https://api.mercury.com/v1";

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
   * Mercury API: GET /v1/accounts
   */
  async getAccounts(): Promise<MercuryAccount[]> {
    try {
      // Base URL already includes /v1, so use /accounts
      const response = await this.request<{ accounts: MercuryAccount[] }>("/accounts");
      return response.accounts || [];
    } catch (error: any) {
      // If base URL is wrong, try with /api prefix
      if (error.message?.includes('404') || error.message?.includes('notFound')) {
        // Temporarily change base URL to try /api/v1 format
        const originalBaseUrl = this.baseUrl;
        this.baseUrl = "https://api.mercury.com/api/v1";
        try {
          const response = await this.request<{ accounts: MercuryAccount[] }>("/accounts");
          this.baseUrl = originalBaseUrl; // Restore original
          return response.accounts || [];
        } catch (altError) {
          this.baseUrl = originalBaseUrl; // Restore original
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
   * Mercury API: GET /v1/accounts/{accountId}/transactions
   */
  async getTransactions(params: {
    accountId: string;
    startDate?: string;
    endDate?: string;
  }): Promise<MercuryTransaction[]> {
    // Base URL already includes /v1, so use /accounts/{accountId}/transactions
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
      // If 404, try with /api prefix in base URL
      if (error.message?.includes('404') || error.message?.includes('notFound')) {
        const originalBaseUrl = this.baseUrl;
        this.baseUrl = "https://api.mercury.com/api/v1";
        try {
          const altUrl = queryParams.toString() 
            ? `${endpoint}?${queryParams.toString()}`
            : endpoint;
          const response = await this.request<{ transactions: MercuryTransaction[] }>(altUrl);
          this.baseUrl = originalBaseUrl; // Restore original
          return response.transactions || [];
        } catch (altError) {
          this.baseUrl = originalBaseUrl; // Restore original
          throw error; // Throw original error
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

