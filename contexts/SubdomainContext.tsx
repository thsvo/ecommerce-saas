import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { extractSubdomain } from '@/lib/subdomainUtils';

type SubdomainContextType = {
  subdomain: string | null;
  customDomain: string | null;
  isAdminSubdomain: boolean;
  isCustomDomain: boolean;
  adminId: string | null;
  isSubdomainAdmin: boolean; // Whether current user is the admin of this subdomain
  storeName: string | null;
};

const defaultContext: SubdomainContextType = {
  subdomain: null,
  customDomain: null,
  isAdminSubdomain: false,
  isCustomDomain: false,
  adminId: null,
  isSubdomainAdmin: false,
  storeName: null,
};

const SubdomainContext = createContext<SubdomainContextType>(defaultContext);

export const useSubdomain = () => useContext(SubdomainContext);

type SubdomainProviderProps = {
  children: ReactNode;
};

export const SubdomainProvider = ({ children }: SubdomainProviderProps) => {
  const [subdomainData, setSubdomainData] = useState<SubdomainContextType>(defaultContext);

  useEffect(() => {
    const loadSubdomainData = async () => {
      try {
        // Get hostname
        const host = window.location.hostname;
        
        // Check if current user is logged in
        const token = localStorage.getItem('token');
        let currentUserId = null;
        
        if (token) {
          try {
            const response = await fetch('/api/server/auth/me', {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.ok) {
              const { user } = await response.json();
              currentUserId = user?.id;
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
          }
        }

        // Try to get admin data by host (subdomain or custom domain)
        const response = await fetch(`/api/subdomains/host/${encodeURIComponent(host)}`);
        
        if (response.ok) {
          const data = await response.json();
          
          setSubdomainData({
            subdomain: data.subdomain || null,
            customDomain: data.customDomain || null,
            isAdminSubdomain: data.isAdminSubdomain || false,
            isCustomDomain: data.isCustomDomain || false,
            adminId: data.adminId,
            isSubdomainAdmin: currentUserId === data.adminId,
            storeName: data.storeName || null,
          });
        } else {
          // Fallback to old subdomain detection
          const subdomain = extractSubdomain(host);
          
          if (subdomain) {
            const subdomainResponse = await fetch(`/api/subdomains/${subdomain}`);
            
            if (subdomainResponse.ok) {
              const subdomainData = await subdomainResponse.json();
              setSubdomainData({
                subdomain,
                customDomain: null,
                isAdminSubdomain: true,
                isCustomDomain: false,
                adminId: subdomainData.adminId,
                isSubdomainAdmin: currentUserId === subdomainData.adminId,
                storeName: subdomainData.storeName,
              });
            } else {
              setSubdomainData({
                subdomain,
                customDomain: null,
                isAdminSubdomain: false,
                isCustomDomain: false,
                adminId: null,
                isSubdomainAdmin: false,
                storeName: null,
              });
            }
          } else {
            setSubdomainData(defaultContext);
          }
        }
      } catch (error) {
        console.error('Error loading subdomain data:', error);
        setSubdomainData(defaultContext);
      }
    };

    // Only run in browser environment
    if (typeof window !== 'undefined') {
      loadSubdomainData();
    }
  }, []);

  return (
    <SubdomainContext.Provider value={subdomainData}>
      {children}
    </SubdomainContext.Provider>
  );
};