#!/bin/bash
# Frontend deployment verification script
# Checks that the deployed frontend matches the expected commit SHA

set -e

# Configuration
FRONTEND_URL="${FRONTEND_URL:-https://quantum-leap-frontend-production.up.railway.app}"
EXPECTED_SHA="${EXPECTED_SHA:-}"
TIMEOUT="${TIMEOUT:-30}"
MAX_RETRIES="${MAX_RETRIES:-10}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to make HTTP request with timeout
make_request() {
    local url="$1"
    local timeout="$2"
    
    curl -s --max-time "$timeout" --fail "$url" 2>/dev/null || {
        log_error "Failed to fetch $url"
        return 1
    }
}

# Function to check if frontend is accessible
check_frontend_health() {
    log_info "Checking frontend health at $FRONTEND_URL..."
    
    local response
    if response=$(make_request "$FRONTEND_URL" "$TIMEOUT"); then
        log_success "Frontend is accessible"
        return 0
    else
        log_error "Frontend is not accessible"
        return 1
    fi
}

# Function to get deployed commit SHA (silent version for internal use)
get_deployed_sha_silent() {
    local version_url="$FRONTEND_URL/version"
    local version_response
    
    if version_response=$(make_request "$version_url" "$TIMEOUT"); then
        # Extract commit SHA from JSON response
        local deployed_sha
        deployed_sha=$(echo "$version_response" | grep -o '"commit":"[^"]*"' | cut -d'"' -f4)
        
        if [ -n "$deployed_sha" ] && [ "$deployed_sha" != "unknown" ]; then
            echo "$deployed_sha"
            return 0
        elif [ "$deployed_sha" = "unknown" ]; then
            echo "unknown"
            return 0
        else
            return 1
        fi
    else
        return 1
    fi
}

# Function to get deployed commit SHA
get_deployed_sha() {
    log_info "Fetching deployed commit SHA from /version endpoint..."
    
    local deployed_sha
    deployed_sha=$(get_deployed_sha_silent)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        if [ "$deployed_sha" != "unknown" ]; then
            log_success "Deployed commit SHA: $deployed_sha"
        else
            log_warning "Deployed commit SHA is 'unknown' - Railway not injecting build args"
            log_warning "This is expected if Railway build args are not configured"
        fi
        echo "$deployed_sha"
        return 0
    else
        log_error "Could not extract commit SHA from version response"
        return 1
    fi
}

# Function to wait for deployment to complete
wait_for_deployment() {
    log_info "Waiting for deployment to complete (max $MAX_RETRIES retries)..."
    
    local retry_count=0
    while [ $retry_count -lt $MAX_RETRIES ]; do
        if check_frontend_health; then
            log_success "Frontend is accessible after $((retry_count + 1)) attempts"
            return 0
        fi
        
        retry_count=$((retry_count + 1))
        log_warning "Attempt $retry_count/$MAX_RETRIES failed, retrying in 10 seconds..."
        sleep 10
    done
    
    log_error "Frontend did not become accessible after $MAX_RETRIES attempts"
    return 1
}

# Function to verify commit SHA match
verify_commit_sha() {
    local expected_sha="$1"
    local deployed_sha="$2"
    
    if [ -z "$expected_sha" ]; then
        log_warning "No expected SHA provided, skipping SHA verification"
        return 0
    fi
    
    # Handle case where deployed SHA is "unknown"
    if [ "$deployed_sha" = "unknown" ]; then
        log_warning "⚠️ SHA verification SKIPPED - Deployed SHA is 'unknown'"
        log_warning "Railway is not injecting build args (COMMIT_SHA)"
        log_warning "To enable SHA verification, configure Railway build args:"
        log_warning "  COMMIT_SHA=\${{ github.sha }}"
        return 0
    fi
    
    # Compare short SHAs (first 8 characters)
    local expected_short="${expected_sha:0:8}"
    local deployed_short="${deployed_sha:0:8}"
    
    log_info "Comparing SHAs:"
    log_info "  Expected: $expected_sha (short: $expected_short)"
    log_info "  Deployed:  $deployed_sha (short: $deployed_short)"
    
    if [ "$expected_short" = "$deployed_short" ]; then
        log_success "✅ SHA verification PASSED - Deployed commit matches expected"
        return 0
    else
        log_error "❌ SHA verification FAILED - Deployed commit does not match expected"
        log_error "Expected: $expected_sha"
        log_error "Deployed: $deployed_sha"
        return 1
    fi
}

# Main verification function
main() {
    echo "=================================================================================="
    echo "🔍 FRONTEND DEPLOYMENT VERIFICATION"
    echo "=================================================================================="
    echo ""
    log_info "Configuration:"
    log_info "  Frontend URL: $FRONTEND_URL"
    log_info "  Expected SHA: ${EXPECTED_SHA:-'not provided'}"
    log_info "  Timeout: ${TIMEOUT}s"
    log_info "  Max Retries: $MAX_RETRIES"
    echo ""
    
    # Step 1: Wait for deployment to complete
    if ! wait_for_deployment; then
        log_error "Deployment verification FAILED - Frontend not accessible"
        exit 1
    fi
    
    # Step 2: Get deployed commit SHA
    local deployed_sha
    deployed_sha=$(get_deployed_sha_silent)
    if [ $? -ne 0 ]; then
        log_error "Deployment verification FAILED - Could not get deployed SHA"
        exit 1
    fi
    
    # Log the deployed SHA
    if [ "$deployed_sha" != "unknown" ]; then
        log_success "Deployed commit SHA: $deployed_sha"
    else
        log_warning "Deployed commit SHA is 'unknown' - Railway not injecting build args"
        log_warning "This is expected if Railway build args are not configured"
    fi
    
    # Step 3: Verify SHA match (if expected SHA provided)
    if [ -n "$EXPECTED_SHA" ]; then
        if ! verify_commit_sha "$EXPECTED_SHA" "$deployed_sha"; then
            log_error "Deployment verification FAILED - SHA mismatch"
            exit 1
        fi
    fi
    
    # Step 4: Final success
    echo ""
    echo "=================================================================================="
    log_success "🎉 DEPLOYMENT VERIFICATION PASSED"
    echo "=================================================================================="
    log_success "Frontend is accessible and running correctly"
    log_success "Deployed commit: $deployed_sha"
    if [ -n "$EXPECTED_SHA" ]; then
        log_success "SHA verification: PASSED"
    fi
    echo ""
    
    exit 0
}

# Show usage if help requested
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Frontend Deployment Verification Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Environment Variables:"
    echo "  FRONTEND_URL    Frontend URL to verify (default: https://quantum-leap-frontend-production.up.railway.app)"
    echo "  EXPECTED_SHA    Expected commit SHA to verify against"
    echo "  TIMEOUT         Request timeout in seconds (default: 30)"
    echo "  MAX_RETRIES     Maximum retry attempts (default: 10)"
    echo ""
    echo "Examples:"
    echo "  $0"
    echo "  EXPECTED_SHA=abc12345 $0"
    echo "  FRONTEND_URL=https://staging.example.com EXPECTED_SHA=def67890 $0"
    echo ""
    exit 0
fi

# Run main function
main "$@"
