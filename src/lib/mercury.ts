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
  // Try different base URL formats - Mercury API might use different structure
  private baseUrl = "https://api.mercury.com/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Try multiple base URL formats
  private async tryRequest<T>(endpoints: string[], options: RequestInit = {}): Promise<T> {
    const baseUrls = [
      "https://api.mercury.com/v1",
      "https://api.mercury.com/api/v1", 
      "https://api.mercury.com/api"
    ];

    let lastError: Error | null = null;

    for (const baseUrl of baseUrls) {
      for (const endpoint of endpoints) {
        const url = `${baseUrl}${endpoint}`;
        try {
          console.log(`Trying Mercury API: ${options.method || 'GET'} ${url}`);
          const response = await fetch(url, {
            ...options,
            headers: {
              "Authorization": `Bearer ${this.apiKey}`,
              "Content-Type": "application/json",
              ...options.headers,
            },
          });

          if (response.ok) {
            console.log(`Success with ${url}`);
            return await response.json();
          }
          
          if (response.status !== 404) {
            // If it's not 404, this might be the right endpoint but wrong auth/permissions
            const errorText = await response.text();
            throw new Error(`Mercury API error: ${response.status} ${errorText}`);
          }
        } catch (error: any) {
          if (!error.message?.includes('404') && !error.message?.includes('notFound')) {
            throw error; // Re-throw non-404 errors immediately
          }
          lastError = error;
        }
      }
    }

    throw lastError || new Error("All Mercury API endpoint attempts failed");
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`Mercury API request: ${options.method || 'GET'} ${url}`);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Mercury API error for ${url}: ${response.status} ${errorText}`);
      throw new Error(`Mercury API error: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get all accounts
   * Mercury API: Try multiple endpoint formats
   */
  async getAccounts(): Promise<MercuryAccount[]> {
    const endpoints = ["/accounts", "/v1/accounts"];
    const response = await this.tryRequest<{ accounts: MercuryAccount[] }>(endpoints);
    return response.accounts || [];
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
   * Mercury API: Try multiple endpoint formats
   */
  async getTransactions(params: {
    accountId: string;
    startDate?: string;
    endDate?: string;
  }): Promise<MercuryTransaction[]> {
    const queryParams = new URLSearchParams();
    
    // Mercury API expects dates in YYYY-MM-DD format
    if (params.startDate) {
      const startDate = params.startDate.includes('T') 
        ? params.startDate.split('T')[0]
        : params.startDate;
      queryParams.append("start", startDate);
    }
    if (params.endDate) {
      const endDate = params.endDate.includes('T')
        ? params.endDate.split('T')[0]
        : params.endDate;
      queryParams.append("end", endDate);
    }

    const queryString = queryParams.toString();
    const baseEndpoint = `/accounts/${params.accountId}/transactions`;
    const endpointWithQuery = queryString ? `${baseEndpoint}?${queryString}` : baseEndpoint;
    
    // Try multiple endpoint formats
    const endpoints = [
      endpointWithQuery,
      `/v1/accounts/${params.accountId}/transactions${queryString ? `?${queryString}` : ''}`,
      `/accounts/${params.accountId}/transactions${queryString ? `?${queryString}` : ''}`
    ];

    const response = await this.tryRequest<{ transactions: MercuryTransaction[] }>(endpoints);
    return response.transactions || [];
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

