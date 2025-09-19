// Test auth routes loading
try {
  console.log('Testing auth routes import...');
  const authRoutes = require('./backend-temp/modules/auth/routes');
  console.log('✅ Auth routes imported successfully');
  console.log('Routes type:', typeof authRoutes);
  console.log('Routes stack length:', authRoutes.stack ? authRoutes.stack.length : 'No stack');
  
  if (authRoutes.stack) {
    console.log('Routes:');
    authRoutes.stack.forEach((layer, index) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods);
        console.log(`  ${index}: ${methods.join(',').toUpperCase()} ${layer.route.path}`);
      } else if (layer.regexp) {
        console.log(`  ${index}: MIDDLEWARE ${layer.regexp}`);
      }
    });
  }
} catch (error) {
  console.error('❌ Error importing auth routes:', error.message);
  console.error('Stack trace:', error.stack);
}