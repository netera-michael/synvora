#!/bin/bash

echo "=========================================="
echo "Venue Merge Script"
echo "=========================================="
echo ""
echo "This script will merge duplicate CICCIO venues."
echo ""

# Check if dev server is running
echo "Checking if Next.js dev server is running..."
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "❌ Next.js dev server is not running on port 3000"
    echo ""
    echo "Please start the dev server first:"
    echo "  npm run dev"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "✓ Dev server is running"
echo ""

# Read session cookie from user
echo "=========================================="
echo "Authentication Required"
echo "=========================================="
echo ""
echo "To run this merge, you need to be logged in as an ADMIN."
echo ""
echo "Please follow these steps:"
echo "  1. Open your browser and go to http://localhost:3000"
echo "  2. Log in as admin"
echo "  3. Open browser Developer Tools (F12)"
echo "  4. Go to the Console tab"
echo "  5. Run this command:"
echo ""
echo "     fetch('/api/venues/merge-duplicates', { method: 'POST' }).then(r => r.json()).then(console.log)"
echo ""
echo "  6. Check the output in the console"
echo ""
echo "=========================================="
echo ""
echo "Alternatively, if you know your session cookie:"
read -p "Enter your session cookie (or press Enter to skip): " SESSION_COOKIE

if [ ! -z "$SESSION_COOKIE" ]; then
    echo ""
    echo "Running merge with provided session..."
    RESPONSE=$(curl -s -X POST http://localhost:3000/api/venues/merge-duplicates \
        -H "Cookie: $SESSION_COOKIE")

    echo ""
    echo "Response:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    echo ""
else
    echo ""
    echo "No session cookie provided."
    echo "Please use the browser method described above."
    echo ""
fi

echo "=========================================="
echo "Done!"
echo "=========================================="
