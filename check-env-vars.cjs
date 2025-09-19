#!/usr/bin/env node

console.log('🔍 Environment Variables Check');
console.log('================================');

const requiredVars = [
  'OAUTH_ENCRYPTION_KEY',
  'JWT_SECRET', 
  'AUTH_OTP_PEPPER',
  'ZERODHA_API_KEY',
  'ZERODHA_API_SECRET',
  'ZERODHA_REDIRECT_URI'
];

const optionalVars = [
  'NODE_ENV',
  'AUTH_JWT_TTL',
  'AUTH_OTP_CHANNELS',
  'ALLOW_SELF_SIGNUP',
  'ZERODHA_API_BASE_URL',
  'ZERODHA_LOGIN_URL'
];

console.log('\n📋 Required Variables:');
let missingRequired = [];
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 10)}...`);
  } else {
    console.log(`❌ ${varName}: NOT SET`);
    missingRequired.push(varName);
  }
});

console.log('\n📋 Optional Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value}`);
  } else {
    console.log(`⚪ ${varName}: not set (using default)`);
  }
});

if (missingRequired.length > 0) {
  console.log('\n❌ Missing Required Variables:');
  missingRequired.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  console.log('\n💡 Generate secure keys with:');
  console.log('   OAUTH_ENCRYPTION_KEY: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  console.log('   JWT_SECRET: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"');
  console.log('   AUTH_OTP_PEPPER: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"');
  process.exit(1);
} else {
  console.log('\n✅ All required environment variables are set!');
  process.exit(0);
}