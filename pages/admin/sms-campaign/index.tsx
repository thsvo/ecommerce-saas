import React, { useState, useEffect } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../../components/ui/alert-dialog';
import { parseRecipients, validateSMSMessage } from '../../../lib/sms-bangladesh';

interface SMSCampaign {
  id: string;
  name: string;
  message: string;
  recipients: string[];
  status: 'DRAFT' | 'SENT' | 'SCHEDULED' | 'FAILED';
  sentAt?: string;
  scheduledAt?: string;
  deliveredCount: number;
  totalCount: number;
  createdAt: string;
}

interface SMSResponse {
  success: boolean;
  message: string;
  data?: any;
  failedNumbers?: string[];
}

const SMSCampaignPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<SMSCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingCampaign, setSendingCampaign] = useState<string | null>(null);
  
  // Form states
  const [campaignName, setCampaignName] = useState('');
  const [message, setMessage] = useState('');
  const [recipients, setRecipients] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Test SMS states
  const [testNumber, setTestNumber] = useState('');
  const [testSending, setTestSending] = useState(false);

  // SMS Bangladesh API Configuration
  const [apiConfig, setApiConfig] = useState({
    baseUrl: 'https://panel.smsbangladesh.com/api',
    user: process.env.NEXT_PUBLIC_SMS_BANGLADESH_USER || 'icc.maheshpur@gmail.com',
    password: process.env.NEXT_PUBLIC_SMS_BANGLADESH_PASSWORD || 'Skynet@1231',
    from: process.env.NEXT_PUBLIC_SMS_BANGLADESH_FROM || 'ANJUMS'
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Helper function for API calls
  const makeApiRequest = async (url: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    return fetch(url, {
      ...options,
      headers,
    });
  };

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await makeApiRequest('/api/admin/sms-campaigns');
      
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        alert(`Error fetching campaigns: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      alert(`Network error: ${error instanceof Error ? error.message : 'Please check your connection'}`);
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async () => {
    if (!campaignName || !message || !recipients) {
      alert('Please fill in all required fields');
      return;
    }

    const recipientNumbers = parseRecipients(recipients);
    if (recipientNumbers.length === 0) {
      alert('Please provide valid phone numbers');
      return;
    }

    if (!validateSMSMessage(message)) {
      alert('Message must be between 1-1000 characters');
      return;
    }

    try {
      setIsCreating(true);
      const response = await makeApiRequest('/api/admin/sms-campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: campaignName,
          message,
          recipients: recipientNumbers,
          scheduledAt: scheduledDate || null
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCampaigns([data.campaign, ...campaigns]);
        
        // Reset form
        setCampaignName('');
        setMessage('');
        setRecipients('');
        setScheduledDate('');
        
        alert('Campaign created successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create campaign');
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Error creating campaign');
    } finally {
      setIsCreating(false);
    }
  };

  const sendCampaign = async (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;

    if (!apiConfig.user || !apiConfig.password) {
      alert('Please configure your SMS Bangladesh API credentials first');
      return;
    }

    try {
      setSendingCampaign(campaignId);
      
      // Send campaign via backend API (backend will handle SMS Bangladesh call)
      const response = await makeApiRequest(`/api/admin/sms-campaigns/${campaignId}/send`, {
        method: 'POST',
        body: JSON.stringify({
          apiConfig
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCampaigns(campaigns.map(c => 
          c.id === campaignId ? { ...c, ...data.campaign } : c
        ));
        
        alert(`Campaign sent successfully! ${data.stats.deliveredCount}/${data.stats.totalCount} delivered (${data.stats.successRate}% success rate)`);
      } else {
        const error = await response.json();
        alert(`Failed to send campaign: ${error.message}`);
      }
    } catch (error) {
      console.error('Error sending campaign:', error);
      alert('Error sending campaign');
    } finally {
      setSendingCampaign(null);
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    try {
      const response = await makeApiRequest(`/api/admin/sms-campaigns/${campaignId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setCampaigns(campaigns.filter(c => c.id !== campaignId));
        alert('Campaign deleted successfully');
      } else {
        alert('Failed to delete campaign');
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      alert('Error deleting campaign');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT': return 'bg-green-100 text-green-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const sendTestSMS = async () => {
    if (!testNumber) {
      alert('Please enter a test phone number');
      return;
    }

    if (!apiConfig.user || !apiConfig.password) {
      alert('Please configure your SMS Bangladesh API credentials');
      return;
    }

    try {
      setTestSending(true);
      
      // Send test SMS via backend API
      const response = await makeApiRequest('/api/admin/sms-test', {
        method: 'POST',
        body: JSON.stringify({
          testNumber,
          user: apiConfig.user,
          password: apiConfig.password,
          from: apiConfig.from
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ Test SMS sent successfully to ${testNumber}!`);
      } else {
        alert(`❌ Test SMS failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Test SMS error:', error);
      alert('❌ Test SMS failed: Connection error');
    } finally {
      setTestSending(false);
    }
  };

  return (
    <AdminLayout title="SMS Campaign Management">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">SMS Campaign</h1>
            <p className="text-gray-600 mt-1">Send bulk SMS messages to your customers</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-blue-50">
              📱 SMS Bangladesh API
            </Badge>
          </div>
        </div>

        {/* Create New Campaign */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>🚀</span>
              <span>Create New SMS Campaign</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="campaignName">Campaign Name *</Label>
                <Input
                  id="campaignName"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g., Summer Sale Promotion"
                />
              </div>
              <div>
                <Label htmlFor="scheduledDate">Schedule Date (Optional)</Label>
                <Input
                  id="scheduledDate"
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your SMS message here..."
                className="min-h-[100px]"
                maxLength={1000}
              />
              <p className="text-sm text-gray-500 mt-1">
                {message.length}/1000 characters
              </p>
            </div>

            <div>
              <Label htmlFor="recipients">Phone Numbers *</Label>
              <Textarea
                id="recipients"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder="Enter phone numbers separated by commas or new lines&#10;e.g., 01712345678, 01987654321&#10;+8801712345678"
                className="min-h-[120px]"
              />
              <p className="text-sm text-gray-500 mt-1">
                Valid numbers: {parseRecipients(recipients).length}
              </p>
            </div>

            <Button 
              onClick={createCampaign} 
              disabled={isCreating}
              className="w-full md:w-auto"
            >
              {isCreating ? (
                <span className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </span>
              ) : (
                <span className="flex items-center space-x-2">
                  <span>📝</span>
                  <span>Create Campaign</span>
                </span>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Campaigns List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>📊</span>
              <span>SMS Campaigns</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>📭 No SMS campaigns found</p>
                <p className="text-sm">Create your first campaign above</p>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{campaign.name}</h3>
                        <p className="text-gray-600 text-sm">
                          Created: {new Date(campaign.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={getStatusColor(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </div>
                    
                    <div className="bg-gray-50 rounded p-3 mb-3">
                      <p className="text-sm font-medium mb-1">Message:</p>
                      <p className="text-sm text-gray-700">{campaign.message}</p>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                      <span>👥 Recipients: {campaign.totalCount}</span>
                      {campaign.status === 'SENT' && (
                        <span>✅ Delivered: {campaign.deliveredCount}</span>
                      )}
                      {campaign.sentAt && (
                        <span>📅 Sent: {new Date(campaign.sentAt).toLocaleString()}</span>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      {campaign.status === 'DRAFT' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              size="sm" 
                              disabled={sendingCampaign === campaign.id}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {sendingCampaign === campaign.id ? (
                                <span className="flex items-center space-x-1">
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                  <span>Sending...</span>
                                </span>
                              ) : (
                                <span className="flex items-center space-x-1">
                                  <span>📤</span>
                                  <span>Send Now</span>
                                </span>
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Send SMS Campaign</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to send this campaign to {campaign.totalCount} recipients? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => sendCampaign(campaign.id)}>
                                Send Campaign
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            🗑️ Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{campaign.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteCampaign(campaign.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>⚙️</span>
              <span>SMS Bangladesh API Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="apiUser">API User (Email) *</Label>
                <Input
                  id="apiUser"
                  type="email"
                  value={apiConfig.user}
                  onChange={(e) => setApiConfig({...apiConfig, user: e.target.value})}
                  placeholder="icc.maheshpur@gmail.com"
                />
              </div>
              <div>
                <Label htmlFor="apiPassword">API Password *</Label>
                <Input
                  id="apiPassword"
                  type="password"
                  value={apiConfig.password}
                  onChange={(e) => setApiConfig({...apiConfig, password: e.target.value})}
                  placeholder="Your SMS Bangladesh Password"
                />
              </div>
              <div>
                <Label htmlFor="fromName">Sender Name/Mask</Label>
                <Input
                  id="fromName"
                  value={apiConfig.from}
                  onChange={(e) => setApiConfig({...apiConfig, from: e.target.value})}
                  placeholder="ECOMMERCE"
                  maxLength={11}
                />
              </div>
            </div>
            
            {/* Test SMS Section */}
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-3">🧪 Test SMS Configuration</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="testNumber">Test Phone Number</Label>
                  <Input
                    id="testNumber"
                    placeholder="01712345678"
                    onChange={(e) => setTestNumber(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={sendTestSMS}
                    disabled={testSending}
                    variant="outline"
                    className="w-full"
                  >
                    {testSending ? (
                      <span className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        <span>Sending Test...</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-2">
                        <span>📱</span>
                        <span>Send Test SMS</span>
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
              <p><strong>SMS Bangladesh API Information:</strong></p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>API URL:</strong> {apiConfig.baseUrl}</li>
                <li><strong>Method:</strong> GET request with parameters</li>
                <li><strong>Format:</strong> ?user=email&password=pass&from=mask&to=numbers&text=message</li>
                <li><strong>Numbers:</strong> Must include country code (88 for Bangladesh)</li>
              </ul>
              <p className="mt-3"><strong>Environment Variables (Optional):</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li><code>NEXT_PUBLIC_SMS_BANGLADESH_USER</code></li>
                <li><code>NEXT_PUBLIC_SMS_BANGLADESH_PASSWORD</code></li>
                <li><code>NEXT_PUBLIC_SMS_BANGLADESH_FROM</code></li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default SMSCampaignPage;
