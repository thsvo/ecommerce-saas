# Error Handling Best Practices for Multi-Tenant E-Commerce SaaS

## Overview

This document outlines comprehensive error handling best practices for the ecommerce-saas application, with a specific focus on multi-tenant architecture considerations. Implementing these practices will improve application reliability, user experience, and maintainability.

## General Error Handling Principles

### 1. Consistent Error Structure

**Current State**: Inconsistent error handling across different parts of the application.

**Recommendations**:

1. **Standardize Error Response Format**
   - Implement a consistent error response structure across all APIs
   - Include error code, message, and additional details when appropriate
   - Maintain consistent HTTP status codes

   ```typescript
   // src/utils/errorHandler.ts
   export interface ErrorResponse {
     status: 'error';
     code: string;
     message: string;
     details?: any;
     requestId?: string;
   }
   
   export function createErrorResponse(code: string, message: string, details?: any): ErrorResponse {
     return {
       status: 'error',
       code,
       message,
       details,
       requestId: generateRequestId(), // Unique ID for tracking the error
     };
   }
   
   // Example usage in API route
   export default async function handler(req: NextApiRequest, res: NextApiResponse) {
     try {
       // API logic here
     } catch (error) {
       const errorResponse = handleApiError(error);
       res.status(errorResponse.statusCode).json(errorResponse.body);
     }
   }
   ```

2. **Create Error Handling Middleware**
   - Implement middleware to catch and process errors
   - Log errors with appropriate context
   - Transform errors into consistent response format

   ```typescript
   // src/middleware/errorHandlingMiddleware.ts
   import { NextApiRequest, NextApiResponse } from 'next';
   import { logger } from '../utils/logger';
   import { createErrorResponse } from '../utils/errorHandler';
   
   export function withErrorHandling(handler: any) {
     return async (req: NextApiRequest, res: NextApiResponse) => {
       try {
         return await handler(req, res);
       } catch (error) {
         // Extract tenant information for context
         const tenantId = req.adminId;
         const subdomain = req.subdomain;
         
         // Log the error with context
         logger.error({
           message: 'API error occurred',
           error: error instanceof Error ? error.message : String(error),
           stack: error instanceof Error ? error.stack : undefined,
           path: req.url,
           method: req.method,
           tenantId,
           subdomain,
           requestId: req.headers['x-request-id'] || generateRequestId(),
         });
         
         // Determine appropriate status code and error code
         const { statusCode, errorCode, errorMessage } = categorizeError(error);
         
         // Send consistent error response
         res.status(statusCode).json(createErrorResponse(
           errorCode,
           errorMessage,
           process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined
         ));
       }
     };
   }
   
   function categorizeError(error: any) {
     // Default values
     let statusCode = 500;
     let errorCode = 'INTERNAL_SERVER_ERROR';
     let errorMessage = 'An unexpected error occurred';
     
     // Categorize based on error type
     if (error.name === 'ValidationError') {
       statusCode = 400;
       errorCode = 'VALIDATION_ERROR';
       errorMessage = error.message;
     } else if (error.name === 'UnauthorizedError') {
       statusCode = 401;
       errorCode = 'UNAUTHORIZED';
       errorMessage = 'Authentication required';
     } else if (error.name === 'ForbiddenError') {
       statusCode = 403;
       errorCode = 'FORBIDDEN';
       errorMessage = 'Access denied';
     } else if (error.name === 'NotFoundError') {
       statusCode = 404;
       errorCode = 'NOT_FOUND';
       errorMessage = error.message || 'Resource not found';
     } else if (error.code === 'P2002') {
       // Prisma unique constraint violation
       statusCode = 409;
       errorCode = 'CONFLICT';
       errorMessage = 'Resource already exists';
     }
     
     return { statusCode, errorCode, errorMessage };
    }
    ```

### 2. Error Monitoring and Alerting

**Current State**: Limited error monitoring.

**Recommendations**:

1. **Implement Error Monitoring Service Integration**
   - Integrate with error monitoring services (Sentry, Datadog, etc.)
   - Configure error grouping and prioritization
   - Set up tenant-aware error tracking

   ```typescript
   // src/utils/errorMonitoring.ts
   import * as Sentry from '@sentry/node';
   import { prisma } from '../lib/prisma';
   
   // Initialize Sentry
   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV,
     tracesSampleRate: 1.0,
     integrations: [
       // Enable HTTP calls tracing
       new Sentry.Integrations.Http({ tracing: true }),
     ],
   });
   
   // Configure tenant context for Sentry
   export function setTenantContext(tenantId: string, subdomain: string) {
     Sentry.configureScope((scope) => {
       scope.setTag('tenantId', tenantId);
       scope.setTag('subdomain', subdomain);
     });
   }
   
   // Clear tenant context
   export function clearTenantContext() {
     Sentry.configureScope((scope) => {
       scope.setTag('tenantId', undefined);
       scope.setTag('subdomain', undefined);
     });
   }
   
   // Report error to Sentry with tenant context
   export async function reportError(error: any, context: Record<string, any> = {}) {
     // Set tenant context if available
     if (context.tenantId) {
       setTenantContext(context.tenantId, context.subdomain);
     }
     
     // Add additional context
     Sentry.setContext('error', {
       ...context,
       errorCode: error.code,
       errorType: error.name,
     });
     
     // Capture exception
     Sentry.captureException(error);
     
     // Clear tenant context
     if (context.tenantId) {
       clearTenantContext();
     }
   }
   
   // Middleware to add Sentry request handler
   export function withSentry(handler: any) {
     return async (req: any, res: any) => {
       try {
         // Add tenant context if available
         if (req.adminId) {
           setTenantContext(req.adminId, req.subdomain);
         }
         
         return await handler(req, res);
       } catch (error) {
         // Report error to Sentry
         Sentry.withScope((scope) => {
           scope.setExtra('url', req.url);
           scope.setExtra('method', req.method);
           scope.setExtra('headers', req.headers);
           scope.setExtra('query', req.query);
           scope.setExtra('body', req.body);
           
           Sentry.captureException(error);
         });
         
         // Clear tenant context
         if (req.adminId) {
           clearTenantContext();
         }
         
         throw error; // Re-throw for regular error handling
       }
     };
   }
   ```

2. **Implement Error Alerting System**
   - Set up alerts for critical errors
   - Configure tenant-specific alert thresholds
   - Implement escalation procedures

   ```typescript
   // src/utils/errorAlerts.ts
   import { prisma } from '../lib/prisma';
   import { sendEmail } from './email';
   import { sendSlackNotification } from './slack';
   
   // Alert thresholds
   const alertThresholds = {
     // General thresholds
     general: {
       criticalErrorCount: 5, // Alert after 5 critical errors
       errorRateThreshold: 0.05, // Alert if error rate exceeds 5%
       timeWindow: 15 * 60 * 1000, // 15 minutes
     },
     // Tenant-specific thresholds
     tenant: {
       criticalErrorCount: 3, // Alert after 3 critical errors for a single tenant
       errorRateThreshold: 0.1, // Alert if tenant error rate exceeds 10%
       timeWindow: 15 * 60 * 1000, // 15 minutes
     },
   };
   
   // Check if alert should be triggered
   export async function checkAlertThresholds() {
     // Check general error thresholds
     await checkGeneralErrorThresholds();
     
     // Check tenant-specific thresholds
     await checkTenantErrorThresholds();
   }
   
   // Check general error thresholds
   async function checkGeneralErrorThresholds() {
     const timeWindow = new Date(Date.now() - alertThresholds.general.timeWindow);
     
     // Count critical errors in time window
     const criticalErrorCount = await prisma.errorLog.count({
       where: {
         createdAt: { gte: timeWindow },
         severity: 'CRITICAL',
       },
     });
     
     // Count all requests in time window
     const requestCount = await prisma.requestLog.count({
       where: {
         createdAt: { gte: timeWindow },
       },
     });
     
     // Count error requests in time window
     const errorRequestCount = await prisma.requestLog.count({
       where: {
         createdAt: { gte: timeWindow },
         status: { gte: 500 },
       },
     });
     
     // Calculate error rate
     const errorRate = requestCount > 0 ? errorRequestCount / requestCount : 0;
     
     // Check thresholds and trigger alerts
     if (criticalErrorCount >= alertThresholds.general.criticalErrorCount) {
       await triggerCriticalErrorAlert('general', criticalErrorCount);
     }
     
     if (errorRate >= alertThresholds.general.errorRateThreshold) {
       await triggerErrorRateAlert('general', errorRate, errorRequestCount, requestCount);
     }
   }
   
   // Check tenant-specific error thresholds
   async function checkTenantErrorThresholds() {
     const timeWindow = new Date(Date.now() - alertThresholds.tenant.timeWindow);
     
     // Get all active tenants
     const tenants = await prisma.admin.findMany({
       where: { status: 'ACTIVE' },
     });
     
     // Check thresholds for each tenant
     for (const tenant of tenants) {
       // Count tenant critical errors in time window
       const criticalErrorCount = await prisma.tenantErrorLog.count({
         where: {
           adminId: tenant.id,
           createdAt: { gte: timeWindow },
           errorType: { in: ['CRITICAL', 'FATAL'] },
         },
       });
       
       // Count all tenant requests in time window
       const requestCount = await prisma.requestLog.count({
         where: {
           tenantId: tenant.id,
           createdAt: { gte: timeWindow },
         },
       });
       
       // Count tenant error requests in time window
       const errorRequestCount = await prisma.requestLog.count({
         where: {
           tenantId: tenant.id,
           createdAt: { gte: timeWindow },
           status: { gte: 500 },
         },
       });
       
       // Calculate tenant error rate
       const errorRate = requestCount > 0 ? errorRequestCount / requestCount : 0;
       
       // Check thresholds and trigger alerts
       if (criticalErrorCount >= alertThresholds.tenant.criticalErrorCount) {
         await triggerCriticalErrorAlert('tenant', criticalErrorCount, tenant);
       }
       
       if (errorRate >= alertThresholds.tenant.errorRateThreshold) {
         await triggerErrorRateAlert('tenant', errorRate, errorRequestCount, requestCount, tenant);
       }
     }
   }
   
   // Trigger critical error alert
   async function triggerCriticalErrorAlert(type: 'general' | 'tenant', count: number, tenant?: any) {
     const subject = tenant
       ? `Critical Errors Alert for Tenant: ${tenant.subdomain}`
       : 'Critical Errors Alert';
     
     const message = tenant
       ? `${count} critical errors detected for tenant ${tenant.subdomain} (${tenant.id}) in the last ${alertThresholds.tenant.timeWindow / 60000} minutes.`
       : `${count} critical errors detected in the last ${alertThresholds.general.timeWindow / 60000} minutes.`;
     
     // Send email alert
     await sendEmail({
       to: process.env.ALERT_EMAIL,
       subject,
       text: message,
     });
     
     // Send Slack notification
     await sendSlackNotification({
       channel: process.env.ALERT_SLACK_CHANNEL,
       text: `🚨 *${subject}*\n${message}`,
     });
     
     // Log alert
     await prisma.alertLog.create({
       data: {
         type: 'CRITICAL_ERROR',
         message,
         tenantId: tenant?.id,
       },
     });
   }
   
   // Trigger error rate alert
   async function triggerErrorRateAlert(
     type: 'general' | 'tenant',
     rate: number,
     errorCount: number,
     requestCount: number,
     tenant?: any
   ) {
     const subject = tenant
       ? `High Error Rate Alert for Tenant: ${tenant.subdomain}`
       : 'High Error Rate Alert';
     
     const message = tenant
       ? `Error rate of ${(rate * 100).toFixed(2)}% detected for tenant ${tenant.subdomain} (${tenant.id}) in the last ${alertThresholds.tenant.timeWindow / 60000} minutes. ${errorCount} errors out of ${requestCount} requests.`
       : `Error rate of ${(rate * 100).toFixed(2)}% detected in the last ${alertThresholds.general.timeWindow / 60000} minutes. ${errorCount} errors out of ${requestCount} requests.`;
     
     // Send email alert
     await sendEmail({
       to: process.env.ALERT_EMAIL,
       subject,
       text: message,
     });
     
     // Send Slack notification
     await sendSlackNotification({
       channel: process.env.ALERT_SLACK_CHANNEL,
       text: `⚠️ *${subject}*\n${message}`,
     });
     
     // Log alert
     await prisma.alertLog.create({
       data: {
         type: 'ERROR_RATE',
         message,
         tenantId: tenant?.id,
       },
     });
   }
   ```

### 3. Error Recovery Strategies

**Current State**: Limited error recovery mechanisms.

**Recommendations**:

1. **Implement Circuit Breaker Pattern**
   - Prevent cascading failures in distributed systems
   - Automatically detect failures and prevent operation when system is faulty
   - Allow recovery time and graceful degradation

   ```typescript
   // src/utils/circuitBreaker.ts
   enum CircuitState {
     CLOSED,  // Normal operation, requests pass through
     OPEN,    // Circuit is open, requests fail fast
     HALF_OPEN // Testing if the service is back online
   }
   
   interface CircuitBreakerOptions {
     failureThreshold: number;     // Number of failures before opening circuit
     resetTimeout: number;         // Time in ms before attempting reset (half-open)
     maxHalfOpenCalls: number;     // Max calls in half-open state
     monitorInterval?: number;     // Interval to check health in ms
     tenantId?: string;            // Optional tenant ID for tenant-specific breakers
   }
   
   export class CircuitBreaker {
     private state: CircuitState = CircuitState.CLOSED;
     private failureCount: number = 0;
     private successCount: number = 0;
     private lastFailureTime: number = 0;
     private halfOpenCallCount: number = 0;
     private resetTimeoutId: NodeJS.Timeout | null = null;
     private monitorIntervalId: NodeJS.Timeout | null = null;
     
     constructor(
       private readonly serviceName: string,
       private readonly options: CircuitBreakerOptions,
       private readonly onStateChange?: (oldState: CircuitState, newState: CircuitState) => void
     ) {
       // Start health monitoring if interval is provided
       if (options.monitorInterval) {
         this.startMonitoring();
       }
     }
     
     // Execute function with circuit breaker protection
     async execute<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
       // If circuit is open, fail fast
       if (this.state === CircuitState.OPEN) {
         if (this.shouldAttemptReset()) {
           this.toHalfOpen();
         } else {
           if (fallback) {
             return fallback();
           }
           throw new Error(`Circuit for ${this.serviceName} is OPEN`);
         }
       }
       
       // If circuit is half-open, limit the number of calls
       if (this.state === CircuitState.HALF_OPEN) {
         if (this.halfOpenCallCount >= this.options.maxHalfOpenCalls) {
           if (fallback) {
             return fallback();
           }
           throw new Error(`Too many requests in HALF-OPEN state for ${this.serviceName}`);
         }
         this.halfOpenCallCount++;
       }
       
       try {
         // Execute the function
         const result = await fn();
         
         // On success
         this.onSuccess();
         return result;
       } catch (error) {
         // On failure
         this.onFailure();
         
         // If fallback is provided, execute it
         if (fallback) {
           return fallback();
         }
         
         throw error;
       }
     }
     
     // Handle successful execution
     private onSuccess(): void {
       if (this.state === CircuitState.HALF_OPEN) {
         this.successCount++;
         
         // If enough successes in half-open state, close the circuit
         if (this.successCount >= this.options.maxHalfOpenCalls) {
           this.toClosed();
         }
       }
       
       // Reset failure count in closed state
       if (this.state === CircuitState.CLOSED) {
         this.failureCount = 0;
       }
     }
     
     // Handle failed execution
     private onFailure(): void {
       this.lastFailureTime = Date.now();
       this.failureCount++;
       
       // If in half-open state, any failure opens the circuit
       if (this.state === CircuitState.HALF_OPEN) {
         this.toOpen();
         return;
       }
       
       // If failure threshold is reached, open the circuit
       if (this.state === CircuitState.CLOSED && 
           this.failureCount >= this.options.failureThreshold) {
         this.toOpen();
       }
     }
     
     // Change state to OPEN
     private toOpen(): void {
       if (this.state === CircuitState.OPEN) return;
       
       const oldState = this.state;
       this.state = CircuitState.OPEN;
       this.resetTimeoutId = setTimeout(() => {
         this.toHalfOpen();
       }, this.options.resetTimeout);
       
       if (this.onStateChange) {
         this.onStateChange(oldState, this.state);
       }
       
       // Log state change
       console.log(`Circuit for ${this.serviceName} changed from ${CircuitState[oldState]} to ${CircuitState[this.state]}`);
     }
     
     // Change state to HALF-OPEN
     private toHalfOpen(): void {
       if (this.state === CircuitState.HALF_OPEN) return;
       
       const oldState = this.state;
       this.state = CircuitState.HALF_OPEN;
       this.halfOpenCallCount = 0;
       this.successCount = 0;
       
       if (this.resetTimeoutId) {
         clearTimeout(this.resetTimeoutId);
         this.resetTimeoutId = null;
       }
       
       if (this.onStateChange) {
         this.onStateChange(oldState, this.state);
       }
       
       // Log state change
       console.log(`Circuit for ${this.serviceName} changed from ${CircuitState[oldState]} to ${CircuitState[this.state]}`);
     }
     
     // Change state to CLOSED
     private toClosed(): void {
       if (this.state === CircuitState.CLOSED) return;
       
       const oldState = this.state;
       this.state = CircuitState.CLOSED;
       this.failureCount = 0;
       this.successCount = 0;
       this.halfOpenCallCount = 0;
       
       if (this.onStateChange) {
         this.onStateChange(oldState, this.state);
       }
       
       // Log state change
       console.log(`Circuit for ${this.serviceName} changed from ${CircuitState[oldState]} to ${CircuitState[this.state]}`);
     }
     
     // Check if enough time has passed to attempt reset
     private shouldAttemptReset(): boolean {
       const now = Date.now();
       return (now - this.lastFailureTime) > this.options.resetTimeout;
     }
     
     // Start health monitoring
     private startMonitoring(): void {
       if (this.monitorIntervalId) return;
       
       this.monitorIntervalId = setInterval(() => {
         // Implement health check logic here
         // For example, ping the service and update circuit state
       }, this.options.monitorInterval);
     }
     
     // Stop health monitoring
     public stopMonitoring(): void {
       if (this.monitorIntervalId) {
         clearInterval(this.monitorIntervalId);
         this.monitorIntervalId = null;
       }
     }
     
     // Get current state
     public getState(): string {
       return CircuitState[this.state];
     }
     
     // Force circuit to specific state (for testing)
     public forceState(state: CircuitState): void {
       const oldState = this.state;
       this.state = state;
       
       if (this.onStateChange) {
         this.onStateChange(oldState, this.state);
       }
     }
   }
   
   // Circuit breaker registry to manage multiple circuit breakers
   export class CircuitBreakerRegistry {
     private static instance: CircuitBreakerRegistry;
     private breakers: Map<string, CircuitBreaker> = new Map();
     
     private constructor() {}
     
     // Get singleton instance
     public static getInstance(): CircuitBreakerRegistry {
       if (!CircuitBreakerRegistry.instance) {
         CircuitBreakerRegistry.instance = new CircuitBreakerRegistry();
       }
       return CircuitBreakerRegistry.instance;
     }
     
     // Get or create circuit breaker
     public getOrCreate(serviceName: string, options: CircuitBreakerOptions): CircuitBreaker {
       // For tenant-specific circuit breakers, include tenant ID in key
       const key = options.tenantId ? `${serviceName}-${options.tenantId}` : serviceName;
       
       if (!this.breakers.has(key)) {
         this.breakers.set(key, new CircuitBreaker(serviceName, options));
       }
       
       return this.breakers.get(key)!;
     }
     
     // Get all circuit breakers
     public getAll(): Map<string, CircuitBreaker> {
       return this.breakers;
     }
     
     // Reset all circuit breakers
     public resetAll(): void {
       this.breakers.forEach(breaker => {
         breaker.forceState(CircuitState.CLOSED);
       });
     }
   }
   ```

2. **Implement Retry Mechanism with Exponential Backoff**
   - Automatically retry failed operations with increasing delays
   - Prevent overwhelming services during recovery
   - Configure tenant-specific retry policies

   ```typescript
   // src/utils/retry.ts
   interface RetryOptions {
     maxRetries: number;          // Maximum number of retry attempts
     initialDelay: number;        // Initial delay in ms
     maxDelay: number;           // Maximum delay in ms
     backoffFactor: number;      // Multiplier for each subsequent retry
     retryableErrors?: string[]; // List of error types that should be retried
     tenantId?: string;          // Optional tenant ID for tenant-specific policies
   }
   
   export class RetryService {
     private static instance: RetryService;
     private tenantPolicies: Map<string, RetryOptions> = new Map();
     private defaultPolicy: RetryOptions = {
       maxRetries: 3,
       initialDelay: 100,
       maxDelay: 5000,
       backoffFactor: 2,
       retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'NETWORK_ERROR']
     };
     
     private constructor() {}
     
     // Get singleton instance
     public static getInstance(): RetryService {
       if (!RetryService.instance) {
         RetryService.instance = new RetryService();
       }
       return RetryService.instance;
     }
     
     // Set tenant-specific retry policy
     public setTenantPolicy(tenantId: string, options: Partial<RetryOptions>): void {
       const currentPolicy = this.tenantPolicies.get(tenantId) || { ...this.defaultPolicy };
       this.tenantPolicies.set(tenantId, { ...currentPolicy, ...options });
     }
     
     // Get retry policy for tenant or default
     public getPolicy(tenantId?: string): RetryOptions {
       if (tenantId && this.tenantPolicies.has(tenantId)) {
         return this.tenantPolicies.get(tenantId)!;
       }
       return this.defaultPolicy;
     }
     
     // Set default retry policy
     public setDefaultPolicy(options: Partial<RetryOptions>): void {
       this.defaultPolicy = { ...this.defaultPolicy, ...options };
     }
     
     // Execute function with retry logic
     public async execute<T>(
       fn: () => Promise<T>,
       options?: Partial<RetryOptions>,
       tenantId?: string
     ): Promise<T> {
       // Get policy based on tenant ID and override with provided options
       const policy = { ...this.getPolicy(tenantId), ...options };
       let lastError: any;
       
       for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
         try {
           // First attempt is not a retry
           if (attempt > 0) {
             // Calculate delay with exponential backoff
             const delay = Math.min(
               policy.initialDelay * Math.pow(policy.backoffFactor, attempt - 1),
               policy.maxDelay
             );
             
             // Add jitter to prevent synchronized retries
             const jitter = Math.random() * 0.2 * delay;
             const finalDelay = delay + jitter;
             
             // Wait before retry
             await new Promise(resolve => setTimeout(resolve, finalDelay));
             
             console.log(`Retry attempt ${attempt}/${policy.maxRetries} after ${finalDelay.toFixed(0)}ms`);
           }
           
           // Execute function
           return await fn();
         } catch (error: any) {
           lastError = error;
           
           // Check if error is retryable
           const errorType = error.code || error.name || 'UNKNOWN_ERROR';
           const isRetryable = !policy.retryableErrors || 
                              policy.retryableErrors.includes(errorType);
           
           // If error is not retryable or max retries reached, throw
           if (!isRetryable || attempt === policy.maxRetries) {
             throw error;
           }
           
           // Log retry attempt
           console.log(`Operation failed with error: ${errorType}. Retrying...`);
         }
       }
       
       // This should never be reached due to the throw in the loop
       throw lastError;
     }
   }
   ```

3. **Implement Graceful Degradation**
   - Provide fallback functionality when services fail
   - Prioritize critical features during partial outages
   - Implement tenant-specific degradation policies

   ```typescript
   // src/utils/degradation.ts
   enum FeatureCriticality {
     CRITICAL,    // Essential for core functionality
     HIGH,        // Important but not critical
     MEDIUM,      // Useful but can be degraded
     LOW          // Nice-to-have features
   }
   
   interface FeatureConfig {
     name: string;
     criticality: FeatureCriticality;
     fallbackFn?: () => any;
     tenantOverrides?: Map<string, {
       criticality?: FeatureCriticality;
       fallbackFn?: () => any;
     }>;
   }
   
   export class GracefulDegradation {
     private static instance: GracefulDegradation;
     private features: Map<string, FeatureConfig> = new Map();
     private degradedFeatures: Set<string> = new Set();
     private systemHealth: number = 100; // 0-100 health score
     
     private constructor() {}
     
     // Get singleton instance
     public static getInstance(): GracefulDegradation {
       if (!GracefulDegradation.instance) {
         GracefulDegradation.instance = new GracefulDegradation();
       }
       return GracefulDegradation.instance;
     }
     
     // Register feature with configuration
     public registerFeature(config: FeatureConfig): void {
       this.features.set(config.name, config);
     }
     
     // Set tenant-specific overrides for a feature
     public setTenantOverride(
       featureName: string,
       tenantId: string,
       overrides: {
         criticality?: FeatureCriticality;
         fallbackFn?: () => any;
       }
     ): void {
       const feature = this.features.get(featureName);
       if (!feature) {
         throw new Error(`Feature ${featureName} not registered`);
       }
       
       if (!feature.tenantOverrides) {
         feature.tenantOverrides = new Map();
       }
       
       feature.tenantOverrides.set(tenantId, overrides);
     }
     
     // Mark feature as degraded
     public degradeFeature(featureName: string): void {
       if (!this.features.has(featureName)) {
         throw new Error(`Feature ${featureName} not registered`);
       }
       
       this.degradedFeatures.add(featureName);
       this.recalculateSystemHealth();
     }
     
     // Mark feature as restored
     public restoreFeature(featureName: string): void {
       this.degradedFeatures.delete(featureName);
       this.recalculateSystemHealth();
     }
     
     // Check if feature is available
     public isFeatureAvailable(featureName: string, tenantId?: string): boolean {
       // If feature is not registered, consider it unavailable
       if (!this.features.has(featureName)) {
         return false;
       }
       
       // If feature is not degraded, it's available
       if (!this.degradedFeatures.has(featureName)) {
         return true;
       }
       
       // If system health is critical, only critical features are available
       const feature = this.features.get(featureName)!;
       let criticality = feature.criticality;
       
       // Apply tenant-specific overrides if available
       if (tenantId && feature.tenantOverrides?.has(tenantId)) {
         const override = feature.tenantOverrides.get(tenantId);
         if (override?.criticality !== undefined) {
           criticality = override.criticality;
         }
       }
       
       // Based on system health, determine if feature should be available
       if (this.systemHealth < 25 && criticality !== FeatureCriticality.CRITICAL) {
         return false;
       }
       
       if (this.systemHealth < 50 && 
           criticality !== FeatureCriticality.CRITICAL && 
           criticality !== FeatureCriticality.HIGH) {
         return false;
       }
       
       if (this.systemHealth < 75 && criticality === FeatureCriticality.LOW) {
         return false;
       }
       
       return true;
     }
     
     // Execute feature with graceful degradation
     public async executeFeature<T>(
       featureName: string,
       fn: () => Promise<T>,
       tenantId?: string
     ): Promise<T> {
       // Check if feature is available
       if (!this.isFeatureAvailable(featureName, tenantId)) {
         // Get feature configuration
         const feature = this.features.get(featureName)!;
         let fallbackFn = feature.fallbackFn;
         
         // Apply tenant-specific fallback if available
         if (tenantId && feature.tenantOverrides?.has(tenantId)) {
           const override = feature.tenantOverrides.get(tenantId);
           if (override?.fallbackFn) {
             fallbackFn = override.fallbackFn;
           }
         }
         
         // If fallback is available, execute it
         if (fallbackFn) {
           return fallbackFn() as T;
         }
         
         // Otherwise, throw error
         throw new Error(`Feature ${featureName} is currently unavailable`);
       }
       
       try {
         // Execute feature function
         return await fn();
       } catch (error) {
         // Mark feature as degraded on error
         this.degradeFeature(featureName);
         throw error;
       }
     }
     
     // Recalculate system health based on degraded features
     private recalculateSystemHealth(): void {
       if (this.degradedFeatures.size === 0) {
         this.systemHealth = 100;
         return;
       }
       
       // Count features by criticality
       let criticalDegraded = 0;
       let highDegraded = 0;
       let mediumDegraded = 0;
       let lowDegraded = 0;
       
       this.degradedFeatures.forEach(featureName => {
         const feature = this.features.get(featureName);
         if (!feature) return;
         
         switch (feature.criticality) {
           case FeatureCriticality.CRITICAL:
             criticalDegraded++;
             break;
           case FeatureCriticality.HIGH:
             highDegraded++;
             break;
           case FeatureCriticality.MEDIUM:
             mediumDegraded++;
             break;
           case FeatureCriticality.LOW:
             lowDegraded++;
             break;
         }
       });
       
       // Calculate health score (weighted by criticality)
       const totalFeatures = this.features.size;
       const criticalWeight = 50;
       const highWeight = 30;
       const mediumWeight = 15;
       const lowWeight = 5;
       
       const criticalCount = Array.from(this.features.values())
         .filter(f => f.criticality === FeatureCriticality.CRITICAL).length;
       const highCount = Array.from(this.features.values())
         .filter(f => f.criticality === FeatureCriticality.HIGH).length;
       const mediumCount = Array.from(this.features.values())
         .filter(f => f.criticality === FeatureCriticality.MEDIUM).length;
       const lowCount = Array.from(this.features.values())
         .filter(f => f.criticality === FeatureCriticality.LOW).length;
       
       const criticalImpact = criticalCount > 0 ? (criticalDegraded / criticalCount) * criticalWeight : 0;
       const highImpact = highCount > 0 ? (highDegraded / highCount) * highWeight : 0;
       const mediumImpact = mediumCount > 0 ? (mediumDegraded / mediumCount) * mediumWeight : 0;
       const lowImpact = lowCount > 0 ? (lowDegraded / lowCount) * lowWeight : 0;
       
       const totalImpact = criticalImpact + highImpact + mediumImpact + lowImpact;
       this.systemHealth = Math.max(0, 100 - totalImpact);
       
       console.log(`System health recalculated: ${this.systemHealth.toFixed(2)}%`);
     }
     
     // Get current system health
     public getSystemHealth(): number {
       return this.systemHealth;
     }
     
     // Get all degraded features
     public getDegradedFeatures(): string[] {
       return Array.from(this.degradedFeatures);
     }
   }
   ```

### 4. Error Classification

**Recommendations**:

1. **Define Error Hierarchy**
   - Create a hierarchy of error classes
   - Categorize errors by type and severity
   - Include appropriate metadata with each error type

   ```typescript
   // src/utils/errors.ts
   export class AppError extends Error {
     public readonly code: string;
     public readonly statusCode: number;
     public readonly isOperational: boolean;
     public readonly details?: any;
     
     constructor(message: string, code: string, statusCode: number, isOperational: boolean, details?: any) {
       super(message);
       this.name = this.constructor.name;
       this.code = code;
       this.statusCode = statusCode;
       this.isOperational = isOperational;
       this.details = details;
       Error.captureStackTrace(this, this.constructor);
     }
   }
   
   // API Errors
   export class APIError extends AppError {
     constructor(message: string, code = 'API_ERROR', statusCode = 500, details?: any) {
       super(message, code, statusCode, true, details);
     }
   }
   
   export class ValidationError extends AppError {
     constructor(message: string, details?: any) {
       super(message, 'VALIDATION_ERROR', 400, true, details);
     }
   }
   
   export class AuthenticationError extends AppError {
     constructor(message = 'Authentication required') {
       super(message, 'AUTHENTICATION_ERROR', 401, true);
     }
   }
   
   export class AuthorizationError extends AppError {
     constructor(message = 'Access denied') {
       super(message, 'AUTHORIZATION_ERROR', 403, true);
     }
   }
   
   export class ResourceNotFoundError extends AppError {
     constructor(resource: string, identifier?: string) {
       const message = identifier 
         ? `${resource} not found with identifier: ${identifier}` 
         : `${resource} not found`;
       super(message, 'RESOURCE_NOT_FOUND', 404, true);
     }
   }
   
   // Database Errors
   export class DatabaseError extends AppError {
     constructor(message: string, code = 'DATABASE_ERROR', details?: any) {
       super(message, code, 500, true, details);
     }
   }
   
   // Tenant-specific Errors
   export class TenantError extends AppError {
     constructor(message: string, code = 'TENANT_ERROR', statusCode = 400, details?: any) {
       super(message, code, statusCode, true, details);
     }
   }
   
   export class TenantNotFoundError extends TenantError {
     constructor(identifier?: string) {
       const message = identifier 
         ? `Tenant not found with identifier: ${identifier}` 
         : 'Tenant not found';
       super(message, 'TENANT_NOT_FOUND', 404);
     }
   }
   
   export class TenantConfigurationError extends TenantError {
     constructor(message: string, details?: any) {
       super(message, 'TENANT_CONFIGURATION_ERROR', 500, details);
     }
   }
   ```

2. **Implement Error Factory Functions**
   - Create factory functions for common error scenarios
   - Ensure consistent error creation across the application
   - Include context-specific information

   ```typescript
   // src/utils/errorFactory.ts
   import * as errors from './errors';
   
   export function createValidationError(message: string, validationErrors: any[]) {
     return new errors.ValidationError(message, { validationErrors });
   }
   
   export function createResourceNotFoundError(resource: string, id?: string) {
     return new errors.ResourceNotFoundError(resource, id);
   }
   
   export function createDatabaseError(originalError: any) {
     // Extract useful information from database errors
     let code = 'DATABASE_ERROR';
     let message = 'Database operation failed';
     let details = undefined;
     
     // Handle Prisma-specific errors
     if (originalError.code) {
       if (originalError.code === 'P2002') {
         code = 'UNIQUE_CONSTRAINT_VIOLATION';
         message = 'A record with this information already exists';
         details = { fields: originalError.meta?.target };
       } else if (originalError.code === 'P2025') {
         code = 'RECORD_NOT_FOUND';
         message = 'Record not found';
       }
     }
     
     return new errors.DatabaseError(message, code, details);
   }
   
   export function createTenantError(tenantId: string, errorType: string, message: string) {
     switch (errorType) {
       case 'NOT_FOUND':
         return new errors.TenantNotFoundError(tenantId);
       case 'CONFIGURATION':
         return new errors.TenantConfigurationError(message, { tenantId });
       default:
         return new errors.TenantError(message, 'TENANT_ERROR', 400, { tenantId });
     }
   }
   ```

## API Error Handling

### 1. Input Validation

**Current State**: Inconsistent validation across endpoints.

**Recommendations**:

1. **Implement Request Validation Middleware**
   - Use a validation library like Joi or Zod
   - Validate request parameters, query strings, and body
   - Return detailed validation errors

   ```typescript
   // src/middleware/validationMiddleware.ts
   import { NextApiRequest, NextApiResponse } from 'next';
   import { Schema } from 'zod';
   import { createValidationError } from '../utils/errorFactory';
   
   export function withValidation(schema: Schema) {
     return async (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
       try {
         // Validate request against schema
         const validationTarget = {
           body: req.body,
           query: req.query,
           params: req.query, // In Next.js, dynamic route params are in req.query
         };
         
         await schema.parseAsync(validationTarget);
         return next();
       } catch (error) {
         // Extract validation errors
         const validationErrors = error.errors || [];
         
         // Create validation error response
         const validationError = createValidationError(
           'Validation failed',
           validationErrors
         );
         
         // Send validation error response
         res.status(400).json({
           status: 'error',
           code: validationError.code,
           message: validationError.message,
           details: validationError.details,
         });
       }
     };
   }
   
   // Example usage in API route
   import { z } from 'zod';
   
   const createProductSchema = z.object({
     body: z.object({
       name: z.string().min(1).max(100),
       price: z.number().positive(),
       description: z.string().optional(),
       categoryId: z.string().uuid(),
     }),
   });
   
   export default withErrorHandling(
     withValidation(createProductSchema)(
       async (req: NextApiRequest, res: NextApiResponse) => {
         // API logic here
       }
     )
   );
   ```

2. **Implement Domain Validation**
   - Validate business rules and domain constraints
   - Separate domain validation from input validation
   - Return specific error codes for domain validation failures

   ```typescript
   // src/services/productService.ts
   import { Product } from '@prisma/client';
   import { prisma } from '../lib/prisma';
   import { createValidationError } from '../utils/errorFactory';
   
   export async function createProduct(adminId: string, productData: Omit<Product, 'id' | 'adminId' | 'createdAt' | 'updatedAt'>) {
     // Domain validation
     const validationErrors = [];
     
     // Check if category exists
     const category = await prisma.category.findUnique({
       where: { id: productData.categoryId },
     });
     
     if (!category) {
       validationErrors.push({
         field: 'categoryId',
         message: 'Category does not exist',
       });
     }
     
     // Check if category belongs to the tenant
     if (category && category.adminId !== adminId) {
       validationErrors.push({
         field: 'categoryId',
         message: 'Category does not belong to this tenant',
       });
     }
     
     // Check inventory constraints
     if (productData.inventory < 0) {
       validationErrors.push({
         field: 'inventory',
         message: 'Inventory cannot be negative',
       });
     }
     
     // If validation errors exist, throw validation error
     if (validationErrors.length > 0) {
       throw createValidationError('Product validation failed', validationErrors);
     }
     
     // Create product
     return prisma.product.create({
       data: {
         ...productData,
         adminId,
       },
     });
   }
   ```

### 2. API Response Handling

**Recommendations**:

1. **Standardize Success Responses**
   - Implement consistent success response structure
   - Include metadata with responses when appropriate
   - Use appropriate HTTP status codes

   ```typescript
   // src/utils/responseHandler.ts
   export interface SuccessResponse<T> {
     status: 'success';
     data: T;
     meta?: {
       page?: number;
       limit?: number;
       total?: number;
       [key: string]: any;
     };
   }
   
   export function createSuccessResponse<T>(data: T, meta?: any): SuccessResponse<T> {
     return {
       status: 'success',
       data,
       meta,
     };
   }
   
   // Example usage in API route
   export default async function handler(req: NextApiRequest, res: NextApiResponse) {
     try {
       const products = await getProducts(req.adminId, req.query);
       
       res.status(200).json(createSuccessResponse(
         products.data,
         {
           page: products.page,
           limit: products.limit,
           total: products.total,
         }
       ));
     } catch (error) {
       // Error handling
     }
   }
   ```

2. **Implement Response Envelope Pattern**
   - Wrap all responses in a consistent envelope
   - Include request ID for tracking
   - Add timing information for performance monitoring

   ```typescript
   // src/middleware/responseEnvelopeMiddleware.ts
   import { NextApiRequest, NextApiResponse } from 'next';
   
   export function withResponseEnvelope(handler: any) {
     return async (req: NextApiRequest, res: NextApiResponse) => {
       // Store original res.json function
       const originalJson = res.json;
       const startTime = Date.now();
       const requestId = req.headers['x-request-id'] || generateRequestId();
       
       // Override res.json to wrap response in envelope
       res.json = function(body: any) {
         const responseTime = Date.now() - startTime;
         
         const envelope = {
           requestId,
           responseTime,
           ...body,
         };
         
         return originalJson.call(this, envelope);
       };
       
       // Add request ID to response headers
       res.setHeader('X-Request-ID', requestId);
       
       return handler(req, res);
     };
   }
   
   // Example usage
   export default withResponseEnvelope(
     withErrorHandling(
       async (req: NextApiRequest, res: NextApiResponse) => {
         // API logic here
       }
     )
   );
   ```

## Multi-Tenant Error Handling

### 1. Tenant-Specific Error Handling

**Recommendations**:

1. **Implement Tenant Context in Errors**
   - Include tenant information in error context
   - Log tenant-specific error patterns
   - Implement tenant-specific error handling when appropriate

   ```typescript
   // src/middleware/tenantErrorHandlingMiddleware.ts
   import { NextApiRequest, NextApiResponse } from 'next';
   import { logger } from '../utils/logger';
   import { createErrorResponse } from '../utils/errorHandler';
   
   export function withTenantErrorHandling(handler: any) {
     return async (req: NextApiRequest, res: NextApiResponse) => {
       try {
         return await handler(req, res);
       } catch (error) {
         // Extract tenant information
         const tenantId = req.adminId;
         const subdomain = req.subdomain;
         
         // Log error with tenant context
         logger.error({
           message: 'Tenant-specific error occurred',
           error: error instanceof Error ? error.message : String(error),
           stack: error instanceof Error ? error.stack : undefined,
           tenantId,
           subdomain,
           path: req.url,
           method: req.method,
         });
         
         // Check for tenant-specific error handling
         if (error.name === 'TenantNotFoundError') {
           return res.status(404).json(createErrorResponse(
             'TENANT_NOT_FOUND',
             'The requested tenant does not exist',
             { subdomain }
           ));
         }
         
         if (error.name === 'TenantConfigurationError') {
           // Notify administrators about configuration issues
           await notifyTenantConfigurationIssue(tenantId, error);
           
           return res.status(500).json(createErrorResponse(
             'TENANT_CONFIGURATION_ERROR',
             'There is a configuration issue with this tenant',
             process.env.NODE_ENV === 'development' ? { details: error.message } : undefined
           ));
         }
         
         // Handle other errors
         const { statusCode, errorCode, errorMessage } = categorizeError(error);
         
         res.status(statusCode).json(createErrorResponse(
           errorCode,
           errorMessage,
           process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined
         ));
       }
     };
   }
   
   async function notifyTenantConfigurationIssue(tenantId: string, error: any) {
     // Implementation to notify administrators
     // This could send an email, create a ticket, etc.
   }
   ```

2. **Implement Tenant-Specific Error Messages**
   - Customize error messages based on tenant configuration
   - Support localization of error messages
   - Allow tenant administrators to customize certain error messages

   ```typescript
   // src/utils/tenantErrorMessages.ts
   import { prisma } from '../lib/prisma';
   
   // Cache for tenant error messages
   const errorMessageCache = new Map<string, Record<string, string>>();
   
   export async function getTenantErrorMessage(tenantId: string, errorCode: string, defaultMessage: string): Promise<string> {
     try {
       // Check cache first
       if (!errorMessageCache.has(tenantId)) {
         // Get tenant error message configuration
         const tenant = await prisma.admin.findUnique({
           where: { id: tenantId },
           include: { errorMessages: true },
         });
         
         if (!tenant) {
           return defaultMessage;
         }
         
         // Cache tenant error messages
         const messages: Record<string, string> = {};
         tenant.errorMessages.forEach(msg => {
           messages[msg.errorCode] = msg.message;
         });
         
         errorMessageCache.set(tenantId, messages);
       }
       
       // Get cached messages
       const messages = errorMessageCache.get(tenantId);
       
       // Return tenant-specific message or default
       return messages[errorCode] || defaultMessage;
     } catch (error) {
       // If any error occurs, return default message
       return defaultMessage;
     }
   }
   
   // Example usage in error handling middleware
   const errorMessage = await getTenantErrorMessage(
     tenantId,
     errorCode,
     defaultErrorMessage
   );
   ```

### 2. Cross-Tenant Error Isolation

**Recommendations**:

1. **Implement Tenant Error Isolation**
   - Prevent error details from leaking across tenants
   - Sanitize error messages for cross-tenant operations
   - Implement strict error boundaries between tenants

   ```typescript
   // src/utils/errorSanitizer.ts
   export function sanitizeErrorForTenant(error: any, currentTenantId: string, targetTenantId?: string) {
     // If error doesn't contain tenant information or tenants match, return as is
     if (!error.details?.tenantId || error.details.tenantId === currentTenantId) {
       return error;
     }
     
     // If error is from another tenant, sanitize details
     const sanitizedError = { ...error };
     
     // Remove sensitive details
     delete sanitizedError.details;
     delete sanitizedError.stack;
     
     // Replace with generic message for cross-tenant errors
     sanitizedError.message = 'An error occurred in another tenant';
     
     return sanitizedError;
   }
   
   // Example usage in cross-tenant operations
   try {
     // Operation that might involve multiple tenants
     const result = await crossTenantOperation(sourceTenantId, targetTenantId);
     return result;
   } catch (error) {
     // Sanitize error before logging or returning
     const sanitizedError = sanitizeErrorForTenant(error, currentTenantId);
     throw sanitizedError;
   }
   ```

2. **Implement Admin-Only Error Details**
   - Provide detailed error information to administrators
   - Restrict sensitive error details from regular users
   - Implement role-based error detail visibility

   ```typescript
   // src/utils/errorDetailVisibility.ts
   export function getErrorDetailsForUser(error: any, user: any) {
     // Create base error response
     const errorResponse = {
       status: 'error',
       code: error.code || 'UNKNOWN_ERROR',
       message: error.message || 'An unexpected error occurred',
     };
     
     // Add details for administrators or in development
     if (user?.role === 'ADMIN' || process.env.NODE_ENV === 'development') {
       return {
         ...errorResponse,
         details: error.details,
         stack: error.stack,
       };
     }
     
     // Return limited information for regular users
     return errorResponse;
   }
   
   // Example usage in API route
   export default async function handler(req: NextApiRequest, res: NextApiResponse) {
     try {
       // API logic
     } catch (error) {
       const errorResponse = getErrorDetailsForUser(error, req.user);
       res.status(error.statusCode || 500).json(errorResponse);
     }
   }
   ```

## Frontend Error Handling

### 1. API Error Handling

**Current State**: Inconsistent error handling in frontend components.

**Recommendations**:

1. **Implement API Client with Error Handling**
   - Create a centralized API client
   - Handle common error scenarios
   - Provide consistent error handling across components

   ```typescript
   // src/lib/apiClient.ts
   import axios, { AxiosError, AxiosRequestConfig } from 'axios';
   
   // Create axios instance
   const api = axios.create({
     baseURL: '/api',
     headers: {
       'Content-Type': 'application/json',
     },
   });
   
   // Add request interceptor
   api.interceptors.request.use(
     (config) => {
       // Add request ID
       config.headers['X-Request-ID'] = generateRequestId();
       return config;
     },
     (error) => Promise.reject(error)
   );
   
   // Add response interceptor
   api.interceptors.response.use(
     (response) => response,
     (error: AxiosError) => {
       // Handle API errors
       if (error.response) {
         // Server responded with error status
         const status = error.response.status;
         const data = error.response.data as any;
         
         // Handle specific error scenarios
         if (status === 401) {
           // Authentication error - redirect to login
           window.location.href = '/login';
         } else if (status === 403) {
           // Authorization error
           console.error('Access denied:', data.message);
         } else if (status === 404) {
           // Resource not found
           console.error('Resource not found:', data.message);
         } else if (status === 429) {
           // Rate limiting
           console.error('Rate limit exceeded. Please try again later.');
         }
         
         // Return structured error
         return Promise.reject({
           status: status,
           code: data.code || 'API_ERROR',
           message: data.message || 'An error occurred',
           details: data.details,
         });
       } else if (error.request) {
         // Request made but no response received
         console.error('Network error:', error.message);
         return Promise.reject({
           status: 0,
           code: 'NETWORK_ERROR',
           message: 'Network error. Please check your connection.',
         });
       } else {
         // Error in setting up the request
         console.error('Request error:', error.message);
         return Promise.reject({
           status: 0,
           code: 'REQUEST_ERROR',
           message: 'Error setting up the request.',
         });
       }
     }
   );
   
   // API client methods
   export const apiClient = {
     async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
       const response = await api.get<T>(url, config);
       return response.data;
     },
     
     async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
       const response = await api.post<T>(url, data, config);
       return response.data;
     },
     
     async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
       const response = await api.put<T>(url, data, config);
       return response.data;
     },
     
     async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
       const response = await api.delete<T>(url, config);
       return response.data;
     },
   };
   ```

2. **Implement Error Boundary Components**
   - Create React error boundaries to catch rendering errors
   - Implement fallback UI for error states
   - Provide context-specific error handling

   ```tsx
   // src/components/ErrorBoundary.tsx
   import React, { Component, ErrorInfo, ReactNode } from 'react';
   import { logger } from '../utils/logger';
   
   interface Props {
     children: ReactNode;
     fallback?: ReactNode | ((error: Error) => ReactNode);
     onError?: (error: Error, errorInfo: ErrorInfo) => void;
   }
   
   interface State {
     hasError: boolean;
     error: Error | null;
   }
   
   export class ErrorBoundary extends Component<Props, State> {
     constructor(props: Props) {
       super(props);
       this.state = {
         hasError: false,
         error: null,
       };
     }
   
     static getDerivedStateFromError(error: Error): State {
       return {
         hasError: true,
         error,
       };
     }
   
     componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
       // Log the error
       logger.error({
         message: 'React component error',
         error: error.message,
         stack: error.stack,
         componentStack: errorInfo.componentStack,
       });
   
       // Call onError callback if provided
       if (this.props.onError) {
         this.props.onError(error, errorInfo);
       }
     }
   
     render(): ReactNode {
       if (this.state.hasError) {
         // Render fallback UI
         if (this.props.fallback) {
           if (typeof this.props.fallback === 'function') {
             return this.props.fallback(this.state.error!);
           }
           return this.props.fallback;
         }
   
         // Default fallback UI
         return (
           <div className="error-boundary">
             <h2>Something went wrong.</h2>
             <p>Please try refreshing the page or contact support if the problem persists.</p>
             {process.env.NODE_ENV === 'development' && (
               <details>
                 <summary>Error details</summary>
                 <pre>{this.state.error?.message}</pre>
                 <pre>{this.state.error?.stack}</pre>
               </details>
             )}
           </div>
         );
       }
   
       return this.props.children;
     }
   }
   
   // Example usage
   function ProductList() {
     return (
       <ErrorBoundary
         fallback={<div>Error loading products. Please try again later.</div>}
         onError={(error) => trackError('ProductList', error)}
       >
         {/* Component content */}
       </ErrorBoundary>
     );
   }
   ```

### 2. User-Friendly Error Messages

**Recommendations**:

1. **Implement Error Message Catalog**
   - Create a centralized catalog of user-friendly error messages
   - Map technical error codes to user-friendly messages
   - Support localization of error messages

   ```typescript
   // src/utils/errorMessages.ts
   import { i18n } from '../lib/i18n';
   
   interface ErrorMessageMap {
     [key: string]: string | ((params?: any) => string);
   }
   
   const errorMessages: Record<string, ErrorMessageMap> = {
     en: {
       // Authentication errors
       'AUTHENTICATION_ERROR': 'Please sign in to continue.',
       'INVALID_CREDENTIALS': 'The email or password you entered is incorrect.',
       'ACCOUNT_LOCKED': 'Your account has been locked. Please contact support.',
       
       // Validation errors
       'VALIDATION_ERROR': 'Please check your input and try again.',
       'REQUIRED_FIELD': (params) => `${params.field} is required.`,
       'INVALID_FORMAT': (params) => `${params.field} has an invalid format.`,
       
       // Resource errors
       'RESOURCE_NOT_FOUND': (params) => `The requested ${params.resource} could not be found.`,
       'ALREADY_EXISTS': (params) => `A ${params.resource} with this information already exists.`,
       
       // Permission errors
       'AUTHORIZATION_ERROR': 'You do not have permission to perform this action.',
       'INSUFFICIENT_PERMISSIONS': 'You need additional permissions to perform this action.',
       
       // Server errors
       'INTERNAL_SERVER_ERROR': 'An unexpected error occurred. Please try again later.',
       'SERVICE_UNAVAILABLE': 'This service is temporarily unavailable. Please try again later.',
       
       // Network errors
       'NETWORK_ERROR': 'Unable to connect to the server. Please check your internet connection.',
       'TIMEOUT_ERROR': 'The request timed out. Please try again.',
       
       // Default error
       'DEFAULT': 'An error occurred. Please try again or contact support.'
     },
     // Add other languages as needed
   };
   
   export function getUserFriendlyErrorMessage(errorCode: string, params?: any): string {
     const language = i18n.language || 'en';
     const messages = errorMessages[language] || errorMessages.en;
     
     const message = messages[errorCode] || messages.DEFAULT;
     
     if (typeof message === 'function') {
       return message(params);
     }
     
     return message;
   }
   ```

2. **Implement Contextual Error Components**
   - Create reusable error components for different contexts
   - Provide appropriate actions based on error type
   - Maintain consistent error presentation

   ```tsx
   // src/components/errors/ApiErrorAlert.tsx
   import React from 'react';
   import { Alert, AlertTitle, Button } from '@mui/material';
   import { getUserFriendlyErrorMessage } from '../../utils/errorMessages';
   
   interface ApiErrorAlertProps {
     error: any;
     onRetry?: () => void;
     onDismiss?: () => void;
   }
   
   export function ApiErrorAlert({ error, onRetry, onDismiss }: ApiErrorAlertProps) {
     // Extract error information
     const errorCode = error?.code || 'UNKNOWN_ERROR';
     const errorMessage = getUserFriendlyErrorMessage(errorCode, error?.details);
     
     // Determine severity based on error type
     let severity = 'error';
     if (errorCode.includes('VALIDATION')) {
       severity = 'warning';
     } else if (errorCode.includes('NOT_FOUND')) {
       severity = 'info';
     }
     
     return (
       <Alert 
         severity={severity as 'error' | 'warning' | 'info'} 
         onClose={onDismiss}
         action={
           onRetry && (
             <Button color="inherit" size="small" onClick={onRetry}>
               Retry
             </Button>
           )
         }
       >
         <AlertTitle>{getErrorTitle(errorCode)}</AlertTitle>
         {errorMessage}
         {process.env.NODE_ENV === 'development' && error?.details && (
           <details>
             <summary>Technical details</summary>
             <pre>{JSON.stringify(error.details, null, 2)}</pre>
           </details>
         )}
       </Alert>
     );
   }
   
   function getErrorTitle(errorCode: string): string {
     if (errorCode.includes('AUTHENTICATION')) {
       return 'Authentication Error';
     } else if (errorCode.includes('AUTHORIZATION')) {
       return 'Permission Error';
     } else if (errorCode.includes('VALIDATION')) {
       return 'Validation Error';
     } else if (errorCode.includes('NOT_FOUND')) {
       return 'Not Found';
     } else if (errorCode.includes('NETWORK')) {
       return 'Network Error';
     } else {
       return 'Error';
     }
   }
   
   // Example usage
   function ProductForm() {
     const [error, setError] = useState(null);
     
     const handleSubmit = async (data) => {
       try {
         await apiClient.post('/products', data);
         // Success handling
       } catch (err) {
         setError(err);
       }
     };
     
     return (
       <div>
         {error && (
           <ApiErrorAlert 
             error={error} 
             onRetry={() => handleSubmit(formData)} 
             onDismiss={() => setError(null)} 
           />
         )}
         {/* Form content */}
       </div>
     );
   }
   ```

## Error Logging and Monitoring

### 1. Structured Error Logging

**Current State**: Basic console logging.

**Recommendations**:

1. **Implement Structured Logging**
   - Use a structured logging library
   - Include context with all error logs
   - Standardize log format across the application

   ```typescript
   // src/utils/logger.ts
import pino from 'pino';

// Create logger instance
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: process.env.NODE_ENV !== 'production',
    },
  },
  base: {
    env: process.env.NODE_ENV,
    service: 'ecommerce-saas',
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`
});

// Create child loggers with context
export function createContextLogger(context: Record<string, any>) {
  return logger.child(context);
}

// Error logging helper
export function logError(error: any, context: Record<string, any> = {}) {
  const errorContext = {
    ...context,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    code: error.code,
    statusCode: error.statusCode,
  };
  
  logger.error(errorContext, 'Error occurred');
}

// Example usage
try {
  // Operation that might fail
} catch (error) {
  logError(error, {
    tenantId: req.adminId,
    subdomain: req.subdomain,
    operation: 'createProduct',
    userId: req.user?.id,
  });
}
```

2. **Implement Tenant-Aware Error Logging**
   - Include tenant information in all error logs
   - Track tenant-specific error patterns
   - Implement tenant error rate monitoring

   ```typescript
   // src/utils/tenantErrorLogger.ts
   import { logger } from './logger';
   import { prisma } from '../lib/prisma';
   
   // Create tenant-specific logger
   export function createTenantLogger(tenantId: string, subdomain: string) {
     return logger.child({
       tenantId,
       subdomain,
       context: 'tenant',
     });
   }
   
   // Log and track tenant errors
   export async function logTenantError(error: any, tenantId: string, context: Record<string, any> = {}) {
     // Log the error
     const tenantLogger = createTenantLogger(tenantId, context.subdomain);
     tenantLogger.error({
       error: error instanceof Error ? error.message : String(error),
       stack: error instanceof Error ? error.stack : undefined,
       ...context,
     }, 'Tenant error occurred');
     
     // Track error in database for monitoring
     try {
       await prisma.tenantErrorLog.create({
         data: {
           adminId: tenantId,
           errorType: error.name || 'Unknown',
           errorCode: error.code || 'UNKNOWN_ERROR',
           message: error instanceof Error ? error.message : String(error),
           path: context.path,
           method: context.method,
           stack: error instanceof Error ? error.stack : undefined,
           metadata: context,
         },
       });
     } catch (logError) {
       // If error tracking fails, just log it
       logger.error({
         message: 'Failed to track tenant error',
         error: logError instanceof Error ? logError.message : String(logError),
         tenantId,
       });
     }
   }
   ```