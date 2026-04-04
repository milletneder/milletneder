import { db } from '@/lib/db';
import { adminSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const SETTINGS_KEY = process.env.SETTINGS_ENCRYPTION_KEY || '';

function encrypt(text: string): { encrypted: string; iv: string } {
  if (!SETTINGS_KEY) return { encrypted: text, iv: '' };
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(SETTINGS_KEY, 'hex');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return { encrypted: encrypted + tag, iv: iv.toString('hex') };
}

function decrypt(encryptedWithTag: string, ivHex: string): string {
  if (!SETTINGS_KEY || !ivHex) return encryptedWithTag;
  const key = Buffer.from(SETTINGS_KEY, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(encryptedWithTag.slice(-32), 'hex');
  const encrypted = encryptedWithTag.slice(0, -32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Admin ayarini okur ve decrypt eder
 */
export async function getSetting(key: string): Promise<string | null> {
  const [row] = await db
    .select()
    .from(adminSettings)
    .where(eq(adminSettings.setting_key, key))
    .limit(1);

  if (!row) return null;

  try {
    return decrypt(row.encrypted_value, row.iv);
  } catch {
    return null;
  }
}

/**
 * Admin ayarini encrypt edip kaydeder (upsert)
 */
export async function setSetting(key: string, value: string, adminId: number): Promise<void> {
  const { encrypted, iv } = encrypt(value);

  const [existing] = await db
    .select({ id: adminSettings.id })
    .from(adminSettings)
    .where(eq(adminSettings.setting_key, key))
    .limit(1);

  if (existing) {
    await db
      .update(adminSettings)
      .set({
        encrypted_value: encrypted,
        iv,
        updated_by: adminId,
        updated_at: new Date(),
      })
      .where(eq(adminSettings.id, existing.id));
  } else {
    await db.insert(adminSettings).values({
      setting_key: key,
      encrypted_value: encrypted,
      iv,
      updated_by: adminId,
    });
  }
}

/**
 * Admin ayarini masked olarak dondurur
 */
export async function getMaskedSetting(key: string): Promise<string | null> {
  const value = await getSetting(key);
  if (!value) return null;

  if (value.length <= 8) return '***';
  return value.slice(0, 4) + '***' + value.slice(-4);
}
