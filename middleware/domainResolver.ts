import { getAdminByHost } from '@/lib/subdomainUtils';
import { NextApiRequest, NextApiResponse } from 'next';


/**
 * Middleware to resolve admin information from host and inject into API requests
 */
export async function resolveAdminFromHost(req: NextApiRequest, res: NextApiResponse, next: () => void) {
  try {
    const host = req.headers['x-original-host'] as string || req.headers.host || '';
    
    if (host) {
      const result = await getAdminByHost(host);
      
      if (result.admin) {
        // Inject admin information into request headers for downstream use
        req.headers['x-admin-id'] = result.admin.id;
        req.headers['x-is-custom-domain'] = result.isCustomDomain ? 'true' : 'false';
        
        if (result.isCustomDomain) {
          req.headers['x-custom-domain'] = host;
        } else if (result.subdomain) {
          req.headers['x-subdomain'] = result.subdomain;
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Error resolving admin from host:', error);
    next(); // Continue even if there's an error
  }
}

/**
 * Get admin ID from request (works with both subdomain and custom domain)
 */
export function getAdminIdFromRequest(req: NextApiRequest): string | null {
  return req.headers['x-admin-id'] as string || null;
}

/**
 * Check if request is from custom domain
 */
export function isCustomDomainRequest(req: NextApiRequest): boolean {
  return req.headers['x-is-custom-domain'] === 'true';
}

/**
 * Get the domain/subdomain identifier from request
 */
export function getDomainIdentifier(req: NextApiRequest): string | null {
  const customDomain = req.headers['x-custom-domain'] as string;
  const subdomain = req.headers['x-subdomain'] as string;
  
  return customDomain || subdomain || null;
}
