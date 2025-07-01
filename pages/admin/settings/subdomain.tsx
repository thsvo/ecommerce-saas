import React, { useState, useEffect } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import { useCurrentSubdomain } from '../../../hooks/useCurrentSubdomain';
import { useAuth } from '../../../contexts/AuthContext';
import axios from 'axios';

const SubdomainSettings: React.FC = () => {
  const { subdomain, isAdminSubdomain, adminId } = useCurrentSubdomain();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [currentSubdomain, setCurrentSubdomain] = useState('');
  
  useEffect(() => {
    if (user && user.subdomain) {
      setCurrentSubdomain(user.subdomain);
    }
  }, [user]);

  const handleCopyUrl = () => {
    const url = `http://${currentSubdomain}.localhost:3000`;
    navigator.clipboard.writeText(url);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <AdminLayout title="Subdomain Settings">
      <div className="space-y-6"/>
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Store Subdomain</h2>
          
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="flex items-center">
              <div className="mr-3 bg-blue-100 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">
              Your store has a unique subdomain that allows customers to access your products directly. 
              This subdomain is automatically generated when your admin account is created.
            </p>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Current Subdomain</label>
            <div className="flex items-center">
              <div className="flex-1 bg-gray-100 p-3 rounded-l-lg border border-gray-300 font-mono">
                {currentSubdomain}<span className="text-gray-500">.store</span>
              </div>
              <button 
                onClick={handleCopyUrl}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-r-lg transition-colors"
              >
                {success ? (
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </span>
                ) : (
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copy URL
                  </span>
                )}
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Your store is accessible at: <span className="font-medium">http://{currentSubdomain}.localhost:3000</span> (for development)
            </p>
            <p className="text-sm text-gray-500">
              In production, it would be: <span className="font-medium">http://{currentSubdomain}.yourdomain.com</span>
            </p>
          </div>
          
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Access Your Store</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a 
                href={`http://${currentSubdomain}.localhost:3000`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <div className="bg-blue-500 text-white p-2 rounded-lg mr-3">
                  🌐
                </div>
                <div>
                  <span className="font-medium text-gray-900 block">Visit Your Store</span>
                  <span className="text-sm text-gray-600">See how customers view your store</span>
                </div>
              </a>
              
              <a 
                href={`http://${currentSubdomain}.localhost:3000/admin`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
              >
                <div className="bg-purple-500 text-white p-2 rounded-lg mr-3">
                  ⚙️
                </div>
                <div>
                  <span className="font-medium text-gray-900 block">Admin Dashboard</span>
                  <span className="text-sm text-gray-600">Manage your store through subdomain</span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SubdomainSettings;