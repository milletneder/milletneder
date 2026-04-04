const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com', '20minutemail.com', 'adf.ly', 'anonaddy.com',
  'bugmenot.com', 'burnermail.io', 'cock.li', 'crazymailing.com',
  'dispostable.com', 'dropmail.me', 'emailfake.com', 'emailondeck.com',
  'fakeinbox.com', 'fakemail.net', 'getairmail.com', 'getnada.com',
  'guerrillamail.com', 'guerrillamail.de', 'guerrillamail.info',
  'guerrillamail.net', 'guerrillamail.org', 'harakirimail.com',
  'inboxkitten.com', 'jetable.org', 'maildrop.cc', 'mailexpire.com',
  'mailinator.com', 'mailnesia.com', 'mailsac.com', 'mailtemp.net',
  'mintemail.com', 'mohmal.com', 'mytemp.email', 'nada.email',
  'sharklasers.com', 'spam4.me', 'spamgourmet.com', 'tempail.com',
  'tempm.com', 'tempmail.com', 'tempmail.net', 'throwaway.email',
  'trashmail.com', 'trashmail.me', 'trashmail.net', 'trbvm.com',
  'wegwerfmail.de', 'yopmail.com', 'yopmail.fr', 'zeroe.ml',
  'grr.la', 'temp-mail.org', 'temp-mail.io', 'tempmailo.com',
  'emailtemp.org', 'mail-temp.com', 'guerrillamailblock.com',
  'tmpmail.net', 'tmpmail.org', 'tempr.email', 'discard.email',
  'discardmail.com', 'discardmail.de', 'emailsensei.com',
  'fake-box.com', 'generator.email', 'guerrillamail.biz',
  'incognitomail.org', 'mailcatch.com', 'mailforspam.com',
  'mailmoat.com', 'mailnator.com', 'mailquack.com',
  'meltmail.com', 'mt2015.com', 'nobulk.com',
  'oneoffemail.com', 'otherinbox.com', 'owlpic.com',
  'proxymail.eu', 'punkass.com', 'receiveee.com',
  'safersignup.de', 'shieldedmail.com', 'sogetthis.com',
  'spamavert.com', 'spambox.us', 'spamcero.com',
  'spamcorptastic.com', 'spamex.com', 'spamfree24.org',
  'spamhole.com', 'spamify.com', 'spaminator.de',
  'spammotel.com', 'spamobox.com', 'spamspot.com',
  'speed.1s.fr', 'superrito.com', 'suremail.info',
  'tempinbox.com', 'temporaryemail.net', 'temporaryforwarding.com',
  'thankyou2010.com', 'thisisnotmyrealemail.com', 'throwam.com',
  'tradermail.info', 'turual.com', 'uggsrock.com',
  'veryrealemail.com', 'vidchart.com', 'viditag.com',
  'viewcastmedia.com', 'vomoto.com', 'vpn.st',
  'wasteland.rfc822.org', 'webemail.me', 'weg-werf-email.de',
  'wegwerfmail.net', 'wegwerfmail.org', 'wh4f.org',
  'whyspam.me', 'willselfdestruct.com', 'winemaven.info',
  'wronghead.com', 'wuzup.net', 'wuzupmail.net',
  'wwwnew.eu', 'xagloo.com', 'xemaps.com',
  'xents.com', 'xjoi.com', 'xmaily.com',
  'xyzfree.net', 'yogamaven.com', 'yuurok.com',
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain);
}

export function detectSequentialEmails(emails: string[]): Set<string> {
  const sequential = new Set<string>();
  const prefixPattern = /^([a-zA-Z]+)(\d+)@/;

  const grouped = new Map<string, string[]>();

  for (const email of emails) {
    const match = email.match(prefixPattern);
    if (match) {
      const key = `${match[1]}@${email.split('@')[1]}`;
      const existing = grouped.get(key) || [];
      existing.push(email);
      grouped.set(key, existing);
    }
  }

  for (const [, group] of grouped) {
    if (group.length >= 3) {
      for (const email of group) {
        sequential.add(email);
      }
    }
  }

  return sequential;
}
