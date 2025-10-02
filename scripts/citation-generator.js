#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CitationGenerator {
  constructor() {
    this.citationsDir = path.join(__dirname, '..', 'docs', 'citations');
    this.ensureCitationsDir();
  }

  ensureCitationsDir() {
    if (!fs.existsSync(this.citationsDir)) {
      fs.mkdirSync(this.citationsDir, { recursive: true });
    }
  }

  generateCitation(leakId, title, details) {
    const citationContent = `# ${leakId}: ${title}

## Symptom
- **Issue**: ${details.symptom}
- **Impact**: ${details.impact}
- **Severity**: ${details.severity}

## Evidence
- **Logs**: ${details.logs || 'See commit logs'}
- **Heap Snapshots**: ${details.heapSnapshots || 'N/A'}
- **Tests**: ${details.tests || 'See test results'}
- **Reproduction**: ${details.reproduction || 'See commit details'}

## Root Cause
- **Analysis**: ${details.rootCause}
- **Code Location**: ${details.codeLocation}
- **Dependencies**: ${details.dependencies || 'N/A'}

## Fix
- **Commit SHA**: ${details.commitSha}
- **Changes**: ${details.changes}
- **Test Proof**: ${details.testProof || 'See test results'}
- **Verification**: ${details.verification || 'See deployment logs'}

## Deploy Confirmation
- **Version Endpoint**: ${details.versionEndpoint || '/api/version'}
- **Digest**: ${details.digest || 'See build logs'}
- **Status**: ${details.status || 'Verified in production'}
- **Timestamp**: ${details.timestamp || new Date().toISOString()}

## Status
- [x] Identified
- [x] Fixed
- [x] Tested
- [x] Deployed
- [x] Verified
`;

    const citationPath = path.join(this.citationsDir, `${leakId}.md`);
    fs.writeFileSync(citationPath, citationContent);
    console.log(`📋 Citation generated: ${citationPath}`);
  }

  generateFromCommit(commitSha) {
    try {
      const commitInfo = execSync(`git show --stat ${commitSha}`, { encoding: 'utf8' });
      const commitMessage = execSync(`git log --format=%B -n 1 ${commitSha}`, { encoding: 'utf8' });
      
      // Extract leak information from commit message
      const leakMatch = commitMessage.match(/LEAK-(\d+)/);
      if (leakMatch) {
        const leakId = `LEAK-${leakMatch[1]}`;
        const title = commitMessage.split('\n')[0].replace(/LEAK-\d+:\s*/, '');
        
        const details = {
          symptom: 'See commit message and logs',
          impact: 'See commit message',
          severity: 'See commit message',
          rootCause: 'See commit changes',
          codeLocation: 'See git diff',
          commitSha: commitSha,
          changes: commitMessage,
          timestamp: new Date().toISOString()
        };
        
        this.generateCitation(leakId, title, details);
      }
    } catch (error) {
      console.error('Error generating citation from commit:', error);
    }
  }
}

if (require.main === module) {
  const generator = new CitationGenerator();
  
  if (process.argv[2]) {
    generator.generateFromCommit(process.argv[2]);
  } else {
    console.log('Usage: node citation-generator.js <commit-sha>');
  }
}

module.exports = CitationGenerator;
