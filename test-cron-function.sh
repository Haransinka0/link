#!/bin/bash

# Test script for the cron job Edge Function
# Replace these values with your actual values
SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
CRON_API_KEY="your-secret-cron-key-here"

echo "Testing cron job Edge Function..."

# Test the function
curl -X POST "$SUPABASE_URL/functions/v1/publish-scheduled-posts" \
  -H "Content-Type: application/json" \
  -H "x-cron-api-key: $CRON_API_KEY" \
  -d '{}'

echo ""
echo "If you see a response like:"
echo '{ "processed": 0, "published": 0, "failed": 0 }'
echo "Then the function is working correctly!"
echo ""
echo "If you see posts being processed, they will appear in the results array."
