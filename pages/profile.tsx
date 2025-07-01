import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  dateOfBirth?: string;
  createdAt: string;
  addresses: Address[];
}

interface Address {
  id: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface AddressFormData {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

export default function Profile() {
  const { user: authUser, token, logout } = useAuth();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [addressForm, setAddressForm] = useState<AddressFormData>({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    isDefault: false
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (!authUser || !token) {
      router.push('/auth/login');
      return;
    }
    fetchUserProfile();
  }, [authUser, token, router]);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get('/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUser(response.data.user);
      setProfileForm({
        firstName: response.data.user.firstName || '',
        lastName: response.data.user.lastName || '',
        email: response.data.user.email || '',
        phone: response.data.user.phone || '',
        dateOfBirth: response.data.user.dateOfBirth ? response.data.user.dateOfBirth.split('T')[0] : '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setMessage({ type: 'error', text: 'Failed to load profile' });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('firstName', profileForm.firstName);
      formData.append('lastName', profileForm.lastName);
      formData.append('email', profileForm.email);
      formData.append('phone', profileForm.phone);
      formData.append('dateOfBirth', profileForm.dateOfBirth);
      
      if (profileForm.newPassword) {
        formData.append('currentPassword', profileForm.currentPassword);
        formData.append('newPassword', profileForm.newPassword);
      }
      
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const response = await axios.put('/api/users/profile', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setUser(response.data.user);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
      setAvatarFile(null);
      setAvatarPreview('');
      setProfileForm(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (error: any) {
      console.error('Profile update error:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to update profile' 
      });
    }
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    try {
      const payload = editingAddress 
        ? { ...addressForm, addressId: editingAddress.id }
        : addressForm;

      const response = editingAddress
        ? await axios.put('/api/users/addresses', payload, {
            headers: { Authorization: `Bearer ${token}` }
          })
        : await axios.post('/api/users/addresses', payload, {
            headers: { Authorization: `Bearer ${token}` }
          });

      setMessage({ 
        type: 'success', 
        text: editingAddress ? 'Address updated successfully!' : 'Address added successfully!' 
      });
      
      fetchUserProfile(); // Refresh to get updated addresses
      setShowAddressForm(false);
      setEditingAddress(null);
      setAddressForm({
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        isDefault: false
      });
    } catch (error: any) {
      console.error('Address operation error:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to save address' 
      });
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      await axios.delete('/api/users/addresses', {
        headers: { Authorization: `Bearer ${token}` },
        data: { addressId }
      });

      setMessage({ type: 'success', text: 'Address deleted successfully!' });
      fetchUserProfile();
    } catch (error: any) {
      console.error('Delete address error:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to delete address' 
      });
    }
  };

  const handleDeleteAccount = async () => {
    const password = prompt('Please enter your password to confirm account deletion:');
    if (!password) return;

    try {
      await axios.delete('/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` },
        data: { password }
      });

      setMessage({ type: 'success', text: 'Account deleted successfully' });
      logout();
      router.push('/');
    } catch (error: any) {
      console.error('Delete account error:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to delete account' 
      });
    }
  };

  const editAddress = (address: Address) => {
    setEditingAddress(address);
    setAddressForm({
      street: address.street,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country,
      isDefault: address.isDefault
    });
    setShowAddressForm(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile not found</h1>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>My Profile - Anjum's</title>
        <meta name="description" content="Manage your profile and account settings" />
      </Head>


      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Profile</h1>
            <p className="text-gray-600">Manage your account settings and personal information</p>
          </div>

          {/* Message Alert */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-100 border border-green-400 text-green-700' 
                : 'bg-red-100 border border-red-400 text-red-700'
            }`}>
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="text-center mb-6">
                  <div className="relative inline-block">
                    <Image
                      src={avatarPreview || user.avatar || '/default-avatar.svg'}
                      alt="Profile"
                      width={100}
                      height={100}
                      className="rounded-full object-cover border-4 border-gray-200"
                    />
                    {isEditing && (
                      <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mt-4">
                    {user.firstName} {user.lastName}
                  </h2>
                  <p className="text-gray-600">{user.email}</p>
                </div>

                <nav className="space-y-2">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'profile'
                        ? 'bg-blue-100 text-blue-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    👤 Profile Information
                  </button>
                  <button
                    onClick={() => setActiveTab('addresses')}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'addresses'
                        ? 'bg-blue-100 text-blue-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    📍 Addresses
                  </button>
                  <button
                    onClick={() => setActiveTab('security')}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'security'
                        ? 'bg-blue-100 text-blue-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    🔒 Security
                  </button>
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl shadow-lg p-8">
                {/* Profile Information Tab */}
                {activeTab === 'profile' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-2xl font-bold text-gray-900">Profile Information</h3>
                      <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                          isEditing
                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isEditing ? 'Cancel' : 'Edit Profile'}
                      </button>
                    </div>

                    <form onSubmit={handleProfileSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            First Name
                          </label>
                          <input
                            type="text"
                            value={profileForm.firstName}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
                            disabled={!isEditing}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Last Name
                          </label>
                          <input
                            type="text"
                            value={profileForm.lastName}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
                            disabled={!isEditing}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={profileForm.email}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                          disabled={!isEditing}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            value={profileForm.phone}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                            disabled={!isEditing}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Date of Birth
                          </label>
                          <input
                            type="date"
                            value={profileForm.dateOfBirth}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                            disabled={!isEditing}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                          />
                        </div>
                      </div>

                      {isEditing && (
                        <>
                          <div className="border-t pt-6 mt-6">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">Change Password (Optional)</h4>
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Current Password
                                </label>
                                <input
                                  type="password"
                                  value={profileForm.currentPassword}
                                  onChange={(e) => setProfileForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    New Password
                                  </label>
                                  <input
                                    type="password"
                                    value={profileForm.newPassword}
                                    onChange={(e) => setProfileForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Confirm New Password
                                  </label>
                                  <input
                                    type="password"
                                    value={profileForm.confirmPassword}
                                    onChange={(e) => setProfileForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="submit"
                              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
                            >
                              Save Changes
                            </button>
                          </div>
                        </>
                      )}
                    </form>
                  </div>
                )}

                {/* Addresses Tab */}
                {activeTab === 'addresses' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-2xl font-bold text-gray-900">Saved Addresses</h3>
                      <button
                        onClick={() => setShowAddressForm(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                      >
                        Add New Address
                      </button>
                    </div>

                    {showAddressForm && (
                      <div className="bg-gray-50 rounded-lg p-6 mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">
                          {editingAddress ? 'Edit Address' : 'Add New Address'}
                        </h4>
                        <form onSubmit={handleAddressSubmit} className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Street Address
                            </label>
                            <input
                              type="text"
                              value={addressForm.street}
                              onChange={(e) => setAddressForm(prev => ({ ...prev, street: e.target.value }))}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              required
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                City
                              </label>
                              <input
                                type="text"
                                value={addressForm.city}
                                onChange={(e) => setAddressForm(prev => ({ ...prev, city: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                State/Province
                              </label>
                              <input
                                type="text"
                                value={addressForm.state}
                                onChange={(e) => setAddressForm(prev => ({ ...prev, state: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                ZIP/Postal Code
                              </label>
                              <input
                                type="text"
                                value={addressForm.zipCode}
                                onChange={(e) => setAddressForm(prev => ({ ...prev, zipCode: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Country
                              </label>
                              <input
                                type="text"
                                value={addressForm.country}
                                onChange={(e) => setAddressForm(prev => ({ ...prev, country: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                              />
                            </div>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="isDefault"
                              checked={addressForm.isDefault}
                              onChange={(e) => setAddressForm(prev => ({ ...prev, isDefault: e.target.checked }))}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700">
                              Set as default address
                            </label>
                          </div>
                          <div className="flex space-x-4">
                            <button
                              type="submit"
                              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                            >
                              {editingAddress ? 'Update Address' : 'Save Address'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowAddressForm(false);
                                setEditingAddress(null);
                                setAddressForm({
                                  street: '',
                                  city: '',
                                  state: '',
                                  zipCode: '',
                                  country: '',
                                  isDefault: false
                                });
                              }}
                              className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    <div className="space-y-4">
                      {user.addresses.length > 0 ? (
                        user.addresses.map((address) => (
                          <div key={address.id} className="border border-gray-200 rounded-lg p-6 relative">
                            {address.isDefault && (
                              <div className="absolute top-4 right-4">
                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm font-semibold">
                                  Default
                                </span>
                              </div>
                            )}
                            <div className="pr-20">
                              <p className="font-semibold text-gray-900">{address.street}</p>
                              <p className="text-gray-600">
                                {address.city}, {address.state} {address.zipCode}
                              </p>
                              <p className="text-gray-600">{address.country}</p>
                            </div>
                            <div className="flex space-x-2 mt-4">
                              <button
                                onClick={() => editAddress(address)}
                                className="text-blue-600 hover:text-blue-700 font-semibold"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteAddress(address.id)}
                                className="text-red-600 hover:text-red-700 font-semibold"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <p>No addresses saved yet.</p>
                          <button
                            onClick={() => setShowAddressForm(true)}
                            className="text-blue-600 hover:text-blue-700 font-semibold mt-2"
                          >
                            Add your first address
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">Security Settings</h3>
                    
                    <div className="space-y-6">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <h4 className="text-lg font-semibold text-red-900 mb-2">Danger Zone</h4>
                        <p className="text-red-700 mb-4">
                          Once you delete your account, there is no going back. Please be certain.
                        </p>
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                        >
                          Delete Account
                        </button>
                      </div>

                      {showDeleteConfirm && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">
                              Are you absolutely sure?
                            </h4>
                            <p className="text-gray-600 mb-6">
                              This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                            </p>
                            <div className="flex space-x-4">
                              <button
                                onClick={handleDeleteAccount}
                                className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                              >
                                Yes, delete my account
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

  
    </>
  );
}
