# Testing Best Practices for Multi-Tenant E-Commerce SaaS

## Overview

This document outlines testing best practices for the ecommerce-saas application, with a specific focus on multi-tenant architecture considerations. Implementing these recommendations will help ensure the application is reliable, secure, and performs well across all tenant instances.

## Test Strategy

### 1. Multi-Tenant Test Approach

**Current State**: Limited tenant-specific testing.

**Recommendations**:

1. **Define Tenant Personas**
   - Create test personas for different tenant types
   - Define usage patterns and requirements for each persona
   ```javascript
   // Example tenant personas
   const tenantPersonas = {
     enterprise: {
       name: 'Enterprise Retail',
       subdomain: 'enterprise-test',
       features: ['inventory-management', 'advanced-analytics', 'multi-user'],
       dataVolume: 'high',
       concurrentUsers: 50,
       customizations: ['custom-checkout', 'branded-emails']
     },
     smallBusiness: {
       name: 'Small Business',
       subdomain: 'small-business-test',
       features: ['basic-inventory', 'simple-analytics'],
       dataVolume: 'medium',
       concurrentUsers: 10,
       customizations: []
     },
     soloEntrepreneur: {
       name: 'Solo Entrepreneur',
       subdomain: 'solo-test',
       features: ['basic-store'],
       dataVolume: 'low',
       concurrentUsers: 2,
       customizations: []
     }
   };
   ```

2. **Implement Tenant-Specific Test Environments**
   - Create isolated test environments for each tenant persona
   - Implement data seeding for tenant-specific scenarios
   ```javascript
   // Test environment setup for tenant
   async function setupTenantTestEnvironment(persona) {
     // Create test tenant
     const tenant = await prisma.admin.create({
       data: {
         name: persona.name,
         subdomain: persona.subdomain,
         email: `test@${persona.subdomain}.example.com`,
         password: await bcrypt.hash('test-password', 10),
         features: persona.features
       }
     });
     
     // Seed tenant-specific data
     await seedTenantData(tenant.id, persona.dataVolume);
     
     // Apply tenant customizations
     await applyTenantCustomizations(tenant.id, persona.customizations);
     
     return tenant;
   }
   ```

### 2. Test Coverage Strategy

**Current State**: Limited test coverage.

**Recommendations**:

1. **Define Test Coverage Goals**
   - Set minimum coverage requirements for different code types
   - Prioritize coverage for tenant-specific code paths
   ```javascript
   // Jest coverage configuration in jest.config.js
   module.exports = {
     // ...
     coverageThreshold: {
       global: {
         statements: 80,
         branches: 75,
         functions: 80,
         lines: 80
       },
       './src/middleware/': {
         statements: 90,
         branches: 85,
         functions: 90,
         lines: 90
       },
       './src/api/auth/': {
         statements: 95,
         branches: 90,
         functions: 95,
         lines: 95
       }
     }
   };
   ```

2. **Implement Test Categorization**
   - Categorize tests by tenant impact
   - Prioritize tests that affect all tenants
   ```javascript
   // Test categorization with Jest tags
   describe('Product API', () => {
     // Test that affects all tenants
     it.each(['enterprise', 'smallBusiness', 'soloEntrepreneur'])(
       'should create product for %s tenant',
       async (personaKey) => {
         // Test implementation
       }
     );
     
     // Test for specific tenant feature
     it('should support inventory management for enterprise tenant', async () => {
       // Test implementation
     }, 10000);
   });
   ```

## Unit Testing

### 1. Tenant-Aware Unit Testing

**Current State**: Basic unit tests without tenant context.

**Recommendations**:

1. **Implement Tenant Context Mocking**
   ```javascript
   // Tenant context mock for unit tests
   function mockTenantContext(tenantId) {
     // Mock AsyncLocalStorage for tenant context
     jest.mock('../utils/tenantContext', () => ({
       getCurrentTenant: jest.fn().mockReturnValue({ id: tenantId }),
       withTenantContext: (tenantId, fn) => fn()
     }));
     
     // Mock request object with tenant context
     const req = {
       tenant: { id: tenantId },
       adminId: tenantId
     };
     
     return req;
   }
   
   // Usage in test
   test('product service should filter by tenant', async () => {
     const tenantId = 'test-tenant-1';
     mockTenantContext(tenantId);
     
     // Mock database response
     prisma.product.findMany.mockResolvedValue([{ id: 'prod1', name: 'Test Product', adminId: tenantId }]);
     
     // Call service
     const products = await productService.getProducts();
     
     // Verify tenant filter was applied
     expect(prisma.product.findMany).toHaveBeenCalledWith(
       expect.objectContaining({
         where: expect.objectContaining({
           adminId: tenantId
         })
       })
     );
   });
   ```

2. **Test Tenant Isolation Logic**
   ```javascript
   // Test tenant data isolation
   test('middleware should enforce tenant isolation', async () => {
     // Setup test tenants
     const tenant1 = { id: 'tenant-1', subdomain: 'tenant1' };
     const tenant2 = { id: 'tenant-2', subdomain: 'tenant2' };
     
     // Mock request for tenant 1 trying to access tenant 2's data
     const req = {
       tenant: tenant1,
       adminId: tenant1.id,
       params: {
         productId: 'product-from-tenant2'
       }
     };
     
     const res = {
       status: jest.fn().mockReturnThis(),
       json: jest.fn()
     };
     
     const next = jest.fn();
     
     // Mock database to return product belonging to tenant 2
     prisma.product.findUnique.mockResolvedValue({
       id: 'product-from-tenant2',
       name: 'Tenant 2 Product',
       adminId: tenant2.id
     });
     
     // Call middleware
     await tenantIsolationMiddleware(req, res, next);
     
     // Verify tenant isolation is enforced
     expect(next).not.toHaveBeenCalled();
     expect(res.status).toHaveBeenCalledWith(403);
     expect(res.json).toHaveBeenCalledWith(
       expect.objectContaining({
         error: expect.stringContaining('access denied')
       })
     );
   });
   ```

### 2. Service Layer Testing

**Recommendations**:

1. **Test Service Layer with Tenant Context**
   ```javascript
   // Test product service with tenant context
   describe('Product Service', () => {
     beforeEach(() => {
       // Reset mocks
       jest.clearAllMocks();
     });
     
     test('createProduct should add tenant ID to product data', async () => {
       // Setup
       const tenantId = 'test-tenant';
       const productData = {
         name: 'Test Product',
         price: 99.99,
         description: 'A test product'
       };
       
       // Mock prisma create method
       prisma.product.create.mockResolvedValue({
         id: 'new-product-id',
         ...productData,
         adminId: tenantId
       });
       
       // Call service method with tenant context
       const result = await productService.createProduct(productData, tenantId);
       
       // Assertions
       expect(prisma.product.create).toHaveBeenCalledWith({
         data: {
           ...productData,
           adminId: tenantId
         }
       });
       
       expect(result).toHaveProperty('id', 'new-product-id');
       expect(result).toHaveProperty('adminId', tenantId);
     });
   });
   ```

2. **Test Tenant-Specific Business Logic**
   ```javascript
   // Test tenant-specific pricing logic
   test('pricing service should apply tenant-specific rules', async () => {
     // Setup tenant with specific pricing rules
     const tenantId = 'test-tenant';
     const tenantConfig = {
       pricingRules: {
         applyDiscount: true,
         discountRate: 0.1,
         minimumOrderValue: 50
       }
     };
     
     // Mock tenant config retrieval
     tenantConfigService.getTenantConfig.mockResolvedValue(tenantConfig);
     
     // Test order data
     const orderData = {
       items: [
         { productId: 'prod1', quantity: 2, unitPrice: 30 }
       ]
     };
     
     // Call pricing service
     const pricingResult = await pricingService.calculateOrderPricing(orderData, tenantId);
     
     // Verify tenant-specific rules were applied
     expect(pricingResult).toHaveProperty('subtotal', 60);
     expect(pricingResult).toHaveProperty('discount', 6); // 10% of 60
     expect(pricingResult).toHaveProperty('total', 54);
   });
   ```

## Integration Testing

### 1. API Integration Testing

**Current State**: Limited API testing.

**Recommendations**:

1. **Implement Tenant-Specific API Tests**
   ```javascript
   // Using supertest for API testing
   const request = require('supertest');
   const app = require('../app');
   
   describe('Product API (Integration)', () => {
     // Setup test tenants before tests
     let tenants = {};
     
     beforeAll(async () => {
       // Create test tenants
       tenants.enterprise = await setupTestTenant('enterprise-test');
       tenants.small = await setupTestTenant('small-test');
       
       // Generate auth tokens
       tenants.enterprise.token = generateAuthToken(tenants.enterprise.id);
       tenants.small.token = generateAuthToken(tenants.small.id);
     });
     
     test('GET /api/products should return tenant-specific products', async () => {
       // Create test products for each tenant
       await createTestProduct(tenants.enterprise.id, 'Enterprise Product');
       await createTestProduct(tenants.small.id, 'Small Business Product');
       
       // Test enterprise tenant
       const enterpriseResponse = await request(app)
         .get('/api/products')
         .set('Authorization', `Bearer ${tenants.enterprise.token}`)
         .set('x-tenant-id', tenants.enterprise.id);
       
       expect(enterpriseResponse.status).toBe(200);
       expect(enterpriseResponse.body.data).toEqual(
         expect.arrayContaining([
           expect.objectContaining({ name: 'Enterprise Product' })
         ])
       );
       expect(enterpriseResponse.body.data).not.toEqual(
         expect.arrayContaining([
           expect.objectContaining({ name: 'Small Business Product' })
         ])
       );
       
       // Test small business tenant
       const smallResponse = await request(app)
         .get('/api/products')
         .set('Authorization', `Bearer ${tenants.small.token}`)
         .set('x-tenant-id', tenants.small.id);
       
       expect(smallResponse.status).toBe(200);
       expect(smallResponse.body.data).toEqual(
         expect.arrayContaining([
           expect.objectContaining({ name: 'Small Business Product' })
         ])
       );
       expect(smallResponse.body.data).not.toEqual(
         expect.arrayContaining([
           expect.objectContaining({ name: 'Enterprise Product' })
         ])
       );
     });
   });
   ```

2. **Test Tenant Subdomain Routing**
   ```javascript
   // Test subdomain routing
   describe('Subdomain Routing', () => {
     test('requests to tenant subdomain should set tenant context', async () => {
       // Setup mock tenant
       const tenant = {
         id: 'test-tenant',
         subdomain: 'test-store'
       };
       
       // Mock database to return tenant
       prisma.admin.findUnique.mockResolvedValue(tenant);
       
       // Create mock request with subdomain
       const req = {
         headers: {
           host: 'test-store.example.com'
         },
         url: '/api/products'
       };
       
       const res = {
         setHeader: jest.fn()
       };
       
       const next = jest.fn();
       
       // Call middleware
       await subdomainMiddleware(req, res, next);
       
       // Verify tenant context was set
       expect(req).toHaveProperty('subdomain', 'test-store');
       expect(req).toHaveProperty('adminId', 'test-tenant');
       expect(next).toHaveBeenCalled();
     });
   });
   ```

### 2. Database Integration Testing

**Recommendations**:

1. **Test Database Queries with Tenant Context**
   ```javascript
   // Test database queries with tenant isolation
   describe('Database Integration', () => {
     // Setup test database
     beforeAll(async () => {
       // Connect to test database
       await prisma.$connect();
       
       // Clean up existing data
       await prisma.$transaction([
         prisma.product.deleteMany(),
         prisma.admin.deleteMany()
       ]);
     });
     
     afterAll(async () => {
       // Disconnect from test database
       await prisma.$disconnect();
     });
     
     test('queries should respect tenant isolation', async () => {
       // Create test tenants
       const tenant1 = await prisma.admin.create({
         data: {
           name: 'Test Tenant 1',
           subdomain: 'test1',
           email: 'test1@example.com',
           password: 'hashed-password'
         }
       });
       
       const tenant2 = await prisma.admin.create({
         data: {
           name: 'Test Tenant 2',
           subdomain: 'test2',
           email: 'test2@example.com',
           password: 'hashed-password'
         }
       });
       
       // Create products for each tenant
       await prisma.product.createMany({
         data: [
           { name: 'Tenant 1 Product', price: 10, adminId: tenant1.id },
           { name: 'Tenant 2 Product', price: 20, adminId: tenant2.id }
         ]
       });
       
       // Query with tenant 1 context
       const tenant1Products = await prisma.product.findMany({
         where: { adminId: tenant1.id }
       });
       
       expect(tenant1Products).toHaveLength(1);
       expect(tenant1Products[0]).toHaveProperty('name', 'Tenant 1 Product');
       
       // Query with tenant 2 context
       const tenant2Products = await prisma.product.findMany({
         where: { adminId: tenant2.id }
       });
       
       expect(tenant2Products).toHaveLength(1);
       expect(tenant2Products[0]).toHaveProperty('name', 'Tenant 2 Product');
     });
   });
   ```

2. **Test Tenant Data Migration**
   ```javascript
   // Test tenant data migration
   test('tenant data migration should preserve data integrity', async () => {
     // Create source tenant with data
     const sourceTenant = await createTestTenantWithData('source-tenant');
     
     // Create target tenant
     const targetTenant = await prisma.admin.create({
       data: {
         name: 'Target Tenant',
         subdomain: 'target-tenant',
         email: 'target@example.com',
         password: 'hashed-password'
       }
     });
     
     // Perform data migration
     await tenantMigrationService.migrateTenantData(sourceTenant.id, targetTenant.id);
     
     // Verify data was migrated correctly
     const sourceProducts = await prisma.product.findMany({
       where: { adminId: sourceTenant.id }
     });
     
     const targetProducts = await prisma.product.findMany({
       where: { adminId: targetTenant.id }
     });
     
     // Check product counts match
     expect(targetProducts.length).toBe(sourceProducts.length);
     
     // Check product data was migrated correctly
     for (const sourceProduct of sourceProducts) {
       const targetProduct = targetProducts.find(p => p.name === sourceProduct.name);
       expect(targetProduct).toBeDefined();
       expect(targetProduct.price).toBe(sourceProduct.price);
       expect(targetProduct.adminId).toBe(targetTenant.id);
     }
   });
   ```

## End-to-End Testing

### 1. Multi-Tenant E2E Testing

**Current State**: Limited E2E testing.

**Recommendations**:

1. **Implement Tenant-Specific E2E Tests**
   ```javascript
   // Using Cypress for E2E testing
   describe('Multi-Tenant E2E', () => {
     // Test different tenant experiences
     ['enterprise', 'small-business', 'solo'].forEach(tenantType => {
       describe(`${tenantType} tenant experience`, () => {
         beforeEach(() => {
           // Set up tenant-specific test data
           cy.task('setupTestTenant', { type: tenantType });
           
           // Visit tenant-specific subdomain
           cy.visit(`https://${tenantType}-test.localhost:3000`);
         });
         
         it('should show tenant-specific branding', () => {
           // Verify tenant branding is displayed
           cy.get('.tenant-logo').should('be.visible');
           cy.get('.tenant-name').should('contain', tenantConfig[tenantType].name);
         });
         
         it('should show tenant-specific features', () => {
           // Log in as tenant admin
           cy.login(tenantConfig[tenantType].adminEmail, 'test-password');
           
           // Verify tenant-specific features are available
           cy.get('.admin-dashboard').should('be.visible');
           
           // Check for tenant-specific features
           if (tenantType === 'enterprise') {
             cy.get('.advanced-analytics').should('be.visible');
             cy.get('.inventory-management').should('be.visible');
           } else if (tenantType === 'small-business') {
             cy.get('.basic-analytics').should('be.visible');
             cy.get('.inventory-management').should('be.visible');
             cy.get('.advanced-analytics').should('not.exist');
           } else {
             cy.get('.basic-analytics').should('be.visible');
             cy.get('.inventory-management').should('not.exist');
             cy.get('.advanced-analytics').should('not.exist');
           }
         });
       });
     });
   });
   ```

2. **Test Tenant Onboarding Flow**
   ```javascript
   // Test tenant onboarding flow
   describe('Tenant Onboarding', () => {
     beforeEach(() => {
       // Visit signup page
       cy.visit('/signup');
     });
     
     it('should allow creating a new tenant', () => {
       // Fill out signup form
       cy.get('#business-name').type('Test Store');
       cy.get('#subdomain').type('test-store');
       cy.get('#email').type('admin@test-store.com');
       cy.get('#password').type('secure-password');
       cy.get('#confirm-password').type('secure-password');
       
       // Submit form
       cy.get('button[type="submit"]').click();
       
       // Verify success and redirect to onboarding
       cy.url().should('include', '/onboarding');
       
       // Complete onboarding steps
       cy.get('#store-category').select('Electronics');
       cy.get('#store-currency').select('USD');
       cy.get('button.next-step').click();
       
       // Upload logo
       cy.get('input[type="file"]').attachFile('test-logo.png');
       cy.get('button.next-step').click();
       
       // Set up payment methods
       cy.get('#enable-stripe').check();
       cy.get('#stripe-api-key').type('test-stripe-key');
       cy.get('button.complete-setup').click();
       
       // Verify redirect to admin dashboard
       cy.url().should('include', '/admin/dashboard');
       
       // Verify tenant was created correctly
       cy.request('/api/tenant/info').then(response => {
         expect(response.status).to.eq(200);
         expect(response.body.data).to.have.property('name', 'Test Store');
         expect(response.body.data).to.have.property('subdomain', 'test-store');
       });
     });
   });
   ```

### 2. Cross-Tenant Testing

**Recommendations**:

1. **Test Tenant Isolation**
   ```javascript
   // Test tenant data isolation
   describe('Tenant Isolation', () => {
     // Create test tenants and data
     before(() => {
       // Create tenant 1 with products
       cy.task('createTestTenant', { subdomain: 'tenant1' });
       cy.task('createTestProducts', { 
         tenantId: 'tenant1',
         products: [
           { name: 'Tenant 1 Product 1', price: 10 },
           { name: 'Tenant 1 Product 2', price: 20 }
         ]
       });
       
       // Create tenant 2 with products
       cy.task('createTestTenant', { subdomain: 'tenant2' });
       cy.task('createTestProducts', { 
         tenantId: 'tenant2',
         products: [
           { name: 'Tenant 2 Product 1', price: 30 },
           { name: 'Tenant 2 Product 2', price: 40 }
         ]
       });
     });
     
     it('should not allow access to another tenant\'s data', () => {
       // Log in as tenant 1 admin
       cy.visit('https://tenant1.localhost:3000/admin');
       cy.login('admin@tenant1.com', 'test-password');
       
       // Verify tenant 1 can see their products
       cy.visit('https://tenant1.localhost:3000/admin/products');
       cy.get('.product-item').should('have.length', 2);
       cy.get('.product-item').should('contain', 'Tenant 1 Product 1');
       cy.get('.product-item').should('contain', 'Tenant 1 Product 2');
       
       // Try to access tenant 2's admin area
       cy.visit('https://tenant2.localhost:3000/admin', { failOnStatusCode: false });
       
       // Verify access is denied
       cy.get('.error-message').should('contain', 'Access denied');
       
       // Try to access tenant 2's API directly
       cy.request({
         url: 'https://tenant2.localhost:3000/api/products',
         failOnStatusCode: false
       }).then(response => {
         expect(response.status).to.eq(401);
       });
     });
   });
   ```

2. **Test Shared Infrastructure**
   ```javascript
   // Test shared infrastructure components
   describe('Shared Infrastructure', () => {
     it('should handle multiple tenant requests concurrently', () => {
       // Create array of tenant subdomains
       const tenants = ['tenant1', 'tenant2', 'tenant3', 'tenant4', 'tenant5'];
       
       // Create promises for concurrent requests
       const requests = tenants.map(tenant => {
         return cy.request(`https://${tenant}.localhost:3000/api/products`)
           .then(response => {
             // Verify response is tenant-specific
             expect(response.status).to.eq(200);
             expect(response.body).to.have.property('data');
             
             // Verify tenant ID in response
             expect(response.body).to.have.property('tenantId', tenant);
             
             return response;
           });
       });
       
       // Wait for all requests to complete
       return Promise.all(requests);
     });
   });
   ```

## Performance Testing

### 1. Tenant-Specific Load Testing

**Current State**: Limited performance testing.

**Recommendations**:

1. **Implement Tenant-Specific Load Tests**
   ```javascript
   // Using k6 for load testing
   import http from 'k6/http';
   import { check, sleep } from 'k6';
   
   export const options = {
     scenarios: {
       // Simulate enterprise tenant load
       enterprise: {
         executor: 'ramping-vus',
         startVUs: 0,
         stages: [
           { duration: '1m', target: 50 }, // Ramp up to 50 users
           { duration: '3m', target: 50 }, // Stay at 50 users
           { duration: '1m', target: 0 }   // Ramp down to 0 users
         ],
         env: { TENANT: 'enterprise-test' }
       },
       // Simulate small business tenant load
       smallBusiness: {
         executor: 'ramping-vus',
         startVUs: 0,
         stages: [
           { duration: '1m', target: 10 }, // Ramp up to 10 users
           { duration: '3m', target: 10 }, // Stay at 10 users
           { duration: '1m', target: 0 }   // Ramp down to 0 users
         ],
         env: { TENANT: 'small-business-test' }
       }
     }
   };
   
   export default function() {
     const tenant = __ENV.TENANT;
     const baseUrl = `https://${tenant}.example.com`;
     
     // Get product listing
     const productsResponse = http.get(`${baseUrl}/api/products`);
     check(productsResponse, {
       'products status is 200': (r) => r.status === 200,
       'products response time < 200ms': (r) => r.timings.duration < 200
     });
     
     // Get product details
     const productId = JSON.parse(productsResponse.body).data[0]?.id;
     if (productId) {
       const productResponse = http.get(`${baseUrl}/api/products/${productId}`);
       check(productResponse, {
         'product status is 200': (r) => r.status === 200,
         'product response time < 150ms': (r) => r.timings.duration < 150
       });
     }
     
     // Simulate user browsing behavior
     sleep(Math.random() * 3 + 1); // Random sleep between 1-4 seconds
   }
   ```

2. **Test Tenant Resource Isolation**
   ```javascript
   // Test resource isolation between tenants
   import http from 'k6/http';
   import { check, sleep } from 'k6';
   
   export const options = {
     scenarios: {
       // High load on one tenant
       highLoadTenant: {
         executor: 'constant-vus',
         vus: 50,
         duration: '2m',
         env: { TENANT: 'high-load-tenant' }
       },
       // Normal load on another tenant
       normalTenant: {
         executor: 'constant-vus',
         vus: 5,
         duration: '2m',
         env: { TENANT: 'normal-tenant' }
       }
     }
   };
   
   export default function() {
     const tenant = __ENV.TENANT;
     const baseUrl = `https://${tenant}.example.com`;
     
     // Make API requests
     const response = http.get(`${baseUrl}/api/products`);
     
     // Check response time based on tenant
     if (tenant === 'high-load-tenant') {
       check(response, {
         'high load tenant response time < 500ms': (r) => r.timings.duration < 500
       });
     } else {
       check(response, {
         'normal tenant response time < 200ms': (r) => r.timings.duration < 200
       });
     }
     
     sleep(1);
   }
   ```

### 2. Database Performance Testing

**Recommendations**:

1. **Test Database Query Performance by Tenant Size**
   ```javascript
   // Test database performance with different tenant sizes
   describe('Database Performance', () => {
     // Setup test tenants with different data volumes
     before(async () => {
       // Small tenant (100 products)
       await setupTestTenant('small-tenant', 100);
       
       // Medium tenant (1,000 products)
       await setupTestTenant('medium-tenant', 1000);
       
       // Large tenant (10,000 products)
       await setupTestTenant('large-tenant', 10000);
     });
     
     it('should maintain query performance for different tenant sizes', async () => {
       // Test product listing query for each tenant
       const tenants = ['small-tenant', 'medium-tenant', 'large-tenant'];
       
       for (const tenant of tenants) {
         const startTime = Date.now();
         
         // Execute query
         await prisma.product.findMany({
           where: { adminId: tenant },
           take: 20,
           orderBy: { createdAt: 'desc' }
         });
         
         const duration = Date.now() - startTime;
         
         // Log performance
         console.log(`${tenant} query duration: ${duration}ms`);
         
         // Assert performance expectations
         if (tenant === 'small-tenant') {
           expect(duration).to.be.lessThan(50);
         } else if (tenant === 'medium-tenant') {
           expect(duration).to.be.lessThan(100);
         } else {
           expect(duration).to.be.lessThan(200);
         }
       }
     });
   });
   ```

2. **Test Tenant Data Migration Performance**
   ```javascript
   // Test tenant data migration performance
   describe('Tenant Migration Performance', () => {
     it('should migrate tenant data within acceptable time limits', async () => {
       // Create source tenant with substantial data
       const sourceTenant = await createLargeTestTenant(5000); // 5000 products
       
       // Create target tenant
       const targetTenant = await prisma.admin.create({
         data: {
           name: 'Target Tenant',
           subdomain: 'target-tenant',
           email: 'target@example.com',
           password: 'hashed-password'
         }
       });
       
       // Measure migration time
       const startTime = Date.now();
       
       // Perform data migration
       await tenantMigrationService.migrateTenantData(sourceTenant.id, targetTenant.id);
       
       const duration = Date.now() - startTime;
       
       // Log migration time
       console.log(`Migration duration for 5000 products: ${duration}ms`);
       
       // Assert migration completed within acceptable time
       expect(duration).to.be.lessThan(60000); // Less than 1 minute
       
       // Verify all data was migrated
       const targetProducts = await prisma.product.count({
         where: { adminId: targetTenant.id }
       });
       
       expect(targetProducts).to.equal(5000);
     });
   });
   ```

## Security Testing

### 1. Tenant Isolation Security Testing

**Current State**: Limited security testing.

**Recommendations**:

1. **Test Cross-Tenant Access Prevention**
   ```javascript
   // Test cross-tenant access prevention
   describe('Tenant Security', () => {
     // Create test tenants and users
     before(async () => {
       // Create tenant 1
       const tenant1 = await createTestTenant('tenant1');
       const tenant1Token = generateAuthToken(tenant1.id);
       
       // Create tenant 2
       const tenant2 = await createTestTenant('tenant2');
       const tenant2Token = generateAuthToken(tenant2.id);
       
       // Create test data for each tenant
       await createTestData(tenant1.id, tenant2.id);
       
       // Store tokens for tests
       this.tenant1 = { id: tenant1.id, token: tenant1Token };
       this.tenant2 = { id: tenant2.id, token: tenant2Token };
     });
     
     it('should prevent accessing another tenant\'s data via API', async () => {
       // Get product from tenant 2
       const tenant2Product = await prisma.product.findFirst({
         where: { adminId: this.tenant2.id }
       });
       
       // Try to access tenant 2's product using tenant 1's token
       const response = await request(app)
         .get(`/api/products/${tenant2Product.id}`)
         .set('Authorization', `Bearer ${this.tenant1.token}`);
       
       // Verify access is denied
       expect(response.status).to.equal(404); // Should return 404 to avoid leaking info
     });
     
     it('should prevent accessing another tenant\'s data via parameter tampering', async () => {
       // Try to specify another tenant's ID in query params
       const response = await request(app)
         .get('/api/products')
         .query({ adminId: this.tenant2.id }) // Attempt to override tenant context
         .set('Authorization', `Bearer ${this.tenant1.token}`);
       
       // Verify tenant isolation is enforced
       expect(response.status).to.equal(200); // Should still return 200
       
       // Verify only tenant 1's products are returned
       const products = response.body.data;
       products.forEach(product => {
         expect(product.adminId).to.equal(this.tenant1.id);
       });
     });
   });
   ```

2. **Test Tenant Authentication Boundaries**
   ```javascript
   // Test tenant authentication boundaries
   describe('Tenant Authentication', () => {
     it('should enforce subdomain-specific login', async () => {
       // Create test tenant
       const tenant = await createTestTenant('test-tenant');
       
       // Create user for tenant
       const user = await createTestUser(tenant.id, 'admin@test-tenant.com', 'password123');
       
       // Test login on correct subdomain
       const correctSubdomainResponse = await request(app)
         .post('/api/auth/login')
         .set('Host', 'test-tenant.example.com')
         .send({
           email: 'admin@test-tenant.com',
           password: 'password123'
         });
       
       expect(correctSubdomainResponse.status).to.equal(200);
       expect(correctSubdomainResponse.body).to.have.property('token');
       
       // Test login on incorrect subdomain
       const wrongSubdomainResponse = await request(app)
         .post('/api/auth/login')
         .set('Host', 'wrong-tenant.example.com')
         .send({
           email: 'admin@test-tenant.com',
           password: 'password123'
         });
       
       expect(wrongSubdomainResponse.status).to.equal(401);
     });
   });
   ```

### 2. Tenant Data Privacy Testing

**Recommendations**:

1. **Test Data Leakage Prevention**
   ```javascript
   // Test data leakage prevention
   describe('Data Privacy', () => {
     it('should not expose tenant identifiers in public APIs', async () => {
       // Create test tenant and product
       const tenant = await createTestTenant('privacy-test');
       const product = await createTestProduct(tenant.id, 'Public Product');
       
       // Access product via public API
       const response = await request(app)
         .get(`/api/public/products/${product.id}`)
         .set('Host', 'privacy-test.example.com');
       
       // Verify response does not contain internal tenant ID
       expect(response.status).to.equal(200);
       expect(response.body).to.have.property('data');
       expect(response.body.data).to.not.have.property('adminId');
       expect(response.body.data).to.not.have.property('tenantId');
     });
   });
   ```

2. **Test Tenant Data Deletion**
   ```javascript
   // Test tenant data deletion
   describe('Tenant Data Deletion', () => {
     it('should completely remove tenant data on account deletion', async () => {
       // Create test tenant with data
       const tenant = await createTestTenantWithData('deletion-test');
       
       // Verify tenant data exists
       const initialProducts = await prisma.product.count({
         where: { adminId: tenant.id }
       });
       
       expect(initialProducts).to.be.greaterThan(0);
       
       // Delete tenant
       await request(app)
         .delete('/api/admin/account')
         .set('Authorization', `Bearer ${generateAuthToken(tenant.id)}`);
       
       // Verify all tenant data is deleted
       const remainingProducts = await prisma.product.count({
         where: { adminId: tenant.id }
       });
       
       expect(remainingProducts).to.equal(0);
       
       // Verify tenant record is deleted
       const tenantExists = await prisma.admin.findUnique({
         where: { id: tenant.id }
       });
       
       expect(tenantExists).to.be.null;
     });
   });
   ```

## Continuous Integration

### 1. Multi-Tenant CI Pipeline

**Current State**: Basic CI setup.

**Recommendations**:

1. **Implement Tenant-Aware Test Stages**
   ```yaml
   # Example GitHub Actions workflow
   name: Multi-Tenant CI
   
   on:
     push:
       branches: [ main, develop ]
     pull_request:
       branches: [ main, develop ]
   
   jobs:
     unit-tests:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - name: Set up Node.js
           uses: actions/setup-node@v2
           with:
             node-version: '16'
         - name: Install dependencies
           run: npm ci
         - name: Run unit tests
           run: npm run test:unit
     
     tenant-integration-tests:
       needs: unit-tests
       runs-on: ubuntu-latest
       strategy:
         matrix:
           tenant-type: [enterprise, small-business, solo]
       steps:
         - uses: actions/checkout@v2
         - name: Set up Node.js
           uses: actions/setup-node@v2
           with:
             node-version: '16'
         - name: Install dependencies
           run: npm ci
         - name: Setup test database
           run: npm run db:setup:test
         - name: Create test tenant
           run: npm run create:test:tenant -- --type=${{ matrix.tenant-type }}
         - name: Run integration tests for ${{ matrix.tenant-type }}
           run: npm run test:integration -- --tenant=${{ matrix.tenant-type }}
     
     e2e-tests:
       needs: tenant-integration-tests
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - name: Set up Node.js
           uses: actions/setup-node@v2
           with:
             node-version: '16'
         - name: Install dependencies
           run: npm ci
         - name: Setup test environment
           run: npm run setup:e2e
         - name: Run E2E tests
           run: npm run test:e2e
   ```

2. **Implement Tenant-Specific Deployment Testing**
   ```yaml
   # Example deployment testing workflow
   name: Tenant Deployment Testing
   
   on:
     workflow_run:
       workflows: ["Multi-Tenant CI"]
       types:
         - completed
   
   jobs:
     deploy-test-tenants:
       runs-on: ubuntu-latest
       if: ${{ github.event.workflow_run.conclusion == 'success' }}
       strategy:
         matrix:
           tenant-type: [enterprise, small-business, solo]
       steps:
         - uses: actions/checkout@v2
         - name: Set up Node.js
           uses: actions/setup-node@v2
           with:
             node-version: '16'
         - name: Install dependencies
           run: npm ci
         - name: Deploy test tenant
           run: npm run deploy:test -- --type=${{ matrix.tenant-type }}
         - name: Run smoke tests
           run: npm run test:smoke -- --tenant=${{ matrix.tenant-type }}
   ```

### 2. Test Data Management

**Recommendations**:

1. **Implement Tenant Test Data Generation**
   ```javascript
   // Tenant test data generator
   const { faker } = require('@faker-js/faker');
   
   async function generateTenantTestData(tenantId, options = {}) {
     const {
       productCount = 10,
       customerCount = 5,
       orderCount = 3
     } = options;
     
     // Generate products
     const products = [];
     for (let i = 0; i < productCount; i++) {
       products.push({
         name: faker.commerce.productName(),
         description: faker.commerce.productDescription(),
         price: parseFloat(faker.commerce.price()),
         adminId: tenantId
       });
     }
     
     // Create products in database
     await prisma.product.createMany({
       data: products
     });
     
     // Generate customers
     const customers = [];
     for (let i = 0; i < customerCount; i++) {
       customers.push({
         name: faker.person.fullName(),
         email: faker.internet.email(),
         phone: faker.phone.number(),
         adminId: tenantId
       });
     }
     
     // Create customers in database
     await prisma.customer.createMany({
       data: customers
     });
     
     // Generate orders
     const createdProducts = await prisma.product.findMany({
       where: { adminId: tenantId },
       select: { id: true, price: true }
     });
     
     const createdCustomers = await prisma.customer.findMany({
       where: { adminId: tenantId },
       select: { id: true }
     });
     
     for (let i = 0; i < orderCount; i++) {
       // Create order
       const order = await prisma.order.create({
         data: {
           customerId: faker.helpers.arrayElement(createdCustomers).id,
           status: faker.helpers.arrayElement(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED']),
           adminId: tenantId
         }
       });
       
       // Add order items
       const itemCount = faker.number.int({ min: 1, max: 3 });
       const orderItems = [];
       
       for (let j = 0; j < itemCount; j++) {
         const product = faker.helpers.arrayElement(createdProducts);
         orderItems.push({
           orderId: order.id,
           productId: product.id,
           quantity: faker.number.int({ min: 1, max: 5 }),
           price: product.price
         });
       }
       
       await prisma.orderItem.createMany({
         data: orderItems
       });
     }
     
     return {
       productCount,
       customerCount,
       orderCount
     };
   }
   ```

2. **Implement Test Data Cleanup**
   ```javascript
   // Test data cleanup utility
   async function cleanupTenantTestData(tenantId) {
     // Delete all tenant data in reverse order of dependencies
     await prisma.$transaction([
       prisma.orderItem.deleteMany({
         where: {
           order: {
             adminId: tenantId
           }
         }
       }),
       prisma.order.deleteMany({
         where: { adminId: tenantId }
       }),
       prisma.customer.deleteMany({
         where: { adminId: tenantId }
       }),
       prisma.product.deleteMany({
         where: { adminId: tenantId }
       })
     ]);
     
     // Optionally delete tenant
     if (options?.deleteTenant) {
       await prisma.admin.delete({
         where: { id: tenantId }
       });
     }
   }
   ```

## Conclusion

Implementing these testing best practices will significantly improve the reliability, security, and performance of the ecommerce-saas application across all tenant instances. These recommendations should be prioritized based on current pain points and implemented incrementally.

Regular testing and continuous improvement of the test suite should be conducted to ensure the application continues to meet quality standards as the tenant base grows and the application evolves.