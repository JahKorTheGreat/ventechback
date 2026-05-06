/**
 * affiliateClient.ts
 * Frontend API client for VENTECH Affiliate System
 * 
 * Usage in React:
 * const affiliateClient = new AffiliateClient(jwtToken);
 * const stats = await affiliateClient.getDashboardStats();
 */

interface RequestOptions {
  method: 'GET' | 'POST' | 'DELETE' | 'PUT';
  body?: any;
}

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class AffiliateClient {
  private baseUrl: string;
  private jwtToken: string;

  constructor(jwtToken: string, baseUrl: string = 'http://localhost:3000/api/affiliate') {
    this.jwtToken = jwtToken;
    this.baseUrl = baseUrl;
  }

  /**
   * Internal method to make HTTP requests
   */
  private async request<T = any>(endpoint: string, options: RequestOptions): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.jwtToken) {
      headers['Authorization'] = `Bearer ${this.jwtToken}`;
    }

    const response = await fetch(url, {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `API Error: ${response.status}`);
    }

    return response.json();
  }

  // ==================== PUBLIC ENDPOINTS ====================

  /**
   * Submit affiliate application (PUBLIC - no auth required)
   */
  async submitApplication(data: {
    fullName: string;
    email: string;
    phone: string;
    country: string;
    promotionChannel: string;
    platformLink: string;
    audienceSize: number;
    payoutMethod: string;
    reason: string;
  }): Promise<ApiResponse> {
    return this.request('/', {
      method: 'POST',
      body: data,
    });
  }

  // ==================== DASHBOARD ENDPOINTS ====================

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<ApiResponse<{
    totalEarnings: number;
    pendingEarnings: number;
    totalClicks: number;
    totalConversions: number;
    conversionRate: string;
    thisMonthEarnings: number;
    lastMonthEarnings: number;
    tier: string;
    referralCode: string;
  }>> {
    return this.request('/dashboard/stats', { method: 'GET' });
  }

  /**
   * Get chart data for dashboard visualization
   */
  async getChartData(): Promise<ApiResponse<{
    labels: string[];
    earnings: number[];
    clicks: number[];
    conversions: number[];
  }>> {
    return this.request('/dashboard/chart-data', { method: 'GET' });
  }

  /**
   * Get recent earnings (last 10)
   */
  async getRecentEarnings(): Promise<ApiResponse<any[]>> {
    return this.request('/dashboard/recent-earnings', { method: 'GET' });
  }

  // ==================== EARNINGS ENDPOINTS ====================

  /**
   * Get all earnings with pagination and filtering
   */
  async getEarnings(options?: {
    status?: 'all' | 'pending' | 'approved' | 'paid';
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());

    const query = params.toString();
    return this.request(`/earnings${query ? '?' + query : ''}`, { method: 'GET' });
  }

  /**
   * Get earnings summary (breakdown by status)
   */
  async getEarningsSummary(): Promise<ApiResponse<{
    approved: number;
    pending: number;
    paid: number;
  }>> {
    return this.request('/earnings/summary', { method: 'GET' });
  }

  // ==================== REFERRAL LINKS ENDPOINTS ====================

  /**
   * Get all referral links
   */
  async getReferralLinks(): Promise<ApiResponse<any[]>> {
    return this.request('/links', { method: 'GET' });
  }

  /**
   * Create a new referral link
   */
  async createReferralLink(data: {
    name: string;
    source: string;
  }): Promise<ApiResponse<{
    id: string;
    name: string;
    url: string;
    shortUrl: string;
    source: string;
    createdAt: string;
  }>> {
    return this.request('/links', {
      method: 'POST',
      body: data,
    });
  }

  /**
   * Delete a referral link
   */
  async deleteReferralLink(linkId: string): Promise<ApiResponse> {
    return this.request(`/links/${linkId}`, { method: 'DELETE' });
  }

  // ==================== PRODUCTS ENDPOINTS ====================

  /**
   * Get all products with affiliate commission info
   */
  async getProducts(): Promise<ApiResponse<any[]>> {
    return this.request('/products', { method: 'GET' });
  }

  // ==================== PAYMENT METHODS ENDPOINTS ====================

  /**
   * Get all payment methods
   */
  async getPaymentMethods(): Promise<ApiResponse<any[]>> {
    return this.request('/payment-methods', { method: 'GET' });
  }

  /**
   * Add a new payment method
   */
  async addPaymentMethod(data: {
    type: 'bank' | 'momo' | 'crypto';
    name: string;
    details: string;
  }): Promise<ApiResponse<{
    id: string;
    type: string;
    name: string;
    details: string;
    isDefault: boolean;
    isVerified: boolean;
  }>> {
    return this.request('/payment-methods', {
      method: 'POST',
      body: data,
    });
  }

  /**
   * Delete a payment method
   */
  async deletePaymentMethod(methodId: string): Promise<ApiResponse> {
    return this.request(`/payment-methods/${methodId}`, { method: 'DELETE' });
  }

  // ==================== PAYOUTS ENDPOINTS ====================

  /**
   * Get payout history
   */
  async getPayouts(): Promise<ApiResponse<any[]>> {
    return this.request('/payouts', { method: 'GET' });
  }

  /**
   * Request a payout
   */
  async requestPayout(data: {
    amount: number;
    methodId: string;
  }): Promise<ApiResponse<{
    id: string;
    amount: number;
    method: string;
    status: 'pending' | 'processing' | 'completed';
    createdAt: string;
  }>> {
    return this.request('/payouts/request', {
      method: 'POST',
      body: data,
    });
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Update JWT token (when user logs in with new token)
   */
  updateToken(token: string): void {
    this.jwtToken = token;
  }

  /**
   * Clear JWT token (on logout)
   */
  clearToken(): void {
    this.jwtToken = '';
  }
}

// ==================== USAGE EXAMPLES ====================

/**
 * Example 1: React Hook for Dashboard
 */
export const useDashboardData = (jwtToken: string) => {
  const [stats, setStats] = React.useState(null);
  const [chartData, setChartData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const client = new AffiliateClient(jwtToken);
        const [statsRes, chartRes] = await Promise.all([
          client.getDashboardStats(),
          client.getChartData(),
        ]);

        setStats(statsRes.data);
        setChartData(chartRes.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [jwtToken]);

  return { stats, chartData, loading, error };
};

/**
 * Example 2: React Component using AffiliateClient
 */
const DashboardComponent: React.FC<{ jwtToken: string }> = ({ jwtToken }) => {
  const client = new AffiliateClient(jwtToken);
  const { stats, chartData, loading } = useDashboardData(jwtToken);

  const handleCreateLink = async () => {
    try {
      const newLink = await client.createReferralLink({
        name: 'My YouTube Campaign',
        source: 'youtube',
      });

      // Copy link to clipboard
      navigator.clipboard.writeText(newLink.data.url);
      alert('Link copied to clipboard!');
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleRequestPayout = async () => {
    try {
      // Get payment methods first
      const methodsRes = await client.getPaymentMethods();
      const defaultMethod = methodsRes.data?.[0];

      if (!defaultMethod) {
        alert('Add a payment method first');
        return;
      }

      // Request payout
      const payout = await client.requestPayout({
        amount: 100,
        methodId: defaultMethod.id,
      });

      alert(`Payout requested: $${payout.data.amount}`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Affiliate Dashboard</h1>

      {/* Stats */}
      <div className="stats">
        <div>Total Earnings: ${stats?.totalEarnings}</div>
        <div>Pending: ${stats?.pendingEarnings}</div>
        <div>Clicks: {stats?.totalClicks}</div>
        <div>Conversions: {stats?.totalConversions}</div>
      </div>

      {/* Actions */}
      <button onClick={handleCreateLink}>Create Link</button>
      <button onClick={handleRequestPayout}>Request Payout</button>
    </div>
  );
};

/**
 * Example 3: Using in Context API for app-wide access
 */
const AffiliateContext = React.createContext<AffiliateClient | null>(null);

export const AffiliateProvider: React.FC<{ children: React.ReactNode; token: string }> = ({
  children,
  token,
}) => {
  const client = new AffiliateClient(token);

  return (
    <AffiliateContext.Provider value={client}>{children}</AffiliateContext.Provider>
  );
};

export const useAffiliate = () => {
  const context = React.useContext(AffiliateContext);
  if (!context) {
    throw new Error('useAffiliate must be used within AffiliateProvider');
  }
  return context;
};

/**
 * Example 4: Component that uses the context
 */
const EarningsPage: React.FC = () => {
  const client = useAffiliate();
  const [earnings, setEarnings] = React.useState([]);

  React.useEffect(() => {
    client.getEarnings({ status: 'pending' }).then((res) => {
      setEarnings(res.data || []);
    });
  }, [client]);

  return (
    <div>
      <h2>Pending Earnings</h2>
      <ul>
        {earnings.map((earning: any) => (
          <li key={earning.id}>
            {earning.productName}: ${earning.amount}
          </li>
        ))}
      </ul>
    </div>
  );
};
