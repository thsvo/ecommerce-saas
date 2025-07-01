import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminByHost } from '../../../../lib/subdomainUtils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { host } = req.query;
    
    if (!host || typeof host !== 'string') {
      return res.status(400).json({ error: 'Host parameter is required' });
    }

    const decodedHost = decodeURIComponent(host);
    const result = await getAdminByHost(decodedHost);

    if (!result.admin) {
      return res.status(404).json({ 
        error: 'No admin found for this host',
        isAdminSubdomain: false,
        isCustomDomain: false
      });
    }

    const responseData = {
      adminId: result.admin.id,
      storeName: `${result.admin.firstName} ${result.admin.lastName}`,
      isAdminSubdomain: true,
      isCustomDomain: result.isCustomDomain,
      subdomain: result.subdomain || null,
      customDomain: result.isCustomDomain ? decodedHost : null,
    };

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Error in host lookup:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
