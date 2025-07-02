# Tenant Subdomain API Routing Guide

## Problem Identified

We encountered a 500 Internal Server Error when making API requests from tenant subdomains to the `/api/server/` endpoints. The specific error occurred when accessing:

```
https://tariqulislam.codeopx.com/api/server/auth/login
```

The issue was that API requests from tenant subdomains (e.g., `tenant1.codeopx.com`) were not being properly routed to the backend API server. While the Next.js application has a rewrite rule in `next.config.js` to handle `/api/server/` paths, this wasn't being properly applied at the Nginx level for tenant subdomains.

## Solution Implemented

We've updated the Nginx configuration to properly route API requests from tenant subdomains to the backend server. The key change was adding a location block in the wildcard subdomain server configuration:

```nginx
# Route API requests from tenant subdomains to the backend
location /api/server/ {
    proxy_pass http://backend/api/;
}
```

This ensures that any request to `/api/server/` from a tenant subdomain (e.g., `tenant1.codeopx.com/api/server/auth/login`) is correctly proxied to the backend API server at the correct path (`api.codeopx.com/api/auth/login`).

## How It Works

1. **Client-side request**: When a user on a tenant subdomain (e.g., `tenant1.codeopx.com`) makes a request to `/api/server/auth/login`, the request is sent to the Nginx server.

2. **Nginx routing**: Nginx matches the request against the location blocks in the server configuration. The new location block `/api/server/` matches, and Nginx forwards the request to the backend upstream (`http://backend/api/`).

3. **Path transformation**: The `/api/server/` prefix is replaced with `/api/`, so a request to `/api/server/auth/login` becomes `/api/auth/login` when it reaches the backend server.

4. **Backend processing**: The Express.js server running on the backend processes the request using the appropriate route handler.

5. **Subdomain awareness**: The Next.js middleware adds the `x-subdomain` header to the request, which is then used by the `withSubdomainCheck` middleware to identify the tenant and apply the appropriate access controls.

## Testing

To verify that the API routing is working correctly:

1. Make a POST request to `https://[tenant-subdomain].codeopx.com/api/server/auth/login` with valid credentials.
2. The request should be properly routed to the backend and return a 200 OK response with the user's information.
3. Check the server logs for the debug output from the login handler, which should show the correct subdomain information.

## Additional Considerations

- **Caching**: Be mindful of any caching configurations that might affect API requests. The `proxy_cache_bypass $http_upgrade;` directive helps prevent unwanted caching.

- **Headers**: Ensure that all necessary headers are being properly passed to the backend, especially the `Host` header which is used to extract the subdomain.

- **SSL**: All API requests should use HTTPS to ensure secure communication. The SSL certificates are configured to cover both the main domain and all subdomains.

- **Error Handling**: Monitor the Nginx error logs (`/var/log/nginx/error.log`) and the application logs for any issues related to API routing.

## Conclusion

With this configuration, API requests from tenant subdomains should now be properly routed to the backend server, allowing the multi-tenant functionality to work correctly. If you encounter any issues, check the Nginx and application logs for more information.