import supabaseAdmin from '../utils/supabaseClient';
import enhancedEmailService from './enhanced-email.service';

class AffiliateService {
  /**
   * Create a new affiliate application
   */
  async createAffiliateApplication(data: {
    fullName: string;
    email: string;
    phone: string;
    companyName?: string;
    type: 'individual' | 'company';
    promotionChannel: string;
    platformLink: string;
    country: string;
    termsAccepted: boolean;
  }) {
    const { data: affiliate, error } = await supabaseAdmin
      .from('affiliates')
      .insert([
        {
          full_name: data.fullName,
          email: data.email,
          phone: data.phone,
          company_name: data.companyName,
          type: data.type,
          promotion_channel: data.promotionChannel,
          platform_link: data.platformLink,
          country: data.country,
          terms_accepted: data.termsAccepted,
          status: 'pending',
          commission_tier: 3, // Start at bronze tier
        },
      ])
      .select()
      .single();

    if (error) throw new Error(`Failed to create affiliate application: ${error.message}`);

    return affiliate;
  }

  /**
   * Approve an affiliate application and create initial referral code
   */
  async approveAffiliate(affiliateId: string, approverUserId: string) {
    // Update affiliate status to active
    const { data: updatedAffiliate, error: updateError } = await supabaseAdmin
      .from('affiliates')
      .update({
        status: 'active',
        approved_at: new Date().toISOString(),
        approved_by: approverUserId,
      })
      .eq('id', affiliateId)
      .select()
      .single();

    if (updateError) throw new Error(`Failed to approve affiliate: ${updateError.message}`);

    // Create initial referral code for this affiliate
    const referralCode = this.generateReferralCode(affiliateId);
    const { data: referral, error: referralError } = await supabaseAdmin
      .from('affiliate_referrals')
      .insert([
        {
          affiliate_id: affiliateId,
          referral_code: referralCode,
          referral_type: 'code',
        },
      ])
      .select()
      .single();

    if (referralError)
      throw new Error(`Failed to create initial referral code: ${referralError.message}`);

    // Send approval email to affiliate
    await enhancedEmailService.sendAffiliateApprovalEmail(updatedAffiliate.email, {
      fullName: updatedAffiliate.full_name,
      referralCode: referralCode,
    });

    return { affiliate: updatedAffiliate, referral };
  }

  /**
   * Reject an affiliate application
   */
  async rejectAffiliate(affiliateId: string, rejectionReason: string) {
    const { data: updatedAffiliate, error } = await supabaseAdmin
      .from('affiliates')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason,
      })
      .eq('id', affiliateId)
      .select()
      .single();

    if (error) throw new Error(`Failed to reject affiliate: ${error.message}`);

    // Send rejection email
    await enhancedEmailService.sendAffiliateRejectionEmail(updatedAffiliate.email, {
      fullName: updatedAffiliate.full_name,
      rejectionReason,
    });

    return updatedAffiliate;
  }

  /**
   * Suspend an affiliate (temporarily disable)
   */
  async suspendAffiliate(affiliateId: string, reason: string) {
    const { data: updatedAffiliate, error } = await supabaseAdmin
      .from('affiliates')
      .update({
        status: 'suspended',
        rejection_reason: reason, // Reusing this field for suspension reason
      })
      .eq('id', affiliateId)
      .select()
      .single();

    if (error) throw new Error(`Failed to suspend affiliate: ${error.message}`);

    return updatedAffiliate;
  }

  /**
   * Reactivate a suspended affiliate
   */
  async reactivateAffiliate(affiliateId: string) {
    const { data: updatedAffiliate, error } = await supabaseAdmin
      .from('affiliates')
      .update({
        status: 'active',
        rejection_reason: null,
      })
      .eq('id', affiliateId)
      .select()
      .single();

    if (error) throw new Error(`Failed to reactivate affiliate: ${error.message}`);

    return updatedAffiliate;
  }

  /**
   * Generate a new unique referral code for an affiliate
   */
  generateReferralCode(affiliateId: string): string {
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const shortAffiliateId = affiliateId.substring(0, 8).toUpperCase();
    return `AFFY-${shortAffiliateId}-${randomSuffix}`;
  }

  /**
   * Validate if a referral code exists and is active
   */
  async validateReferralCode(code: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from('affiliate_referrals')
      .select('id, expires_at')
      .eq('referral_code', code)
      .single();

    if (error || !data) return false;

    // Check if code has expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Create a new referral code for an affiliate (for code-based referrals)
   */
  async createReferralCode(affiliateId: string) {
    // Verify affiliate is active
    const { data: affiliate, error: affiliateError } = await supabaseAdmin
      .from('affiliates')
      .select('status')
      .eq('id', affiliateId)
      .single();

    if (affiliateError || !affiliate) {
      throw new Error('Affiliate not found');
    }

    if (affiliate.status !== 'active') {
      throw new Error('Affiliate is not active');
    }

    const referralCode = this.generateReferralCode(affiliateId);

    const { data: referral, error } = await supabaseAdmin
      .from('affiliate_referrals')
      .insert([
        {
          affiliate_id: affiliateId,
          referral_code: referralCode,
          referral_type: 'code',
        },
      ])
      .select()
      .single();

    if (error) throw new Error(`Failed to create referral code: ${error.message}`);

    return referral;
  }

  /**
   * Create a customer referral (Method 2: affiliate refers a customer)
   */
  async createCustomerReferral(affiliateId: string, referredUserId: string) {
    const { data: referral, error } = await supabaseAdmin
      .from('affiliate_referrals')
      .insert([
        {
          affiliate_id: affiliateId,
          referred_user_id: referredUserId,
          referral_type: 'customer_referral',
        },
      ])
      .select()
      .single();

    if (error) throw new Error(`Failed to create customer referral: ${error.message}`);

    return referral;
  }

  /**
   * Calculate commission rate based on affiliate's 90-day order performance
   */
  async calculateCommissionRate(affiliateId: string): Promise<number> {
    // Get all commissions earned in last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: commissions, error } = await supabaseAdmin
      .from('affiliate_commissions')
      .select('id')
      .eq('affiliate_id', affiliateId)
      .gte('earned_at', ninetyDaysAgo.toISOString())
      .eq('status', 'earned');

    if (error) throw new Error(`Failed to fetch commission history: ${error.message}`);

    const orderCount = commissions?.length || 0;

    // Get the applicable tier based on order count
    const { data: tier, error: tierError } = await supabaseAdmin
      .from('affiliate_commission_tiers')
      .select('commission_percentage')
      .lte('min_orders', orderCount)
      .or(`max_orders.is.null,max_orders.gte.${orderCount}`)
      .eq('is_active', true)
      .order('min_orders', { ascending: false })
      .limit(1)
      .single();

    if (tierError || !tier) {
      // Default to 3% if no tier found
      return 3;
    }

    return tier.commission_percentage;
  }

  /**
   * Track an order from a referral and create commission record
   */
  async trackOrderFromReferral(
    orderId: string,
    referralCode?: string,
    referredUserId?: string
  ) {
    let affiliateId: string | null = null;
    let referralType: 'code' | 'customer_referral' | null = null;

    // Method 1: Track via referral code
    if (referralCode) {
      const { data: referral, error } = await supabaseAdmin
        .from('affiliate_referrals')
        .select('affiliate_id')
        .eq('referral_code', referralCode)
        .eq('referral_type', 'code')
        .single();

      if (!error && referral) {
        affiliateId = referral.affiliate_id;
        referralType = 'code';
      }
    }

    // Method 2: Track via referred customer
    if (!affiliateId && referredUserId) {
      const { data: referral, error } = await supabaseAdmin
        .from('affiliate_referrals')
        .select('affiliate_id')
        .eq('referred_user_id', referredUserId)
        .eq('referral_type', 'customer_referral')
        .single();

      if (!error && referral) {
        affiliateId = referral.affiliate_id;
        referralType = 'customer_referral';
      }
    }

    // If no referral found, don't create commission
    if (!affiliateId || !referralType) {
      return null;
    }

    // Get order details (READ-ONLY)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('total, created_at')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    // Get affiliate details
    const { data: affiliate, error: affiliateError } = await supabaseAdmin
      .from('affiliates')
      .select('id, status')
      .eq('id', affiliateId)
      .single();

    if (affiliateError || !affiliate) {
      throw new Error('Affiliate not found');
    }

    if (affiliate.status !== 'active') {
      return null; // Don't create commission for inactive affiliates
    }

    // Calculate commission rate
    const commissionRate = await this.calculateCommissionRate(affiliateId);
    const commissionAmount = (order.total * commissionRate) / 100;

    // Create commission record with 'pending' status
    const { data: commission, error: commissionError } = await supabaseAdmin
      .from('affiliate_commissions')
      .insert([
        {
          affiliate_id: affiliateId,
          order_id: orderId,
          order_total: order.total,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          referral_type: referralType,
          referral_code: referralCode || null,
          referred_user_id: referredUserId || null,
          status: 'pending',
          order_date: order.created_at,
        },
      ])
      .select()
      .single();

    if (commissionError) throw new Error(`Failed to create commission: ${commissionError.message}`);

    return commission;
  }

  /**
   * Mark a commission as earned when payment is confirmed
   */
  async confirmCommissionEarned(orderId: string, transactionId: string) {
    const { data: commissions, error } = await supabaseAdmin
      .from('affiliate_commissions')
      .update({
        status: 'earned',
        earned_at: new Date().toISOString(),
        transaction_id: transactionId,
      })
      .eq('order_id', orderId)
      .eq('status', 'pending')
      .select();

    if (error) throw new Error(`Failed to confirm commission: ${error.message}`);

    return commissions;
  }

  /**
   * Get affiliate dashboard data
   */
  async getAffiliateDashboard(affiliateId: string) {
    // Get affiliate basic info
    const { data: affiliate, error: affiliateError } = await supabaseAdmin
      .from('affiliates')
      .select('*')
      .eq('id', affiliateId)
      .single();

    if (affiliateError || !affiliate) {
      throw new Error('Affiliate not found');
    }

    // Get commission summary
    const { data: commissions, error: commissionsError } = await supabaseAdmin
      .from('affiliate_commissions')
      .select('status, commission_amount')
      .eq('affiliate_id', affiliateId);

    if (commissionsError) throw new Error('Failed to fetch commissions');

    const totalEarned = commissions
      ?.filter((c) => c.status === 'earned' || c.status === 'paid')
      .reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;

    const totalPending = commissions
      ?.filter((c) => c.status === 'pending')
      .reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;

    const totalPaid = commissions
      ?.filter((c) => c.status === 'paid')
      .reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;

    // Get referral codes
    const { data: referralCodes, error: codesError } = await supabaseAdmin
      .from('affiliate_referrals')
      .select('*')
      .eq('affiliate_id', affiliateId)
      .eq('referral_type', 'code')
      .is('expires_at', null); // Only get active codes

    // Get performance metrics
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: recentCommissions, error: recentError } = await supabaseAdmin
      .from('affiliate_commissions')
      .select('id')
      .eq('affiliate_id', affiliateId)
      .gte('earned_at', ninetyDaysAgo.toISOString())
      .eq('status', 'earned');

    const conversions = recentCommissions?.length || 0;

    return {
      affiliate,
      earnings: {
        totalEarned: Number(totalEarned),
        totalPending: Number(totalPending),
        totalPaid: Number(totalPaid),
      },
      referralCodes: referralCodes || [],
      performance: {
        conversions90Days: conversions,
        currentTier: affiliate.commission_tier,
      },
    };
  }

  /**
   * Get paginated commission history for an affiliate
   */
  async getCommissionHistory(
    affiliateId: string,
    options: { page: number; limit: number; status?: string; sortBy?: string }
  ) {
    const { page = 1, limit = 20, status, sortBy = 'earned_at' } = options;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('affiliate_commissions')
      .select('*, orders(order_number, created_at), transactions(status)', {
        count: 'exact',
      })
      .eq('affiliate_id', affiliateId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: commissions, count, error } = await query
      .order(sortBy, { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Failed to fetch commission history: ${error.message}`);

    return {
      data: commissions,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  /**
   * Get all pending and approved affiliates (admin use)
   */
  async listAffiliates(options: {
    page?: number;
    limit?: number;
    status?: string;
    sortBy?: string;
  }) {
    const { page = 1, limit = 20, status, sortBy = 'created_at' } = options;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin.from('affiliates').select('*', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: affiliates, count, error } = await query
      .order(sortBy, { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Failed to fetch affiliates: ${error.message}`);

    return {
      data: affiliates,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  /**
   * Request a payout for earned commissions
   */
  async requestPayout(
    affiliateId: string,
    amount: number,
    payoutMethod: 'paystack' | 'bank_transfer' | 'mobile_money'
  ) {
    // Verify affiliate exists and is active
    const { data: affiliate, error: affiliateError } = await supabaseAdmin
      .from('affiliates')
      .select('status, payout_details')
      .eq('id', affiliateId)
      .single();

    if (affiliateError || !affiliate) {
      throw new Error('Affiliate not found');
    }

    if (affiliate.status !== 'active') {
      throw new Error('Affiliate is not active');
    }

    // Check if payout details are configured
    if (!affiliate.payout_details) {
      throw new Error('Payout details not configured. Please update your payment information.');
    }

    // Get available earned commissions
    const { data: earned, error: earnedError } = await supabaseAdmin
      .from('affiliate_commissions')
      .select('commission_amount')
      .eq('affiliate_id', affiliateId)
      .eq('status', 'earned');

    if (earnedError) throw new Error('Failed to check available balance');

    const availableBalance = earned?.reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;

    if (amount > availableBalance) {
      throw new Error(`Requested amount exceeds available balance of ${availableBalance}`);
    }

    // Create payout request
    const { data: payout, error } = await supabaseAdmin
      .from('affiliate_payouts')
      .insert([
        {
          affiliate_id: affiliateId,
          amount: amount,
          payout_method: payoutMethod,
          status: 'pending',
          request_date: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw new Error(`Failed to create payout request: ${error.message}`);

    return payout;
  }

  /**
   * Get payout history for an affiliate
   */
  async getPayoutHistory(
    affiliateId: string,
    options: { page?: number; limit?: number; status?: string }
  ) {
    const { page = 1, limit = 20, status } = options;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('affiliate_payouts')
      .select('*', { count: 'exact' })
      .eq('affiliate_id', affiliateId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: payouts, count, error } = await query
      .order('request_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Failed to fetch payout history: ${error.message}`);

    return {
      data: payouts,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  /**
   * Update affiliate payout details
   */
  async updatePayoutDetails(affiliateId: string, payoutDetails: any) {
    const { data: affiliate, error } = await supabaseAdmin
      .from('affiliates')
      .update({ payout_details: payoutDetails })
      .eq('id', affiliateId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update payout details: ${error.message}`);

    return affiliate;
  }

  /**
   * Get affiliate analytics (admin use)
   */
  async getAffiliateAnalytics() {
    // Total affiliates by status
    const { data: statuses, error: statusError } = await supabaseAdmin
      .from('affiliates')
      .select('status')
      .then((result) => {
        if (result.error) return result;
        const stats = {
          total: 0,
          active: 0,
          pending: 0,
          suspended: 0,
          rejected: 0,
        };
        result.data?.forEach((affiliate) => {
          stats.total++;
          if (affiliate.status === 'active') stats.active++;
          else if (affiliate.status === 'pending') stats.pending++;
          else if (affiliate.status === 'suspended') stats.suspended++;
          else if (affiliate.status === 'rejected') stats.rejected++;
        });
        return { data: stats, error: null };
      });

    // Total commissions generated
    const { data: commissionData, error: commissionError } = await supabaseAdmin
      .from('affiliate_commissions')
      .select('status, commission_amount');

    const totalCommissions = commissionData
      ?.filter((c) => c.status === 'earned' || c.status === 'paid')
      .reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;

    const totalPendingCommissions = commissionData
      ?.filter((c) => c.status === 'pending')
      .reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;

    // Total payouts processed
    const { data: payoutData, error: payoutError } = await supabaseAdmin
      .from('affiliate_payouts')
      .select('amount, status');

    const totalPayouts = payoutData
      ?.filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    return {
      affiliateStats: statuses,
      commissions: {
        totalEarned: Number(totalCommissions),
        totalPending: Number(totalPendingCommissions),
      },
      payouts: {
        totalPaid: Number(totalPayouts),
      },
    };
  }
}

export default new AffiliateService();
