# Admin Subdomain Functionality

This document explains how the admin subdomain functionality works in the ecommerce application.

## Overview

When a superadmin creates an admin user, the system automatically generates a unique subdomain for that admin. The admin can then access their own version of the website through their subdomain (e.g., `adminname.yourdomain.com`). When accessed through this subdomain, the website will only show content created by that specific admin.

## Key Features

### Complete Admin Isolation
- **Separate Admin Panels**: Each admin has their own isolated admin panel accessible via their subdomain
- **Content Isolation**: Products and categories created by one admin are not visible to other admins
- **Subdomain-Specific Frontend**: The entire frontend (homepage, products, categories, etc.) shows only the admin's content when accessed via subdomain
- **Independent Operations**: Each admin can create, update, and manage their products and categories independently

### Subdomain Features
- **Custom Homepage**: Subdomain visitors see a personalized homepage with only that admin's products
- **Branded Experience**: The subdomain displays the admin's store name in the navbar
- **Admin Access**: Only the subdomain owner can access the admin panel for that subdomain
- **Complete Frontend**: All pages (products, categories, search, etc.) work within the subdomain context

## How It Works

1. **Subdomain Generation**: When a superadmin creates an admin user, a unique subdomain is automatically generated based on the admin's name.

2. **Subdomain Routing**: The application uses Next.js middleware to detect requests coming from subdomains and routes them appropriately.

3. **Content Filtering**: When a user accesses the site through an admin's subdomain, all content (products, categories, orders, etc.) is filtered to only show items created by that admin.

4. **Admin Panel Access**: The admin can access their management panel through the subdomain by clicking the "Admin Panel" link in the navbar or visiting `/admin` on their subdomain.

## Implementation Details

### Key Components

- **Middleware (`middleware.ts`)**: Detects subdomain requests and adds subdomain headers for proper routing.

- **Subdomain Context (`contexts/SubdomainContext.tsx`)**: Provides subdomain information throughout the application and determines if the current user is the subdomain owner.

- **Subdomain Utilities (`lib/subdomainUtils.ts`)**: Contains functions for generating unique subdomains and extracting subdomain information from hostnames.

- **API Middleware (`middleware/subdomainCheck.ts`)**: Ensures API requests are properly scoped to the admin's subdomain and attaches admin ID to requests.

- **Custom Hook (`hooks/useCurrentSubdomain.ts`)**: Makes it easy for components to access subdomain information and provides API endpoint filtering.

- **Enhanced Navbar (`components/Navbar.tsx`)**: Shows subdomain branding and provides admin panel access for subdomain owners.

### Database Schema Updates

The following models have been updated to support admin isolation:

- **Products**: Added `createdBy` field to associate products with specific admins
- **Categories**: Added `createdBy` field to associate categories with specific admins
- **User Relations**: Added relations to link admins with their created content

### API Route Updates

All relevant API routes have been updated to:
- Detect subdomain context from request headers
- Filter content by admin ID when in subdomain context
- Automatically set `createdBy` field when creating new content

## Testing Locally

### Prerequisites

To test subdomains locally, you need to modify your hosts file to support subdomains on localhost:

1. Edit your hosts file (Windows: `C:\Windows\System32\drivers\etc\hosts`, Mac/Linux: `/etc/hosts`)
2. Add entries for your test subdomains:
   ```
   127.0.0.1 adminuser.localhost
   127.0.0.1 test.localhost
   127.0.0.1 localhost
   ```

### Creating an Admin with Subdomain

Run the admin creation script:

```bash
node scripts/createAdmin.js
```

This will create an admin user with a unique subdomain and display the URL you can use to access the admin interface.

### Accessing the Admin Subdomain

Once you have created an admin user with a subdomain, you can access their version of the site by visiting:

```
http://[subdomain].localhost:3000
```

For example, if the generated subdomain is "adminuser", you would visit:

```
http://adminuser.localhost:3000
```

### Testing Admin Isolation

1. Create multiple admin users with different subdomains
2. Log in as each admin and create products/categories in their respective admin panels
3. Visit each subdomain to verify that only that admin's content is visible
4. Verify that admin panel access is restricted to the subdomain owner

## Production Deployment

For production, you'll need to configure your DNS and web server to support wildcard subdomains. This typically involves:

1. Setting up a wildcard DNS record (e.g., `*.yourdomain.com`) pointing to your server
2. Configuring your web server (Nginx, Apache, etc.) to handle wildcard subdomains
3. Ensuring your SSL certificate supports wildcard subdomains

## Admin Capabilities on Subdomains

Each admin can perform the following operations within their subdomain:

### Product Management
- Create new products visible only on their subdomain
- Edit and update their products
- Delete their products
- Upload product images
- Set product stock and pricing
- Feature products on their subdomain homepage

### Category Management
- Create custom categories for their store
- Edit category information and images
- Organize products within their categories
- Categories are unique per admin (multiple admins can have categories with the same name)

### Content Visibility
- Only products and categories created by the admin are visible on their subdomain
- The homepage shows only their products in featured and trending sections
- Product search and filtering works only within their content
- Category pages show only their products

### Admin Panel Access
- Full access to their admin dashboard with subdomain-specific statistics
- Ability to manage orders placed on their subdomain
- User management for customers who register through their subdomain
- SMS and WhatsApp campaign management for their customer base

## Troubleshooting

- If subdomains aren't working locally, ensure your hosts file is properly configured
- Check that the Next.js middleware is correctly detecting and routing subdomain requests
- Verify that the admin user has a valid subdomain in the database
- Use the browser's developer tools to check for any errors in the console
- Ensure the database migration for adding `createdBy` fields has been applied successfully

## Future Enhancements

Potential improvements to the subdomain functionality:

- Custom domain mapping (allow admins to use their own domains)
- Subdomain-specific themes and branding
- Advanced analytics per subdomain
- Subdomain-specific payment gateway configuration
- Multi-language support per subdomain