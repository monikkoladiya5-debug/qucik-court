/**
 * Centralized authentication configuration.
 * All secrets and sensitive constants live here.
 * In production these would come from environment variables.
 */

export const AUTH_CONFIG = {
  /** JWT signing secret — override via JWT_SECRET env var in production */
  jwtSecret: process.env.JWT_SECRET || 'qc-dev-secret-2026-change-in-prod',

  /** Token expiry */
  jwtExpiresIn: '7d',

  /** bcrypt salt rounds */
  saltRounds: 10,

  /** Demo admin credentials — never returned to the frontend */
  adminEmail: 'admin@quickcourt.com',
  adminPassword: 'admin123',
  adminVerificationCode: 'QC-ADMIN-2026',

  /** Demo owner credentials */
  ownerEmail: 'owner@quickcourt.com',
  ownerPassword: 'owner123',

  /** Roles */
  ROLES: {
    CUSTOMER: 'CUSTOMER',
    OWNER: 'OWNER',
    ADMIN: 'ADMIN',
  },
};
