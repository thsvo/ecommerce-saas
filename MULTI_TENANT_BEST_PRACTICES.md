# Multi-Tenant Architecture Best Practices

## Introduction

This document outlines best practices for developing, maintaining, and scaling multi-tenant SaaS applications like our ecommerce platform. These recommendations are designed to enhance security, performance, and maintainability while providing a seamless experience for tenants.

## Architecture Patterns

### 1. Tenant Isolation Strategies

#### Database Isolation

**Current Implementation**: Shared database with tenant identifier columns

**Recommended Approaches**:

1. **Row-Level Security (RLS)**
   - Implement PostgreSQL RLS policies to enforce tenant isolation at the database level
   - Example:
   ```sql
   -- Enable RLS on a table
   ALTER TABLE products ENABLE ROW LEVEL SECURITY;
   
   -- Create policy that restricts access based on admin_id
   CREATE POLICY tenant_isolation_policy ON products
     USING (admin_id = current_setting('app.current_admin_id')::uuid);
   ```

2. **Schema-Based Isolation**
   - For tenants requiring stricter isolation, consider using separate schemas
   - Dynamically switch schemas based on the tenant context
   ```typescript
   // Set the search path before executing queries
   await prisma.$executeRaw`SET search_path TO tenant_${tenantId}`;
   ```

3. **Query Middleware**
   - Enhance the current approach with Prisma middleware that automatically applies tenant filters
   ```typescript
   prisma.$use(async (params, next) => {
     // Skip for non-tenant-specific operations
     if (params.action === 'findUnique' || !tenantContext.getCurrentTenant()) {
       return next(params);
     }
     
     // Add tenant filter to all queries
     if (params.args.where) {
       params.args.where.adminId = tenantContext.getCurrentTenant().id;
     } else {
       params.args.where = { adminId: tenantContext.getCurrentTenant().id };
     }
     
     return next(params);
   });
   ```

### 2. Tenant Identification and Routing

**Current Implementation**: Subdomain-based tenant identification with middleware

**Recommendations**:

1. **Enhance Tenant Context Management**
   - Implement a dedicated TenantContext service
   ```typescript
   // lib/tenantContext.ts
   class TenantContext {
     private static instance: TenantContext;
     private tenant: Tenant | null = null;
     
     private constructor() {}
     
     static getInstance(): TenantContext {
       if (!TenantContext.instance) {
         TenantContext.instance = new TenantContext();
       }
       return TenantContext.instance;
     }
     
     setTenant(tenant: Tenant): void {
       this.tenant = tenant;
     }
     
     getCurrentTenant(): Tenant | null {
       return this.tenant;
     }
     
     clear(): void {
       this.tenant = null;
     }
   }
   
   export default TenantContext.getInstance();
   ```

2. **Implement Tenant Resolution Strategy Pattern**
   - Support multiple tenant identification methods (subdomain, header, path parameter)
   ```typescript
   // Tenant resolution strategy interface
   interface TenantResolutionStrategy {
     resolveTenant(req: NextRequest): Promise<string | null>;
   }
   
   // Subdomain strategy
   class SubdomainResolutionStrategy implements TenantResolutionStrategy {
     async resolveTenant(req: NextRequest): Promise<string | null> {
       const host = req.headers.get('host') || '';
       return extractSubdomain(host);
     }
   }
   
   // Header strategy
   class HeaderResolutionStrategy implements TenantResolutionStrategy {
     async resolveTenant(req: NextRequest): Promise<string | null> {
       return req.headers.get('x-tenant-id');
     }
   }
   ```

### 3. Caching Strategies

**Current Implementation**: Limited caching with potential for tenant data leakage

**Recommendations**:

1. **Tenant-Aware Cache Keys**
   - Prefix all cache keys with tenant identifier
   ```typescript
   const cacheKey = `tenant:${tenantId}:products:${productId}`;
   ```

2. **Implement Cache Isolation**
   - Use separate Redis databases for different tenants
   - For in-memory caching, use a tenant-aware cache manager
   ```typescript
   class TenantAwareCache {
     private caches: Map<string, Map<string, any>> = new Map();
     
     get(tenantId: string, key: string): any {
       const tenantCache = this.caches.get(tenantId);
       if (!tenantCache) return undefined;
       return tenantCache.get(key);
     }
     
     set(tenantId: string, key: string, value: any): void {
       if (!this.caches.has(tenantId)) {
         this.caches.set(tenantId, new Map());
       }
       this.caches.get(tenantId)!.set(key, value);
     }
     
     invalidate(tenantId: string, key?: string): void {
       if (key) {
         this.caches.get(tenantId)?.delete(key);
       } else {
         this.caches.delete(tenantId);
       }
     }
   }
   ```

## Security Best Practices

### 1. Cross-Tenant Access Prevention

**Current Implementation**: Basic tenant validation in API routes

**Recommendations**:

1. **Implement Defense-in-Depth**
   - Add tenant validation at multiple layers (middleware, service, database)
   - Use JWT claims to include tenant information
   ```typescript
   // When generating JWT
   const token = jwt.sign(
     { userId: user.id, tenantId: user.subdomain },
     process.env.JWT_SECRET as string,
     { expiresIn: '7d' }
   );
   ```

2. **Tenant Boundary Enforcement**
   - Implement strict validation for cross-tenant operations
   - Log and alert on potential tenant boundary violations
   ```typescript
   function enforceTenantBoundary(requestTenantId: string, resourceTenantId: string) {
     if (requestTenantId !== resourceTenantId) {
       const error = new Error('Tenant boundary violation detected');
       console.error('Security alert: Tenant boundary violation', {
         requestTenantId,
         resourceTenantId,
         timestamp: new Date().toISOString(),
       });
       throw error;
     }
   }
   ```

### 2. Tenant Data Isolation

**Recommendations**:

1. **Implement Object-Level Authorization**
   - Check tenant ownership for every object access
   ```typescript
   async function authorizeResourceAccess(resourceId: string, tenantId: string) {
     const resource = await prisma.resource.findUnique({
       where: { id: resourceId },
     });
     
     if (!resource || resource.adminId !== tenantId) {
       throw new Error('Unauthorized access to resource');
     }
     
     return resource;
   }
   ```

2. **Data Encryption with Tenant-Specific Keys**
   - For highly sensitive data, implement tenant-specific encryption keys
   ```typescript
   async function encryptForTenant(data: string, tenantId: string) {
     const tenantKey = await getTenantEncryptionKey(tenantId);
     return encrypt(data, tenantKey);
   }
   
   async function decryptForTenant(encryptedData: string, tenantId: string) {
     const tenantKey = await getTenantEncryptionKey(tenantId);
     return decrypt(encryptedData, tenantKey);
   }
   ```

## Performance Optimization

### 1. Tenant-Aware Query Optimization

**Recommendations**:

1. **Optimize Indexes for Tenant Queries**
   - Create composite indexes with tenant ID as the first column
   ```sql
   CREATE INDEX idx_products_admin_id_created_at ON products(admin_id, created_at DESC);
   ```

2. **Implement Query Hints for Large Tenants**
   - Use query hints to optimize performance for tenants with large datasets
   ```typescript
   // For large tenants, use specific query optimizations
   if (isTenantLarge(tenantId)) {
     // Use specific query plan
     await prisma.$executeRaw`SET LOCAL enable_nestloop = off`;
   }
   ```

### 2. Resource Allocation and Throttling

**Recommendations**:

1. **Implement Tenant-Based Rate Limiting**
   - Apply different rate limits based on tenant tier
   ```typescript
   async function rateLimitRequest(tenantId: string, endpoint: string) {
     const tenant = await getTenantDetails(tenantId);
     const rateLimit = getRateLimitForTier(tenant.tier);
     
     const currentUsage = await getRateLimitUsage(tenantId, endpoint);
     if (currentUsage >= rateLimit) {
       throw new Error('Rate limit exceeded');
     }
     
     await incrementRateLimitUsage(tenantId, endpoint);
   }
   ```

2. **Dynamic Resource Allocation**
   - Implement a system to allocate more resources to high-tier tenants
   - Consider using separate server instances for premium tenants

## Scalability Considerations

### 1. Tenant Sharding

**Recommendations**:

1. **Implement Tenant Sharding Strategy**
   - Group tenants into shards based on size, geography, or other criteria
   - Use a shard manager to route requests to the appropriate database
   ```typescript
   class ShardManager {
     private shardMap: Map<string, string> = new Map(); // tenantId -> shardId
     
     async getShardForTenant(tenantId: string): Promise<string> {
       // Check cache first
       if (this.shardMap.has(tenantId)) {
         return this.shardMap.get(tenantId)!;
       }
       
       // Look up in shard mapping table
       const mapping = await prisma.tenantShardMapping.findUnique({
         where: { tenantId },
       });
       
       if (!mapping) {
         throw new Error(`No shard mapping found for tenant ${tenantId}`);
       }
       
       // Cache the result
       this.shardMap.set(tenantId, mapping.shardId);
       return mapping.shardId;
     }
     
     async getConnectionForTenant(tenantId: string): Promise<PrismaClient> {
       const shardId = await this.getShardForTenant(tenantId);
       return getConnectionForShard(shardId);
     }
   }
   ```

### 2. Tenant Migration and Rebalancing

**Recommendations**:

1. **Implement Tenant Migration Process**
   - Develop tools for moving tenants between shards
   - Ensure zero-downtime migration process
   ```typescript
   async function migrateTenant(tenantId: string, sourceShardId: string, targetShardId: string) {
     // 1. Lock tenant for writes
     await lockTenantForWrites(tenantId);
     
     try {
       // 2. Copy tenant data to target shard
       await copyTenantData(tenantId, sourceShardId, targetShardId);
       
       // 3. Verify data integrity
       await verifyTenantDataIntegrity(tenantId, targetShardId);
       
       // 4. Update shard mapping
       await updateTenantShardMapping(tenantId, targetShardId);
       
       // 5. Clean up source shard data (can be done asynchronously later)
       await scheduleTenantDataCleanup(tenantId, sourceShardId);
     } finally {
       // 6. Unlock tenant for writes
       await unlockTenantForWrites(tenantId);
     }
   }
   ```

## Monitoring and Observability

### 1. Tenant-Aware Monitoring

**Recommendations**:

1. **Implement Tenant Context in Logging**
   - Include tenant identifier in all log entries
   ```typescript
   logger.info('User logged in', {
     userId: user.id,
     tenantId: user.subdomain,
     timestamp: new Date().toISOString(),
   });
   ```

2. **Tenant-Specific Metrics**
   - Track performance and usage metrics per tenant
   - Set up alerts for abnormal tenant behavior
   ```typescript
   // Track API request metrics per tenant
   metrics.increment('api.requests', 1, {
     tenantId: req.subdomain,
     endpoint: req.url,
     statusCode: res.statusCode,
   });
   ```

### 2. Tenant Health Dashboards

**Recommendations**:

1. **Implement Tenant Health Monitoring**
   - Create dashboards showing tenant-specific health metrics
   - Track error rates, response times, and resource usage per tenant

2. **Proactive Tenant Issue Detection**
   - Implement anomaly detection for tenant metrics
   - Set up alerts for potential tenant-specific issues

## Tenant Lifecycle Management

### 1. Tenant Onboarding and Provisioning

**Recommendations**:

1. **Automate Tenant Provisioning**
   - Create a comprehensive tenant provisioning workflow
   - Include database setup, subdomain configuration, and initial data seeding
   ```typescript
   async function provisionNewTenant(tenantData: TenantProvisioningData) {
     // 1. Create tenant record
     const tenant = await createTenantRecord(tenantData);
     
     // 2. Set up subdomain
     await configureSubdomain(tenant.subdomain);
     
     // 3. Initialize tenant database/schema
     await initializeTenantData(tenant.id);
     
     // 4. Set up default configurations
     await setupDefaultConfigurations(tenant.id);
     
     // 5. Create admin user
     await createAdminUser(tenant.id, tenantData.adminEmail, tenantData.adminPassword);
     
     return tenant;
   }
   ```

### 2. Tenant Offboarding and Data Retention

**Recommendations**:

1. **Implement Tenant Deactivation Process**
   - Create a staged deactivation process (suspend → archive → delete)
   ```typescript
   async function deactivateTenant(tenantId: string) {
     // 1. Mark tenant as suspended
     await updateTenantStatus(tenantId, 'SUSPENDED');
     
     // 2. Revoke active sessions
     await revokeAllTenantSessions(tenantId);
     
     // 3. Disable tenant access
     await disableTenantSubdomain(tenantId);
     
     // 4. Schedule data archiving
     await scheduleTenantDataArchiving(tenantId, Date.now() + 30 * 24 * 60 * 60 * 1000);
   }
   ```

2. **Data Retention and Compliance**
   - Implement data retention policies compliant with regulations
   - Provide data export capabilities for tenants

## Conclusion

Implementing these multi-tenant best practices will enhance the security, performance, and scalability of our ecommerce SaaS platform. These recommendations should be prioritized based on current business needs and implemented incrementally to minimize disruption to existing tenants.

Regular reviews of the multi-tenant architecture should be conducted to ensure it continues to meet the evolving needs of the business and its tenants.