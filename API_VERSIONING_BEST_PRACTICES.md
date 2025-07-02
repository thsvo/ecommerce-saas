# API Versioning Best Practices for Multi-Tenant E-Commerce SaaS

## Overview

This document outlines best practices for implementing and managing API versioning in the ecommerce-saas application. Proper API versioning is crucial for maintaining backward compatibility while allowing the API to evolve, especially in a multi-tenant environment where different tenants may adopt new versions at different rates.

## Why API Versioning Matters

1. **Backward Compatibility**: Allows existing clients to continue functioning without disruption
2. **Gradual Migration**: Enables tenants to migrate to new API versions at their own pace
3. **Feature Evolution**: Facilitates the introduction of new features and improvements
4. **Error Reduction**: Minimizes the risk of breaking changes affecting tenant operations
5. **Client Confidence**: Builds trust with API consumers through predictable update patterns

## Versioning Strategies

### 1. URL Path Versioning

**Implementation**:

```javascript
// Example URL structure: /api/v1/products

// In server.js or routes configuration
app.use('/api/v1/products', require('./routes/v1/products'));
app.use('/api/v2/products', require('./routes/v2/products'));
```

**Pros**:
- Simple to implement and understand
- Clear visibility of version in use
- Easy to route to different code bases

**Cons**:
- Requires changing URLs when migrating versions
- Can lead to code duplication

### 2. Query Parameter Versioning

**Implementation**:

```javascript
// Example URL structure: /api/products?version=1

// In route handler
router.get('/products', (req, res) => {
  const version = req.query.version || '1'; // Default to version 1
  
  if (version === '1') {
    return handleV1Request(req, res);
  } else if (version === '2') {
    return handleV2Request(req, res);
  }
  
  // Handle unsupported version
  res.status(400).json({ error: 'Unsupported API version' });
});
```

**Pros**:
- Maintains the same URL structure
- Easy to default to latest version

**Cons**:
- Less visible in API documentation
- Can be overlooked in requests

### 3. Custom Header Versioning

**Implementation**:

```javascript
// Example header: X-API-Version: 1

// In middleware
app.use((req, res, next) => {
  const version = req.headers['x-api-version'] || '1';
  req.apiVersion = version;
  next();
});

// In route handler
router.get('/products', (req, res) => {
  if (req.apiVersion === '1') {
    return handleV1Request(req, res);
  } else if (req.apiVersion === '2') {
    return handleV2Request(req, res);
  }
  
  // Handle unsupported version
  res.status(400).json({ error: 'Unsupported API version' });
});
```

**Pros**:
- Keeps URLs clean
- Separates versioning concerns from resource identification

**Cons**:
- Less discoverable
- Requires custom header support in clients

### 4. Content Negotiation (Accept Header)

**Implementation**:

```javascript
// Example header: Accept: application/vnd.ecommerce.v1+json

// In middleware
app.use((req, res, next) => {
  const acceptHeader = req.headers.accept;
  let version = '1'; // Default version
  
  if (acceptHeader) {
    const match = acceptHeader.match(/application\/vnd\.ecommerce\.v(\d+)\+json/);
    if (match && match[1]) {
      version = match[1];
    }
  }
  
  req.apiVersion = version;
  next();
});
```

**Pros**:
- Follows HTTP standards
- Allows for content type negotiation alongside versioning

**Cons**:
- More complex to implement
- Less intuitive for API consumers

## Recommended Approach for ecommerce-saas

For the ecommerce-saas application, we recommend implementing **URL Path Versioning** for the following reasons:

1. **Clarity**: Makes the API version explicitly visible in all requests
2. **Simplicity**: Easy for tenants and their developers to understand and implement
3. **Documentation**: Simplifies API documentation and examples
4. **Routing**: Facilitates clean separation of version-specific code
5. **Multi-tenant considerations**: Makes it easy to track which tenants are using which API versions

## Implementation Guidelines

### 1. Version Routing Structure

```javascript
// server.js
const express = require('express');
const app = express();

// API version routes
app.use('/api/v1', require('./routes/v1'));
app.use('/api/v2', require('./routes/v2'));

// Default route to latest version
app.use('/api', (req, res, next) => {
  // Redirect to latest version
  const latestVersion = 'v2';
  const newUrl = req.url.replace('/api', `/api/${latestVersion}`);
  res.redirect(307, newUrl);
});
```

### 2. Directory Structure

```
src/
├── api/
│   ├── v1/
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── index.js
│   ├── v2/
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── index.js
│   └── common/
│       ├── models/
│       ├── services/
│       └── utils/
```

### 3. Code Reuse Between Versions

```javascript
// src/api/common/services/productService.js
const prisma = require('../../../lib/prisma');

const productService = {
  // Common functionality used across versions
  getProductById: async (productId, adminId) => {
    return prisma.product.findUnique({
      where: {
        id: productId,
        adminId
      }
    });
  },
  
  // Other common methods...
};

module.exports = productService;

// src/api/v1/controllers/productController.js
const productService = require('../../common/services/productService');

const productController = {
  getProduct: async (req, res) => {
    const { productId } = req.params;
    const { adminId } = req;
    
    const product = await productService.getProductById(productId, adminId);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // V1 response format
    return res.json({
      id: product.id,
      name: product.name,
      price: product.price,
      // V1 fields only
    });
  }
};

// src/api/v2/controllers/productController.js
const productService = require('../../common/services/productService');

const productController = {
  getProduct: async (req, res) => {
    const { productId } = req.params;
    const { adminId } = req;
    
    const product = await productService.getProductById(productId, adminId);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // V2 response format with additional fields
    return res.json({
      id: product.id,
      name: product.name,
      price: product.price,
      // V2 additional fields
      inventory: product.inventory,
      categories: product.categories,
      metadata: product.metadata
    });
  }
};
```

### 4. Tenant-Specific Version Management

```javascript
// src/middleware/versionCheck.js
const prisma = require('../lib/prisma');

const versionCheck = async (req, res, next) => {
  const { adminId } = req;
  
  if (!adminId) {
    return next();
  }
  
  try {
    // Get tenant's preferred API version
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { apiVersion: true }
    });
    
    if (admin && admin.apiVersion) {
      // Store tenant's preferred version
      req.tenantApiVersion = admin.apiVersion;
      
      // Optional: Redirect to tenant's preferred version if different
      const urlVersion = req.originalUrl.match(/\/api\/v(\d+)/);
      if (urlVersion && urlVersion[1] !== admin.apiVersion) {
        const newUrl = req.originalUrl.replace(
          `/api/v${urlVersion[1]}`,
          `/api/v${admin.apiVersion}`
        );
        return res.redirect(307, newUrl);
      }
    }
    
    next();
  } catch (error) {
    console.error('Error checking tenant API version:', error);
    next();
  }
};

module.exports = versionCheck;
```

## Version Lifecycle Management

### 1. Version Deprecation Process

```javascript
// src/middleware/versionDeprecation.js
const deprecationWarning = (req, res, next) => {
  const apiVersion = req.originalUrl.match(/\/api\/v(\d+)/);
  
  if (apiVersion && apiVersion[1] === '1') {
    // Add deprecation warning header
    res.setHeader(
      'Warning',
      '299 - "Deprecated API Version: v1 will be discontinued on 2023-12-31. Please migrate to v2."'
    );
    
    // Log deprecation for monitoring
    console.warn(`Deprecated API v1 called by tenant ${req.adminId || 'unknown'}`);
  }
  
  next();
};

module.exports = deprecationWarning;
```

### 2. Version Sunset Strategy

1. **Announcement Phase** (3-6 months before)
   - Notify all tenants via email, dashboard notifications, and API responses
   - Provide migration guides and documentation
   - Offer support for migration questions

2. **Warning Phase** (1-3 months before)
   - Increase frequency of notifications
   - Add more prominent warnings in API responses
   - Reach out directly to tenants still using the old version

3. **Sunset Phase**
   - Redirect all traffic to the new version with appropriate status codes
   - Eventually return error responses for the deprecated version

```javascript
// Example sunset implementation
app.use('/api/v1', (req, res, next) => {
  const sunsetDate = new Date('2023-12-31');
  const currentDate = new Date();
  
  // Set sunset header (RFC 8594)
  res.setHeader('Sunset', sunsetDate.toUTCString());
  
  if (currentDate > sunsetDate) {
    // Version has been sunset
    return res.status(410).json({
      error: 'API v1 has been discontinued',
      message: 'Please migrate to API v2',
      documentation: 'https://docs.example.com/api/migration-guide'
    });
  }
  
  // Version still supported but deprecated
  next();
});
```

## Multi-Tenant Considerations

### 1. Tenant Version Preferences

Add a setting in the tenant admin dashboard to select preferred API version:

```javascript
// Example schema addition in Prisma
model Admin {
  id          String   @id @default(uuid())
  // Other fields...
  apiVersion  String   @default("1") // Default to v1
}

// Admin settings controller
const updateApiVersion = async (req, res) => {
  const { adminId } = req;
  const { apiVersion } = req.body;
  
  // Validate version
  const supportedVersions = ['1', '2'];
  if (!supportedVersions.includes(apiVersion)) {
    return res.status(400).json({ error: 'Unsupported API version' });
  }
  
  try {
    await prisma.admin.update({
      where: { id: adminId },
      data: { apiVersion }
    });
    
    return res.json({ success: true, message: 'API version preference updated' });
  } catch (error) {
    console.error('Error updating API version preference:', error);
    return res.status(500).json({ error: 'Failed to update API version preference' });
  }
};
```

### 2. Version Analytics

Implement tracking to monitor which tenants are using which API versions:

```javascript
// src/middleware/apiAnalytics.js
const prisma = require('../lib/prisma');

const apiAnalytics = async (req, res, next) => {
  const startTime = Date.now();
  
  // Store original end function
  const originalEnd = res.end;
  
  // Override end function
  res.end = async function(...args) {
    // Calculate request duration
    const duration = Date.now() - startTime;
    
    // Extract API version from URL
    const urlMatch = req.originalUrl.match(/\/api\/v(\d+)/);
    const apiVersion = urlMatch ? urlMatch[1] : 'unknown';
    
    // Log API usage
    try {
      await prisma.apiUsage.create({
        data: {
          adminId: req.adminId || null,
          endpoint: req.originalUrl,
          method: req.method,
          statusCode: res.statusCode,
          duration,
          apiVersion,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Error logging API usage:', error);
    }
    
    // Call original end function
    return originalEnd.apply(this, args);
  };
  
  next();
};

module.exports = apiAnalytics;
```

### 3. Tenant Migration Support

Provide tools to help tenants migrate between versions:

```javascript
// Example migration helper endpoint
router.post('/api/admin/migrate-to-v2', async (req, res) => {
  const { adminId } = req;
  
  try {
    // 1. Check if tenant is ready for migration
    const migrationChecks = await checkMigrationReadiness(adminId);
    
    if (!migrationChecks.ready) {
      return res.status(400).json({
        error: 'Migration prerequisites not met',
        details: migrationChecks.issues
      });
    }
    
    // 2. Perform any necessary data transformations
    await transformTenantDataForV2(adminId);
    
    // 3. Update tenant's preferred API version
    await prisma.admin.update({
      where: { id: adminId },
      data: { apiVersion: '2' }
    });
    
    // 4. Log successful migration
    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action: 'API_MIGRATION',
        details: 'Migrated from API v1 to v2',
        timestamp: new Date()
      }
    });
    
    return res.json({
      success: true,
      message: 'Successfully migrated to API v2'
    });
  } catch (error) {
    console.error('Error during API migration:', error);
    return res.status(500).json({ error: 'Migration failed' });
  }
});
```

## Documentation Best Practices

### 1. Version-Specific Documentation

Maintain separate documentation for each API version:

```javascript
// Example documentation route
app.get('/api/v1/docs', (req, res) => {
  res.render('api-docs', {
    version: '1',
    endpoints: v1EndpointDocs,
    deprecationNotice: 'API v1 will be discontinued on December 31, 2023.'
  });
});

app.get('/api/v2/docs', (req, res) => {
  res.render('api-docs', {
    version: '2',
    endpoints: v2EndpointDocs,
    newFeatures: v2NewFeatures
  });
});
```

### 2. Migration Guides

Create comprehensive guides for moving between versions:

```markdown
# Migrating from API v1 to v2

## Overview of Changes

- New product fields: `inventory`, `categories`, `metadata`
- Changed response format for order endpoints
- New pagination mechanism
- Improved error responses

## Step-by-Step Migration Guide

1. Update your API client to use the `/api/v2/` URL prefix
2. Update your product handling code to work with the new fields
3. Modify your order processing logic to handle the new response format
4. Update your pagination implementation
5. Enhance error handling to utilize the improved error responses

## Endpoint-by-Endpoint Changes

### Products

#### GET /api/v1/products/:id
```

## Testing Strategies

### 1. Version-Specific Tests

```javascript
// Example Jest test for API versioning
describe('API Versioning', () => {
  describe('v1 API', () => {
    test('GET /api/v1/products returns correct format', async () => {
      const response = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${testToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      
      // Check v1 format
      const product = response.body.data[0];
      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('price');
      expect(product).not.toHaveProperty('inventory'); // v2 field
    });
  });
  
  describe('v2 API', () => {
    test('GET /api/v2/products returns enhanced format', async () => {
      const response = await request(app)
        .get('/api/v2/products')
        .set('Authorization', `Bearer ${testToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      
      // Check v2 format
      const product = response.body.data[0];
      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('price');
      expect(product).toHaveProperty('inventory'); // v2 field
      expect(product).toHaveProperty('categories'); // v2 field
    });
  });
});
```

### 2. Compatibility Tests

```javascript
// Test backward compatibility
describe('API Backward Compatibility', () => {
  test('v1 client can work with v2 API through redirection', async () => {
    // Simulate v1 client
    const response = await request(app)
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${testToken}`);
    
    expect(response.status).toBe(200);
    
    // Even if internally redirected to v2, response should be in v1 format
    const product = response.body.data[0];
    expect(product).toHaveProperty('id');
    expect(product).toHaveProperty('name');
    expect(product).toHaveProperty('price');
    expect(product).not.toHaveProperty('inventory'); // Should not expose v2 fields
  });
});
```

## Conclusion

Implementing proper API versioning is essential for the ecommerce-saas application to evolve while maintaining backward compatibility. By following the URL path versioning approach and implementing the strategies outlined in this document, the application can provide a smooth experience for all tenants regardless of which API version they use.

Regular monitoring of version usage, proactive communication about version changes, and comprehensive documentation will ensure a successful versioning strategy that supports the application's growth and evolution.

## References

- [REST API Versioning Strategies](https://www.restapitutorial.com/lessons/versioning.html)
- [Microsoft REST API Guidelines](https://github.com/microsoft/api-guidelines/blob/vNext/Guidelines.md#12-versioning)
- [Stripe API Versioning](https://stripe.com/docs/api/versioning)
- [RFC 8594 - The Sunset HTTP Header Field](https://tools.ietf.org/html/rfc8594)