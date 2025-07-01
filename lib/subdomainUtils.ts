import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Generates a unique subdomain for an admin user
 * @param firstName First name of the admin
 * @param lastName Last name of the admin
 * @returns A unique subdomain string
 */
export async function generateUniqueSubdomain(firstName: string, lastName: string): Promise<string> {
  // Create base subdomain from first name and last name
  let baseSubdomain = `${firstName.toLowerCase()}${lastName.toLowerCase()}`;
  
  // Remove special characters and spaces
  baseSubdomain = baseSubdomain.replace(/[^a-z0-9]/g, '');
  
  // Check if the subdomain already exists
  let subdomain = baseSubdomain;
  let counter = 1;
  
  while (true) {
    const existingUser = await prisma.user.findUnique({
      where: { subdomain },
    });
    
    if (!existingUser) {
      return subdomain;
    }
    
    // If subdomain exists, append a number and try again
    subdomain = `${baseSubdomain}${counter}`;
    counter++;
  }
}

/**
 * Extracts subdomain from hostname
 * @param host The hostname from request headers
 * @returns The subdomain or null if no subdomain
 */
export function extractSubdomain(host: string): string | null {
  // Handle localhost for development
  if (host.includes('localhost')) {
    const parts = host.split('.');
    if (parts.length > 1) {
      return parts[0];
    }
    return null;
  }
  
  // Handle production domains
  const parts = host.split('.');
  if (parts.length > 2) {
    return parts[0];
  }
  
  return null;
}

/**
 * Check if the host is a custom domain and get the associated admin
 * @param host The hostname from request headers
 * @returns Admin user data if custom domain, null otherwise
 */
export async function getAdminByCustomDomain(host: string) {
  try {
    const customDomain = await prisma.customDomain.findFirst({
      where: {
        domain: host,
        isActive: true,
        status: 'ACTIVE'
      },
      include: {
        user: true
      }
    });

    return customDomain?.user || null;
  } catch (error) {
    console.error('Error fetching custom domain:', error);
    return null;
  }
}

/**
 * Get admin by subdomain or custom domain
 * @param host The hostname from request headers
 * @returns Admin user data and domain type
 */
export async function getAdminByHost(host: string): Promise<{
  admin: any | null;
  isCustomDomain: boolean;
  subdomain?: string;
}> {
  // First check if it's a custom domain
  const customDomainAdmin = await getAdminByCustomDomain(host);
  if (customDomainAdmin) {
    return {
      admin: customDomainAdmin,
      isCustomDomain: true
    };
  }

  // If not custom domain, check for subdomain
  const subdomain = extractSubdomain(host);
  if (subdomain) {
    try {
      const subdomainAdmin = await prisma.user.findUnique({
        where: { subdomain },
      });

      return {
        admin: subdomainAdmin,
        isCustomDomain: false,
        subdomain
      };
    } catch (error) {
      console.error('Error fetching subdomain admin:', error);
    }
  }

  return {
    admin: null,
    isCustomDomain: false
  };
}

/**
 * Check if a domain is available for custom domain setup
 * @param domain The domain to check
 * @returns boolean indicating availability
 */
export async function isDomainAvailable(domain: string): Promise<boolean> {
  try {
    const existingDomain = await prisma.customDomain.findUnique({
      where: { domain }
    });
    
    return !existingDomain;
  } catch (error) {
    console.error('Error checking domain availability:', error);
    return false;
  }
}