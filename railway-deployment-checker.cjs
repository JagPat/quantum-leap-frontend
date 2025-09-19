#!/usr/bin/env node

/**
 * Railway Deployment Checker
 * Comprehensive tool to check Railway deployment status and provide specific guidance
 * for resolving database and deployment issues
 */

const https = require('https');
const { performance } = require('perf_hooks');

// Railway deployment configuration
const railwayConfig = {
  backend: {
    url: 'https://web-production-de0bc.up.railway.app',
    expectedVersion: '2.0.0',
    healthEndpoints: [
      '/health',
      '/api/modules/auth/debug',
      '/api/modules/auth/broker/health'
    ]
  },
  frontend: {
    workingUrl: 'https://quantum-leap-frontend-production.up.railway.app',
    alternativeUrls: [
      'https://quantumleap-trading-frontend.up.railway.app',
      'https://quantum-leap-frontend-production.up.railway.app'
    ]
  },
  database: {
    expectedTables: ['users', 'broker_configs', 'oauth_tokens'],
    requiredColumns: {
      oauth_tokens: ['oauth_state']
    }
  }
};

// Utility functions
function makeHttpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      timeout: options.timeout || 10000,
      ...options
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: res.headers['content-type']?.includes('application/json') ? JSON.parse(data) : data
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Railway deployment status checker
async function checkRailwayDeploymentStatus() {
  console.log('🚂 Railway Deployment Status Check');
  console.log('==================================');
  console.log(`⏱️  Started at: ${new Date().toISOString()}`);
  console.log('');

  const deploymentStatus = {
    backend: {
      deployed: false,
      version: null,
      healthy: false,
      uptime: null,
      issues: []
    },
    frontend: {
      deployed: false,
      accessible: false,
      workingUrl: null,
      issues: []
    },
    database: {
      connected: false,
      initialized: false,
      tablesAccessible: false,
      issues: []
    },
    overall: {
      ready: false,
      criticalIssues: 0,
      recommendations: []
    }
  };

  try {
    // Check Backend Deployment
    console.log('🔧 Backend Deployment Check');
    console.log('---------------------------');
    
    try {
      const backendHealth = await makeHttpsRequest(`${railwayConfig.backend.url}/health`, { timeout: 15000 });
      
      console.log(`📊 Backend Status: ${backendHealth.status}`);
      
      if (backendHealth.status === 200 && backendHealth.data.status === 'OK') {
        deploymentStatus.backend.deployed = true;
        deploymentStatus.backend.healthy = true;
        deploymentStatus.backend.version = backendHealth.data.version;
        deploymentStatus.backend.uptime = Math.round(backendHealth.data.uptime);
        
        console.log(`✅ Backend deployed successfully`);
        console.log(`📦 Version: ${backendHealth.data.version}`);
        console.log(`⏰ Uptime: ${Math.round(backendHealth.data.uptime)}s`);
        
        if (backendHealth.data.version === railwayConfig.backend.expectedVersion) {
          console.log('✅ Backend version matches expected version');
        } else {
          console.log(`⚠️  Version mismatch: expected ${railwayConfig.backend.expectedVersion}, got ${backendHealth.data.version}`);
          deploymentStatus.backend.issues.push('Version mismatch');
        }
      } else {
        deploymentStatus.backend.issues.push('Backend health check failed');
        console.log('❌ Backend deployment issues detected');
      }
    } catch (error) {
      deploymentStatus.backend.issues.push(`Backend unreachable: ${error.message}`);
      console.log(`❌ Backend unreachable: ${error.message}`);
    }

    // Check Frontend Deployment
    console.log('');
    console.log('🌐 Frontend Deployment Check');
    console.log('----------------------------');
    
    // Test working URL first
    try {
      const frontendResponse = await makeHttpsRequest(railwayConfig.frontend.workingUrl, { timeout: 10000 });
      
      if (frontendResponse.status === 200) {
        deploymentStatus.frontend.deployed = true;
        deploymentStatus.frontend.accessible = true;
        deploymentStatus.frontend.workingUrl = railwayConfig.frontend.workingUrl;
        
        console.log(`✅ Frontend accessible at: ${railwayConfig.frontend.workingUrl}`);
        console.log(`📊 Status: ${frontendResponse.status}`);
      } else {
        console.log(`⚠️  Frontend returned status: ${frontendResponse.status}`);
        deploymentStatus.frontend.issues.push(`Unexpected status: ${frontendResponse.status}`);
      }
    } catch (error) {
      console.log(`❌ Frontend not accessible: ${error.message}`);
      deploymentStatus.frontend.issues.push(`Frontend unreachable: ${error.message}`);
    }

    // Check Database Connection
    console.log('');
    console.log('🗄️ Database Connection Check');
    console.log('----------------------------');
    
    try {
      const dbHealthResponse = await makeHttpsRequest(`${railwayConfig.backend.url}/api/modules/auth/broker/health`, { timeout: 15000 });
      
      if (dbHealthResponse.status === 200 && dbHealthResponse.data.success) {
        const components = dbHealthResponse.data.data.components;
        
        console.log('🔍 Database Component Analysis:');
        console.log(`   - Broker Configs: ${components.brokerConfigs?.status || 'unknown'}`);
        console.log(`   - OAuth Tokens: ${components.tokenManager?.components?.oauthTokens?.status || 'unknown'}`);
        
        // Check for database connection errors
        const brokerConfigError = components.brokerConfigs?.error;
        const oauthTokenError = components.tokenManager?.components?.oauthTokens?.error;
        
        if (brokerConfigError?.includes('Database connection not initialized')) {
          deploymentStatus.database.issues.push('Database connection not initialized in broker configs');
          deploymentStatus.overall.criticalIssues++;
          console.log('❌ Database connection not initialized in broker configs');
        }
        
        if (oauthTokenError?.includes('Database connection not initialized')) {
          deploymentStatus.database.issues.push('Database connection not initialized in OAuth tokens');
          deploymentStatus.overall.criticalIssues++;
          console.log('❌ Database connection not initialized in OAuth tokens');
        }
        
        if (deploymentStatus.database.issues.length === 0) {
          deploymentStatus.database.connected = true;
          deploymentStatus.database.initialized = true;
          deploymentStatus.database.tablesAccessible = true;
          console.log('✅ Database connection is healthy');
        }
      } else {
        deploymentStatus.database.issues.push('Database health check failed');
        deploymentStatus.overall.criticalIssues++;
        console.log('❌ Database health check failed');
      }
    } catch (error) {
      deploymentStatus.database.issues.push(`Database health check error: ${error.message}`);
      deploymentStatus.overall.criticalIssues++;
      console.log(`❌ Database health check error: ${error.message}`);
    }

    // Generate recommendations
    console.log('');
    console.log('💡 Generating Deployment Recommendations');
    console.log('----------------------------------------');
    
    if (deploymentStatus.database.issues.length > 0) {
      deploymentStatus.overall.recommendations.push('🗄️ DATABASE ISSUES DETECTED:');
      deploymentStatus.overall.recommendations.push('   1. Check Railway PostgreSQL service status in dashboard');
      deploymentStatus.overall.recommendations.push('   2. Verify DATABASE_URL environment variable is set correctly');
      deploymentStatus.overall.recommendations.push('   3. Ensure PostgreSQL service is running and accessible');
      deploymentStatus.overall.recommendations.push('   4. Check if database service needs to be restarted');
      deploymentStatus.overall.recommendations.push('   5. Verify database connection string format');
      deploymentStatus.overall.recommendations.push('');
    }

    if (deploymentStatus.backend.issues.length > 0) {
      deploymentStatus.overall.recommendations.push('🔧 BACKEND ISSUES DETECTED:');
      deploymentStatus.overall.recommendations.push('   1. Check Railway backend service deployment logs');
      deploymentStatus.overall.recommendations.push('   2. Verify latest code is deployed from GitHub');
      deploymentStatus.overall.recommendations.push('   3. Check environment variables configuration');
      deploymentStatus.overall.recommendations.push('   4. Consider redeploying backend service');
      deploymentStatus.overall.recommendations.push('');
    }

    if (deploymentStatus.frontend.issues.length > 0) {
      deploymentStatus.overall.recommendations.push('🌐 FRONTEND ISSUES DETECTED:');
      deploymentStatus.overall.recommendations.push('   1. Check Railway frontend service deployment status');
      deploymentStatus.overall.recommendations.push('   2. Verify build process completed successfully');
      deploymentStatus.overall.recommendations.push('   3. Check domain configuration and routing');
      deploymentStatus.overall.recommendations.push('   4. Consider redeploying frontend service');
      deploymentStatus.overall.recommendations.push('');
    }

    // Overall system readiness
    deploymentStatus.overall.ready = 
      deploymentStatus.backend.deployed && 
      deploymentStatus.backend.healthy &&
      deploymentStatus.frontend.deployed && 
      deploymentStatus.frontend.accessible &&
      deploymentStatus.database.connected && 
      deploymentStatus.database.initialized;

  } catch (error) {
    console.log(`💥 Deployment status check failed: ${error.message}`);
    deploymentStatus.overall.recommendations.push(`System check error: ${error.message}`);
  }

  console.log('');
  console.log('📊 Railway Deployment Summary');
  console.log('=============================');
  console.log(`🔧 Backend Deployed: ${deploymentStatus.backend.deployed ? 'YES' : 'NO'}`);
  console.log(`🔧 Backend Healthy: ${deploymentStatus.backend.healthy ? 'YES' : 'NO'}`);
  console.log(`🌐 Frontend Deployed: ${deploymentStatus.frontend.deployed ? 'YES' : 'NO'}`);
  console.log(`🌐 Frontend Accessible: ${deploymentStatus.frontend.accessible ? 'YES' : 'NO'}`);
  console.log(`🗄️  Database Connected: ${deploymentStatus.database.connected ? 'YES' : 'NO'}`);
  console.log(`🗄️  Database Initialized: ${deploymentStatus.database.initialized ? 'YES' : 'NO'}`);
  console.log(`🚨 Critical Issues: ${deploymentStatus.overall.criticalIssues}`);
  console.log(`✅ System Ready: ${deploymentStatus.overall.ready ? 'YES' : 'NO'}`);
  console.log('');

  return deploymentStatus;
}

// Railway-specific guidance generator
async function generateRailwayGuidance(deploymentStatus) {
  console.log('📋 Railway-Specific Resolution Guidance');
  console.log('=======================================');
  console.log('');

  console.log('🚂 Railway Dashboard Actions Required:');
  console.log('--------------------------------------');
  
  if (!deploymentStatus.database.connected || !deploymentStatus.database.initialized) {
    console.log('🗄️ DATABASE SERVICE ACTIONS:');
    console.log('');
    console.log('1. 📊 Check PostgreSQL Service Status:');
    console.log('   - Go to Railway dashboard → Your project');
    console.log('   - Look for PostgreSQL service');
    console.log('   - Check if service is "Running" (green status)');
    console.log('   - If not running, click "Deploy" or "Restart"');
    console.log('');
    
    console.log('2. 🔗 Verify DATABASE_URL Environment Variable:');
    console.log('   - Go to backend service → Variables tab');
    console.log('   - Ensure DATABASE_URL is present and correctly formatted');
    console.log('   - Format should be: postgresql://user:password@host:port/database');
    console.log('   - If missing, add it from PostgreSQL service connection info');
    console.log('');
    
    console.log('3. 🔄 Restart Services in Order:');
    console.log('   - First: Restart PostgreSQL service');
    console.log('   - Wait for PostgreSQL to be fully running');
    console.log('   - Then: Restart backend service');
    console.log('   - This ensures proper connection initialization');
    console.log('');
  }

  if (!deploymentStatus.backend.deployed || !deploymentStatus.backend.healthy) {
    console.log('🔧 BACKEND SERVICE ACTIONS:');
    console.log('');
    console.log('1. 📦 Check Deployment Status:');
    console.log('   - Go to backend service → Deployments tab');
    console.log('   - Verify latest deployment is "Success"');
    console.log('   - Check deployment logs for errors');
    console.log('');
    
    console.log('2. 🔍 Review Build Logs:');
    console.log('   - Look for any build or startup errors');
    console.log('   - Check for missing dependencies');
    console.log('   - Verify all environment variables are set');
    console.log('');
  }

  if (!deploymentStatus.frontend.deployed || !deploymentStatus.frontend.accessible) {
    console.log('🌐 FRONTEND SERVICE ACTIONS:');
    console.log('');
    console.log('1. 🚀 Check Frontend Deployment:');
    console.log('   - Go to frontend service → Deployments tab');
    console.log('   - Verify build completed successfully');
    console.log('   - Check for any build errors or warnings');
    console.log('');
    
    console.log('2. 🔗 Verify Domain Configuration:');
    console.log('   - Check Settings → Domains');
    console.log('   - Ensure custom domain is properly configured');
    console.log('   - Test both railway.app domain and custom domain');
    console.log('');
  }

  console.log('⚡ Quick Resolution Steps:');
  console.log('-------------------------');
  console.log('');
  console.log('1. 🔄 Immediate Actions (try in order):');
  console.log('   a) Restart PostgreSQL service');
  console.log('   b) Wait 30 seconds');
  console.log('   c) Restart backend service');
  console.log('   d) Wait for backend to fully start');
  console.log('   e) Test database connection');
  console.log('');
  
  console.log('2. 🧪 Verification Commands:');
  console.log('   - Test backend: curl https://web-production-de0bc.up.railway.app/health');
  console.log('   - Test OAuth: curl https://web-production-de0bc.up.railway.app/api/modules/auth/broker/health');
  console.log('   - Test frontend: curl https://quantum-leap-frontend-production.up.railway.app');
  console.log('');
  
  console.log('3. 🔍 If Issues Persist:');
  console.log('   - Check Railway status page for service outages');
  console.log('   - Review all environment variables');
  console.log('   - Check service resource usage and limits');
  console.log('   - Consider creating new PostgreSQL service if corrupted');
  console.log('');

  console.log('📞 Railway Support Resources:');
  console.log('-----------------------------');
  console.log('- Railway Discord: https://discord.gg/railway');
  console.log('- Railway Docs: https://docs.railway.app');
  console.log('- Railway Status: https://status.railway.app');
  console.log('');

  return {
    databaseActions: !deploymentStatus.database.connected || !deploymentStatus.database.initialized,
    backendActions: !deploymentStatus.backend.deployed || !deploymentStatus.backend.healthy,
    frontendActions: !deploymentStatus.frontend.deployed || !deploymentStatus.frontend.accessible,
    criticalIssues: deploymentStatus.overall.criticalIssues,
    systemReady: deploymentStatus.overall.ready
  };
}

// Main Railway deployment checker
async function runRailwayDeploymentCheck() {
  console.log('🚂 Railway Deployment Checker');
  console.log('=============================');
  console.log(`⏱️  Started at: ${new Date().toISOString()}`);
  console.log('');

  try {
    // Check deployment status
    const deploymentStatus = await checkRailwayDeploymentStatus();

    // Generate specific guidance
    const guidance = await generateRailwayGuidance(deploymentStatus);

    // Final summary
    console.log('🎯 Final Assessment');
    console.log('==================');
    
    if (deploymentStatus.overall.ready) {
      console.log('✅ System is ready for production use!');
      console.log('🎉 All services are deployed and functional');
    } else {
      console.log('⚠️  System requires attention before production use');
      console.log(`🚨 Critical issues to resolve: ${deploymentStatus.overall.criticalIssues}`);
      
      if (guidance.databaseActions) {
        console.log('🗄️  Priority 1: Fix database connectivity');
      }
      if (guidance.backendActions) {
        console.log('🔧 Priority 2: Resolve backend deployment issues');
      }
      if (guidance.frontendActions) {
        console.log('🌐 Priority 3: Fix frontend accessibility');
      }
    }

    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. Follow the Railway dashboard actions above');
    console.log('2. Run verification again after making changes');
    console.log('3. Monitor system health continuously');
    console.log('');

    return {
      success: true,
      systemReady: deploymentStatus.overall.ready,
      deploymentStatus: deploymentStatus,
      guidance: guidance,
      criticalIssues: deploymentStatus.overall.criticalIssues
    };

  } catch (error) {
    console.error('💥 Railway deployment check failed:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

// CLI interface
if (require.main === module) {
  console.log('🚀 Starting Railway Deployment Check...');
  console.log('');

  runRailwayDeploymentCheck()
    .then(result => {
      console.log(`🏁 Railway check completed at: ${new Date().toISOString()}`);
      console.log(`📊 Final Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      
      if (result.success) {
        console.log(`🎯 System Ready: ${result.systemReady ? 'YES' : 'NO'}`);
        console.log(`🚨 Critical Issues: ${result.criticalIssues || 0}`);
      }
      
      process.exit(result.success && result.systemReady ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Railway deployment check failed:', error);
      process.exit(1);
    });
}

// Export for use in other scripts
module.exports = {
  runRailwayDeploymentCheck,
  checkRailwayDeploymentStatus,
  generateRailwayGuidance,
  railwayConfig
};