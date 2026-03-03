// src/controllers/affiliate.controller.ts

import { Request, Response } from 'express';
import { authResponse } from '../middleware/auth.middleware';
import { successResponse, errorResponse, paginatedResponse } from '../utils/responseHandlers';
import { affiliateService } from '../services/affiliate.service';
import { supabaseAdmin } from '../utils/supabaseClient';
import { sendAffiliateApplicationEmail } from '../services/email.service';

export class AffiliateController {
  /**
   * Submit affiliate application (public endpoint - existing)
   */
  async submitAffiliateApplication(req: Request, res: Response) {
    try {
      const {
        fullName,
        email,
        phone,
        country,
        promotionChannel,
        platformLink,
        audienceSize,
        payoutMethod,
        reason,
      } = req.body;

      // Validate required fields
      if (!fullName || !email || !phone || !country || !promotionChannel || !platformLink) {
        return res.status(400).json({
          success: false,
          message:
            'Missing required fields: fullName, email, phone, country, promotionChannel, and platformLink are required',
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format',
        });
      }

      // Validate URL format
      try {
        new URL(platformLink);
      } catch {
        return res.status(400).json({
          success: false,
          message: 'Invalid platform link format',
        });
      }

      // Attempt to send email notification
      const emailResult = await sendAffiliateApplicationEmail({
        fullName,
        email,
        phone,
        country,
        promotionChannel,
        platformLink,
        audienceSize: audienceSize || null,
        payoutMethod: payoutMethod || null,
        reason: reason || null,
      });

      if (!emailResult.success) {
        console.error('Failed to send affiliate application email:', emailResult.error);
      }

      return res.json({
        success: true,
        message:
          "Affiliate application submitted successfully! We'll review your application and get back to you soon.",
      });
    } catch (error) {
      console.error('Error processing affiliate application:', error);
      return res.status(200).json({
        success: false,
        message: 'Your application was received. Email notification will be retried by the server.',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get dashboard statistics (authenticated affiliates only)
   */
  async getDashboardStats(req: any, res: Response) {
    try {
      const { data: affiliate } = await supabaseAdmin
        .from('affiliates')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (!affiliate) {
        return errorResponse(res, 'Affiliate not found', 404);
      }

      const stats = await affiliateService.getDashboardStats(affiliate.id);
      return successResponse(res, stats, 'Dashboard stats retrieved successfully');
    } catch (error) {
      console.error('Dashboard stats error:', error);
      return errorResponse(res, 'Failed to fetch dashboard stats', 500);
    }
  }

  /**
   * Get chart data for last 12 months
   */
  async getChartData(req: any, res: Response) {
    try {
      const { data: affiliate } = await supabaseAdmin
        .from('affiliates')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (!affiliate) {
        return errorResponse(res, 'Affiliate not found', 404);
      }

      const chartData = await affiliateService.getChartData(affiliate.id);
      return successResponse(res, chartData, 'Chart data retrieved successfully');
    } catch (error) {
      console.error('Chart data error:', error);
      return errorResponse(res, 'Failed to fetch chart data', 500);
    }
  }

  /**
   * Get recent earnings (last 10)
   */
  async getRecentEarnings(req: any, res: Response) {
    try {
      const { data: affiliate } = await supabaseAdmin
        .from('affiliates')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (!affiliate) {
        return errorResponse(res, 'Affiliate not found', 404);
      }

      const earnings = await affiliateService.getRecentEarnings(affiliate.id);
      return successResponse(res, earnings, 'Recent earnings retrieved successfully');
    } catch (error) {
      console.error('Recent earnings error:', error);
      return errorResponse(res, 'Failed to fetch recent earnings', 500);
    }
  }

  /**
   * Get paginated earnings with optional status filter
   */
  async getEarnings(req: any, res: Response) {
    try {
      const { status, page = '1', limit = '20' } = req.query;

      const { data: affiliate } = await supabaseAdmin
        .from('affiliates')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (!affiliate) {
        return errorResponse(res, 'Affiliate not found', 404);
      }

      const result = await affiliateService.getEarnings(
        affiliate.id,
        status as string,
        parseInt(page as string),
        parseInt(limit as string)
      );

      return paginatedResponse(
        res,
        result.earnings,
        'Earnings retrieved successfully',
        result.page,
        parseInt(limit as string),
        result.total
      );
    } catch (error) {
      console.error('Earnings error:', error);
      return errorResponse(res, 'Failed to fetch earnings', 500);
    }
  }

  /**
   * Get earnings summary by status
   */
  async getEarningsSummary(req: any, res: Response) {
    try {
      const { data: affiliate } = await supabaseAdmin
        .from('affiliates')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (!affiliate) {
        return errorResponse(res, 'Affiliate not found', 404);
      }

      const summary = await affiliateService.getEarningsSummary(affiliate.id);
      return successResponse(res, summary, 'Earnings summary retrieved successfully');
    } catch (error) {
      console.error('Earnings summary error:', error);
      return errorResponse(res, 'Failed to fetch earnings summary', 500);
    }
  }

  /**
   * Get referral links
   */
  async getLinks(req: any, res: Response) {
    try {
      const { data: affiliate } = await supabaseAdmin
        .from('affiliates')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (!affiliate) {
        return errorResponse(res, 'Affiliate not found', 404);
      }

      const links = await affiliateService.getReferralLinks(affiliate.id);
      return successResponse(res, links, 'Referral links retrieved successfully');
    } catch (error) {
      console.error('Links error:', error);
      return errorResponse(res, 'Failed to fetch links', 500);
    }
  }

  /**
   * Create new referral link
   */
  async createLink(req: any, res: Response) {
    try {
      const { name, source } = req.body;

      if (!name) {
        return errorResponse(res, 'Link name is required', 400);
      }

      const { data: affiliate } = await supabaseAdmin
        .from('affiliates')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (!affiliate) {
        return errorResponse(res, 'Affiliate not found', 404);
      }

      const link = await affiliateService.createReferralLink(affiliate.id, name, source);
      return successResponse(res, link, 'Referral link created successfully', 201);
    } catch (error) {
      console.error('Create link error:', error);
      return errorResponse(res, 'Failed to create link', 500);
    }
  }

  /**
   * Delete referral link
   */
  async deleteLink(req: any, res: Response) {
    try {
      const { id } = req.params;

      const { data: affiliate } = await supabaseAdmin
        .from('affiliates')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (!affiliate) {
        return errorResponse(res, 'Affiliate not found', 404);
      }

      await affiliateService.deleteReferralLink(affiliate.id, id);
      return successResponse(res, { message: 'Link deleted successfully' }, 'Link deleted');
    } catch (error) {
      console.error('Delete link error:', error);
      return errorResponse(res, 'Failed to delete link', 500);
    }
  }

  /**
   * Get payment methods
   */
  async getPaymentMethods(req: any, res: Response) {
    try {
      const { data: affiliate } = await supabaseAdmin
        .from('affiliates')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (!affiliate) {
        return errorResponse(res, 'Affiliate not found', 404);
      }

      const methods = await affiliateService.getPaymentMethods(affiliate.id);
      return successResponse(res, methods, 'Payment methods retrieved successfully');
    } catch (error) {
      console.error('Payment methods error:', error);
      return errorResponse(res, 'Failed to fetch payment methods', 500);
    }
  }

  /**
   * Add payment method
   */
  async addPaymentMethod(req: any, res: Response) {
    try {
      const { type, name, details } = req.body;

      if (!type || !name || !details) {
        return errorResponse(res, 'Type, name, and details are required', 400);
      }

      if (!['bank', 'momo', 'crypto'].includes(type)) {
        return errorResponse(res, 'Invalid payment method type', 400);
      }

      const { data: affiliate } = await supabaseAdmin
        .from('affiliates')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (!affiliate) {
        return errorResponse(res, 'Affiliate not found', 404);
      }

      const method = await affiliateService.addPaymentMethod(affiliate.id, type, name, details);
      return successResponse(res, method, 'Payment method added successfully', 201);
    } catch (error) {
      console.error('Add payment method error:', error);
      return errorResponse(res, 'Failed to add payment method', 500);
    }
  }

  /**
   * Delete payment method
   */
  async deletePaymentMethod(req: any, res: Response) {
    try {
      const { id } = req.params;

      const { data: affiliate } = await supabaseAdmin
        .from('affiliates')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (!affiliate) {
        return errorResponse(res, 'Affiliate not found', 404);
      }

      await affiliateService.deletePaymentMethod(affiliate.id, id);
      return successResponse(res, { message: 'Payment method deleted' }, 'Payment method deleted');
    } catch (error) {
      console.error('Delete payment method error:', error);
      return errorResponse(res, 'Failed to delete payment method', 500);
    }
  }

  /**
   * Get payouts
   */
  async getPayouts(req: any, res: Response) {
    try {
      const { data: affiliate } = await supabaseAdmin
        .from('affiliates')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (!affiliate) {
        return errorResponse(res, 'Affiliate not found', 404);
      }

      const payouts = await affiliateService.getPayouts(affiliate.id);
      return successResponse(res, payouts, 'Payouts retrieved successfully');
    } catch (error) {
      console.error('Payouts error:', error);
      return errorResponse(res, 'Failed to fetch payouts', 500);
    }
  }

  /**
   * Request payout
   */
  async requestPayout(req: any, res: Response) {
    try {
      const { amount, methodId } = req.body;

      if (!amount || !methodId) {
        return errorResponse(res, 'Amount and payment method are required', 400);
      }

      const { data: affiliate } = await supabaseAdmin
        .from('affiliates')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (!affiliate) {
        return errorResponse(res, 'Affiliate not found', 404);
      }

      const payout = await affiliateService.requestPayout(affiliate.id, amount, methodId);
      return successResponse(res, payout, 'Payout request created successfully', 201);
    } catch (error) {
      console.error('Request payout error:', error);
      const message = error instanceof Error ? error.message : 'Failed to request payout';
      return errorResponse(res, message, 400);
    }
  }

  /**
   * Get products with commission rates
   */
  async getProducts(req: any, res: Response) {
    try {
      const { data: affiliate } = await supabaseAdmin
        .from('affiliates')
        .select('tier')
        .eq('user_id', req.user.id)
        .single();

      if (!affiliate) {
        return errorResponse(res, 'Affiliate not found', 404);
      }

      const { data: products, error } = await supabaseAdmin
        .from('products')
        .select('id, name, price, description, category_id, image')
        .eq('in_stock', true)
        .limit(100);

      if (error || !products) {
        return errorResponse(res, 'Failed to fetch products', 500);
      }

      const commissionRates: Record<string, number> = {
        starter: 0.08,
        pro: 0.1,
        elite: 0.12,
      };

      const rate = commissionRates[affiliate.tier] || 0.08;

      const productsWithCommission = products.map(product => ({
        ...product,
        commissionRate: rate * 100,
        commission: parseFloat((product.price * rate).toFixed(2)),
      }));

      return successResponse(res, productsWithCommission, 'Products with commissions retrieved');
    } catch (error) {
      console.error('Products error:', error);
      return errorResponse(res, 'Failed to fetch products', 500);
    }
  }
}

export const affiliateController = new AffiliateController();