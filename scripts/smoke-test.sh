#!/usr/bin/env bash
# Smoke test for a running Snip instance: health, create, redirect,
# URL validation and unknown codes. Needs only bash + curl.
#
# Usage: scripts/smoke-test.sh [BASE_URL]   (default: http://localhost:8787)
# Exits 0 if every check passes, 1 otherwise.

BASE_URL="${1:-http://localhost:8787}"
BASE_URL="${BASE_URL%/}"
TARGET="https://example.com/smoke-test?from=snip"
CURL=(curl -s --connect-timeout 3 --max-time 10)
failures=0

check() { # check <description> <passed: 0|1> [detail]
  if [ "$2" = 1 ]; then
    echo "✅ $1"
  else
    echo "❌ $1${3:+ ($3)}"
    failures=$((failures + 1))
  fi
}

create_link() { # prints "<body>\n<status>"
  "${CURL[@]}" -w '\n%{http_code}' -X POST "$BASE_URL/api/links" \
    -H 'content-type: application/json' -d "{\"url\":\"$1\"}"
}

echo "Smoke testing $BASE_URL"

# 1. Health
body=$("${CURL[@]}" "$BASE_URL/api/health")
echo "$body" | grep -q '"ok":true'
check "GET /api/health returns ok:true" $(( $? == 0 )) "got: ${body:-no response}"

# 2. Create an https link
resp=$(create_link "$TARGET")
status=$(echo "$resp" | tail -n 1)
code=$(echo "$resp" | sed -n 's/.*"code":"\([^"]*\)".*/\1/p')
[ "$status" = 201 ] && [ -n "$code" ]
check "POST /api/links returns 201 with a code" $(( $? == 0 )) "status: $status"

# 3. Follow the short link
result=$("${CURL[@]}" -o /dev/null -w '%{http_code} %{redirect_url}' "$BASE_URL/s/${code:-missing}")
[ "$result" = "302 $TARGET" ]
check "GET /s/<code> returns 302 to $TARGET" $(( $? == 0 )) "got: $result"

# 4. Reject non-web URLs
status=$(create_link "javascript:alert(1)" | tail -n 1)
check "POST /api/links rejects javascript: with 400" $(( status == 400 )) "status: $status"

# 5. Unknown code
status=$("${CURL[@]}" -o /dev/null -w '%{http_code}' "$BASE_URL/s/does-not-exist")
check "GET /s/<unknown> returns 404" $(( status == 404 )) "status: $status"

if [ "$failures" -eq 0 ]; then
  echo "All checks passed."
  exit 0
fi
echo "$failures check(s) failed."
exit 1
