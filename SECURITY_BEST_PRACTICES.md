# Security Best Practices for Multi-Tenant E-Commerce SaaS

## Overview

This document outlines essential security best practices for the ecommerce-saas application, with a specific focus on multi-tenant architecture security concerns. Implementing these recommendations will help protect tenant data, prevent unauthorized access, and maintain compliance with security standards.

## Authentication and Authorization

### 1. Tenant Isolation

**Current State**: Basic tenant isolation through subdomain checking.

**Recommendations**:

1. **Implement Robust Tenant Context Validation**
   ```typescript
   // Enhanced tenant validation middleware
   export async function withStrictTenantIsolation(req, res, next) {
     // Get tenant from request (subdomain or header)
     const tenantId = req.subdomain || req.headers['x-tenant-id'];
     
     if (!tenantId) {
       return res.status(401).json({ error: 'Tenant context required' });
     }
     
     // Validate tenant exists and is active
     const tenant = await prisma.admin.findUnique({
       where: { subdomain: tenantId },
       select: { id: true, status: true, accessRestrictions: true }
     });
     
     if (!tenant || tenant.status !== 'active') {
       return res.status(403).json({ error: 'Invalid or inactive tenant' });
     }
     
     // Set tenant context for downstream use
     req.tenantId = tenantId;
     req.adminId = tenant.id;
     req.tenantAccessRestrictions = tenant.accessRestrictions;
     
     // Proceed to next middleware
     next();
   }
   ```

2. **Implement Resource-Based Access Control**
   ```typescript
   // Resource-based access control middleware
   export function canAccessResource(resourceType) {
     return async (req, res, next) => {
       // Get user from request
       const userId = req.userId;
       const tenantId = req.adminId;
       
       if (!userId || !tenantId) {
         return res.status(401).json({ error: 'Authentication required' });
       }
       
       // Check if user has permission to access this resource type
       const userPermissions = await getUserPermissions(userId, tenantId);
       
       if (!userPermissions.includes(`${resourceType}:read`)) {
         return res.status(403).json({ error: 'Access denied' });
       }
       
       next();
     };
   }
   ```

### 2. JWT Security Enhancements

**Current State**: Basic JWT implementation.

**Recommendations**:

1. **Implement Short-Lived Access Tokens with Refresh Tokens**
   ```typescript
   // Generate tokens with proper expiration
   function generateTokens(user, tenant) {
     // Short-lived access token (15 minutes)
     const accessToken = jwt.sign(
       { 
         userId: user.id, 
         email: user.email,
         tenantId: tenant.id,
         role: user.role
       },
       process.env.JWT_SECRET,
       { expiresIn: '15m' }
     );
     
     // Longer-lived refresh token (7 days)
     const refreshToken = jwt.sign(
       { userId: user.id, tokenVersion: user.tokenVersion },
       process.env.JWT_REFRESH_SECRET,
       { expiresIn: '7d' }
     );
     
     return { accessToken, refreshToken };
   }
   ```

2. **Implement Token Rotation and Invalidation**
   ```typescript
   // Refresh token endpoint
   app.post('/api/auth/refresh-token', async (req, res) => {
     const { refreshToken } = req.body;
     
     if (!refreshToken) {
       return res.status(400).json({ error: 'Refresh token required' });
     }
     
     try {
       // Verify the refresh token
       const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
       
       // Get user and check token version
       const user = await prisma.user.findUnique({
         where: { id: payload.userId },
         select: { id: true, email: true, role: true, tokenVersion: true }
       });
       
       if (!user || user.tokenVersion !== payload.tokenVersion) {
         return res.status(401).json({ error: 'Invalid refresh token' });
       }
       
       // Get tenant context
       const tenant = await prisma.admin.findFirst({
         where: {
           users: {
             some: { id: user.id }
           }
         }
       });
       
       // Generate new tokens
       const tokens = generateTokens(user, tenant);
       
       res.json(tokens);
     } catch (error) {
       return res.status(401).json({ error: 'Invalid refresh token' });
     }
   });
   ```

3. **Implement Secure Token Storage**
   ```typescript
   // Client-side token storage (httpOnly cookies)
   app.post('/api/auth/login', async (req, res) => {
     // Authentication logic...
     
     // Generate tokens
     const { accessToken, refreshToken } = generateTokens(user, tenant);
     
     // Set httpOnly cookies
     res.cookie('access_token', accessToken, {
       httpOnly: true,
       secure: process.env.NODE_ENV === 'production',
       sameSite: 'strict',
       maxAge: 15 * 60 * 1000 // 15 minutes
     });
     
     res.cookie('refresh_token', refreshToken, {
       httpOnly: true,
       secure: process.env.NODE_ENV === 'production',
       sameSite: 'strict',
       path: '/api/auth/refresh-token', // Restrict to refresh endpoint
       maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
     });
     
     // Return user info (but not tokens in response body)
     res.json({
       user: {
         id: user.id,
         email: user.email,
         role: user.role
       }
     });
   });
   ```

## Data Protection

### 1. Data Encryption

**Current State**: Limited encryption implementation.

**Recommendations**:

1. **Implement Field-Level Encryption for Sensitive Data**
   ```typescript
   // Utility for field-level encryption
   const crypto = require('crypto');
   
   const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
   const IV_LENGTH = 16;
   
   function encrypt(text) {
     const iv = crypto.randomBytes(IV_LENGTH);
     const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
     let encrypted = cipher.update(text, 'utf8', 'hex');
     encrypted += cipher.final('hex');
     return `${iv.toString('hex')}:${encrypted}`;
   }
   
   function decrypt(text) {
     const [ivHex, encryptedHex] = text.split(':');
     const iv = Buffer.from(ivHex, 'hex');
     const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
     let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
     decrypted += decipher.final('utf8');
     return decrypted;
   }
   ```

2. **Implement Transparent Data Encryption at Rest**
   - Use database-level encryption for all tenant data
   - Ensure encryption keys are properly managed and rotated

3. **Implement Secure Data Transmission**
   ```typescript
   // In next.config.js
   module.exports = {
     async headers() {
       return [
         {
           source: '/(.*)',
           headers: [
             {
               key: 'Strict-Transport-Security',
               value: 'max-age=63072000; includeSubDomains; preload'
             },
             {
               key: 'X-Content-Type-Options',
               value: 'nosniff'
             },
             {
               key: 'X-Frame-Options',
               value: 'DENY'
             },
             {
               key: 'X-XSS-Protection',
               value: '1; mode=block'
             },
             {
               key: 'Referrer-Policy',
               value: 'strict-origin-when-cross-origin'
             },
             {
               key: 'Permissions-Policy',
               value: 'camera=(), microphone=(), geolocation=()'
             }
           ]
         }
       ];
     }
   };
   ```

### 2. Data Isolation

**Current State**: Basic tenant data isolation.

**Recommendations**:

1. **Implement Row-Level Security**
   ```typescript
   // Prisma middleware for tenant isolation
   prisma.$use(async (params, next) => {
     // Skip for system-level operations
     if (params.action === 'findUnique' || params.action === 'findFirst') {
       return next(params);
     }
     
     // Get tenant context from async storage
     const tenantId = getTenantIdFromAsyncStorage();
     
     if (!tenantId) {
       throw new Error('Tenant context required for data access');
     }
     
     // Add tenant filter to all queries
     if (params.args.where) {
       params.args.where.adminId = tenantId;
     } else {
       params.args.where = { adminId: tenantId };
     }
     
     return next(params);
   });
   ```

2. **Implement Data Partitioning**
   - Consider physical data partitioning for large tenants
   - Implement logical partitioning with proper indexing

## API Security

### 1. Input Validation and Sanitization

**Current State**: Basic input validation.

**Recommendations**:

1. **Implement Comprehensive Input Validation**
   ```typescript
   // Validation middleware using Zod
   import { z } from 'zod';
   
   function validateRequest(schema) {
     return (req, res, next) => {
       try {
         // Validate request body against schema
         const validated = schema.parse(req.body);
         
         // Replace request body with validated data
         req.body = validated;
         
         next();
       } catch (error) {
         // Return validation errors
         return res.status(400).json({
           error: 'Validation failed',
           details: error.errors
         });
       }
     };
   }
   
   // Example schema for product creation
   const createProductSchema = z.object({
     name: z.string().min(1).max(100),
     description: z.string().max(1000).optional(),
     price: z.number().positive(),
     categoryId: z.string().uuid().optional(),
     stock: z.number().int().nonnegative().default(0),
     images: z.array(z.string().url()).max(10).optional()
   });
   
   // Use in route
   app.post('/api/products', validateRequest(createProductSchema), createProduct);
   ```

2. **Implement Output Sanitization**
   ```typescript
   // Sanitize HTML content
   import sanitizeHtml from 'sanitize-html';
   
   function sanitizeOutput(obj) {
     if (typeof obj !== 'object' || obj === null) {
       return obj;
     }
     
     if (Array.isArray(obj)) {
       return obj.map(sanitizeOutput);
     }
     
     const result = {};
     
     for (const [key, value] of Object.entries(obj)) {
       if (typeof value === 'string' && key.includes('html')) {
         result[key] = sanitizeHtml(value, {
           allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
           allowedAttributes: {}
         });
       } else if (typeof value === 'object' && value !== null) {
         result[key] = sanitizeOutput(value);
       } else {
         result[key] = value;
       }
     }
     
     return result;
   }
   
   // Use in response
   app.get('/api/products/:id', async (req, res) => {
     const product = await getProduct(req.params.id);
     res.json(sanitizeOutput(product));
   });
   ```

### 2. Rate Limiting and Throttling

**Current State**: No rate limiting implementation.

**Recommendations**:

1. **Implement Tenant-Aware Rate Limiting**
   ```typescript
   // Rate limiting middleware with Redis
   import rateLimit from 'express-rate-limit';
   import RedisStore from 'rate-limit-redis';
   import Redis from 'ioredis';
   
   const redis = new Redis(process.env.REDIS_URL);
   
   // Create tenant-aware rate limiter
   function createTenantRateLimiter(options) {
     return rateLimit({
       store: new RedisStore({
         sendCommand: (...args) => redis.call(...args),
       }),
       keyGenerator: (req) => {
         // Use tenant ID in rate limit key
         const tenantId = req.adminId || 'anonymous';
         return `${tenantId}:${req.ip}`;
       },
       ...options
     });
   }
   
   // Apply different rate limits based on endpoint sensitivity
   const authLimiter = createTenantRateLimiter({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 30, // 30 requests per window
     standardHeaders: true,
     message: { error: 'Too many login attempts, please try again later' }
   });
   
   const apiLimiter = createTenantRateLimiter({
     windowMs: 60 * 1000, // 1 minute
     max: 100, // 100 requests per minute
     standardHeaders: true
   });
   
   // Apply to routes
   app.use('/api/auth', authLimiter);
   app.use('/api', apiLimiter);
   ```

2. **Implement Tiered Rate Limiting**
   ```typescript
   // Tiered rate limiting based on tenant plan
   async function tieredRateLimiter(req, res, next) {
     const tenantId = req.adminId;
     
     if (!tenantId) {
       // Apply default limits for unauthenticated requests
       return defaultLimiter(req, res, next);
     }
     
     // Get tenant plan
     const tenant = await prisma.admin.findUnique({
       where: { id: tenantId },
       select: { plan: true }
     });
     
     // Apply rate limits based on plan
     switch (tenant?.plan) {
       case 'enterprise':
         return enterpriseLimiter(req, res, next);
       case 'business':
         return businessLimiter(req, res, next);
       case 'starter':
         return starterLimiter(req, res, next);
       default:
         return defaultLimiter(req, res, next);
     }
   }
   ```

## Infrastructure Security

### 1. Network Security

**Current State**: Basic network security.

**Recommendations**:

1. **Implement Web Application Firewall (WAF)**
   - Use Cloudflare, AWS WAF, or similar service
   - Configure rules to block common attack patterns

2. **Implement Network Segmentation**
   - Separate database, application, and public-facing components
   - Use security groups or network ACLs to restrict traffic

### 2. Secrets Management

**Current State**: Environment variables for secrets.

**Recommendations**:

1. **Implement Secure Secrets Management**
   - Use AWS Secrets Manager, HashiCorp Vault, or similar service
   - Rotate secrets regularly
   ```typescript
   // Secrets manager integration
   import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
   
   const secretsManager = new SecretsManagerClient({ region: 'us-east-1' });
   
   async function getSecret(secretName) {
     try {
       const command = new GetSecretValueCommand({ SecretId: secretName });
       const response = await secretsManager.send(command);
       return JSON.parse(response.SecretString);
     } catch (error) {
       console.error(`Error retrieving secret ${secretName}:`, error);
       throw error;
     }
   }
   
   // Usage
   async function initializeApp() {
     const dbCredentials = await getSecret('ecommerce-saas/database');
     const jwtSecrets = await getSecret('ecommerce-saas/jwt');
     
     // Configure application with retrieved secrets
     // ...
   }
   ```

2. **Implement Tenant-Specific Secrets**
   - Store tenant-specific API keys and credentials securely
   - Implement proper access controls for tenant secrets

## Compliance and Auditing

### 1. Audit Logging

**Current State**: Limited logging implementation.

**Recommendations**:

1. **Implement Comprehensive Audit Logging**
   ```typescript
   // Audit logging middleware
   function auditLogMiddleware(req, res, next) {
     // Capture original end method
     const originalEnd = res.end;
     
     // Get request start time
     const startTime = Date.now();
     
     // Override end method to capture response
     res.end = function(chunk, encoding) {
       // Calculate request duration
       const duration = Date.now() - startTime;
       
       // Create audit log entry
       const logEntry = {
         timestamp: new Date().toISOString(),
         method: req.method,
         path: req.path,
         query: req.query,
         statusCode: res.statusCode,
         duration,
         userId: req.userId || 'anonymous',
         tenantId: req.adminId || 'anonymous',
         userIp: req.ip,
         userAgent: req.headers['user-agent']
       };
       
       // Log to audit log storage
       storeAuditLog(logEntry);
       
       // Call original end method
       return originalEnd.call(this, chunk, encoding);
     };
     
     next();
   }
   
   // Store audit log
   async function storeAuditLog(logEntry) {
     // Store in database or send to external logging service
     await prisma.auditLog.create({ data: logEntry });
   }
   ```

2. **Implement Sensitive Action Logging**
   ```typescript
   // Log sensitive actions
   async function logSensitiveAction(action, userId, tenantId, details) {
     await prisma.sensitiveActionLog.create({
       data: {
         action,
         userId,
         tenantId,
         details: JSON.stringify(details),
         timestamp: new Date()
       }
     });
   }
   
   // Usage
   app.post('/api/users', async (req, res) => {
     // Create user logic
     const user = await createUser(req.body);
     
     // Log sensitive action
     await logSensitiveAction(
       'user.create',
       req.userId,
       req.adminId,
       { email: user.email, role: user.role }
     );
     
     res.status(201).json(user);
   });
   ```

### 2. Data Retention and Deletion

**Current State**: Limited data lifecycle management.

**Recommendations**:

1. **Implement Data Retention Policies**
   ```typescript
   // Scheduled job for data retention enforcement
   async function enforceDataRetention() {
     // Get current date
     const now = new Date();
     
     // Delete audit logs older than retention period
     await prisma.auditLog.deleteMany({
       where: {
         timestamp: {
           lt: new Date(now.setMonth(now.getMonth() - 6)) // 6 months retention
         }
       }
     });
     
     // Delete other data based on retention policies
     // ...
   }
   ```

2. **Implement Secure Data Deletion**
   ```typescript
   // Tenant offboarding process
   async function offboardTenant(tenantId) {
     // Backup tenant data for retention period
     await backupTenantData(tenantId);
     
     // Delete tenant data
     await prisma.$transaction([
       prisma.product.deleteMany({ where: { adminId: tenantId } }),
       prisma.order.deleteMany({ where: { adminId: tenantId } }),
       prisma.customer.deleteMany({ where: { adminId: tenantId } }),
       prisma.user.deleteMany({ where: { adminId: tenantId } }),
       prisma.admin.delete({ where: { id: tenantId } })
     ]);
     
     // Log tenant deletion
     await logSensitiveAction(
       'tenant.delete',
       'system',
       tenantId,
       { reason: 'tenant offboarding' }
     );
   }
   ```

## Vulnerability Management

### 1. Dependency Management

**Current State**: Basic dependency management.

**Recommendations**:

1. **Implement Automated Dependency Scanning**
   - Use GitHub Dependabot, Snyk, or similar tools
   - Regularly update dependencies to address vulnerabilities

2. **Implement Security Testing in CI/CD**
   - Add SAST and DAST tools to CI/CD pipeline
   - Block deployments with critical vulnerabilities

### 2. Security Response Plan

**Recommendations**:

1. **Create Security Incident Response Plan**
   - Define roles and responsibilities
   - Establish communication protocols
   - Create tenant notification procedures

2. **Implement Vulnerability Disclosure Policy**
   - Create a responsible disclosure program
   - Establish process for addressing reported vulnerabilities

## Conclusion

Implementing these security best practices will significantly enhance the security posture of the ecommerce-saas application. These recommendations should be prioritized based on risk assessment and implemented incrementally.

Regular security assessments and penetration testing should be conducted to identify and address new vulnerabilities as the application evolves.