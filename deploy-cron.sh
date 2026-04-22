#!/bin/bash

echo "Deploying Supabase Edge Function for scheduled LinkedIn posting..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Error: Supabase CLI is not installed. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Deploy the Edge Function
echo "Deploying publish-scheduled-posts function..."
supabase functions deploy publish-scheduled-posts

echo "Edge Function deployed successfully!"
echo ""
echo "Next steps:"
echo "1. Set environment variables in Supabase Dashboard:"
echo "   - CRON_API_KEY (your secret key)"
echo "   - LINKEDIN_CLIENT_ID"
echo "   - LINKEDIN_CLIENT_SECRET"
echo "   - LINKEDIN_EMAIL"
echo "   - LINKEDIN_PASSWORD"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "2. Setup cron job at cron-job.org:"
echo "   - URL: https://[YOUR-PROJECT-REF].supabase.co/functions/v1/publish-scheduled-posts"
echo "   - Method: POST"
echo "   - Headers: x-cron-api-key: [YOUR_CRON_API_KEY]"
echo "   - Schedule: Every 5 minutes"
