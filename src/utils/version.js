// Version endpoint utility
export const getBuildInfo = () => {
  return {
    commitSha: process.env.VITE_COMMIT_SHA || 'unknown',
    buildTime: process.env.VITE_BUILD_TIME || 'unknown',
    nodeVersion: process.env.VITE_NODE_VERSION || 'unknown',
    packageLockHash: process.env.VITE_PACKAGE_LOCK_HASH || 'unknown',
    buildId: process.env.VITE_BUILD_ID || 'unknown',
    version: process.env.VITE_APP_VERSION || '1.0.0'
  };
};

export const getVersionEndpoint = () => {
  return {
    success: true,
    data: getBuildInfo(),
    timestamp: new Date().toISOString()
  };
};
