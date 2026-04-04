// Known datacenter/VPN IP ranges (CIDR notation)
// These are major cloud providers and known VPN providers
const DATACENTER_RANGES = [
  // DigitalOcean
  '104.131.0.0/16', '104.236.0.0/16', '159.65.0.0/16', '167.71.0.0/16',
  '167.172.0.0/16', '178.128.0.0/16', '178.62.0.0/16', '188.166.0.0/16',
  '206.189.0.0/16', '209.97.0.0/16', '46.101.0.0/16', '68.183.0.0/16',
  // AWS
  '3.0.0.0/8', '13.0.0.0/8', '18.0.0.0/8', '52.0.0.0/8', '54.0.0.0/8',
  // Google Cloud
  '34.0.0.0/8', '35.0.0.0/8',
  // Azure
  '13.64.0.0/11', '20.0.0.0/8', '40.64.0.0/10', '52.224.0.0/11',
  // Hetzner
  '88.198.0.0/16', '136.243.0.0/16', '138.201.0.0/16', '144.76.0.0/16',
  '148.251.0.0/16', '176.9.0.0/16', '178.63.0.0/16', '195.201.0.0/16',
  '5.9.0.0/16',
  // OVH
  '51.38.0.0/16', '51.68.0.0/16', '51.75.0.0/16', '51.77.0.0/16',
  '51.79.0.0/16', '51.83.0.0/16', '51.89.0.0/16', '51.91.0.0/16',
  '54.36.0.0/16', '54.37.0.0/16', '54.38.0.0/16',
  // Vultr
  '45.32.0.0/16', '45.63.0.0/16', '45.76.0.0/16', '45.77.0.0/16',
  '64.237.0.0/16', '66.42.0.0/16', '95.179.0.0/16', '104.238.0.0/16',
  '108.61.0.0/16', '149.28.0.0/16', '207.148.0.0/16',
  // Linode
  '45.33.0.0/16', '45.56.0.0/16', '50.116.0.0/16', '69.164.0.0/16',
  '72.14.176.0/20', '96.126.96.0/19', '97.107.128.0/17',
  '139.162.0.0/16', '172.104.0.0/16', '176.58.0.0/16',
];

function ipToLong(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function cidrContains(cidr: string, ip: string): boolean {
  const [network, bits] = cidr.split('/');
  const mask = ~(0xFFFFFFFF >>> parseInt(bits)) >>> 0;
  return (ipToLong(ip) & mask) === (ipToLong(network) & mask);
}

let _compiledRanges: Array<{ network: number; mask: number }> | null = null;

function getCompiledRanges() {
  if (_compiledRanges) return _compiledRanges;
  _compiledRanges = DATACENTER_RANGES.map(cidr => {
    const [network, bits] = cidr.split('/');
    const mask = ~(0xFFFFFFFF >>> parseInt(bits)) >>> 0;
    return { network: ipToLong(network) & mask, mask };
  });
  return _compiledRanges;
}

export function isVpnOrDatacenter(ip: string): boolean {
  if (!ip || ip === '127.0.0.1' || ip === '::1') return false;

  // Only handle IPv4
  if (ip.includes(':')) return false;

  const ipLong = ipToLong(ip);
  const ranges = getCompiledRanges();

  for (const { network, mask } of ranges) {
    if ((ipLong & mask) === network) return true;
  }

  return false;
}

export function getSubnetGroup(ip: string): string | null {
  if (!ip || ip.includes(':')) return null;
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
}
