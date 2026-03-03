import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../utils/supabaseClient';
import { errorResponse } from '../utils/responseHandlers';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Unauthorized - No token provided', 401);
    }

    const token = authHeader.substring(7);

    // Verify token with Supabase
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return errorResponse(res, 'Unauthorized - Invalid token', 401);
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return errorResponse(res, 'User profile not found', 404);
    }

    req.user = profile;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return errorResponse(res, 'Authentication failed', 500);
  }
};

export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return errorResponse(res, 'Unauthorized', 401);
  }

  if (req.user.role !== 'admin') {
    return errorResponse(res, 'Forbidden - Admin access required', 403);
  }

  next();
};

// Add to existing src/middleware/auth.middleware.ts for Affiliate verification

export const requireAffiliate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return errorResponse(res, 'Unauthorized', 401);
  }

  try {
    const { data: affiliate, error } = await supabaseAdmin
      .from('affiliates')
      .select('status')
      .eq('user_id', req.user.id)
      .single();

    if (error || !affiliate) {
      return errorResponse(res, 'Affiliate account not found', 404);
    }

    if (affiliate.status !== 'active') {
      return errorResponse(
        res,
        `Affiliate account is ${affiliate.status}. Please contact support.`,
        403
      );
    }

    next();
  } catch (error) {
    console.error('Affiliate verification error:', error);
    return errorResponse(res, 'Failed to verify affiliate status', 500);
  }
};

