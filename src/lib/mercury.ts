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
    const attemptedUrls: string[] = [];

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
              "Authorization": `Bearer ${this.apiKey}`,
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
   * Mercury API: Try multiple endpoint formats and query parameter names
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

    // Try different endpoint structures:
    // 1. /accounts/{id}/transactions (RESTful path)
    // 2. /transactions?accountId={id} (query param)
    // 3. /v1/transactions?accountId={id}
    
    const endpoints: string[] = [];
    
    // Structure 1: RESTful path parameter
    const restfulPath = `/accounts/${params.accountId}/transactions`;
    if (startDate && endDate) {
      endpoints.push(`${restfulPath}?start=${startDate}&end=${endDate}`);
      endpoints.push(`${restfulPath}?startDate=${startDate}&endDate=${endDate}`);
      endpoints.push(`${restfulPath}?from=${startDate}&to=${endDate}`);
    } else {
      endpoints.push(restfulPath);
    }
    
    // Structure 2: Query parameter for accountId
    const queryParamBase = `/transactions`;
    const accountIdParam = `accountId=${params.accountId}`;
    if (startDate && endDate) {
      endpoints.push(`${queryParamBase}?${accountIdParam}&start=${startDate}&end=${endDate}`);
      endpoints.push(`${queryParamBase}?${accountIdParam}&startDate=${startDate}&endDate=${endDate}`);
      endpoints.push(`${queryParamBase}?${accountIdParam}&from=${startDate}&to=${endDate}`);
    } else {
      endpoints.push(`${queryParamBase}?${accountIdParam}`);
    }
    
    // Structure 3: Try with /v1 prefix in endpoint (if baseUrl doesn't have it)
    endpoints.push(`/v1/transactions?${accountIdParam}${startDate && endDate ? `&start=${startDate}&end=${endDate}` : ''}`);

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

