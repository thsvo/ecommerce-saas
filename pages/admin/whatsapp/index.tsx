import React, { useState, useEffect } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../../components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { parseWhatsAppRecipients, validateWhatsAppMessage } from '../../../lib/whatsapp-business';

interface WhatsAppCampaign {
  id: string;
  name: string;
  messageType: 'TEXT' | 'TEMPLATE' | 'MEDIA';
  textMessage?: string;
  templateName?: string;
  templateParams?: any;
  mediaUrl?: string;
  mediaType?: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
  recipients: string[];
  status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'FAILED';
  sentAt?: string;
  scheduledAt?: string;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  totalCount: number;
  createdAt: string;
  failedNumbers: string[];
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  displayName: string;
  category: string;
  language: string;
  status: string;
  components: any;
}

interface WhatsAppResponse {
  success: boolean;
  message: string;
  data?: any;
  result?: any;
  config?: any;
}

const WhatsAppCampaignPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingCampaign, setSendingCampaign] = useState<string | null>(null);
  
  // Form states
  const [campaignName, setCampaignName] = useState('');
  const [messageType, setMessageType] = useState<'TEXT' | 'TEMPLATE' | 'MEDIA'>('TEXT');
  const [textMessage, setTextMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT'>('IMAGE');
  const [recipients, setRecipients] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Test message states
  const [testNumber, setTestNumber] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [testSending, setTestSending] = useState(false);

  // API Configuration states
  const [showConfigHelp, setShowConfigHelp] = useState(false);
  const [configStatus, setConfigStatus] = useState<any>(null);
  const [checkingConfig, setCheckingConfig] = useState(false);

  useEffect(() => {
    fetchCampaigns();
    fetchTemplates();
    checkConfiguration();
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
      const response = await makeApiRequest('/api/admin/whatsapp/campaigns');
      
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

  const fetchTemplates = async () => {
    try {
      const response = await makeApiRequest('/api/admin/whatsapp/templates');
      
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      } else {
        console.warn('Could not fetch templates');
      }
    } catch (error) {
      console.warn('Error fetching templates:', error);
    }
  };

  const checkConfiguration = async () => {
    try {
      setCheckingConfig(true);
      const response = await makeApiRequest('/api/admin/whatsapp/config-status');
      
      if (response.ok) {
        const data = await response.json();
        setConfigStatus(data);
      } else {
        console.warn('Could not check configuration');
      }
    } catch (error) {
      console.warn('Error checking configuration:', error);
    } finally {
      setCheckingConfig(false);
    }
  };

  const createCampaign = async () => {
    if (!campaignName || !recipients) {
      alert('Please fill in campaign name and recipients');
      return;
    }

    if (messageType === 'TEXT' && !textMessage) {
      alert('Please enter a text message');
      return;
    }

    if (messageType === 'TEMPLATE' && !selectedTemplate) {
      alert('Please select a template');
      return;
    }

    if (messageType === 'MEDIA' && (!mediaUrl || !mediaType)) {
      alert('Please enter media URL and select media type');
      return;
    }

    const recipientNumbers = parseWhatsAppRecipients(recipients);
    if (recipientNumbers.length === 0) {
      alert('No valid phone numbers found. Please ensure numbers include country code (e.g., +1234567890)');
      return;
    }

    if (messageType === 'TEXT') {
      const validation = validateWhatsAppMessage(textMessage);
      if (!validation.isValid) {
        alert(`Message validation failed: ${validation.errors.join(', ')}`);
        return;
      }
    }

    try {
      setIsCreating(true);

      const campaignData = {
        name: campaignName,
        messageType,
        textMessage: messageType === 'TEXT' ? textMessage : (messageType === 'MEDIA' ? textMessage : undefined), // Use as caption for media
        templateName: messageType === 'TEMPLATE' ? selectedTemplate : undefined,
        mediaUrl: messageType === 'MEDIA' ? mediaUrl : undefined,
        mediaType: messageType === 'MEDIA' ? mediaType : undefined,
        recipients: recipients,
        scheduledAt: scheduledDate || undefined,
        sendImmediately: false
      };

      const response = await makeApiRequest('/api/admin/whatsapp/campaigns', {
        method: 'POST',
        body: JSON.stringify(campaignData),
      });

      const result = await response.json();

      if (response.ok) {
        alert('Campaign created successfully!');
        setCampaignName('');
        setTextMessage('');
        setSelectedTemplate('');
        setMediaUrl('');
        setRecipients('');
        setScheduledDate('');
        fetchCampaigns();
      } else {
        alert(`Error creating campaign: ${result.message}`);
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert(`Network error: ${error instanceof Error ? error.message : 'Please check your connection'}`);
    } finally {
      setIsCreating(false);
    }
  };

  const sendCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to send this campaign? This action cannot be undone.')) {
      return;
    }

    try {
      setSendingCampaign(campaignId);

      const response = await makeApiRequest(`/api/admin/whatsapp/campaigns/${campaignId}/send`, {
        method: 'POST',
      });

      const result = await response.json();

      if (response.ok) {
        alert(`Campaign sent successfully! ${result.result?.successfulCount || 0} delivered, ${result.result?.failedCount || 0} failed.`);
        fetchCampaigns();
      } else {
        alert(`Error sending campaign: ${result.message}`);
      }
    } catch (error) {
      console.error('Error sending campaign:', error);
      alert(`Network error: ${error instanceof Error ? error.message : 'Please check your connection'}`);
    } finally {
      setSendingCampaign(null);
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) {
      return;
    }

    try {
      const response = await makeApiRequest(`/api/admin/whatsapp/campaigns/${campaignId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Campaign deleted successfully!');
        fetchCampaigns();
      } else {
        const result = await response.json();
        alert(`Error deleting campaign: ${result.message}`);
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      alert(`Network error: ${error instanceof Error ? error.message : 'Please check your connection'}`);
    }
  };

  const sendTestMessage = async () => {
    if (!testNumber || !testMessage) {
      alert('Please enter both test number and message');
      return;
    }

    const validation = validateWhatsAppMessage(testMessage);
    if (!validation.isValid) {
      alert(`Message validation failed: ${validation.errors.join(', ')}`);
      return;
    }

    try {
      setTestSending(true);

      const response = await makeApiRequest('/api/admin/whatsapp/test', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: testNumber,
          message: testMessage,
          messageType: 'text'
        }),
      });

      const result: WhatsAppResponse = await response.json();

      if (response.ok) {
        alert('Test message sent successfully!');
        setTestNumber('');
        setTestMessage('');
      } else {
        alert(`Error sending test message: ${result.message}`);
        if (result.config) {
          setShowConfigHelp(true);
        }
      }
    } catch (error) {
      console.error('Error sending test message:', error);
      alert(`Network error: ${error instanceof Error ? error.message : 'Please check your connection'}`);
    } finally {
      setTestSending(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'SENT': return 'default';
      case 'FAILED': return 'destructive';
      case 'SCHEDULED': return 'secondary';
      case 'DRAFT': return 'outline';
      default: return 'outline';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">WhatsApp Business Campaigns</h1>
          <div className="flex gap-2">
            <Button 
              onClick={checkConfiguration}
              variant="outline"
              disabled={checkingConfig}
            >
              {checkingConfig ? 'Checking...' : 'Check Config'}
            </Button>
            <Button 
              onClick={() => setShowConfigHelp(true)}
              variant="outline"
            >
              Setup Help
            </Button>
          </div>
        </div>

        {/* Configuration Status */}
        {configStatus && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Configuration Status
                {configStatus.tests?.apiTest?.success ? (
                  <Badge variant="default">✅ Connected</Badge>
                ) : (
                  <Badge variant="destructive">❌ Not Connected</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="font-semibold mb-2">Configuration:</h4>
                  <ul className="space-y-1 text-sm">
                    <li className={configStatus.configStatus.accessToken.present ? 'text-green-600' : 'text-red-600'}>
                      Access Token: {configStatus.configStatus.accessToken.present ? '✅ Present' : '❌ Missing'}
                    </li>
                    <li className={configStatus.configStatus.phoneNumberId.present ? 'text-green-600' : 'text-red-600'}>
                      Phone Number ID: {configStatus.configStatus.phoneNumberId.present ? '✅ Present' : '❌ Missing'}
                    </li>
                    <li className={configStatus.configStatus.businessAccountId.present ? 'text-green-600' : 'text-red-600'}>
                      Business Account ID: {configStatus.configStatus.businessAccountId.present ? '✅ Present' : '❌ Missing'}
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">API Tests:</h4>
                  <ul className="space-y-1 text-sm">
                    {configStatus.tests.apiTest && (
                      <li className={configStatus.tests.apiTest.success ? 'text-green-600' : 'text-red-600'}>
                        Access Token: {configStatus.tests.apiTest.success ? '✅ Valid' : '❌ Invalid'}
                      </li>
                    )}
                    {configStatus.tests.phoneNumberTest && (
                      <li className={configStatus.tests.phoneNumberTest.success ? 'text-green-600' : 'text-red-600'}>
                        Phone Number: {configStatus.tests.phoneNumberTest.success ? '✅ Valid' : '❌ Invalid'}
                      </li>
                    )}
                    {configStatus.tests.businessAccountTest && (
                      <li className={configStatus.tests.businessAccountTest.success ? 'text-green-600' : 'text-red-600'}>
                        Business Account: {configStatus.tests.businessAccountTest.success ? '✅ Valid' : '❌ Invalid'}
                      </li>
                    )}
                  </ul>
                </div>
              </div>
              {configStatus.nextSteps && configStatus.nextSteps.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Next Steps:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {configStatus.nextSteps.map((step: string, index: number) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* API Configuration Help Dialog */}
        <AlertDialog open={showConfigHelp} onOpenChange={setShowConfigHelp}>
          <AlertDialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>WhatsApp Business API Setup Guide</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4 text-sm">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Getting Started with Meta WhatsApp Business API</h3>
                    <p>To use WhatsApp Business API, you need to set up a Facebook Business account and get API credentials.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold">Step 1: Create Facebook Business Account</h4>
                    <ol className="list-decimal list-inside space-y-1 ml-4">
                      <li>Go to <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">business.facebook.com</a></li>
                      <li>Create a business account or use existing one</li>
                      <li>Verify your business information</li>
                    </ol>
                  </div>

                  <div>
                    <h4 className="font-semibold">Step 2: Set up WhatsApp Business Account</h4>
                    <ol className="list-decimal list-inside space-y-1 ml-4">
                      <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">developers.facebook.com</a></li>
                      <li>Create a new app or use existing one</li>
                      <li>Add WhatsApp Business Product to your app</li>
                      <li>Follow the setup wizard to configure your WhatsApp Business Account</li>
                    </ol>
                  </div>

                  <div>
                    <h4 className="font-semibold">Step 3: Get API Credentials</h4>
                    <p>You'll need these credentials in your <code>.env</code> file:</p>
                    <div className="bg-gray-100 p-3 rounded mt-2 font-mono text-xs">
                      <div>WHATSAPP_ACCESS_TOKEN=your_access_token_here</div>
                      <div>WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here</div>
                      <div>WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id_here</div>
                      <div>WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token_here</div>
                      <div>WHATSAPP_API_VERSION=v23.0</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold">Step 4: How to Find Your Credentials</h4>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li><strong>Access Token:</strong> Go to App Dashboard → WhatsApp → API Setup → Temporary Access Token</li>
                      <li><strong>Phone Number ID:</strong> In API Setup, you'll see "From" phone number with an ID</li>
                      <li><strong>Business Account ID:</strong> Found in WhatsApp Manager or API Setup page</li>
                      <li><strong>Webhook Verify Token:</strong> You create this yourself when setting up webhooks</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold">Step 5: Phone Number Requirements</h4>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>All phone numbers must include country code (e.g., +1234567890)</li>
                      <li>Numbers must be registered WhatsApp users</li>
                      <li>During testing, you can only send to verified test numbers</li>
                      <li>For production, you need to submit your app for review</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold">Step 6: Message Templates</h4>
                    <p>For marketing messages, you need pre-approved message templates:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Create templates in WhatsApp Manager</li>
                      <li>Templates must be approved by Meta before use</li>
                      <li>Text messages can be sent to users who messaged you first (24-hour window)</li>
                    </ul>
                  </div>

                  <div className="bg-yellow-50 p-3 rounded">
                    <h4 className="font-semibold text-yellow-800">Important Notes:</h4>
                    <ul className="list-disc list-inside space-y-1 ml-4 text-yellow-700">
                      <li>Start with the test environment before going to production</li>
                      <li>Respect WhatsApp's messaging policies</li>
                      <li>Monitor your message delivery rates and quality scores</li>
                      <li>Set up webhooks to receive delivery confirmations</li>
                    </ul>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowConfigHelp(false)}>Close</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Create Campaign Form */}
          <Card>
            <CardHeader>
              <CardTitle>Create WhatsApp Campaign</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="campaignName">Campaign Name</Label>
                <Input
                  id="campaignName"
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Enter campaign name"
                />
              </div>

              <div>
                <Label htmlFor="messageType">Message Type</Label>
                <Select value={messageType} onValueChange={(value: 'TEXT' | 'TEMPLATE' | 'MEDIA') => setMessageType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select message type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TEXT">Text Message</SelectItem>
                    <SelectItem value="TEMPLATE">Template Message</SelectItem>
                    <SelectItem value="MEDIA">Media Message</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {messageType === 'TEXT' && (
                <div>
                  <Label htmlFor="textMessage">Message Content</Label>
                  <Textarea
                    id="textMessage"
                    value={textMessage}
                    onChange={(e) => setTextMessage(e.target.value)}
                    placeholder="Enter your message (max 4096 characters)"
                    rows={4}
                    maxLength={4096}
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    {textMessage.length}/4096 characters
                  </div>
                </div>
              )}

              {messageType === 'TEMPLATE' && (
                <div>
                  <Label htmlFor="template">Select Template</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.filter(t => t.status === 'APPROVED').map((template) => (
                        <SelectItem key={template.id} value={template.name}>
                          {template.displayName} ({template.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {templates.length === 0 && (
                    <div className="text-sm text-gray-500 mt-1">
                      No approved templates found. Create templates in WhatsApp Manager.
                    </div>
                  )}
                </div>
              )}

              {messageType === 'MEDIA' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="mediaType">Media Type</Label>
                    <Select value={mediaType} onValueChange={(value: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT') => setMediaType(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select media type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IMAGE">Image</SelectItem>
                        <SelectItem value="VIDEO">Video</SelectItem>
                        <SelectItem value="AUDIO">Audio</SelectItem>
                        <SelectItem value="DOCUMENT">Document</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="mediaUrl">Media URL</Label>
                    <Input
                      id="mediaUrl"
                      type="url"
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      placeholder="https://example.com/media.jpg"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mediaCaption">Caption (Optional)</Label>
                    <Textarea
                      id="mediaCaption"
                      value={textMessage}
                      onChange={(e) => setTextMessage(e.target.value)}
                      placeholder="Enter caption for media"
                      rows={2}
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="recipients">Recipients</Label>
                <Textarea
                  id="recipients"
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  placeholder="Enter phone numbers with country code, separated by commas or new lines&#10;Example:&#10;+1234567890&#10;+9876543210"
                  rows={4}
                />
                <div className="text-sm text-gray-500 mt-1">
                  Enter phone numbers with country code (e.g., +1234567890)
                </div>
              </div>

              <div>
                <Label htmlFor="scheduledDate">Schedule For Later (Optional)</Label>
                <Input
                  id="scheduledDate"
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>

              <Button 
                onClick={createCampaign} 
                className="w-full"
                disabled={isCreating}
              >
                {isCreating ? 'Creating Campaign...' : 'Create Campaign'}
              </Button>
            </CardContent>
          </Card>

          {/* Test Message */}
          <Card>
            <CardHeader>
              <CardTitle>Send Test Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="testNumber">Test Phone Number</Label>
                <Input
                  id="testNumber"
                  type="tel"
                  value={testNumber}
                  onChange={(e) => setTestNumber(e.target.value)}
                  placeholder="+1234567890"
                />
              </div>

              <div>
                <Label htmlFor="testMessage">Test Message</Label>
                <Textarea
                  id="testMessage"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Enter test message"
                  rows={4}
                />
              </div>

              <Button 
                onClick={sendTestMessage} 
                className="w-full"
                disabled={testSending}
              >
                {testSending ? 'Sending...' : 'Send Test Message'}
              </Button>

              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Note:</strong> Test messages can only be sent to:</p>
                <ul className="list-disc list-inside ml-4">
                  <li>Verified test numbers in your WhatsApp Business account</li>
                  <li>Numbers that have messaged your business first (within 24 hours)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaigns List */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">Loading campaigns...</div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No campaigns found. Create your first WhatsApp campaign above!
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{campaign.name}</h3>
                        <p className="text-sm text-gray-600">
                          Type: {campaign.messageType} | Created: {formatDate(campaign.createdAt)}
                        </p>
                      </div>
                      <Badge variant={getStatusBadgeVariant(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                      <div>
                        <span className="font-medium">Total:</span> {campaign.totalCount}
                      </div>
                      <div>
                        <span className="font-medium">Delivered:</span> {campaign.deliveredCount}
                      </div>
                      <div>
                        <span className="font-medium">Read:</span> {campaign.readCount}
                      </div>
                      <div>
                        <span className="font-medium">Failed:</span> {campaign.failedCount}
                      </div>
                    </div>

                    {campaign.messageType === 'TEXT' && campaign.textMessage && (
                      <div className="mb-4">
                        <span className="font-medium text-sm">Message:</span>
                        <p className="text-sm text-gray-700 mt-1 bg-gray-50 p-2 rounded">
                          {campaign.textMessage.length > 200 
                            ? `${campaign.textMessage.substring(0, 200)}...` 
                            : campaign.textMessage
                          }
                        </p>
                      </div>
                    )}

                    {campaign.messageType === 'TEMPLATE' && campaign.templateName && (
                      <div className="mb-4">
                        <span className="font-medium text-sm">Template:</span>
                        <p className="text-sm text-gray-700 mt-1">{campaign.templateName}</p>
                      </div>
                    )}

                    {campaign.messageType === 'MEDIA' && campaign.mediaUrl && (
                      <div className="mb-4">
                        <span className="font-medium text-sm">Media:</span>
                        <p className="text-sm text-gray-700 mt-1">
                          {campaign.mediaType}: {campaign.mediaUrl}
                        </p>
                      </div>
                    )}

                    {campaign.failedNumbers.length > 0 && (
                      <div className="mb-4">
                        <span className="font-medium text-sm text-red-600">Failed Numbers:</span>
                        <p className="text-sm text-gray-700 mt-1">
                          {campaign.failedNumbers.slice(0, 5).join(', ')}
                          {campaign.failedNumbers.length > 5 && ` and ${campaign.failedNumbers.length - 5} more...`}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {campaign.status === 'DRAFT' && (
                        <Button
                          onClick={() => sendCampaign(campaign.id)}
                          disabled={sendingCampaign === campaign.id}
                          size="sm"
                        >
                          {sendingCampaign === campaign.id ? 'Sending...' : 'Send Now'}
                        </Button>
                      )}
                      
                      {campaign.status !== 'SENT' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">Delete</Button>
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
                      )}
                    </div>

                    {campaign.sentAt && (
                      <p className="text-xs text-gray-500 mt-2">
                        Sent: {formatDate(campaign.sentAt)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default WhatsAppCampaignPage;
