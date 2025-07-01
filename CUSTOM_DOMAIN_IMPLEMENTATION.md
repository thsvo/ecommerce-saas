# Custom Domain Management Documentation

## Overview

This system allows subdomain owners to add and verify custom domains for their stores. When a custom domain is verified and activated, customers can access the store via both the original subdomain and the custom domain.

## Features

### 🌐 Domain Management
- **Add Custom Domains**: Admins can add their own custom domains
- **DNS Verification**: Automated verification of domain ownership via DNS records
- **Dual Access**: Stores remain accessible via both subdomain and custom domain
- **SSL Support**: Ready for SSL certificate integration
- **Status Tracking**: Real-time domain verification status

### 🔍 DNS Verification Methods
- **TXT Record Verification**: Proves domain ownership
- **CNAME Record Verification**: Routes traffic to our servers
- **Automated Verification**: Background verification with retry logic
- **Cloudflare Integration**: Optional integration for automatic verification

### 🎨 User Interface
- **Admin Dashboard**: Complete domain management interface
- **Visual Status**: Color-coded status badges for domains
- **Setup Instructions**: Step-by-step DNS configuration guide
- **One-Click Actions**: Verify, activate, deactivate domains
- **Error Handling**: Clear error messages and troubleshooting

## How It Works

### 1. Domain Addition
When an admin adds a custom domain:
1. System generates a unique verification token
2. Creates required DNS records (TXT and CNAME)
3. Provides setup instructions to the admin
4. Sets domain status to "PENDING"

### 2. DNS Verification
The verification process checks:
1. **TXT Record**: `_ecommerce-verify.domain.com` with verification token
2. **CNAME Record**: `domain.com` pointing to your platform domain
3. **Propagation**: DNS changes can take 24-48 hours to propagate

### 3. Domain Activation
Once verified:
1. Domain status changes to "VERIFIED"
2. Admin can activate the domain
3. Middleware routes traffic from custom domain
4. Store becomes accessible via custom domain

## Database Schema

### CustomDomain Model
```prisma
model CustomDomain {
  id              String              @id @default(cuid())
  domain          String              @unique
  userId          String              // Admin who owns this domain
  status          DomainStatus        @default(PENDING)
  verificationMethod DomainVerificationMethod @default(DNS_TXT)
  verificationToken String            // Token for DNS verification
  dnsRecords      Json?               // Required DNS records
  lastVerified    DateTime?
  verifiedAt      DateTime?
  ssl             Boolean             @default(false)
  isActive        Boolean             @default(false)
  errorMessage    String?
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  // Relations
  user            User                @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("custom_domains")
}
```

## API Endpoints

### Domain Management (`/api/admin/domains`)
- `GET`: List all domains for authenticated admin
- `POST`: Add new custom domain
- `PUT`: Update domain (verify/activate/deactivate)
- `DELETE`: Remove custom domain

### Auto Verification (`/api/admin/domains/verify`)
- `POST`: Perform automated domain verification with retries

### Host Resolution (`/api/subdomains/host/[host]`)
- `GET`: Get admin data for any host (subdomain or custom domain)

## Middleware Integration

The middleware now handles both subdomains and custom domains:
1. **Host Detection**: Checks if incoming request is from custom domain or subdomain
2. **Admin Resolution**: Finds associated admin for the host
3. **Header Injection**: Adds admin context to requests
4. **Routing**: Serves appropriate content based on admin context

## Frontend Integration

### SubdomainContext Enhancement
- Added custom domain support
- Unified admin store detection
- Store display name generation
- Domain type identification

### Navbar Updates
- Shows custom domain badge vs subdomain badge
- Displays store name appropriately
- Admin panel links work with both domain types

## Setup Instructions for Admins

### 1. Add Domain
1. Go to Admin → Domain Management
2. Click "Add Domain"
3. Enter your domain name (e.g., `mystore.com`)
4. Click "Add Domain"

### 2. Configure DNS
Add these DNS records to your domain:

**TXT Record:**
- Name: `_ecommerce-verify.yourdomain.com`
- Value: `ecommerce-verification=TOKEN_HERE`
- TTL: 300

**CNAME Record:**
- Name: `yourdomain.com` (or `@` for root domain)
- Value: `yourecommerceplatform.com`
- TTL: 300

### 3. Verify Domain
1. Wait for DNS propagation (can take up to 48 hours)
2. Click "Verify Domain" in the admin panel
3. System will automatically verify ownership and routing

### 4. Activate Domain
1. Once verified, click "Activate Domain"
2. Your store is now accessible via custom domain
3. Both subdomain and custom domain work simultaneously

## Technical Implementation

### DNS Verification Library
- **Pure Node.js**: Uses built-in `dns` module
- **Retry Logic**: Multiple verification attempts with delays
- **Error Handling**: Detailed error messages for troubleshooting
- **Cloudflare Integration**: Optional API integration for hosted domains

### Security Features
- **Token-based Verification**: Unique tokens prevent domain hijacking
- **Admin Isolation**: Domains are tied to specific admin accounts
- **Validation**: Domain format and availability checking
- **Error Logging**: Comprehensive logging for debugging

### Performance Considerations
- **Caching**: Domain resolution can be cached
- **Background Verification**: Non-blocking verification process
- **Efficient Routing**: Minimal overhead in middleware
- **Database Indexing**: Optimized queries for domain lookup

## Environment Variables

```env
# Your main domain (where the ecommerce platform is hosted)
NEXT_PUBLIC_DOMAIN=yourdomain.com

# Cloudflare API credentials (optional)
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token_here
CLOUDFLARE_ZONE_ID=your_cloudflare_zone_id_here

# DNS verification settings
DNS_VERIFICATION_TIMEOUT=30000
DNS_VERIFICATION_RETRIES=5
```

## Troubleshooting

### Common Issues

1. **DNS Not Propagated**
   - Wait 24-48 hours for full propagation
   - Use DNS checker tools to verify records
   - Try verification again after waiting

2. **CNAME Conflicts**
   - Remove existing A/CNAME records for the domain
   - Ensure only one CNAME record exists for the domain
   - Contact domain registrar if issues persist

3. **Verification Fails**
   - Check DNS records are exactly as provided
   - Ensure no extra spaces in DNS values
   - Verify domain ownership

4. **SSL Issues**
   - Implement SSL certificate automation
   - Use services like Let's Encrypt
   - Configure SSL in your hosting provider

## Future Enhancements

### Planned Features
- **Automatic SSL**: Let's Encrypt integration
- **Domain Analytics**: Traffic and performance metrics
- **Subdomain Redirects**: Automatic redirects from subdomain to custom domain
- **Bulk Operations**: Manage multiple domains simultaneously
- **Advanced DNS**: Support for A records and advanced configurations

### Integration Opportunities
- **CDN Integration**: Cloudflare, AWS CloudFront
- **DNS Providers**: Route53, Cloudflare, Namecheap APIs
- **SSL Automation**: Certbot, AWS Certificate Manager
- **Monitoring**: Domain uptime and performance tracking

## Support

For technical support:
1. Check the verification status in admin panel
2. Review error messages for specific issues
3. Verify DNS records using online DNS checker tools
4. Contact support with domain details and error messages

## Security Notes

- Never share verification tokens
- Keep DNS records secure
- Regularly monitor domain status
- Use strong passwords for domain registrar accounts
- Enable two-factor authentication where possible
