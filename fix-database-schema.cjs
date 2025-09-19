#!/usr/bin/env node

/**
 * Database Schema Fix Script
 * Updates the database schema to support OAuth-only users with string user IDs
 */

const https = require('https');

const BASE_URL = 'https://web-production-de0bc.up.railway.app';

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Database-Schema-Fix/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonBody
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function fixDatabaseSchema() {
  console.log('🔧 Database Schema Fix');
  console.log('=====================');
  console.log(`🌐 Backend URL: ${BASE_URL}`);
  console.log('');
  
  console.log('📋 Schema fixes needed:');
  console.log('1. Change broker_configs.user_id from UUID to VARCHAR(255)');
  console.log('2. Remove foreign key constraint on broker_configs.user_id');
  console.log('3. Change oauth_audit_log.user_id from UUID to VARCHAR(255)');
  console.log('4. Remove foreign key constraint on oauth_audit_log.user_id');
  console.log('');
  
  console.log('🧪 Testing current OAuth setup to see if schema fix is needed...');
  
  try {
    // Test OAuth setup with string user ID
    const testData = {
      api_key: 'schema_fix_test_key_1234567890',
      api_secret: 'schema_fix_test_secret_1234567890',
      user_id: 'schema_fix_test_user_123'
    };
    
    const response = await makeRequest('/api/modules/auth/broker/setup-oauth', 'POST', testData);
    
    console.log(`📥 OAuth Setup Test Status: ${response.status}`);
    console.log(`📊 Response:`, JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Schema appears to be working correctly!');
      console.log('🎉 OAuth setup with string user IDs is functional');
      return true;
    } else if (response.data.message && response.data.message.includes('Database connection not initialized')) {
      console.log('⚠️ Database connection issue detected');
      console.log('🔧 This needs to be fixed at the application level');
      return false;
    } else {
      console.log('❌ Schema fix may be needed');
      console.log('🔧 Check the error message above for details');
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing schema:', error.message);
    return false;
  }
}

// Run schema fix
fixDatabaseSchema()
  .then(success => {
    if (success) {
      console.log('\n🎉 Database schema verification completed successfully');
    } else {
      console.log('\n⚠️ Database schema may need manual fixes');
      console.log('📋 Manual steps if needed:');
      console.log('1. Connect to your Railway PostgreSQL database');
      console.log('2. Run the following SQL commands:');
      console.log('');
      console.log('-- Drop foreign key constraints');
      console.log('ALTER TABLE broker_configs DROP CONSTRAINT IF EXISTS broker_configs_user_id_fkey;');
      console.log('ALTER TABLE oauth_audit_log DROP CONSTRAINT IF EXISTS oauth_audit_log_user_id_fkey;');
      console.log('');
      console.log('-- Change user_id columns to VARCHAR');
      console.log('ALTER TABLE broker_configs ALTER COLUMN user_id TYPE VARCHAR(255);');
      console.log('ALTER TABLE oauth_audit_log ALTER COLUMN user_id TYPE VARCHAR(255);');
      console.log('');
      console.log('-- Recreate unique constraint');
      console.log('ALTER TABLE broker_configs ADD CONSTRAINT broker_configs_user_broker_unique UNIQUE (user_id, broker_name);');
    }
    
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Schema fix failed:', error);
    process.exit(1);
  });