#!/usr/bin/env node

const https = require('https');

class DeploymentVerifier {
  constructor() {
    this.frontendUrl = 'https://quantum-leap-frontend-production.up.railway.app';
    this.backendUrl = 'https://web-production-de0bc.up.railway.app';
    this.expectedCommitSha = process.env.INTENDED_SHA || 'a3e93ecc143de0b29c0aa6074f447e3421e07843';
  }

  async verifyDeployment() {
    console.log('🔍 Verifying deployment...');
    console.log(`Expected commit: ${this.expectedCommitSha}`);
    
    try {
      // Check frontend
      const frontendVersion = await this.getVersion(this.frontendUrl + '/version');
      console.log('Frontend version:', frontendVersion);
      
      // Check backend
      const backendVersion = await this.getVersion(this.backendUrl + '/version');
      console.log('Backend version:', backendVersion);
      
      // Verify commit SHA matches
      const frontendMatches = frontendVersion?.data?.commitSha === this.expectedCommitSha;
      const backendMatches = backendVersion?.data?.commitSha === this.expectedCommitSha;
      
      if (frontendMatches && backendMatches) {
        console.log('✅ Deployment verification passed');
        return true;
      } else {
        console.log('❌ Deployment verification failed');
        console.log(`Frontend matches: ${frontendMatches}`);
        console.log(`Backend matches: ${backendMatches}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Deployment verification error:', error);
      return false;
    }
  }

  async getVersion(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });
  }
}

if (require.main === module) {
  const verifier = new DeploymentVerifier();
  verifier.verifyDeployment().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = DeploymentVerifier;
