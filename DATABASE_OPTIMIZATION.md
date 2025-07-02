# Database Optimization for Multi-Tenant E-Commerce SaaS

## Overview

This document outlines database optimization strategies for the ecommerce-saas application, with a specific focus on multi-tenant architecture considerations. Implementing these recommendations will help improve database performance, scalability, and maintainability across all tenant instances.

## Schema Design

### 1. Tenant Isolation Strategies

**Current State**: Single database with tenant ID columns for data separation.

**Recommendations**:

1. **Optimize Tenant ID Indexing**
   ```prisma
   // In schema.prisma
   model Product {
     id        String   @id @default(uuid())
     name      String
     price     Float
     adminId   String   // Tenant identifier
     // Other fields...
     
     // Add index on tenant identifier
     @@index([adminId])
     
     // Add compound indexes for common queries
     @@index([adminId, createdAt])
     @@index([adminId, name])
   }
   ```

2. **Consider Database-Per-Tenant for Large Tenants**
   - Implement a router service to direct queries to the appropriate database
   - Use connection pooling to efficiently manage database connections
   ```typescript
   // Database router service
   class DatabaseRouter {
     private connections = new Map();
     private defaultConnection;
     
     constructor(defaultConnectionString) {
       this.defaultConnection = new PrismaClient({
         datasources: {
           db: {
             url: defaultConnectionString
           }
         }
       });
     }
     
     async getTenantConnection(tenantId) {
       // Check if tenant has dedicated database
       const tenantConfig = await this.defaultConnection.tenantConfig.findUnique({
         where: { tenantId },
         select: { dedicatedDatabase: true, connectionString: true }
       });
       
       // If tenant doesn't have dedicated database, use default
       if (!tenantConfig?.dedicatedDatabase) {
         return this.defaultConnection;
       }
       
       // If connection already exists, return it
       if (this.connections.has(tenantId)) {
         return this.connections.get(tenantId);
       }
       
       // Create new connection
       const connection = new PrismaClient({
         datasources: {
           db: {
             url: tenantConfig.connectionString
           }
         }
       });
       
       // Store connection
       this.connections.set(tenantId, connection);
       
       return connection;
     }
   }
   ```

### 2. Schema Optimization

**Current State**: Basic schema design.

**Recommendations**:

1. **Normalize Data Appropriately**
   ```prisma
   // Before: Denormalized product variants
   model Product {
     id          String   @id @default(uuid())
     name        String
     price       Float
     adminId     String
     // Denormalized variant data
     sizeOptions String?
     colorOptions String?
   }
   
   // After: Normalized product variants
   model Product {
     id          String    @id @default(uuid())
     name        String
     adminId     String
     variants    Variant[]
   }
   
   model Variant {
     id          String   @id @default(uuid())
     productId   String
     product     Product  @relation(fields: [productId], references: [id])
     price       Float
     size        String?
     color       String?
     stock       Int      @default(0)
     
     @@index([productId])
   }
   ```

2. **Use Appropriate Data Types**
   ```prisma
   // Before: Inefficient data types
   model Order {
     id            String   @id @default(uuid())
     customerName  String
     customerEmail String
     status        String   // Using string for enum values
     items         String   // JSON string for order items
     totalAmount   Float
     createdAt     DateTime @default(now())
     adminId       String
   }
   
   // After: Optimized data types
   model Order {
     id            String     @id @default(uuid())
     customerName  String
     customerEmail String
     status        OrderStatus // Using enum
     items         OrderItem[] // Relation instead of JSON
     totalAmount   Decimal     // Decimal for currency
     createdAt     DateTime    @default(now())
     adminId       String
   }
   
   enum OrderStatus {
     PENDING
     PROCESSING
     SHIPPED
     DELIVERED
     CANCELLED
   }
   
   model OrderItem {
     id        String  @id @default(uuid())
     orderId   String
     order     Order   @relation(fields: [orderId], references: [id])
     productId String
     quantity  Int
     price     Decimal // Decimal for currency
     
     @@index([orderId])
   }
   ```

## Query Optimization

### 1. Efficient Querying

**Current State**: Basic queries without optimization.

**Recommendations**:

1. **Use Selective Field Queries**
   ```typescript
   // Before: Fetching all fields
   const products = await prisma.product.findMany({
     where: { adminId: tenantId }
   });
   
   // After: Selecting only needed fields
   const products = await prisma.product.findMany({
     where: { adminId: tenantId },
     select: {
       id: true,
       name: true,
       price: true,
       // Only select fields that are needed
     }
   });
   ```

2. **Implement Efficient Pagination**
   ```typescript
   // Before: Offset-based pagination
   const products = await prisma.product.findMany({
     where: { adminId: tenantId },
     skip: (page - 1) * pageSize,
     take: pageSize
   });
   
   // After: Cursor-based pagination
   const products = await prisma.product.findMany({
     where: {
       adminId: tenantId,
       ...(cursor ? { id: { lt: cursor } } : {})
     },
     take: pageSize,
     orderBy: { id: 'desc' }
   });
   
   // Get next cursor from last item
   const nextCursor = products.length === pageSize ? products[products.length - 1].id : null;
   ```

3. **Optimize Related Data Queries**
   ```typescript
   // Before: N+1 query problem
   const orders = await prisma.order.findMany({
     where: { adminId: tenantId }
   });
   
   for (const order of orders) {
     order.items = await prisma.orderItem.findMany({
       where: { orderId: order.id }
     });
   }
   
   // After: Single query with includes
   const orders = await prisma.order.findMany({
     where: { adminId: tenantId },
     include: {
       items: true
     }
   });
   ```

### 2. Query Monitoring and Optimization

**Recommendations**:

1. **Implement Query Logging and Analysis**
   ```typescript
   // Prisma query logging middleware
   prisma.$use(async (params, next) => {
     const startTime = Date.now();
     
     // Execute the query
     const result = await next(params);
     
     // Calculate query duration
     const duration = Date.now() - startTime;
     
     // Log slow queries
     if (duration > 100) { // Log queries taking more than 100ms
       console.warn(`Slow query detected: ${params.model}.${params.action} took ${duration}ms`);
       console.warn(`Query params: ${JSON.stringify(params)}`);
     }
     
     return result;
   });
   ```

2. **Implement Query Caching**
   ```typescript
   // Query cache using Redis
   import Redis from 'ioredis';
   
   const redis = new Redis(process.env.REDIS_URL);
   
   async function cachedQuery(cacheKey, queryFn, ttl = 300) {
     // Try to get from cache
     const cachedResult = await redis.get(cacheKey);
     
     if (cachedResult) {
       return JSON.parse(cachedResult);
     }
     
     // Execute query
     const result = await queryFn();
     
     // Cache result
     await redis.set(cacheKey, JSON.stringify(result), 'EX', ttl);
     
     return result;
   }
   
   // Usage example
   async function getProductsByCategory(categoryId, tenantId) {
     const cacheKey = `products:category:${categoryId}:tenant:${tenantId}`;
     
     return cachedQuery(cacheKey, () => {
       return prisma.product.findMany({
         where: {
           categoryId,
           adminId: tenantId
         }
       });
     });
   }
   ```

## Indexing Strategies

### 1. Tenant-Aware Indexing

**Current State**: Basic indexes without tenant-specific optimization.

**Recommendations**:

1. **Create Tenant-Specific Compound Indexes**
   ```prisma
   // In schema.prisma
   model Product {
     id          String   @id @default(uuid())
     name        String
     price       Float
     categoryId  String?
     createdAt   DateTime @default(now())
     updatedAt   DateTime @updatedAt
     adminId     String
     
     // Tenant-specific compound indexes
     @@index([adminId, categoryId])
     @@index([adminId, name])
     @@index([adminId, createdAt])
     @@index([adminId, price])
   }
   ```

2. **Create Indexes for Common Query Patterns**
   ```prisma
   // In schema.prisma
   model Order {
     id            String      @id @default(uuid())
     customerEmail String
     status        OrderStatus
     totalAmount   Decimal
     createdAt     DateTime    @default(now())
     adminId       String
     
     // Indexes for common queries
     @@index([adminId, status])
     @@index([adminId, customerEmail])
     @@index([adminId, createdAt])
     @@index([adminId, status, createdAt])
   }
   ```

### 2. Index Maintenance

**Recommendations**:

1. **Implement Index Usage Monitoring**
   - Set up database monitoring to track index usage
   - Identify unused or duplicate indexes
   - Monitor query performance with and without indexes

2. **Implement Regular Index Maintenance**
   - Schedule regular index rebuilding for heavily fragmented indexes
   - Remove unused indexes to improve write performance
   - Analyze query patterns to identify missing indexes

## Data Partitioning

### 1. Horizontal Partitioning (Sharding)

**Current State**: No data partitioning.

**Recommendations**:

1. **Implement Tenant-Based Sharding**
   - Distribute tenants across multiple database shards
   - Use consistent hashing to determine shard for each tenant
   ```typescript
   // Shard router service
   class ShardRouter {
     private shardConnections = [];
     private shardCount;
     
     constructor(connectionStrings) {
       this.shardCount = connectionStrings.length;
       
       // Initialize connections to all shards
       this.shardConnections = connectionStrings.map(connectionString => {
         return new PrismaClient({
           datasources: {
             db: {
               url: connectionString
             }
           }
         });
       });
     }
     
     // Get shard for tenant
     getShardForTenant(tenantId) {
       // Use consistent hashing to determine shard
       const shardIndex = this.getShardIndex(tenantId);
       return this.shardConnections[shardIndex];
     }
     
     // Calculate shard index using consistent hashing
     private getShardIndex(tenantId) {
       // Simple hash function for demonstration
       let hash = 0;
       for (let i = 0; i < tenantId.length; i++) {
         hash = ((hash << 5) - hash) + tenantId.charCodeAt(i);
         hash |= 0; // Convert to 32bit integer
       }
       
       // Ensure positive index
       hash = Math.abs(hash);
       
       // Get index within shard count
       return hash % this.shardCount;
     }
   }
   ```

2. **Implement Data-Based Sharding for Large Tenants**
   - For large tenants, shard data based on logical partitions
   - Use date-based sharding for time-series data
   ```typescript
   // Example of date-based sharding for order history
   async function getOrdersByDateRange(tenantId, startDate, endDate) {
     // Determine which shards to query based on date range
     const shards = getShardsByDateRange(startDate, endDate);
     
     // Query each shard and combine results
     const results = await Promise.all(
       shards.map(shard => {
         return shard.order.findMany({
           where: {
             adminId: tenantId,
             createdAt: {
               gte: startDate,
               lte: endDate
             }
           }
         });
       })
     );
     
     // Flatten results
     return results.flat();
   }
   ```

### 2. Vertical Partitioning

**Recommendations**:

1. **Separate Frequently Accessed Data**
   - Move frequently accessed fields to separate tables
   - Keep large text or binary data in separate tables
   ```prisma
   // Before: Single product table with all fields
   model Product {
     id          String  @id @default(uuid())
     name        String
     price       Float
     description String  @db.Text // Large text field
     adminId     String
   }
   
   // After: Split into core and detail tables
   model Product {
     id          String        @id @default(uuid())
     name        String
     price       Float
     adminId     String
     details     ProductDetail?
   }
   
   model ProductDetail {
     id          String  @id @default(uuid())
     productId   String  @unique
     product     Product @relation(fields: [productId], references: [id])
     description String  @db.Text // Large text field
     // Other less frequently accessed fields
   }
   ```

2. **Separate Analytical Data**
   - Move historical and analytical data to separate tables or databases
   - Implement ETL processes to sync data for reporting
   ```typescript
   // Example ETL process for order analytics
   async function syncOrderAnalytics() {
     // Get latest sync timestamp
     const lastSync = await getLastSyncTimestamp();
     
     // Get new orders since last sync
     const newOrders = await prisma.order.findMany({
       where: {
         createdAt: {
           gt: lastSync
         }
       },
       include: {
         items: true
       }
     });
     
     // Transform orders for analytics
     const analyticsData = transformOrdersForAnalytics(newOrders);
     
     // Insert into analytics database
     await analyticsDb.orderAnalytics.createMany({
       data: analyticsData
     });
     
     // Update sync timestamp
     await updateSyncTimestamp(new Date());
   }
   ```

## Connection Management

### 1. Connection Pooling

**Current State**: Basic connection management.

**Recommendations**:

1. **Optimize Connection Pool Settings**
   ```typescript
   // In database configuration
   const prisma = new PrismaClient({
     datasources: {
       db: {
         url: process.env.DATABASE_URL
       }
     },
     // Configure connection pool
     log: ['query', 'info', 'warn', 'error']
   });
   
   // For Node.js environment variables
   // DATABASE_CONNECTION_LIMIT=20
   // DATABASE_CONNECTION_TIMEOUT=30000
   ```

2. **Implement Connection Monitoring**
   ```typescript
   // Monitor connection pool usage
   async function monitorConnectionPool() {
     // Example for PostgreSQL
     const result = await prisma.$queryRaw`
       SELECT 
         count(*) as total_connections,
         sum(CASE WHEN state = 'active' THEN 1 ELSE 0 END) as active_connections,
         sum(CASE WHEN state = 'idle' THEN 1 ELSE 0 END) as idle_connections
       FROM pg_stat_activity
       WHERE datname = current_database()
     `;
     
     // Log connection stats
     console.log('Connection pool stats:', result[0]);
     
     // Alert if approaching connection limit
     if (result[0].total_connections > 15) { // 75% of limit
       console.warn('Connection pool nearing capacity');
     }
   }
   ```

### 2. Tenant-Aware Connection Management

**Recommendations**:

1. **Implement Tenant Connection Isolation**
   ```typescript
   // Tenant connection manager
   class TenantConnectionManager {
     private connectionPools = new Map();
     private defaultPool;
     
     constructor(defaultConnectionString) {
       this.defaultPool = new PrismaClient({
         datasources: {
           db: {
             url: defaultConnectionString
           }
         }
       });
     }
     
     async getConnectionForTenant(tenantId) {
       // Check if tenant has dedicated connection pool
       if (this.connectionPools.has(tenantId)) {
         return this.connectionPools.get(tenantId);
       }
       
       // Check if tenant should have dedicated pool
       const tenantConfig = await this.defaultPool.tenantConfig.findUnique({
         where: { tenantId },
         select: { dedicatedPool: true, connectionString: true }
       });
       
       // If tenant doesn't need dedicated pool, use default
       if (!tenantConfig?.dedicatedPool) {
         return this.defaultPool;
       }
       
       // Create dedicated connection pool
       const pool = new PrismaClient({
         datasources: {
           db: {
             url: tenantConfig.connectionString
           }
         }
       });
       
       // Store in map
       this.connectionPools.set(tenantId, pool);
       
       return pool;
     }
   }
   ```

2. **Implement Connection Prioritization**
   - Prioritize connections for premium tenants
   - Implement connection limits per tenant
   ```typescript
   // Connection prioritization middleware
   async function connectionPriorityMiddleware(req, res, next) {
     const tenantId = req.tenantId;
     
     if (!tenantId) {
       return next();
     }
     
     // Get tenant tier
     const tenant = await getTenantTier(tenantId);
     
     // Set connection priority based on tier
     switch (tenant.tier) {
       case 'premium':
         req.connectionPriority = 'high';
         break;
       case 'standard':
         req.connectionPriority = 'medium';
         break;
       default:
         req.connectionPriority = 'low';
     }
     
     next();
   }
   ```

## Backup and Recovery

### 1. Tenant-Specific Backups

**Current State**: General database backups.

**Recommendations**:

1. **Implement Tenant-Specific Backup Schedules**
   - Configure backup frequency based on tenant tier
   - Implement point-in-time recovery for premium tenants
   ```typescript
   // Tenant backup scheduler
   async function scheduleTenantBackups() {
     // Get all tenants with their tiers
     const tenants = await prisma.admin.findMany({
       select: {
         id: true,
         subdomain: true,
         tier: true
       }
     });
     
     // Schedule backups based on tier
     for (const tenant of tenants) {
       switch (tenant.tier) {
         case 'premium':
           // Hourly backups for premium tenants
           scheduleBackup(tenant.id, '0 * * * *');
           break;
         case 'business':
           // 6-hour backups for business tenants
           scheduleBackup(tenant.id, '0 */6 * * *');
           break;
         case 'starter':
           // Daily backups for starter tenants
           scheduleBackup(tenant.id, '0 0 * * *');
           break;
       }
     }
   }
   ```

2. **Implement Tenant Data Export**
   - Provide API for tenants to export their data
   - Implement scheduled data exports for compliance
   ```typescript
   // Tenant data export endpoint
   app.post('/api/admin/export-data', requireAdmin, async (req, res) => {
     const tenantId = req.adminId;
     
     // Start export job
     const exportJob = await startDataExport(tenantId);
     
     res.json({
       data: {
         jobId: exportJob.id,
         status: exportJob.status,
         estimatedCompletionTime: exportJob.estimatedCompletionTime
       }
     });
   });
   
   // Data export implementation
   async function startDataExport(tenantId) {
     // Create export job record
     const job = await prisma.exportJob.create({
       data: {
         tenantId,
         status: 'QUEUED',
         createdAt: new Date()
       }
     });
     
     // Queue export job
     await exportQueue.add('tenant-data-export', {
       jobId: job.id,
       tenantId
     });
     
     return job;
   }
   ```

### 2. Disaster Recovery

**Recommendations**:

1. **Implement Multi-Region Replication**
   - Set up database replicas in multiple regions
   - Implement automatic failover
   - Test disaster recovery procedures regularly

2. **Implement Recovery Time Objectives (RTO) by Tenant Tier**
   - Define RTO based on tenant service level agreements
   - Prioritize recovery of premium tenant data
   - Implement tenant communication plan for outages

## Performance Monitoring

### 1. Query Performance Monitoring

**Recommendations**:

1. **Implement Query Performance Logging**
   ```typescript
   // Query performance logging middleware
   prisma.$use(async (params, next) => {
     const startTime = Date.now();
     
     // Get tenant ID from params if available
     const tenantId = params.args?.where?.adminId || 'unknown';
     
     // Execute the query
     const result = await next(params);
     
     // Calculate query duration
     const duration = Date.now() - startTime;
     
     // Log query performance
     await prisma.queryPerformanceLog.create({
       data: {
         model: params.model,
         action: params.action,
         duration,
         tenantId,
         timestamp: new Date()
       }
     });
     
     return result;
   });
   ```

2. **Implement Performance Dashboards**
   - Create tenant-specific performance dashboards
   - Track query performance trends over time
   - Set up alerts for performance degradation

### 2. Tenant Usage Monitoring

**Recommendations**:

1. **Track Tenant Database Usage**
   ```typescript
   // Tenant usage tracking job
   async function trackTenantDatabaseUsage() {
     // Get all tenants
     const tenants = await prisma.admin.findMany({
       select: {
         id: true,
         subdomain: true
       }
     });
     
     // Track usage for each tenant
     for (const tenant of tenants) {
       // Get row counts for main tables
       const [productCount, orderCount, customerCount] = await Promise.all([
         prisma.product.count({ where: { adminId: tenant.id } }),
         prisma.order.count({ where: { adminId: tenant.id } }),
         prisma.customer.count({ where: { adminId: tenant.id } })
       ]);
       
       // Calculate storage usage (example)
       const storageUsage = await calculateTenantStorageUsage(tenant.id);
       
       // Record usage metrics
       await prisma.tenantUsageMetrics.create({
         data: {
           tenantId: tenant.id,
           productCount,
           orderCount,
           customerCount,
           storageUsageMB: storageUsage,
           timestamp: new Date()
         }
       });
     }
   }
   ```

2. **Implement Usage-Based Billing**
   - Track database operations for billing purposes
   - Implement usage quotas and throttling
   - Provide usage reports to tenants

## Conclusion

Implementing these database optimization strategies will significantly improve the performance, scalability, and maintainability of the ecommerce-saas application's database layer. These recommendations should be prioritized based on current pain points and implemented incrementally.

Regular database performance monitoring and optimization should be conducted to ensure the database continues to meet performance requirements as the tenant base grows and usage patterns evolve.