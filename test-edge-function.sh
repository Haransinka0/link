#!/bin/bash

# Test the Edge Function directly
SUPABASE_URL="https://hdmmvvdknamberkztv.supabase.co/functions/v1/publish-scheduled-posts"
CRON_API_KEY="your-secret-cron-key-here"

echo "Testing Edge Function directly..."
echo "URL: $SUPABASE_URL"
echo "Using CRON_API_KEY: $CRON_API_KEY"
echo ""

curl -X POST "$SUPABASE_URL" \
  -H "Content-Type: application/json" \
  -H "x-cron-api-key: $CRON_API_KEY" \
  -d '{}'

echo ""
echo ""
echo "If you see 401 error, the CRON_API_KEY doesn't match what's in Supabase."
echo "If you see {\"processed\":0,\"published\":0,\"failed\":0}, it's working!"
