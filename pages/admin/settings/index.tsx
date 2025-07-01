import React from 'react';
import AdminLayout from '../../../components/AdminLayout';
import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();

  const settingsCategories = [
    {
      title: 'Store Settings',
      description: 'Configure your store name, logo, and contact information',
      icon: '🏪',
      href: '/admin/settings/store',
      color: 'bg-blue-500',
      available: true
    },
    {
      title: 'Subdomain Settings',
      description: 'View and manage your store subdomain',
      icon: '🌐',
      href: '/admin/settings/subdomain',
      color: 'bg-purple-500',
      available: user?.subdomain ? true : false
    },
    {
      title: 'Payment Methods',
      description: 'Configure payment gateways and options',
      icon: '💳',
      href: '/admin/settings/payments',
      color: 'bg-green-500',
      available: true
    },
    {
      title: 'Shipping Options',
      description: 'Set up shipping methods and delivery zones',
      icon: '📦',
      href: '/admin/settings/shipping',
      color: 'bg-yellow-500',
      available: true
    },
    {
      title: 'Email Templates',
      description: 'Customize notification emails for orders and accounts',
      icon: '📧',
      href: '/admin/settings/emails',
      color: 'bg-red-500',
      available: true
    },
    {
      title: 'User Accounts',
      description: 'Manage admin users and permissions',
      icon: '👥',
      href: '/admin/settings/users',
      color: 'bg-indigo-500',
      available: true
    }
  ];

  return (
    <AdminLayout title="Settings">
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {settingsCategories.map((category, index) => (
              <div key={index} className={`relative ${!category.available ? 'opacity-50' : ''}`}>
                {!category.available && (
                  <div className="absolute inset-0 bg-gray-200 bg-opacity-50 flex items-center justify-center rounded-lg z-10">
                    <span className="bg-gray-800 text-white text-xs px-2 py-1 rounded">
                      Coming Soon
                    </span>
                  </div>
                )}
                
                <Link 
                  href={category.available ? category.href : '#'}
                  className={`block p-6 rounded-lg border border-gray-200 hover:border-gray-300 transition-all ${category.available ? 'hover:shadow-md' : ''}`}
                  onClick={(e) => !category.available && e.preventDefault()}
                >
                  <div className="flex items-center mb-4">
                    <div className={`${category.color} text-white p-3 rounded-lg mr-4`}>
                      <span className="text-xl">{category.icon}</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">{category.title}</h3>
                  </div>
                  <p className="text-gray-600">{category.description}</p>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SettingsPage;