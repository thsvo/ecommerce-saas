import { useEffect, useState } from 'react';
import { useSubdomain } from '@/contexts/SubdomainContext';

/**
 * Custom hook to get information about the current subdomain or custom domain
 * and whether content should be filtered by the admin's ID
 */
export function useCurrentSubdomain() {
  const { 
    subdomain, 
    customDomain, 
    isAdminSubdomain, 
    isCustomDomain, 
    adminId, 
    isSubdomainAdmin,
    storeName 
  } = useSubdomain();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Once subdomain context is loaded, set loading to false
    setIsLoading(false);
  }, [subdomain, customDomain]);

  /**
   * Filter function to scope content to the current admin subdomain/custom domain
   * @param items Array of items with createdBy or userId field
   * @returns Filtered array of items
   */
  const filterContentBySubdomain = <T extends { createdBy?: string; userId?: string }>(items: T[]): T[] => {
    if ((!isAdminSubdomain && !isCustomDomain) || !adminId) {
      return items;
    }
    
    // Filter items to only show those created by the admin
    return items.filter(item => {
      const itemCreator = item.createdBy || item.userId;
      return itemCreator === adminId;
    });
  };

  /**
   * Get API endpoint with subdomain/custom domain filtering
   * @param endpoint Base API endpoint
   * @returns API endpoint with admin filter if in subdomain/custom domain context
   */
  const getSubdomainApiEndpoint = (endpoint: string): string => {
    if ((!isAdminSubdomain && !isCustomDomain) || !adminId) {
      return endpoint;
    }
    
    const separator = endpoint.includes('?') ? '&' : '?';
    return `${endpoint}${separator}adminId=${adminId}`;
  };

  /**
   * Get the display name for the current store
   */
  const getStoreDisplayName = (): string => {
    if (isCustomDomain && customDomain) {
      return customDomain;
    }
    if (isAdminSubdomain && subdomain) {
      return `${subdomain}.codeopx.com`;
    }
    return storeName || 'Store';
  };

  return {
    subdomain,
    customDomain,
    isAdminSubdomain,
    isCustomDomain,
    adminId,
    isSubdomainAdmin,
    storeName,
    isLoading,
    filterContentBySubdomain,
    getSubdomainApiEndpoint,
    getStoreDisplayName,
    // Computed property for convenience
    isAdminStore: isAdminSubdomain || isCustomDomain,
    storeIdentifier: customDomain || subdomain,
  };
}