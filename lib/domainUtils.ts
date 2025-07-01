/**
 * Client-side utilities for domain management
 * (Browser-safe version without Node.js dns module)
 */

export interface DNSRecord {
  type: 'TXT' | 'CNAME' | 'A';
  name: string;
  value: string;
  ttl?: number;
}

/**
 * Check if domain is valid format (browser-safe)
 */
export function isValidDomain(domain: string): boolean {
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
  return domainRegex.test(domain);
}

/**
 * Extract domain from URL or hostname
 */
export function extractDomainFromHost(host: string): string {
  return host.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
}

/**
 * Format DNS instructions for display
 */
export function formatDNSInstructions(domain: string, records: DNSRecord[]): string {
  return records.map(record => 
    `${record.type} ${record.name} ${record.value}`
  ).join('\n');
}

/**
 * Get domain status color for UI
 */
export function getDomainStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'ACTIVE': return 'bg-green-500';
    case 'VERIFIED': return 'bg-blue-500';
    case 'VERIFYING': return 'bg-yellow-500';
    case 'FAILED': return 'bg-red-500';
    case 'INACTIVE': return 'bg-gray-500';
    default: return 'bg-gray-400';
  }
}

/**
 * Get domain status text for display
 */
export function getDomainStatusText(status: string): string {
  switch (status.toUpperCase()) {
    case 'PENDING': return 'Pending Setup';
    case 'VERIFYING': return 'Verifying...';
    case 'VERIFIED': return 'Verified';
    case 'ACTIVE': return 'Active';
    case 'INACTIVE': return 'Inactive';
    case 'FAILED': return 'Verification Failed';
    default: return 'Unknown';
  }
}
