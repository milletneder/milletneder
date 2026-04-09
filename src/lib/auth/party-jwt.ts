import jwt from 'jsonwebtoken';

/**
 * Parti hesap oturum JWT'si.
 *
 * Admin JWT ve user JWT'den tamamen bagimsiz bir scope. 'role: party'
 * claim'i cross-scope replay'i engeller — user/admin token'lari parti
 * rotalarinda kabul edilmez.
 */

interface PartyJwtPayload {
  accountId: number;
  partyId: number;
  email: string;
  role: 'party';
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not configured');
  return secret;
}

export function signPartyToken(payload: Omit<PartyJwtPayload, 'role'>): string {
  return jwt.sign({ ...payload, role: 'party' }, getJwtSecret(), { expiresIn: '24h' });
}

export function verifyPartyToken(token: string): PartyJwtPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as PartyJwtPayload;
    if (decoded.role !== 'party') return null;
    return decoded;
  } catch {
    return null;
  }
}
