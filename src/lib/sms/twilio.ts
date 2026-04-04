import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;
const testMode = process.env.TWILIO_TEST_MODE === 'true';

let client: twilio.Twilio | null = null;

function getClient(): twilio.Twilio {
  if (!client) {
    if (!accountSid || !authToken) {
      throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set');
    }
    client = twilio(accountSid, authToken);
  }
  return client;
}

export async function sendOTP(phone: string, code: string): Promise<void> {
  const body = `milletneder.com dogrulama kodunuz: ${code}`;

  if (testMode) {
    console.log(`[TWILIO TEST] SMS to ${phone}: ${body}`);
    return;
  }

  if (!fromNumber) {
    throw new Error('TWILIO_PHONE_NUMBER must be set');
  }

  await getClient().messages.create({
    body,
    from: fromNumber,
    to: phone,
  });
}
