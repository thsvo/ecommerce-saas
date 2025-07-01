import dns from 'dns';
import crypto from 'crypto';
import { promisify } from 'util';

const resolveTxt = promisify(dns.resolveTxt);
const resolveCname = promisify(dns.resolveCname);

export interface DNSRecord {
  type: 'TXT' | 'CNAME' | 'A';
  name: string;
  value: string;
  ttl?: number;
}

export interface DomainVerificationResult {
  verified: boolean;
  records: DNSRecord[];
  errors: string[];
}

/**
 * Generates a unique verification token for domain verification
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate required DNS records for domain verification
 */
export function generateDNSRecords(domain: string, token: string, targetDomain: string): DNSRecord[] {
  return [
    {
      type: 'TXT',
      name: `_ecommerce-verify.${domain}`,
      value: `ecommerce-verification=${token}`,
      ttl: 300
    },
    {
      type: 'CNAME',
      name: domain,
      value: targetDomain,
      ttl: 300
    }
  ];
}

/**
 * Verify domain ownership via TXT record
 */
export async function verifyTXTRecord(domain: string, expectedToken: string): Promise<boolean> {
  try {
    const txtRecords = await resolveTxt(`_ecommerce-verify.${domain}`);
    
    for (const record of txtRecords) {
      const recordValue = Array.isArray(record) ? record.join('') : record;
      if (recordValue === `ecommerce-verification=${expectedToken}`) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error(`TXT verification failed for ${domain}:`, error);
    return false;
  }
}

/**
 * Verify domain CNAME record points to our domain
 */
export async function verifyCNAMERecord(domain: string, expectedTarget: string): Promise<boolean> {
  try {
    const cnameRecords = await resolveCname(domain);
    
    for (const record of cnameRecords) {
      if (record === expectedTarget || record === `${expectedTarget}.`) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error(`CNAME verification failed for ${domain}:`, error);
    return false;
  }
}

/**
 * Comprehensive domain verification
 */
export async function verifyDomain(
  domain: string, 
  token: string, 
  targetDomain: string
): Promise<DomainVerificationResult> {
  const errors: string[] = [];
  const records: DNSRecord[] = [];
  
  try {
    // Verify TXT record
    const txtVerified = await verifyTXTRecord(domain, token);
    if (!txtVerified) {
      errors.push('TXT record verification failed. Please ensure the TXT record is properly configured.');
    }
    
    // Verify CNAME record
    const cnameVerified = await verifyCNAMERecord(domain, targetDomain);
    if (!cnameVerified) {
      errors.push('CNAME record verification failed. Please ensure the domain points to our servers.');
    }
    
    // Get current DNS records for reference
    try {
      const txtRecords = await resolveTxt(`_ecommerce-verify.${domain}`);
      records.push({
        type: 'TXT',
        name: `_ecommerce-verify.${domain}`,
        value: txtRecords.join(', ')
      });
    } catch (e) {
      // TXT record not found
    }
    
    try {
      const cnameRecords = await resolveCname(domain);
      records.push({
        type: 'CNAME',
        name: domain,
        value: cnameRecords.join(', ')
      });
    } catch (e) {
      // CNAME record not found
    }
    
    return {
      verified: txtVerified && cnameVerified,
      records,
      errors
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    errors.push(`Domain verification failed: ${errorMessage}`);
    return {
      verified: false,
      records,
      errors
    };
  }
}

/**
 * Check if domain is valid format
 */
export function isValidDomain(domain: string): boolean {
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
  return domainRegex.test(domain);
}

/**
 * Cloudflare DNS API integration for automatic verification
 */
export class CloudflareVerifier {
  private apiToken: string;
  private zoneId: string;

  constructor(apiToken: string, zoneId: string) {
    this.apiToken = apiToken;
    this.zoneId = zoneId;
  }

  /**
   * Get DNS records for a domain from Cloudflare
   */
  async getDNSRecords(domain: string): Promise<any[]> {
    try {
      const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${this.zoneId}/dns_records?name=${domain}`, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(`Cloudflare API error: ${data.errors?.[0]?.message || 'Unknown error'}`);
      }

      return data.result || [];
    } catch (error) {
      console.error('Failed to get DNS records from Cloudflare:', error);
      throw error;
    }
  }

  /**
   * Check if domain is configured correctly in Cloudflare
   */
  async verifyCloudflareConfig(domain: string, targetDomain: string): Promise<boolean> {
    try {
      const records = await this.getDNSRecords(domain);
      
      // Check for CNAME or A record pointing to our domain
      const hasCorrectRecord = records.some(record => {
        if (record.type === 'CNAME') {
          return record.content === targetDomain || record.content === `${targetDomain}.`;
        }
        if (record.type === 'A') {
          // You would need to specify your server's IP addresses here
          return true; // Implement IP verification if needed
        }
        return false;
      });

      return hasCorrectRecord;
    } catch (error) {
      console.error('Cloudflare verification failed:', error);
      return false;
    }
  }
}

/**
 * Automated domain verification with retry logic
 */
export async function autoVerifyDomain(
  domain: string,
  token: string,
  targetDomain: string,
  maxRetries: number = 3,
  retryDelay: number = 5000
): Promise<DomainVerificationResult> {
  let lastResult: DomainVerificationResult = {
    verified: false,
    records: [],
    errors: ['Verification not started']
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`Domain verification attempt ${attempt}/${maxRetries} for ${domain}`);
    
    lastResult = await verifyDomain(domain, token, targetDomain);
    
    if (lastResult.verified) {
      console.log(`Domain ${domain} verified successfully on attempt ${attempt}`);
      return lastResult;
    }
    
    if (attempt < maxRetries) {
      console.log(`Retrying in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  console.log(`Domain verification failed for ${domain} after ${maxRetries} attempts`);
  return lastResult;
}
