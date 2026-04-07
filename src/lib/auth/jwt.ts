import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = "7d";

export interface JwtPayload {
  userId: number;
  vp?: string;   // decrypted vote party slug (oy kullanmışsa)
  vk?: string;   // base64-encoded VEK (Vote Encryption Key)
  st?: string;   // subscription tier (free, vatandas, ogrenci, arastirmaci, parti)
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
