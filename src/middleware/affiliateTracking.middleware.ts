// src/middleware/affiliateTracking.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { affiliateService } from '../services/affiliate.service';

export const trackAffiliateClick = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ref } = req.query;

    if (ref && typeof ref === 'string') {
      // Track the click
      const ip = req.ip || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const source = typeof req.query.utm_source === 'string' ? req.query.utm_source : 'direct';

      await affiliateService.trackClick(ref, ip, userAgent, source);

      // Set cookie for 90-day tracking
      res.cookie('affiliate_ref', ref, {
        maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });

      if (source && source !== 'direct') {
        res.cookie('affiliate_source', source, {
          maxAge: 90 * 24 * 60 * 60 * 1000,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        });
      }
    }

    next();
  } catch (error) {
    console.error('Click tracking error:', error);
    next(); // Don't block request on tracking failure
  }
};