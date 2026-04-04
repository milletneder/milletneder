import jwt from 'jsonwebtoken';

interface AdminJwtPayload {
  adminId: number;
  email: string;
  role: 'admin';
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not configured');
  return secret;
}

export function signAdminToken(payload: Omit<AdminJwtPayload, 'role'>): string {
  return jwt.sign({ ...payload, role: 'admin' }, getJwtSecret(), { expiresIn: '24h' });
}

export function verifyAdminToken(token: string): AdminJwtPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AdminJwtPayload;
    if (decoded.role !== 'admin') return null;
    return decoded;
  } catch {
    return null;
  }
}
