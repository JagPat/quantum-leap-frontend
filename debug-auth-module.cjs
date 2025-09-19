// Debug auth module registration
console.log('🔍 Debugging auth module registration...');

try {
  // Load the auth module directly
  const authModule = require('./backend-temp/modules/auth/index.js');
  console.log('✅ Auth module loaded');
  console.log('📋 Module properties:', Object.keys(authModule));
  console.log('🔧 getRoutes type:', typeof authModule.getRoutes);
  console.log('🔧 getRoutes exists:', !!authModule.getRoutes);
  
  if (authModule.getRoutes) {
    console.log('🔍 Testing getRoutes() call...');
    const routes = authModule.getRoutes();
    console.log('✅ getRoutes() returned:', typeof routes);
    console.log('📊 Routes stack length:', routes && routes.stack ? routes.stack.length : 'No stack');
  }
  
  // Test module spreading (what service container does)
  console.log('\n🔍 Testing module spreading...');
  const spreadModule = {
    ...authModule,
    registeredAt: new Date(),
    status: 'registered'
  };
  
  console.log('📋 Spread module properties:', Object.keys(spreadModule));
  console.log('🔧 Spread getRoutes type:', typeof spreadModule.getRoutes);
  console.log('🔧 Spread getRoutes exists:', !!spreadModule.getRoutes);
  
  if (spreadModule.getRoutes) {
    console.log('🔍 Testing spread getRoutes() call...');
    const spreadRoutes = spreadModule.getRoutes();
    console.log('✅ Spread getRoutes() returned:', typeof spreadRoutes);
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}