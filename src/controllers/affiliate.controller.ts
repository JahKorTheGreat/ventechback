import { Request, Response } from 'express';
import { sendAffiliateApplicationEmail } from '../services/email.service';
import { supabaseAdmin } from '../utils/supabaseClient';
import affiliateService from '../services/affiliate.service';

export class AffiliateController {
  /**
   * Submit affiliate application (existing endpoint, enhanced with database persistence)
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
        companyName,
        type,
        audienceSize, 
        payoutMethod, 
        reason 
      } = req.body;

      // Validate required fields
      if (!fullName || !email || !phone || !country || !promotionChannel || !platformLink || !type) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: fullName, email, phone, country, promotionChannel, platformLink, and type are required'
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }

      // Validate type
      if (!['individual', 'company'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid type. Must be "individual" or "company"'
        });
      }

      // Validate URL format
      try {
        new URL(platformLink);
      } catch {
        return res.status(400).json({
          success: false,
          message: 'Invalid platform link format'
        });
      }

      // Create affiliate application in database
      await affiliateService.createAffiliateApplication({
        fullName,
        email,
        phone,
        companyName: companyName || undefined,
        type,
        promotionChannel,
        platformLink,
        country,
        termsAccepted: true,
      });

      // Attempt to send email notification to admins
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
        // Log but do not fail the request; we accept the submission regardless
        console.error('Failed to send affiliate application email:', emailResult.error);
      }

      return res.json({
        success: true,
        message: 'Affiliate application submitted successfully! We\'ll review your application and get back to you soon.'
      });

    } catch (error) {
      console.error('Error processing affiliate application:', error);
      return res.status(200).json({
        success: false,
        message: 'Your application was received. Email notification will be retried by the server.',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Approve an affiliate application (admin only)
   */
  async approveAffiliate(req: Request, res: Response) {
    try {
      const { affiliateId } = req.params;
      const userId = (req as any).user?.id;

      if (!affiliateId) {
        return res.status(400).json({
          success: false,
          message: 'Affiliate ID is required'
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const result = await affiliateService.approveAffiliate(affiliateId, userId);

      return res.json({
        success: true,
        message: 'Affiliate approved successfully',
        data: result
      });
    } catch (error) {
      console.error('Error approving affiliate:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to approve affiliate'
      });
    }
  }

  /**
   * Reject an affiliate application (admin only)
   */
  async rejectAffiliate(req: Request, res: Response) {
    try {
      const { affiliateId } = req.params;
      const { rejectionReason } = req.body;

      if (!affiliateId) {
        return res.status(400).json({
          success: false,
          message: 'Affiliate ID is required'
        });
      }

      if (!rejectionReason) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required'
        });
      }

      const affiliate = await affiliateService.rejectAffiliate(affiliateId, rejectionReason);

      return res.json({
        success: true,
        message: 'Affiliate rejected successfully',
        data: affiliate
      });
    } catch (error) {
      console.error('Error rejecting affiliate:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reject affiliate'
      });
    }
  }

  /**
   * Suspend an affiliate (admin only)
   */
  async suspendAffiliate(req: Request, res: Response) {
    try {
      const { affiliateId } = req.params;
      const { reason } = req.body;

      if (!affiliateId) {
        return res.status(400).json({
          success: false,
          message: 'Affiliate ID is required'
        });
      }

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Suspension reason is required'
        });
      }

      const affiliate = await affiliateService.suspendAffiliate(affiliateId, reason);

      return res.json({
        success: true,
        message: 'Affiliate suspended successfully',
        data: affiliate
      });
    } catch (error) {
      console.error('Error suspending affiliate:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to suspend affiliate'
      });
    }
  }

  /**
   * Reactivate a suspended affiliate (admin only)
   */
  async reactivateAffiliate(req: Request, res: Response) {
    try {
      const { affiliateId } = req.params;

      if (!affiliateId) {
        return res.status(400).json({
          success: false,
          message: 'Affiliate ID is required'
        });
      }

      const affiliate = await affiliateService.reactivateAffiliate(affiliateId);

      return res.json({
        success: true,
        message: 'Affiliate reactivated successfully',
        data: affiliate
      });
    } catch (error) {
      console.error('Error reactivating affiliate:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reactivate affiliate'
      });
    }
  }

  /**
   * Get affiliate dashboard (authenticated affiliate)
   */
  async getAffiliateDashboard(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      // Get affiliate record linked to this user
      const { data: affiliate, error } = await supabaseAdmin
        .from('affiliates')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (error || !affiliate) {
        return res.status(404).json({
          success: false,
          message: 'Affiliate account not found'
        });
      }

      const dashboard = await affiliateService.getAffiliateDashboard(affiliate.id);

      return res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      console.error('Error fetching affiliate dashboard:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch dashboard'
      });
    }
  }

  /**
   * Get commission history (authenticated affiliate)
   */
  async getCommissionHistory(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { page = 1, limit = 20, status } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      // Get affiliate record
      const { data: affiliate, error } = await supabaseAdmin
        .from('affiliates')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (error || !affiliate) {
        return res.status(404).json({
          success: false,
          message: 'Affiliate account not found'
        });
      }

      const history = await affiliateService.getCommissionHistory(affiliate.id, {
        page: Number(page),
        limit: Number(limit),
        status: status as string | undefined,
      });

      return res.json({
        success: true,
        data: history.data,
        pagination: history.pagination
      });
    } catch (error) {
      console.error('Error fetching commission history:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch commission history'
      });
    }
  }

  /**
   * List all affiliates (admin only)
   */
  async listAffiliates(req: Request, res: Response) {
    try {
      const { page = 1, limit = 20, status } = req.query;

      const result = await affiliateService.listAffiliates({
        page: Number(page),
        limit: Number(limit),
        status: status as string | undefined,
      });

      return res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error listing affiliates:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to list affiliates'
      });
    }
  }

  /**
   * Get affiliate system analytics (admin only)
   */
  async getAnalytics(req: Request, res: Response) {
    try {
      const analytics = await affiliateService.getAffiliateAnalytics();

      return res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Error fetching affiliate analytics:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch analytics'
      });
    }
  }
}
export const affiliateController = new AffiliateController();


