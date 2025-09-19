// Test OAuth routes for syntax errors
try {
  console.log('Testing OAuth routes import...');
  const oauthRoutes = require('./backend-temp/modules/auth/routes/oauth');
  console.log('✅ OAuth routes imported successfully');
  console.log('Routes type:', typeof oauthRoutes);
  console.log('Routes stack length:', oauthRoutes.stack ? oauthRoutes.stack.length : 'No stack');
} catch (error) {
  console.error('❌ Error importing OAuth routes:', error.message);
  console.error('Stack trace:', error.stack);
}