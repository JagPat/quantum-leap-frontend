import React from 'react';
import { getBuildInfo } from '../utils/version';

export const VersionEndpoint = () => {
  const buildInfo = getBuildInfo();
  
  return (
    <div style={{ 
      position: 'fixed', 
      bottom: 0, 
      right: 0, 
      background: 'rgba(0,0,0,0.8)', 
      color: 'white', 
      padding: '8px', 
      fontSize: '10px',
      fontFamily: 'monospace',
      zIndex: 9999,
      borderRadius: '4px 0 0 0'
    }}>
      v{buildInfo.version} | {buildInfo.commitSha?.substring(0, 8)} | {buildInfo.buildTime?.substring(0, 10)}
    </div>
  );
};

export const getVersionInfo = () => {
  return {
    success: true,
    data: getBuildInfo(),
    timestamp: new Date().toISOString()
  };
};
