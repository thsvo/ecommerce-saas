# API Design Best Practices for Multi-Tenant E-Commerce SaaS

## Overview

This document outlines best practices for designing, implementing, and maintaining APIs in the ecommerce-saas application, with a specific focus on multi-tenant architecture considerations. Following these guidelines will help ensure that the API is consistent, maintainable, secure, and performant across all tenant instances.

## API Architecture

### 1. RESTful API Design

**Current State**: Basic REST API implementation.

**Recommendations**:

1. **Consistent Resource Naming**
   - Use plural nouns for resource collections
   - Use kebab-case for multi-word resource names
   - Maintain consistent naming conventions

   ```
   # Good
   GET /api/products
   GET /api/product-categories
   
   # Avoid
   GET /api/getProducts
   GET /api/product_category
   ```

2. **Proper HTTP Method Usage**
   - Use appropriate HTTP methods for operations

   ```
   GET /api/products          # List products
   POST /api/products         # Create a product
   GET /api/products/{id}     # Get a specific product
   PUT /api/products/{id}     # Update a product (full update)
   PATCH /api/products/{id}   # Update a product (partial update)
   DELETE /api/products/{id}  # Delete a product
   ```

3. **Consistent Response Structure**
   - Standardize response formats across all endpoints

   ```json
   // Success response
   {
     "data": { ... },
     "meta": { ... }
   }
   
   // Error response
   {
     "error": {
       "code": "RESOURCE_NOT_FOUND",
       "message": "The requested product could not be found",
       "details": { ... }
     }
   }
   ```

### 2. API Versioning

**Current State**: No explicit API versioning.

**Recommendations**:

1. **Implement URL-Based Versioning**
   ```
   # Version 1
   GET /api/v1/products
   
   # Version 2
   GET /api/v2/products
   ```

2. **Implement Version Transition Strategy**
   - Support multiple versions simultaneously during transition periods
   - Provide deprecation notices and timelines
   - Document migration paths between versions

   ```typescript
   // Example of version routing in Express
   import express from 'express';
   import v1Routes from './v1/routes';
   import v2Routes from './v2/routes';
   
   const app = express();
   
   // Mount v1 routes
   app.use('/api/v1', (req, res, next) => {
     // Add deprecation warning header for v1
     res.setHeader('X-API-Warn', 'API v1 is deprecated and will be removed on 2023-12-31. Please migrate to v2.');
     next();
   }, v1Routes);
   
   // Mount v2 routes
   app.use('/api/v2', v2Routes);
   ```

## Multi-Tenant Considerations

### 1. Tenant Identification

**Current State**: Tenant identification via subdomain.

**Recommendations**:

1. **Support Multiple Tenant Identification Methods**
   ```typescript
   // Enhanced tenant identification middleware
   export async function identifyTenant(req, res, next) {
     // Try to identify tenant from multiple sources
     const tenantId = 
       req.headers['x-tenant-id'] || // Header-based identification
       req.subdomain ||              // Subdomain-based identification
       extractTenantFromPath(req.path); // Path-based identification
     
     if (!tenantId) {
       // For public endpoints, proceed without tenant context
       if (isPublicEndpoint(req.path)) {
         return next();
       }
       
       return res.status(400).json({
         error: {
           code: 'TENANT_REQUIRED',
           message: 'Tenant identification is required for this endpoint'
         }
       });
     }
     
     // Validate and set tenant context
     try {
       const tenant = await validateTenant(tenantId);
       req.tenant = tenant;
       req.adminId = tenant.id;
       next();
     } catch (error) {
       return res.status(400).json({
         error: {
           code: 'INVALID_TENANT',
           message: 'The specified tenant is invalid or inactive'
         }
       });
     }
   }
   ```

2. **Implement Tenant Context Propagation**
   ```typescript
   // Tenant context storage using async local storage
   import { AsyncLocalStorage } from 'async_hooks';
   
   const tenantContext = new AsyncLocalStorage();
   
   // Middleware to store tenant context
   export function withTenantContext(req, res, next) {
     if (!req.tenant) {
       return next();
     }
     
     // Store tenant context for the request lifecycle
     tenantContext.run({ tenant: req.tenant }, () => {
       next();
     });
   }
   
   // Helper to get current tenant context
   export function getCurrentTenant() {
     const store = tenantContext.getStore();
     return store?.tenant;
   }
   ```

### 2. Tenant-Specific Customization

**Current State**: Limited tenant-specific customization.

**Recommendations**:

1. **Implement Tenant Configuration Service**
   ```typescript
   // Tenant configuration service
   class TenantConfigService {
     private configCache = new Map();
     
     async getTenantConfig(tenantId) {
       // Check cache first
       if (this.configCache.has(tenantId)) {
         return this.configCache.get(tenantId);
       }
       
       // Fetch from database
       const config = await prisma.tenantConfig.findUnique({
         where: { tenantId }
       });
       
       // Cache result
       this.configCache.set(tenantId, config);
       
       return config;
     }
     
     async getConfigValue(tenantId, key, defaultValue = null) {
       const config = await this.getTenantConfig(tenantId);
       return config?.settings?.[key] ?? defaultValue;
     }
     
     // Clear cache for a specific tenant
     invalidateCache(tenantId) {
       this.configCache.delete(tenantId);
     }
   }
   ```

2. **Implement Feature Flags by Tenant**
   ```typescript
   // Feature flag middleware
   export function requireFeature(featureName) {
     return async (req, res, next) => {
       const tenant = req.tenant;
       
       if (!tenant) {
         return res.status(400).json({
           error: {
             code: 'TENANT_REQUIRED',
             message: 'Tenant context is required for this endpoint'
           }
         });
       }
       
       // Check if feature is enabled for this tenant
       const isEnabled = await tenantConfigService.getConfigValue(
         tenant.id,
         `features.${featureName}`,
         false
       );
       
       if (!isEnabled) {
         return res.status(403).json({
           error: {
             code: 'FEATURE_DISABLED',
             message: `The ${featureName} feature is not enabled for this tenant`
           }
         });
       }
       
       next();
     };
   }
   ```

## API Security

### 1. Authentication and Authorization

**Current State**: Basic JWT authentication.

**Recommendations**:

1. **Implement Role-Based Access Control (RBAC)**
   ```typescript
   // Role-based access control middleware
   export function requireRole(roles) {
     // Convert single role to array
     const requiredRoles = Array.isArray(roles) ? roles : [roles];
     
     return (req, res, next) => {
       // Check if user is authenticated
       if (!req.user) {
         return res.status(401).json({
           error: {
             code: 'AUTHENTICATION_REQUIRED',
             message: 'Authentication is required for this endpoint'
           }
         });
       }
       
       // Check if user has required role
       if (!requiredRoles.includes(req.user.role)) {
         return res.status(403).json({
           error: {
             code: 'INSUFFICIENT_PERMISSIONS',
             message: 'You do not have permission to access this resource'
           }
         });
       }
       
       next();
     };
   }
   ```

2. **Implement Permission-Based Access Control**
   ```typescript
   // Permission-based access control middleware
   export function requirePermission(permission) {
     return async (req, res, next) => {
       // Check if user is authenticated
       if (!req.user) {
         return res.status(401).json({
           error: {
             code: 'AUTHENTICATION_REQUIRED',
             message: 'Authentication is required for this endpoint'
           }
         });
       }
       
       // Get user permissions
       const userPermissions = await getUserPermissions(req.user.id, req.tenant.id);
       
       // Check if user has required permission
       if (!userPermissions.includes(permission)) {
         return res.status(403).json({
           error: {
             code: 'INSUFFICIENT_PERMISSIONS',
             message: `The ${permission} permission is required for this action`
           }
         });
       }
       
       next();
     };
   }
   ```

### 2. Input Validation

**Current State**: Basic input validation.

**Recommendations**:

1. **Implement Schema-Based Validation**
   ```typescript
   // Validation middleware using Zod
   import { z } from 'zod';
   
   export function validateRequest(schema) {
     return (req, res, next) => {
       try {
         // Validate request body
         const validated = schema.parse(req.body);
         
         // Replace request body with validated data
         req.body = validated;
         
         next();
       } catch (error) {
         return res.status(400).json({
           error: {
             code: 'VALIDATION_ERROR',
             message: 'The request data is invalid',
             details: error.errors
           }
         });
       }
     };
   }
   ```

2. **Implement Tenant-Specific Validation Rules**
   ```typescript
   // Product schema with tenant-specific validation
   export async function getProductSchema(tenantId) {
     // Get tenant configuration
     const config = await tenantConfigService.getTenantConfig(tenantId);
     
     // Base product schema
     let productSchema = z.object({
       name: z.string().min(1).max(100),
       price: z.number().positive(),
       description: z.string().max(1000).optional(),
     });
     
     // Add tenant-specific validation rules
     if (config.requiresSKU) {
       productSchema = productSchema.extend({
         sku: z.string().min(3).max(50)
       });
     }
     
     if (config.usesInventoryManagement) {
       productSchema = productSchema.extend({
         stock: z.number().int().nonnegative()
       });
     }
     
     return productSchema;
   }
   
   // Middleware for tenant-specific validation
   export function validateTenantSpecific(schemaFactory) {
     return async (req, res, next) => {
       try {
         // Get tenant-specific schema
         const schema = await schemaFactory(req.tenant.id);
         
         // Validate request body
         const validated = schema.parse(req.body);
         
         // Replace request body with validated data
         req.body = validated;
         
         next();
       } catch (error) {
         return res.status(400).json({
           error: {
             code: 'VALIDATION_ERROR',
             message: 'The request data is invalid',
             details: error.errors
           }
         });
       }
     };
   }
   ```

## API Performance

### 1. Pagination and Filtering

**Current State**: Basic pagination implementation.

**Recommendations**:

1. **Implement Cursor-Based Pagination**
   ```typescript
   // Cursor-based pagination helper
   async function paginateResults(model, query, cursorField, cursorValue, limit) {
     // Build cursor condition
     const cursorCondition = cursorValue
       ? {
           [cursorField]: {
             lt: cursorValue // For descending order
           }
         }
       : {};
     
     // Merge cursor condition with query
     const whereCondition = {
       ...query,
       ...cursorCondition
     };
     
     // Fetch one more item than requested to determine if there are more results
     const items = await prisma[model].findMany({
       where: whereCondition,
       orderBy: {
         [cursorField]: 'desc'
       },
       take: limit + 1
     });
     
     // Check if there are more results
     const hasMore = items.length > limit;
     
     // Remove the extra item if there are more results
     if (hasMore) {
       items.pop();
     }
     
     // Get the cursor value for the next page
     const nextCursor = hasMore ? items[items.length - 1][cursorField] : null;
     
     return {
       items,
       pagination: {
         hasMore,
         nextCursor
       }
     };
   }
   ```

2. **Implement Efficient Filtering**
   ```typescript
   // Convert query parameters to Prisma filter
   function buildFilterCondition(filters, allowedFields) {
     const condition = {};
     
     // Process each filter
     for (const [key, value] of Object.entries(filters)) {
       // Skip if field is not allowed
       if (!allowedFields.includes(key)) {
         continue;
       }
       
       // Handle special operators
       if (key.includes('.')) {
         const [field, operator] = key.split('.');
         
         // Skip if field is not allowed
         if (!allowedFields.includes(field)) {
           continue;
         }
         
         // Initialize field condition if not exists
         condition[field] = condition[field] || {};
         
         // Add operator condition
         switch (operator) {
           case 'gt':
             condition[field].gt = parseFloat(value);
             break;
           case 'gte':
             condition[field].gte = parseFloat(value);
             break;
           case 'lt':
             condition[field].lt = parseFloat(value);
             break;
           case 'lte':
             condition[field].lte = parseFloat(value);
             break;
           case 'contains':
             condition[field].contains = value;
             break;
           case 'startsWith':
             condition[field].startsWith = value;
             break;
           case 'endsWith':
             condition[field].endsWith = value;
             break;
         }
       } else {
         // Simple equality filter
         condition[key] = value;
       }
     }
     
     return condition;
   }
   ```

### 2. Caching

**Current State**: Limited caching implementation.

**Recommendations**:

1. **Implement Response Caching**
   ```typescript
   // Response caching middleware
   import NodeCache from 'node-cache';
   
   // Create cache instance
   const apiCache = new NodeCache({ stdTTL: 300 }); // 5 minutes default TTL
   
   // Caching middleware
   export function cacheResponse(ttl = 300) {
     return (req, res, next) => {
       // Skip caching for non-GET requests
       if (req.method !== 'GET') {
         return next();
       }
       
       // Generate cache key
       const cacheKey = generateCacheKey(req);
       
       // Check if response is cached
       const cachedResponse = apiCache.get(cacheKey);
       
       if (cachedResponse) {
         // Return cached response
         return res.status(200).json(cachedResponse);
       }
       
       // Store original json method
       const originalJson = res.json;
       
       // Override json method to cache response
       res.json = function(data) {
         // Cache response
         apiCache.set(cacheKey, data, ttl);
         
         // Call original json method
         return originalJson.call(this, data);
       };
       
       next();
     };
   }
   
   // Generate cache key from request
   function generateCacheKey(req) {
     const tenantId = req.tenant?.id || 'public';
     const path = req.originalUrl || req.url;
     
     return `${tenantId}:${path}`;
   }
   ```

2. **Implement Cache Invalidation**
   ```typescript
   // Cache invalidation helper
   export function invalidateCache(pattern) {
     // Get all cache keys
     const keys = apiCache.keys();
     
     // Filter keys by pattern
     const matchingKeys = keys.filter(key => key.includes(pattern));
     
     // Delete matching keys
     matchingKeys.forEach(key => apiCache.del(key));
     
     return matchingKeys.length;
   }
   
   // Example usage in product update endpoint
   app.put('/api/products/:id', async (req, res) => {
     // Update product
     const product = await updateProduct(req.params.id, req.body);
     
     // Invalidate related caches
     invalidateCache(`${req.tenant.id}:products`);
     invalidateCache(`${req.tenant.id}:products/${req.params.id}`);
     
     res.json({ data: product });
   });
   ```

## API Documentation

### 1. OpenAPI Specification

**Current State**: Limited API documentation.

**Recommendations**:

1. **Implement OpenAPI Documentation**
   ```typescript
   // Using swagger-jsdoc and swagger-ui-express
   import swaggerJsdoc from 'swagger-jsdoc';
   import swaggerUi from 'swagger-ui-express';
   
   // OpenAPI specification options
   const options = {
     definition: {
       openapi: '3.0.0',
       info: {
         title: 'E-Commerce SaaS API',
         version: '1.0.0',
         description: 'API documentation for the E-Commerce SaaS platform',
       },
       servers: [
         {
           url: 'https://{tenant}.example.com/api/v1',
           variables: {
             tenant: {
               default: 'demo',
               description: 'Tenant subdomain',
             },
           },
         },
       ],
       components: {
         securitySchemes: {
           bearerAuth: {
             type: 'http',
             scheme: 'bearer',
             bearerFormat: 'JWT',
           },
         },
       },
       security: [
         {
           bearerAuth: [],
         },
       ],
     },
     apis: ['./routes/*.js', './controllers/*.js'], // Path to the API docs
   };
   
   // Initialize swagger-jsdoc
   const openapiSpecification = swaggerJsdoc(options);
   
   // Serve OpenAPI UI
   app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpecification));
   ```

2. **Document API Endpoints with JSDoc**
   ```typescript
   /**
    * @openapi
    * /products:
    *   get:
    *     summary: Get a list of products
    *     description: Retrieve a list of products for the current tenant
    *     tags: [Products]
    *     parameters:
    *       - in: query
    *         name: limit
    *         schema:
    *           type: integer
    *           default: 20
    *         description: Maximum number of products to return
    *       - in: query
    *         name: cursor
    *         schema:
    *           type: string
    *         description: Cursor for pagination
    *     responses:
    *       200:
    *         description: A list of products
    *         content:
    *           application/json:
    *             schema:
    *               type: object
    *               properties:
    *                 data:
    *                   type: array
    *                   items:
    *                     $ref: '#/components/schemas/Product'
    *                 pagination:
    *                   type: object
    *                   properties:
    *                     hasMore:
    *                       type: boolean
    *                     nextCursor:
    *                       type: string
    *       401:
    *         $ref: '#/components/responses/Unauthorized'
    *       403:
    *         $ref: '#/components/responses/Forbidden'
    */
   app.get('/api/products', requireAuth, async (req, res) => {
     // Implementation
   });
   ```

## Error Handling

### 1. Standardized Error Responses

**Current State**: Inconsistent error handling.

**Recommendations**:

1. **Implement Error Response Structure**
   ```typescript
   // Error response helper
   function errorResponse(res, status, code, message, details = null) {
     return res.status(status).json({
       error: {
         code,
         message,
         ...(details && { details })
       }
     });
   }
   
   // Usage examples
   function notFound(res, resource = 'Resource') {
     return errorResponse(res, 404, 'NOT_FOUND', `${resource} not found`);
   }
   
   function unauthorized(res, message = 'Authentication required') {
     return errorResponse(res, 401, 'UNAUTHORIZED', message);
   }
   
   function forbidden(res, message = 'Insufficient permissions') {
     return errorResponse(res, 403, 'FORBIDDEN', message);
   }
   
   function badRequest(res, message, details = null) {
     return errorResponse(res, 400, 'BAD_REQUEST', message, details);
   }
   
   function serverError(res, error) {
     // Log the error
     console.error('Server error:', error);
     
     // Return generic error in production
     const message = process.env.NODE_ENV === 'production'
       ? 'An unexpected error occurred'
       : error.message;
     
     return errorResponse(res, 500, 'SERVER_ERROR', message);
   }
   ```

2. **Implement Global Error Handler**
   ```typescript
   // Global error handler middleware
   function errorHandler(err, req, res, next) {
     // Handle specific error types
     if (err.name === 'ValidationError') {
       return badRequest(res, 'Validation error', err.details);
     }
     
     if (err.name === 'UnauthorizedError') {
       return unauthorized(res);
     }
     
     if (err.name === 'NotFoundError') {
       return notFound(res, err.resource);
     }
     
     // Handle unexpected errors
     return serverError(res, err);
   }
   
   // Add to Express app
   app.use(errorHandler);
   ```

## API Testing

### 1. Automated Testing

**Current State**: Limited API testing.

**Recommendations**:

1. **Implement Unit Tests for API Logic**
   ```typescript
   // Example unit test for product service
   import { expect } from 'chai';
   import sinon from 'sinon';
   import { createProduct } from '../services/productService';
   
   describe('Product Service', () => {
     describe('createProduct', () => {
       it('should create a product with valid data', async () => {
         // Arrange
         const productData = {
           name: 'Test Product',
           price: 99.99,
           description: 'A test product'
         };
         
         const tenantId = 'test-tenant';
         
         const prismaStub = sinon.stub().resolves({
           id: '123',
           ...productData,
           adminId: tenantId,
           createdAt: new Date()
         });
         
         // Act
         const result = await createProduct(productData, tenantId, { create: prismaStub });
         
         // Assert
         expect(result).to.have.property('id', '123');
         expect(result).to.have.property('name', 'Test Product');
         expect(result).to.have.property('adminId', tenantId);
         expect(prismaStub.calledOnce).to.be.true;
       });
     });
   });
   ```

2. **Implement Integration Tests for API Endpoints**
   ```typescript
   // Example integration test for product API
   import request from 'supertest';
   import { expect } from 'chai';
   import app from '../app';
   import { generateTestToken } from './helpers';
   
   describe('Product API', () => {
     describe('GET /api/products', () => {
       it('should return products for authenticated tenant', async () => {
         // Arrange
         const token = generateTestToken('test-tenant');
         
         // Act
         const response = await request(app)
           .get('/api/products')
           .set('Authorization', `Bearer ${token}`);
         
         // Assert
         expect(response.status).to.equal(200);
         expect(response.body).to.have.property('data');
         expect(response.body.data).to.be.an('array');
       });
       
       it('should return 401 for unauthenticated request', async () => {
         // Act
         const response = await request(app).get('/api/products');
         
         // Assert
         expect(response.status).to.equal(401);
         expect(response.body).to.have.property('error');
         expect(response.body.error).to.have.property('code', 'UNAUTHORIZED');
       });
     });
   });
   ```

### 2. Tenant-Specific Testing

**Recommendations**:

1. **Implement Multi-Tenant Test Environment**
   ```typescript
   // Test helper for tenant-specific tests
   export function createTenantContext(tenantId, userRole = 'admin') {
     // Create test token
     const token = generateTestToken(tenantId, userRole);
     
     // Return request helper
     return {
       get: (url) => request(app)
         .get(url)
         .set('Authorization', `Bearer ${token}`)
         .set('X-Tenant-ID', tenantId),
       
       post: (url, data) => request(app)
         .post(url)
         .send(data)
         .set('Authorization', `Bearer ${token}`)
         .set('X-Tenant-ID', tenantId),
       
       put: (url, data) => request(app)
         .put(url)
         .send(data)
         .set('Authorization', `Bearer ${token}`)
         .set('X-Tenant-ID', tenantId),
       
       delete: (url) => request(app)
         .delete(url)
         .set('Authorization', `Bearer ${token}`)
         .set('X-Tenant-ID', tenantId)
     };
   }
   
   // Usage in tests
   describe('Multi-Tenant Product API', () => {
     it('should isolate products between tenants', async () => {
       // Arrange
       const tenant1 = createTenantContext('tenant-1');
       const tenant2 = createTenantContext('tenant-2');
       
       // Create product for tenant 1
       const createResponse = await tenant1.post('/api/products', {
         name: 'Tenant 1 Product',
         price: 99.99
       });
       
       expect(createResponse.status).to.equal(201);
       const productId = createResponse.body.data.id;
       
       // Tenant 1 should be able to access the product
       const tenant1GetResponse = await tenant1.get(`/api/products/${productId}`);
       expect(tenant1GetResponse.status).to.equal(200);
       
       // Tenant 2 should not be able to access the product
       const tenant2GetResponse = await tenant2.get(`/api/products/${productId}`);
       expect(tenant2GetResponse.status).to.equal(404);
     });
   });
   ```

## Conclusion

Implementing these API design best practices will significantly improve the consistency, maintainability, security, and performance of the ecommerce-saas application's API. These recommendations should be prioritized based on current pain points and implemented incrementally.

Regular API reviews and testing should be conducted to ensure the API continues to meet these standards as the application evolves.