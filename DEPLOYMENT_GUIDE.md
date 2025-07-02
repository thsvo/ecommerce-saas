# Deployment Guide for ecommerce-saas with Nginx

This guide explains how to deploy your ecommerce-saas application using Nginx as a reverse proxy, with the frontend accessible at `codeopx.com` and the backend API at `api.codeopx.com`.

## Prerequisites

- A server with Ubuntu/Debian or similar Linux distribution
- Domain name (codeopx.com) with DNS access
- SSL certificates for your domains
- Node.js and npm installed on your server
- Nginx installed on your server

## Step 1: Set Up DNS Records

Create the following DNS records for your domain:

1. **A record** for `codeopx.com` pointing to your server's IP address
2. **A record** for `www.codeopx.com` pointing to your server's IP address
3. **A record** for `api.codeopx.com` pointing to your server's IP address
4. **Wildcard DNS record** for `*.codeopx.com` pointing to your server's IP address

> **Note:** The wildcard DNS record allows any subdomain of codeopx.com to resolve to your server, which is essential for multi-tenant functionality.

## Step 2: Prepare Your Application

### Build the Next.js Frontend

```bash
# Navigate to your project directory
cd /path/to/ecommerce-saas

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Build the Next.js application
npm run build
```

### Configure Environment Variables

Create a `.env` file in your project root with all necessary environment variables:

```
# Database
DATABASE_URL=your_database_connection_string

# Next.js
NEXT_PUBLIC_API_URL=https://api.codeopx.com
NEXT_PUBLIC_FRONTEND_URL=https://codeopx.com

# Server
SERVER_PORT=3001

# Other environment variables your application needs
```

## Step 3: Set Up Process Manager (PM2)

Install PM2 to manage your Node.js processes:

```bash
npm install -g pm2
```

Create a PM2 ecosystem file (`ecosystem.config.js`) in your project root:

```javascript
module.exports = {
  apps: [
    {
      name: 'frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      env: {
        PORT: 3000,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'backend',
      script: 'server.js',
      env: {
        PORT: 3001,
        NODE_ENV: 'production'
      }
    }
  ]
};
```

Start your application with PM2:

```bash
pm2 start ecosystem.config.js
```

## Step 4: Configure Nginx

1. Copy the provided `nginx.conf` file to your Nginx configuration directory:

```bash
sudo cp nginx.conf /etc/nginx/sites-available/codeopx.com
```

2. Update the wildcard SSL certificate paths in the configuration file with your actual certificate paths:

```bash
sudo nano /etc/nginx/sites-available/codeopx.com
```

Replace:
- `/path/to/your/wildcard.certificate.crt` with your actual wildcard SSL certificate path
- `/path/to/your/wildcard.private.key` with your actual wildcard SSL private key path

> **Note:** Wildcard SSL certificates secure your main domain and all its subdomains (e.g., *.codeopx.com). This is required for the multi-tenant functionality of your application.

3. Create a symbolic link to enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/codeopx.com /etc/nginx/sites-enabled/
```

4. Test the Nginx configuration:

```bash
sudo nginx -t
```

5. If the test is successful, restart Nginx:

```bash
sudo systemctl restart nginx
```

## Step 5: Set Up Wildcard SSL Certificates with Let's Encrypt (Optional)

If you don't have wildcard SSL certificates yet, you can obtain free ones from Let's Encrypt. Note that wildcard certificates require DNS validation:

```bash
# Install Certbot and DNS plugin (example for Cloudflare - adjust based on your DNS provider)
sudo apt update
sudo apt install certbot python3-certbot-dns-cloudflare

# Create a secure file for Cloudflare API credentials
sudo mkdir -p /etc/letsencrypt/dns-credentials
sudo nano /etc/letsencrypt/dns-credentials/cloudflare.ini

# Add your Cloudflare API token to the file
# dns_cloudflare_api_token = your_cloudflare_api_token

# Secure the credentials file
sudo chmod 600 /etc/letsencrypt/dns-credentials/cloudflare.ini

# Obtain wildcard certificate
sudo certbot certonly --dns-cloudflare --dns-cloudflare-credentials /etc/letsencrypt/dns-credentials/cloudflare.ini -d codeopx.com -d *.codeopx.com -d api.codeopx.com
```

After obtaining the certificates, update your Nginx configuration with the correct paths:

```bash
sudo nano /etc/nginx/sites-available/codeopx.com
```

Update the SSL certificate paths to:

```
ssl_certificate /etc/letsencrypt/live/codeopx.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/codeopx.com/privkey.pem;
```

## Step 6: Verify Deployment

Test your deployment by visiting:

- Main Frontend: https://codeopx.com
- API: https://api.codeopx.com/api/health (should return a JSON response)
- Wildcard Domain: https://tenant1.codeopx.com (replace 'tenant1' with any subdomain to test wildcard functionality)

> **Note:** When testing wildcard domains, ensure your application is configured to handle multi-tenant requests properly. The wildcard domain should route to your frontend application, which should then determine which tenant's content to display based on the subdomain.

## Troubleshooting

### Nginx Logs

Check Nginx error logs if you encounter issues:

```bash
sudo tail -f /var/log/nginx/error.log
```

### Application Logs

Check your application logs with PM2:

```bash
pm2 logs frontend
pm2 logs backend
```

### Common Issues

1. **502 Bad Gateway**: Usually means your Node.js application isn't running or Nginx can't connect to it. Check if your application is running with `pm2 status`.

2. **SSL Certificate Issues**: Ensure your SSL certificates are correctly configured in the Nginx configuration.

3. **CORS Errors**: If your frontend can't communicate with your backend, check your CORS configuration in the server.js file.

## Maintenance

### Updating Your Application

```bash
# Pull the latest changes
git pull

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Build the Next.js application
npm run build

# Restart the application
pm2 restart all
```

### Renewing SSL Certificates

Let's Encrypt certificates expire after 90 days. If you used Certbot, it should automatically renew your certificates. You can test the renewal process with:

```bash
sudo certbot renew --dry-run
```

## Security Considerations

1. **Firewall**: Configure a firewall to only allow necessary ports (80, 443).
2. **Regular Updates**: Keep your server, Nginx, and Node.js updated.
3. **Rate Limiting**: Consider adding rate limiting to your Nginx configuration to prevent abuse.
4. **Content Security Policy**: Implement a Content Security Policy to mitigate XSS attacks.
5. **Wildcard Domain Security**: With wildcard domains, ensure proper tenant isolation to prevent cross-tenant data access.

## Multi-Tenant Considerations

When using wildcard domains for a multi-tenant application:

1. **Tenant Identification**: Your application should extract the subdomain from the request hostname to identify the tenant:

```javascript
// Example code for extracting tenant from hostname
const getTenantFromHostname = (hostname) => {
  // Skip if it's the main domain or API domain
  if (hostname === 'codeopx.com' || hostname === 'www.codeopx.com' || hostname === 'api.codeopx.com') {
    return null;
  }
  
  // Extract subdomain
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    return parts[0]; // The subdomain/tenant identifier
  }
  
  return null;
};
```

2. **Database Isolation**: Implement proper database isolation between tenants, either through:
   - Separate schemas for each tenant
   - Row-level tenant identification
   - Query filtering based on tenant ID

3. **Caching Strategy**: Implement tenant-aware caching to prevent data leakage between tenants.

4. **Custom Domain Support**: Consider allowing tenants to use their own custom domains in addition to subdomains.

## Conclusion

Your ecommerce-saas application should now be successfully deployed with Nginx as a reverse proxy. The main frontend is accessible at `codeopx.com`, the backend API at `api.codeopx.com`, and tenant-specific frontends at `*.codeopx.com` (e.g., `tenant1.codeopx.com`, `tenant2.codeopx.com`, etc.).

The wildcard domain and SSL configuration enables your application to support multiple tenants with their own subdomains while maintaining secure connections. This setup provides a foundation for a scalable multi-tenant SaaS application.