#!/usr/bin/env node

const path = require('path');

console.log('🧪 Testing Auth Module Dependencies...');

// Test 1: Check if sequelize can be required
try {
  const { Op } = require('sequelize');
  console.log('✅ Sequelize import successful');
} catch (error) {
  console.log('❌ Sequelize import failed:', error.message);
}

// Test 2: Check if auth module can be loaded
try {
  const AuthModule = require('./backend-temp/modules/auth/index.js');
  console.log('✅ Auth module import successful');
  
  // Test 3: Try to instantiate
  const authInstance = new AuthModule();
  console.log('✅ Auth module instantiation successful');
  console.log('   - Name:', authInstance.name);
  console.log('   - Dependencies:', authInstance.dependencies);
} catch (error) {
  console.log('❌ Auth module failed:', error.message);
  console.log('   Stack:', error.stack);
}

// Test 4: Check authService specifically
try {
  const AuthService = require('./backend-temp/modules/auth/services/authService.js');
  console.log('✅ AuthService import successful');
} catch (error) {
  console.log('❌ AuthService import failed:', error.message);
  console.log('   Stack:', error.stack);
}