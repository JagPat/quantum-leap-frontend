# Citation Template

## LEAK-{ID}: {TITLE}

### Symptom
- **Issue**: Brief description of the issue
- **Impact**: What was affected
- **Severity**: Critical/High/Medium/Low

### Evidence
- **Logs**: Relevant log entries
- **Heap Snapshots**: Memory usage patterns
- **Tests**: Test results showing the issue
- **Reproduction**: Steps to reproduce

### Root Cause
- **Analysis**: Technical analysis of the root cause
- **Code Location**: File and line numbers
- **Dependencies**: Related components

### Fix
- **Commit SHA**: {COMMIT_SHA}
- **Changes**: Description of changes made
- **Test Proof**: Test results confirming fix
- **Verification**: How the fix was verified

### Deploy Confirmation
- **Version Endpoint**: `/version` response
- **Digest**: Docker image digest
- **Status**: Verified in staging/prod
- **Timestamp**: When verification was completed

### Status
- [ ] Identified
- [ ] Fixed
- [ ] Tested
- [ ] Deployed
- [ ] Verified
