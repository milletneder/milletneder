import { eq, and, gte, sql, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { createHash, createHmac } from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users, deviceLogs, votes, rounds, anonymousVoteCounts } from '@/lib/db/schema';
import { signToken } from '@/lib/auth/jwt';
import { logAuthEvent } from '@/lib/auth/auth-logger';
import {
  MAX_REGISTRATIONS_PER_IP,
  IP_RATE_LIMIT_WINDOW_MINUTES,
  REFERRAL_CODE_LENGTH,
} from '@/lib/constants';
import { getActiveProviderName } from '@/lib/sms/provider';
import { isIPWhitelisted } from '@/lib/auth/admin-ip-whitelist';
import {
  generateVEK, deriveKeyFromPassword, encryptVEK, decryptVEK,
  encryptParty, decryptParty,
} from '@/lib/crypto/vote-encryption';
import { generateRecoveryCodes, createRecoveryEntries } from '@/lib/crypto/recovery-codes';
import { NextRequest } from 'next/server';

// --- Identity Hash ---

export function hashIdentity(value: string): string {
  const raw = createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
  const IDENTITY_KEY = process.env.IDENTITY_KEY;
  if (IDENTITY_KEY) {
    return createHmac('sha256', IDENTITY_KEY).update(Buffer.from(raw, 'hex')).digest('hex');
  }
  return raw;
}

// --- Shared Types ---

export interface RegistrationInput {
  identityHash: string;
  identityValue: string; // for logging (masked)
  authProvider: 'phone' | 'email';
  city: string;
  district: string;
  party: string;
  password?: string;
  referralCode?: string;
  fingerprint?: string;
  recoveryEmail?: string;
  request: NextRequest;
}

export interface AuthResult {
  token: string;
  isNewUser: boolean;
  recoveryCodes?: string[];
  showRecoveryModal?: boolean;
  user: {
    id: number;
    city: string | null;
    district: string | null;
    referral_code: string | null;
  };
  referralLink?: string;
  authProvider?: string;
}

// --- IP Rate Limit Check ---

async function checkIpRateLimit(ip: string): Promise<{ blocked: boolean; count: number }> {
  const windowStart = new Date(Date.now() - IP_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
  const [ipCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(deviceLogs)
    .where(and(eq(deviceLogs.ip_address, ip), gte(deviceLogs.created_at, windowStart)));
  const count = ipCount?.count ?? 0;
  const blocked = count >= MAX_REGISTRATIONS_PER_IP && !isIPWhitelisted(ip);
  return { blocked, count };
}

function getIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown';
}

// --- Vote During Registration ---

async function castRegistrationVote(
  userId: number,
  party: string,
  city: string,
  district: string,
  vek: Buffer | null,
  userDemographics: { age_bracket?: string | null; gender?: string | null; education?: string | null; income_bracket?: string | null; turnout_intention?: string | null; previous_vote_2023?: string | null },
): Promise<string | undefined> {
  console.log(`[VOTE] castRegistrationVote called: userId=${userId}, party=${party}, city=${city}, district=${district}`);
  const allRounds = await db.select().from(rounds);
  console.log(`[VOTE] All rounds:`, allRounds.map(r => ({ id: r.id, is_active: r.is_active, start: r.start_date, end: r.end_date })));
  const [activeRound] = allRounds.filter(r => r.is_active);
  if (!activeRound) {
    console.error(`[VOTE] NO ACTIVE ROUND FOUND! Cannot create vote for user ${userId}`);
    return undefined;
  }
  console.log(`[VOTE] Active round found: id=${activeRound.id}`);

  const encryptedParty = vek ? encryptParty(party, vek) : null;

  await db.insert(votes).values({
    user_id: userId,
    round_id: activeRound.id,
    party: vek ? null : party,
    encrypted_party: encryptedParty,
    city,
    district,
    is_valid: true,
  });

  await db.execute(sql`
    INSERT INTO vote_transaction_log (tx_type, round_id, city, district, party, is_valid, is_dummy, created_at)
    VALUES ('OY_KULLANIM', ${activeRound.id}, ${city}, ${district}, ${party}, true, false, NOW())
  `);

  await db.execute(sql`
    INSERT INTO anonymous_vote_counts (round_id, party, city, district, age_bracket, gender, education, income_bracket, turnout_intention, previous_vote_2023, is_valid, is_dummy, vote_count)
    VALUES (${activeRound.id}, ${party}, ${city}, ${district}, ${userDemographics.age_bracket ?? null}, ${userDemographics.gender ?? null}, ${userDemographics.education ?? null}, ${userDemographics.income_bracket ?? null}, ${userDemographics.turnout_intention ?? null}, ${userDemographics.previous_vote_2023 ?? null}, true, false, 1)
    ON CONFLICT (round_id, party, city, COALESCE(district,''), COALESCE(age_bracket,''), COALESCE(gender,''), COALESCE(education,''), COALESCE(income_bracket,''), COALESCE(turnout_intention,''), COALESCE(previous_vote_2023,''), is_valid, is_dummy)
    DO UPDATE SET vote_count = anonymous_vote_counts.vote_count + 1
  `);

  return party;
}

// --- Setup VEK + Recovery Codes ---

async function setupVekAndRecoveryCodes(userId: number, password: string) {
  const vek = generateVEK();
  const derivedKey = deriveKeyFromPassword(password, userId);
  const encryptedVek = encryptVEK(vek, derivedKey);
  const codes = generateRecoveryCodes(8);
  const recoveryCodesData = createRecoveryEntries(codes, vek);

  await db.update(users).set({
    encrypted_vek: encryptedVek,
    recovery_codes: recoveryCodesData,
    vote_encryption_version: 1,
    recovery_codes_confirmed: false,
    recovery_codes_generated_at: new Date(),
  }).where(eq(users.id, userId));

  return { vek, recoveryCodes: codes, showRecoveryModal: true };
}

// --- Register New User ---

export async function registerNewUser(input: RegistrationInput): Promise<AuthResult | { error: string; status: number }> {
  const { identityHash, identityValue, authProvider, city, district, party, password, referralCode, fingerprint, request } = input;
  const ip = getIp(request);
  const cityStr = String(city).trim();
  const districtStr = String(district).trim();

  // IP rate limit
  const { blocked, count } = await checkIpRateLimit(ip);
  if (blocked) {
    await logAuthEvent({ eventType: 'register_blocked', authMethod: authProvider, identityHint: identityValue, request, errorCode: 'ip_rate_limit', errorMessage: `IP başına kayıt limiti aşıldı (${count})` });
    return { error: 'Çok fazla kayıt denemesi. Lütfen daha sonra tekrar deneyin.', status: 429 };
  }

  // Referral
  let referred_by: number | null = null;
  if (referralCode) {
    const [referrer] = await db.select({ id: users.id }).from(users).where(eq(users.referral_code, String(referralCode))).limit(1);
    if (referrer) referred_by = referrer.id;
  }

  // Password hash
  let passwordHash: string | null = null;
  if (password && String(password).length >= 6) {
    passwordHash = await bcrypt.hash(String(password), 10);
  }

  // Create user
  const referral_code = nanoid(REFERRAL_CODE_LENGTH);
  const anonUid = `anon_${nanoid(32)}`;
  const [newUser] = await db
    .insert(users)
    .values({
      anon_uid: anonUid,
      identity_hash: identityHash,
      city: cityStr,
      district: districtStr,
      referral_code,
      referred_by,
      auth_provider: authProvider,
      is_flagged: false,
      flag_reason: null,
      password_hash: passwordHash,
      recovery_email_hash: null,
      vote_encryption_version: passwordHash ? 1 : 0,
    })
    .returning();

  // VEK setup (needs userId)
  let vek: Buffer | null = null;
  let recoveryCodes: string[] | undefined;
  let showRecoveryModal = false;

  if (passwordHash && password) {
    const result = await setupVekAndRecoveryCodes(newUser.id, String(password));
    vek = result.vek;
    recoveryCodes = result.recoveryCodes;
    showRecoveryModal = result.showRecoveryModal;
  }

  // Transaction log
  await db.execute(sql`
    INSERT INTO vote_transaction_log (tx_type, round_id, city, district, is_valid, is_dummy, created_at)
    VALUES ('KAYIT', 0, ${cityStr}, ${districtStr}, NULL, false, NOW())
  `);

  // Device log
  await db.insert(deviceLogs).values({
    user_id: newUser.id,
    fingerprint: fingerprint ? String(fingerprint) : null,
    ip_address: ip,
    user_agent: request.headers.get('user-agent') ?? null,
  });

  // Vote
  let vp: string | undefined;
  console.log(`[REGISTER] About to cast vote: party=${party}, userId=${newUser.id}`);
  if (party) {
    vp = await castRegistrationVote(newUser.id, String(party), cityStr, districtStr, vek, {});
    console.log(`[REGISTER] castRegistrationVote returned: vp=${vp}`);
  } else {
    console.error(`[REGISTER] party is falsy! party="${party}"`);
  }

  const vkBase64 = vek ? vek.toString('base64') : undefined;
  const token = signToken({ userId: newUser.id, vp, vk: vkBase64 });

  const smsProviderName = authProvider === 'phone' ? await getActiveProviderName() : undefined;
  await logAuthEvent({ eventType: 'register', authMethod: authProvider, identityHint: identityValue, userId: newUser.id, request, details: { city: cityStr, district: districtStr, voteParty: vp || 'NONE', ...(smsProviderName && { sms_provider: smsProviderName }) } });

  return {
    token,
    isNewUser: true,
    ...(recoveryCodes && { recoveryCodes }),
    ...(showRecoveryModal && { showRecoveryModal }),
    user: { id: newUser.id, city: cityStr, district: districtStr, referral_code },
    referralLink: `https://milletneder.com?ref=${referral_code}`,
  };
}

// --- Complete Incomplete Registration ---

export async function completeIncompleteRegistration(
  existingUser: typeof users.$inferSelect,
  input: RegistrationInput,
): Promise<AuthResult> {
  const { identityValue, authProvider, city, district, party, password, referralCode, fingerprint, request } = input;
  const ip = getIp(request);
  const cityStr = String(city).trim();
  const districtStr = String(district).trim();

  let passwordHash: string | null = existingUser.password_hash;
  if (password && String(password).length >= 6 && !passwordHash) {
    passwordHash = await bcrypt.hash(String(password), 10);
  }

  // VEK
  let vek: Buffer | null = null;
  let recoveryCodes: string[] | undefined;
  let showRecoveryModal = false;

  if (passwordHash && password && !existingUser.encrypted_vek) {
    const result = await setupVekAndRecoveryCodes(existingUser.id, String(password));
    vek = result.vek;
    recoveryCodes = result.recoveryCodes;
    showRecoveryModal = result.showRecoveryModal;
  }

  // Referral
  let referred_by: number | null = existingUser.referred_by;
  if (!referred_by && referralCode) {
    const [referrer] = await db.select({ id: users.id }).from(users).where(eq(users.referral_code, String(referralCode))).limit(1);
    if (referrer) referred_by = referrer.id;
  }

  let refCode = existingUser.referral_code;
  if (!refCode) refCode = nanoid(REFERRAL_CODE_LENGTH);

  const profileUpdate: Record<string, unknown> = {
    city: cityStr,
    district: districtStr,
    is_active: true,
    password_hash: passwordHash,
    referral_code: refCode,
    referred_by,
    last_login_at: new Date(),
    updated_at: new Date(),
  };

  await db.update(users).set(profileUpdate).where(eq(users.id, existingUser.id));

  // Device log
  await db.insert(deviceLogs).values({
    user_id: existingUser.id,
    fingerprint: fingerprint ? String(fingerprint) : null,
    ip_address: ip,
    user_agent: request.headers.get('user-agent') ?? null,
  });

  // Transaction log
  await db.execute(sql`
    INSERT INTO vote_transaction_log (tx_type, round_id, city, district, is_valid, is_dummy, created_at)
    VALUES ('KAYIT', 0, ${cityStr}, ${districtStr}, NULL, false, NOW())
  `);

  // Vote
  let vp: string | undefined;
  if (party) {
    vp = await castRegistrationVote(existingUser.id, String(party), cityStr, districtStr, vek, {});
  }

  const vkBase64 = vek ? vek.toString('base64') : undefined;
  const token = signToken({ userId: existingUser.id, vp, vk: vkBase64 });

  const smsProviderNameComplete = authProvider === 'phone' ? await getActiveProviderName() : undefined;
  await logAuthEvent({ eventType: 'register', authMethod: authProvider, identityHint: identityValue, userId: existingUser.id, request, details: { city: cityStr, district: districtStr, completedIncomplete: true, ...(smsProviderNameComplete && { sms_provider: smsProviderNameComplete }) } });

  return {
    token,
    isNewUser: true,
    ...(recoveryCodes && { recoveryCodes }),
    ...(showRecoveryModal && { showRecoveryModal }),
    user: { id: existingUser.id, city: cityStr, district: districtStr, referral_code: refCode },
    referralLink: `https://milletneder.com?ref=${refCode}`,
  };
}

// --- Login Existing User ---

export async function loginExistingUser(
  existingUser: typeof users.$inferSelect,
  input: { identityValue: string; authProvider: 'phone' | 'email'; password?: string; request: NextRequest },
): Promise<AuthResult> {
  const { identityValue, authProvider, password, request } = input;
  const pwd = password ? String(password) : undefined;

  const updateData: Record<string, unknown> = { last_login_at: new Date(), updated_at: new Date() };

  // Password migration
  if (pwd && pwd.length >= 6 && !existingUser.password_hash) {
    updateData.password_hash = await bcrypt.hash(pwd, 10);
  }

  let vp: string | undefined;
  let vk: string | undefined;
  let recoveryCodes: string[] | undefined;
  let showRecoveryModal = false;

  if (existingUser.vote_encryption_version === 1 && existingUser.encrypted_vek && pwd) {
    const derivedKey = deriveKeyFromPassword(pwd, existingUser.id);
    const vek = decryptVEK(existingUser.encrypted_vek, derivedKey);
    if (vek) {
      vk = vek.toString('base64');
      // Null party repair
      const nullPartyVotes = await db
        .select()
        .from(votes)
        .where(and(eq(votes.user_id, existingUser.id), sql`party IS NULL AND encrypted_party IS NOT NULL`));
      for (const v of nullPartyVotes) {
        const decrypted = decryptParty(v.encrypted_party!, vek);
        if (decrypted) {
          await db.update(votes).set({ party: decrypted }).where(eq(votes.id, v.id));
        }
      }
      const [currentVote] = await db
        .select({ party: votes.party, encrypted_party: votes.encrypted_party })
        .from(votes)
        .where(and(eq(votes.user_id, existingUser.id), eq(votes.is_valid, true)))
        .orderBy(desc(votes.round_id))
        .limit(1);
      vp = currentVote?.party ?? (currentVote?.encrypted_party ? (decryptParty(currentVote.encrypted_party, vek) ?? undefined) : undefined);
    }
  } else if (existingUser.vote_encryption_version === 0 && pwd) {
    // Legacy migration
    const vek = generateVEK();
    const derivedKey = deriveKeyFromPassword(pwd, existingUser.id);
    vk = vek.toString('base64');

    const userVotes = await db.select().from(votes).where(eq(votes.user_id, existingUser.id));
    for (const vote of userVotes) {
      if (vote.party) {
        await db.update(votes).set({
          encrypted_party: encryptParty(vote.party, vek),
          party: null,
        }).where(eq(votes.id, vote.id));
      }
    }
    if (userVotes.length > 0) {
      const latest = userVotes.sort((a, b) => b.round_id - a.round_id)[0];
      vp = latest.party ?? undefined;
    }

    const codes = generateRecoveryCodes(8);
    recoveryCodes = codes;
    showRecoveryModal = true;

    updateData.encrypted_vek = encryptVEK(vek, derivedKey);
    updateData.recovery_codes = createRecoveryEntries(codes, vek);
    updateData.vote_encryption_version = 1;
    updateData.recovery_codes_confirmed = false;
    updateData.recovery_codes_generated_at = new Date();
  }

  await db.update(users).set(updateData).where(eq(users.id, existingUser.id));

  const token = signToken({ userId: existingUser.id, vp, vk });

  const smsProviderNameLogin = authProvider === 'phone' ? await getActiveProviderName() : undefined;
  await logAuthEvent({ eventType: 'login', authMethod: authProvider, identityHint: identityValue, userId: existingUser.id, request, details: smsProviderNameLogin ? { sms_provider: smsProviderNameLogin } : undefined });

  return {
    token,
    isNewUser: false,
    ...(recoveryCodes && { recoveryCodes }),
    ...(showRecoveryModal && { showRecoveryModal }),
    user: {
      id: existingUser.id,
      city: existingUser.city,
      district: existingUser.district,
      referral_code: existingUser.referral_code,
    },
  };
}
