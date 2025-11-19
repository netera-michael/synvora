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
  // Mercury API base URL: https://api.mercury.com/api/v1
  private baseUrl = "https://api.mercury.com/api/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Try multiple base URL formats
  private async tryRequest<T>(endpoints: string[], options: RequestInit = {}): Promise<T> {
    const baseUrls = [
      "https://api.mercury.com/v1",
      "https://api.mercury.com/api/v1", 
      "https://api.mercury.com/api",
      "https://api.mercury.com" // Try without any version prefix
    ];

    let lastError: Error | null = null;
    const attemptedUrls: string[] = [];

    // Mercury API uses "secret-token:" prefix, not "Bearer"
    let authHeader: string;
    if (this.apiKey.startsWith("secret-token:")) {
      authHeader = this.apiKey;
    } else {
      authHeader = `secret-token:${this.apiKey}`;
    }

    for (const baseUrl of baseUrls) {
      for (const endpoint of endpoints) {
        // Ensure endpoint doesn't start with /v1 if baseUrl already has it
        let cleanEndpoint = endpoint;
        if (baseUrl.includes('/v1') && endpoint.startsWith('/v1/')) {
          cleanEndpoint = endpoint.replace(/^\/v1/, '');
        }
        
        const url = `${baseUrl}${cleanEndpoint}`;
        
        // Skip if we've already tried this exact URL
        if (attemptedUrls.includes(url)) {
          continue;
        }
        attemptedUrls.push(url);

        try {
          console.log(`Trying Mercury API: ${options.method || 'GET'} ${url}`);
          const response = await fetch(url, {
            ...options,
            headers: {
              "Authorization": authHeader,
              "Content-Type": "application/json",
              ...options.headers,
            },
          });

          if (response.ok) {
            console.log(`✅ Success with ${url}`);
            const data = await response.json();
            return data;
          }
          
          const errorText = await response.text();
          console.log(`❌ Failed ${url}: ${response.status} ${errorText.substring(0, 200)}`);
          
          if (response.status !== 404) {
            // If it's not 404, this might be the right endpoint but wrong auth/permissions
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

    console.error(`All ${attemptedUrls.length} Mercury API endpoint attempts failed`);
    throw lastError || new Error("All Mercury API endpoint attempts failed");
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`Mercury API request: ${options.method || 'GET'} ${url}`);
    
    // Mercury API uses "secret-token:" prefix, not "Bearer"
    // Handle both formats: if apiKey already has "secret-token:", use it as-is
    // Otherwise, prepend "secret-token:"
    let authHeader: string;
    if (this.apiKey.startsWith("secret-token:")) {
      authHeader = this.apiKey;
    } else {
      authHeader = `secret-token:${this.apiKey}`;
    }
    
    const response = await fetch(url, {
      ...options,
      headers: {
        "Authorization": authHeader,
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
   * Mercury API: GET /api/v1/accounts
   * Documentation: https://docs.mercury.com/reference/getallaccounts
   */
  async getAccounts(): Promise<MercuryAccount[]> {
    // Base URL already includes /api/v1, so use /accounts
    const response = await this.request<{ accounts: MercuryAccount[] }>("/accounts");
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
   * Mercury API: GET /api/v1/account/{accountId}/transactions
   * Documentation: https://docs.mercury.com/reference/listaccounttransactions
   */
  async getTransactions(params: {
    accountId: string;
    startDate?: string;
    endDate?: string;
  }): Promise<MercuryTransaction[]> {
    // Format dates in YYYY-MM-DD
    const startDate = params.startDate?.includes('T') 
      ? params.startDate.split('T')[0]
      : params.startDate;
    const endDate = params.endDate?.includes('T')
      ? params.endDate.split('T')[0]
      : params.endDate;

    // Mercury API uses: /api/v1/account/{accountId}/transactions
    // Base URL already includes /api/v1, so use /account/{id}/transactions (singular "account")
    let endpoint = `/account/${params.accountId}/transactions`;
    
    // Add date query parameters if provided
    const queryParams = new URLSearchParams();
    if (startDate) {
      queryParams.append("start", startDate);
    }
    if (endDate) {
      queryParams.append("end", endDate);
    }
    
    if (queryParams.toString()) {
      endpoint += `?${queryParams.toString()}`;
    }

    const response = await this.request<{ transactions: MercuryTransaction[] }>(endpoint);
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

