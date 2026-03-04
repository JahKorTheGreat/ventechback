// src/services/affiliate.service.ts

import { supabaseAdmin } from '../utils/supabaseClient';
import {
  Affiliate,
  ReferralLink,
  Earning,
  Payout,
  PaymentMethod,
  DashboardStats,
  ChartData,
  CommissionRates,
} from '../types/affiliate.types';

export class AffiliateService {
  private COMMISSION_RATES: CommissionRates = {
    starter: 0.08,
    pro: 0.10,
    elite: 0.12,
  };

  private MIN_PAYOUT = 50;
  private COOKIE_DURATION_DAYS = 90;

  /**
   * Create a new affiliate account for a user
   */
  async createAffiliate(userId: string, tier: string = 'starter'): Promise<Affiliate> {
    // Generate unique referral code
    const referralCode = this.generateReferralCode();

    const { data, error } = await supabaseAdmin
      .from('affiliates')
      .insert({
        user_id: userId,
        referral_code: referralCode,
        tier,
        status: 'pending',
        total_earnings: 0,
        pending_earnings: 0,
        total_clicks: 0,
        total_conversions: 0,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create affiliate: ${error.message}`);
    }

    return this.mapAffiliate(data);
  }

  /**
   * Get affiliate by user ID
   */
  async getAffiliateByUserId(userId: string): Promise<Affiliate | null> {
    const { data, error } = await supabaseAdmin
      .from('affiliates')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapAffiliate(data);
  }

  /**
   * Get affiliate by ID
   */
  async getAffiliateById(affiliateId: string): Promise<Affiliate | null> {
    const { data, error } = await supabaseAdmin
      .from('affiliates')
      .select('*')
      .eq('id', affiliateId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapAffiliate(data);
  }

  /**
   * Get dashboard statistics for affiliate
   */
  async getDashboardStats(affiliateId: string): Promise<DashboardStats> {
    const affiliate = await this.getAffiliateById(affiliateId);
    if (!affiliate) {
      throw new Error('Affiliate not found');
    }

    // Calculate this month earnings
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: thisMonthData } = await supabaseAdmin
      .from('earnings')
      .select('amount')
      .eq('affiliate_id', affiliateId)
      .in('status', ['approved', 'paid'])
      .gte('created_at', startOfMonth.toISOString());

    const thisMonthEarnings = thisMonthData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

    // Calculate last month earnings
    const startOfLastMonth = new Date(startOfMonth);
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
    const endOfLastMonth = new Date(startOfMonth);

    const { data: lastMonthData } = await supabaseAdmin
      .from('earnings')
      .select('amount')
      .eq('affiliate_id', affiliateId)
      .in('status', ['approved', 'paid'])
      .gte('created_at', startOfLastMonth.toISOString())
      .lt('created_at', endOfLastMonth.toISOString());

    const lastMonthEarnings = lastMonthData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

    const conversionRate =
      affiliate.totalClicks > 0
        ? ((affiliate.totalConversions / affiliate.totalClicks) * 100).toFixed(2)
        : '0';

    return {
      totalEarnings: affiliate.totalEarnings,
      pendingEarnings: affiliate.pendingEarnings,
      totalClicks: affiliate.totalClicks,
      totalConversions: affiliate.totalConversions,
      conversionRate,
      thisMonthEarnings,
      lastMonthEarnings,
      tier: affiliate.tier,
      referralCode: affiliate.referralCode,
    };
  }

  /**
   * Get chart data for last 12 months
   */
  async getChartData(affiliateId: string): Promise<ChartData> {
    const labels: string[] = [];
    const earnings: number[] = [];
    const clicks: number[] = [];
    const conversions: number[] = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      labels.push(date.toLocaleString('default', { month: 'short' }));

      // Get earnings for this month
      const { data: earningData } = await supabaseAdmin
        .from('earnings')
        .select('amount')
        .eq('affiliate_id', affiliateId)
        .in('status', ['approved', 'paid'])
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString());

      const monthEarnings = earningData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      earnings.push(parseFloat(monthEarnings.toFixed(2)));

      // Get clicks for this month
      const { data: clickData } = await supabaseAdmin
        .from('click_logs')
        .select('id')
        .eq('referral_code', (await this.getAffiliateById(affiliateId))?.referralCode || '')
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString());

      clicks.push(clickData?.length || 0);

      // Get conversions for this month
      const { data: conversionData } = await supabaseAdmin
        .from('click_logs')
        .select('id')
        .eq('referral_code', (await this.getAffiliateById(affiliateId))?.referralCode || '')
        .eq('converted', true)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString());

      conversions.push(conversionData?.length || 0);
    }

    return { labels, earnings, clicks, conversions };
  }

  /**
   * Get recent earnings (last 10)
   */
  async getRecentEarnings(affiliateId: string, limit: number = 10): Promise<Earning[]> {
    const { data, error } = await supabaseAdmin
      .from('earnings')
      .select('*')
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map(e => this.mapEarning(e));
  }

  /**
   * Get paginated earnings
   */
  async getEarnings(
    affiliateId: string,
    status?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ earnings: Earning[]; total: number; page: number; totalPages: number }> {
    let query = supabaseAdmin.from('earnings').select('*', { count: 'exact' }).eq('affiliate_id', affiliateId);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const offset = (page - 1) * limit;
    const { data, error, count } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch earnings: ${error.message}`);
    }

    return {
      earnings: (data || []).map(e => this.mapEarning(e)),
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  /**
   * Get earnings summary by status
   */
  async getEarningsSummary(affiliateId: string): Promise<{ approved: number; pending: number; paid: number }> {
    const { data: approvedData } = await supabaseAdmin
      .from('earnings')
      .select('amount')
      .eq('affiliate_id', affiliateId)
      .eq('status', 'approved');

    const { data: pendingData } = await supabaseAdmin
      .from('earnings')
      .select('amount')
      .eq('affiliate_id', affiliateId)
      .eq('status', 'pending');

    const { data: paidData } = await supabaseAdmin
      .from('earnings')
      .select('amount')
      .eq('affiliate_id', affiliateId)
      .eq('status', 'paid');

    const approved = approvedData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
    const pending = pendingData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
    const paid = paidData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

    return { approved, pending, paid };
  }

  /**
   * Create earning record for an order (called on order creation)
   */
  async createEarning(
    affiliateId: string,
    orderId: string,
    productId: string,
    productName: string,
    orderAmount: number
  ): Promise<Earning> {
    const affiliate = await this.getAffiliateById(affiliateId);
    if (!affiliate) {
      throw new Error('Affiliate not found');
    }

    const rate = this.COMMISSION_RATES[affiliate.tier as keyof CommissionRates] || 0.08;
    const commissionAmount = parseFloat((orderAmount * rate).toFixed(2));

    const { data, error } = await supabaseAdmin
      .from('earnings')
      .insert({
        affiliate_id: affiliateId,
        order_id: orderId,
        product_id: productId,
        product_name: productName,
        amount: commissionAmount,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create earning: ${error.message}`);
    }

    // Update affiliate pending earnings
    await supabaseAdmin.rpc('increment_pending_earnings', {
      affiliate_id: affiliateId,
      amount: commissionAmount,
    });

    return this.mapEarning(data);
  }

  /**
   * Get referral links for affiliate
   */
  async getReferralLinks(affiliateId: string): Promise<ReferralLink[]> {
    const { data, error } = await supabaseAdmin
      .from('referral_links')
      .select('*')
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map(l => this.mapReferralLink(l));
  }

  /**
   * Create referral link
   */
  async createReferralLink(
    affiliateId: string,
    name: string,
    source?: string
  ): Promise<ReferralLink> {
    const affiliate = await this.getAffiliateById(affiliateId);
    if (!affiliate) {
      throw new Error('Affiliate not found');
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://ventechgadgets.com';
    const url = `${baseUrl}?ref=${affiliate.referralCode}${source ? `&utm_source=${source}` : ''}`;
    // For now, use the URL as short URL (can integrate with short URL service later)
    const shortUrl = `${baseUrl}?ref=${affiliate.referralCode}`;

    const { data, error } = await supabaseAdmin
      .from('referral_links')
      .insert({
        affiliate_id: affiliateId,
        name,
        url,
        short_url: shortUrl,
        source: source || null,
        clicks: 0,
        conversions: 0,
        earnings: 0,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create referral link: ${error.message}`);
    }

    return this.mapReferralLink(data);
  }

  /**
   * Delete referral link
   */
  async deleteReferralLink(affiliateId: string, linkId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('referral_links')
      .delete()
      .eq('id', linkId)
      .eq('affiliate_id', affiliateId);

    if (error) {
      throw new Error(`Failed to delete referral link: ${error.message}`);
    }
  }

  /**
   * Get payment methods for affiliate
   */
  async getPaymentMethods(affiliateId: string): Promise<PaymentMethod[]> {
    const { data, error } = await supabaseAdmin
      .from('payment_methods')
      .select('*')
      .eq('affiliate_id', affiliateId);

    if (error || !data) {
      return [];
    }

    return data.map(m => this.mapPaymentMethod(m));
  }

  /**
   * Add payment method
   */
  async addPaymentMethod(
    affiliateId: string,
    type: 'bank' | 'momo' | 'crypto',
    name: string,
    details: string
  ): Promise<PaymentMethod> {
    // Check if this is the first payment method
    const existing = await this.getPaymentMethods(affiliateId);
    const isDefault = existing.length === 0;

    const { data, error } = await supabaseAdmin
      .from('payment_methods')
      .insert({
        affiliate_id: affiliateId,
        type,
        name,
        details,
        is_default: isDefault,
        is_verified: false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add payment method: ${error.message}`);
    }

    return this.mapPaymentMethod(data);
  }

  /**
   * Delete payment method
   */
  async deletePaymentMethod(affiliateId: string, methodId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('payment_methods')
      .delete()
      .eq('id', methodId)
      .eq('affiliate_id', affiliateId);

    if (error) {
      throw new Error(`Failed to delete payment method: ${error.message}`);
    }
  }

  /**
   * Get payouts for affiliate
   */
  async getPayouts(affiliateId: string): Promise<Payout[]> {
    const { data, error } = await supabaseAdmin
      .from('payouts')
      .select('*')
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map(p => this.mapPayout(p));
  }

  /**
   * Request payout
   */
  async requestPayout(
    affiliateId: string,
    amount: number,
    methodId: string
  ): Promise<Payout> {
    // Validate minimum payout
    if (amount < this.MIN_PAYOUT) {
      throw new Error(`Minimum payout is $${this.MIN_PAYOUT}`);
    }

    // Verify affiliate and payment method exist
    const affiliate = await this.getAffiliateById(affiliateId);
    if (!affiliate) {
      throw new Error('Affiliate not found');
    }

    const { data: method } = await supabaseAdmin
      .from('payment_methods')
      .select('*')
      .eq('id', methodId)
      .eq('affiliate_id', affiliateId)
      .single();

    if (!method) {
      throw new Error('Payment method not found');
    }

    // Check available balance
    const availableBalance = affiliate.totalEarnings - affiliate.pendingEarnings;
    if (amount > availableBalance) {
      throw new Error('Insufficient balance');
    }

    const { data, error } = await supabaseAdmin
      .from('payouts')
      .insert({
        affiliate_id: affiliateId,
        amount,
        method: method.type,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to request payout: ${error.message}`);
    }

    return this.mapPayout(data);
  }

  /**
   * Track affiliate click
   */
  async trackClick(referralCode: string, ip: string, userAgent: string, source?: string): Promise<void> {
    const { error } = await supabaseAdmin.from('click_logs').insert({
      referral_code: referralCode,
      ip,
      user_agent: userAgent,
      source: source || 'direct',
      converted: false,
    });

    if (error) {
      console.error('Failed to log click:', error);
    }

    // Update affiliate click count
    const affiliate = await supabaseAdmin
      .from('affiliates')
      .select('id')
      .eq('referral_code', referralCode)
      .single();

    if (!affiliate.error && affiliate.data) {
      await supabaseAdmin.rpc('increment_total_clicks', {
        affiliate_id: affiliate.data.id,
      });
    }
  }

  /**
   * Attribute earnings for order (call after order is created)
   */
  async attributeEarningsForOrder(
    orderId: string,
    userId: string,
    affiliateRef: string | null,
    orderAmount: number
  ): Promise<void> {
    if (!affiliateRef) return;

    try {
      const { data: affiliate } = await supabaseAdmin
        .from('affiliates')
        .select('id')
        .eq('referral_code', affiliateRef)
        .eq('status', 'active')
        .single();

      if (!affiliate) return;

      // Get first product from order (or you can iterate through items)
      const { data: orderItems } = await supabaseAdmin
        .from('order_items')
        .select('product_id, products(name)')
        .eq('order_id', orderId)
        .limit(1);

      if (!orderItems || orderItems.length === 0) return;

      const productId = orderItems[0].product_id;
      const productName = orderItems[0].products?.name || 'Product';

      await this.createEarning(affiliate.id, orderId, productId, productName, orderAmount);

      // Mark click as converted
      const { data: latestClick } = await supabaseAdmin
        .from('click_logs')
        .select('id')
        .eq('referral_code', affiliateRef)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latestClick) {
        await supabaseAdmin.from('click_logs').update({ converted: true }).eq('id', latestClick.id);
      }

      // Increment total conversions
      await supabaseAdmin.rpc('increment_total_conversions', {
        affiliate_id: affiliate.id,
      });
    } catch (error) {
      console.error('Affiliate attribution error:', error);
    }
  }

  // Helper methods
  private generateReferralCode(): string {
    return 'AFF' + Math.random().toString(36).substring(2, 11).toUpperCase();
  }

  private mapAffiliate(data: any): Affiliate {
    return {
      id: data.id,
      userId: data.user_id,
      referralCode: data.referral_code,
      tier: data.tier,
      status: data.status,
      totalEarnings: data.total_earnings || 0,
      pendingEarnings: data.pending_earnings || 0,
      totalClicks: data.total_clicks || 0,
      totalConversions: data.total_conversions || 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapEarning(data: any): Earning {
    return {
      id: data.id,
      affiliateId: data.affiliate_id,
      orderId: data.order_id,
      productId: data.product_id,
      productName: data.product_name,
      amount: data.amount,
      status: data.status,
      verifiedAt: data.verified_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapReferralLink(data: any): ReferralLink {
    return {
      id: data.id,
      affiliateId: data.affiliate_id,
      name: data.name,
      url: data.url,
      shortUrl: data.short_url,
      source: data.source,
      clicks: data.clicks,
      conversions: data.conversions,
      earnings: data.earnings,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapPaymentMethod(data: any): PaymentMethod {
    return {
      id: data.id,
      affiliateId: data.affiliate_id,
      type: data.type,
      name: data.name,
      details: data.details,
      isDefault: data.is_default,
      isVerified: data.is_verified,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapPayout(data: any): Payout {
    return {
      id: data.id,
      affiliateId: data.affiliate_id,
      amount: data.amount,
      method: data.method,
      status: data.status,
      reference: data.reference,
      processedAt: data.processed_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

export const affiliateService = new AffiliateService();