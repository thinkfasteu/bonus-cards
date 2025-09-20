import { Request, Response, NextFunction } from 'express';
import { query } from '../db';

export interface AuthenticatedRequest extends Request {
  staff?: {
    staffId: string;
    username: string;
    role: 'reception' | 'admin';
    displayName: string;
  };
}

interface StaffRow {
  id: string;
  username: string;
  role: 'reception' | 'admin';
  is_active: boolean;
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const username = req.headers['x-staff-username'] as string;

    if (!username) {
      res.status(401).json({
        error: 'Authentication required',
        details: 'Header x-staff-username is required'
      });
      return;
    }

    // Load staff member from database
    const result = await query<StaffRow>(
      `SELECT id, username, role, is_active 
       FROM staff 
       WHERE username = $1 AND is_active = true`,
      [username]
    );

    if (result.rows.length === 0) {
      res.status(401).json({
        error: 'Authentication failed',
        details: 'Invalid or inactive staff username'
      });
      return;
    }

    const staff = result.rows[0];
    req.staff = {
      staffId: staff.id,
      username: staff.username,
      role: staff.role,
      displayName: staff.username // Use username as display name since no separate field
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Internal server error during authentication'
    });
  }
}

export function requireRole(allowedRoles: Array<'reception' | 'admin'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.staff) {
      res.status(401).json({
        error: 'Authentication required'
      });
      return;
    }

    if (!allowedRoles.includes(req.staff.role)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        details: `Role '${req.staff.role}' not authorized. Required: ${allowedRoles.join(' or ')}`
      });
      return;
    }

    next();
  };
}

// Convenience middleware for admin-only endpoints
export const requireAdmin = requireRole(['admin']);

// Convenience middleware for both reception and admin
export const requireStaff = requireRole(['reception', 'admin']);