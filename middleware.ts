import { NextRequest, NextResponse } from 'next/server';
import { extractSubdomain } from './lib/subdomainUtils';

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const subdomain = extractSubdomain(host);
  
  // Skip static files but NOT API routes
  if (request.nextUrl.pathname.startsWith('/_next') || 
      request.nextUrl.pathname.includes('.')) {
    return NextResponse.next();
  }
  
  // Handle API routes - add host information and continue
  if (request.nextUrl.pathname.startsWith('/api')) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-original-host', host);
    
    if (subdomain && subdomain !== 'www') {
      requestHeaders.set('x-subdomain', subdomain);
      
      // Debug logging for API requests from subdomains
      console.log('API Request from subdomain:', {
        subdomain,
        path: request.nextUrl.pathname,
        host
      });
    }
    
    return NextResponse.next({
      headers: requestHeaders,
    });
  }
  
  // Handle test subdomain (for development)
  if (subdomain === 'test') {
    return NextResponse.rewrite(new URL('/test', request.url));
  }
  
  // For frontend routes, add host information for client-side handling
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-original-host', host);
  
  if (subdomain && subdomain !== 'www') {
    requestHeaders.set('x-subdomain', subdomain);
  }
  
  return NextResponse.next({
    headers: requestHeaders,
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Now includes API routes for subdomain detection
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
