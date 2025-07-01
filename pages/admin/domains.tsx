import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../components/ui/alert-dialog';
import { getDomainStatusColor, getDomainStatusText, isValidDomain } from '../../lib/domainUtils';

interface DNSRecord {
  type: 'TXT' | 'CNAME' | 'A';
  name: string;
  value: string;
  ttl?: number;
}

interface CustomDomain {
  id: string;
  domain: string;
  status: 'PENDING' | 'VERIFYING' | 'VERIFIED' | 'FAILED' | 'ACTIVE' | 'INACTIVE';
  verificationToken: string;
  dnsRecords: DNSRecord[];
  lastVerified?: string;
  verifiedAt?: string;
  isActive: boolean;
  errorMessage?: string;
  createdAt: string;
}

interface VerificationResult {
  verified: boolean;
  records: DNSRecord[];
  errors: string[];
}

const DomainManagement = () => {
  const { user } = useAuth();
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showInstructions, setShowInstructions] = useState<CustomDomain | null>(null);

  useEffect(() => {
    if (user) {
      fetchDomains();
    }
  }, [user]);

  const fetchDomains = async () => {
    if (!user) return;
    try {
      const response = await fetch('/api/admin/domains', {
        headers: {
          'x-user-id': user.id
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDomains(data.domains);
      }
    } catch (error) {
      console.error('Error fetching domains:', error);
    }
  };

  const addDomain = async () => {
    if (!user) {
      setError('You must be logged in to add a domain.');
      return;
    }

    if (!newDomain.trim()) {
      setError('Please enter a domain name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ domain: newDomain.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        setDomains([data.customDomain, ...domains]);
        setNewDomain('');
        setShowInstructions(data.customDomain);
      } else {
        setError(data.error || 'Failed to add domain');
      }
    } catch (error) {
      setError('Failed to add domain');
    } finally {
      setLoading(false);
    }
  };

  const verifyDomain = async (domainId: string) => {
    if (!user) return;
    setVerifying(domainId);

    try {
      const response = await fetch('/api/admin/domains/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ domainId })
      });

      const data = await response.json();

      if (response.ok) {
        // Update the domain in the list
        setDomains(domains.map(d => 
          d.id === domainId ? data.domain : d
        ));
        
        if (data.success) {
          alert('Domain verified successfully! You can now activate it.');
        } else {
          alert(`Verification failed: ${data.message}`);
        }
      } else {
        alert(`Verification failed: ${data.error}`);
      }
    } catch (error) {
      alert('Verification failed');
    } finally {
      setVerifying(null);
    }
  };

  const toggleDomainStatus = async (domainId: string, action: 'activate' | 'deactivate') => {
    if (!user) return;
    try {
      const response = await fetch('/api/admin/domains', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ id: domainId, action })
      });

      const data = await response.json();

      if (response.ok) {
        setDomains(domains.map(d => 
          d.id === domainId ? data.customDomain : d
        ));
      } else {
        alert(data.error || `Failed to ${action} domain`);
      }
    } catch (error) {
      alert(`Failed to ${action} domain`);
    }
  };

  const deleteDomain = async (domainId: string) => {
    if (!user) return;
    try {
      const response = await fetch('/api/admin/domains', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ id: domainId })
      });

      if (response.ok) {
        setDomains(domains.filter(d => d.id !== domainId));
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete domain');
      }
    } catch (error) {
      alert('Failed to delete domain');
    }
  };

  const getStatusColor = (status: string) => {
    return getDomainStatusColor(status);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Custom Domain Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="Enter domain name (e.g., mystore.com)"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={addDomain} 
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add Domain'}
              </Button>
            </div>
            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {domains.map((domain) => (
          <Card key={domain.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{domain.domain}</h3>
                    <Badge className={getStatusColor(domain.status)}>
                      {domain.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Added on {new Date(domain.createdAt).toLocaleDateString()}
                  </p>
                  {domain.errorMessage && (
                    <p className="text-sm text-red-600 mt-1">{domain.errorMessage}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {domain.status === 'PENDING' || domain.status === 'FAILED' ? (
                    <>
                      <Button
                        onClick={() => setShowInstructions(domain)}
                        variant="outline"
                        size="sm"
                      >
                        Setup Instructions
                      </Button>
                      <Button
                        onClick={() => verifyDomain(domain.id)}
                        disabled={verifying === domain.id}
                        size="sm"
                      >
                        {verifying === domain.id ? 'Verifying...' : 'Verify Domain'}
                      </Button>
                    </>
                  ) : domain.status === 'VERIFIED' ? (
                    <Button
                      onClick={() => toggleDomainStatus(domain.id, 'activate')}
                      size="sm"
                    >
                      Activate Domain
                    </Button>
                  ) : domain.status === 'ACTIVE' ? (
                    <Button
                      onClick={() => toggleDomainStatus(domain.id, 'deactivate')}
                      variant="outline"
                      size="sm"
                    >
                      Deactivate
                    </Button>
                  ) : null}
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Domain</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {domain.domain}? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteDomain(domain.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showInstructions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">DNS Setup Instructions</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInstructions(null)}
              >
                Close
              </Button>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-600">
                To verify ownership of <strong>{showInstructions.domain}</strong>, please add the following DNS records:
              </p>
              
              {(typeof showInstructions.dnsRecords === 'string' ? JSON.parse(showInstructions.dnsRecords) : showInstructions.dnsRecords).map((record: DNSRecord, index: number) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <label className="font-semibold">Type:</label>
                      <div className="bg-white p-2 rounded mt-1">{record.type}</div>
                    </div>
                    <div>
                      <label className="font-semibold">Name:</label>
                      <div className="bg-white p-2 rounded mt-1 flex items-center justify-between">
                        <span className="truncate">{record.name}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(record.name)}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                    <div>
                      <label className="font-semibold">Value:</label>
                      <div className="bg-white p-2 rounded mt-1 flex items-center justify-between">
                        <span className="truncate">{record.value}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(record.value)}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">Important Notes:</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• DNS changes can take up to 24-48 hours to propagate</li>
                  <li>• Make sure to add both TXT and CNAME records</li>
                  <li>• The TXT record is for ownership verification</li>
                  <li>• The CNAME record routes traffic to our servers</li>
                  <li>• Click "Verify Domain" after adding the records</li>
                </ul>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => verifyDomain(showInstructions.id)}
                  disabled={verifying === showInstructions.id}
                  className="flex-1"
                >
                  {verifying === showInstructions.id ? 'Verifying...' : 'Verify Domain Now'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowInstructions(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DomainManagement;
