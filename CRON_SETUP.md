# Cron Job Scheduler Setup for LinkedIn Auto-Posting

This guide will help you set up automated LinkedIn posting using Supabase Edge Functions and cron-job.org.

## Overview

The system works as follows:
1. You schedule posts in the web app (Calendar page)
2. Posts are stored in `post_templates` table with `status='scheduled'`
3. Cron job calls Supabase Edge Function every 5 minutes
4. Edge Function checks for due posts and publishes them to LinkedIn
5. Post status updates to `published` or `failed`

## Step 1: Deploy Edge Function

### Prerequisites
- Install Supabase CLI: `npm install -g supabase`
- Login to Supabase: `supabase login`
- Link your project: `supabase link --project-ref YOUR_PROJECT_REF`

### Deploy
```bash
chmod +x deploy-cron.sh
./deploy-cron.sh
```

Or manually:
```bash
supabase functions deploy publish-scheduled-posts
```

## Step 2: Set Environment Variables

In your Supabase Dashboard > Settings > Edge Functions, add these:

```
CRON_API_KEY=your-secret-cron-key-here
LINKEDIN_CLIENT_ID=your-linkedin-app-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-app-client-secret
LINKEDIN_EMAIL=your-linkedin-email@example.com
LINKEDIN_PASSWORD=your-linkedin-password
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Important: Use a strong, random CRON_API_KEY**

## Step 3: Setup Cron Job

1. Go to [cron-job.org](https://cron-job.org)
2. Create account and login
3. Click "Members" > "Cronjobs" > "Create new cronjob"

### Cron Job Settings:
- **Title**: LinkedIn Auto-Poster
- **URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/publish-scheduled-posts`
- **Method**: POST
- **Headers**: 
  - `x-cron-api-key: your-secret-cron-key-here`
  - `Content-Type: application/json`
- **Schedule**: Every 5 minutes (or your preferred interval)
- **Timeout**: 60 seconds

### Test the Cron Job
Click "Run now" to test. You should see:
- Success: `{ "processed": 0, "published": 0, "failed": 0 }` (if no posts due)
- Or results if posts are processed

## Step 4: Test the Full Flow

1. **In your web app**:
   - Create a template
   - Go to Calendar page
   - Click a date 2-3 minutes in the future
   - Select template and schedule it

2. **Wait for cron job** to run (every 5 minutes)

3. **Check results**:
   - In app: History page should show post status
   - In LinkedIn: Your post should appear
   - In cron-job.org: Check execution logs

## How It Works

### Edge Function Logic
```typescript
// 1. Verify cron API key
// 2. Fetch scheduled posts due now
// 3. For each post:
//    - Get LinkedIn credentials from env
//    - Get OAuth access token
//    - Get user profile
//    - Post to LinkedIn API
//    - Update post status in DB
// 4. Return summary
```

### Database Flow
```
post_templates table:
- status: 'scheduled' -> 'published'/'failed'
- scheduled_at: when to post
- published_at: when actually posted
- rejection_reason: error message if failed
```

### LinkedIn API Flow
```
1. OAuth 2.0 client credentials flow
2. Get user profile (person URN)
3. Create post with REST API
4. Handle images (if present)
```

## Troubleshooting

### Posts not publishing?
1. Check cron job logs at cron-job.org
2. Check Edge Function logs in Supabase Dashboard
3. Verify environment variables are set correctly
4. Check LinkedIn API credentials are valid

### Authentication errors?
1. Verify LinkedIn app credentials
2. Check LinkedIn app permissions
3. Ensure LinkedIn account is accessible

### Posts stuck in "scheduled"?
1. Check if `scheduled_at` time is in the past
2. Verify cron job is running
3. Check Edge Function logs for errors

## Security Notes

- **CRON_API_KEY**: Keep this secret and random
- **LinkedIn credentials**: Store securely in Supabase env
- **HTTPS**: All requests use HTTPS
- **Rate limits**: LinkedIn has API rate limits

## Advanced Options

### Custom Schedule
Change cron job schedule based on needs:
- Every 1 minute: High frequency
- Every 5 minutes: Good balance
- Every 15 minutes: Lower frequency

### Multiple Users
For multiple LinkedIn accounts:
1. Add `user_id` to post_templates
2. Store LinkedIn credentials per user
3. Update Edge Function to handle multiple accounts

### Image Support
The current version supports text posts. Image upload can be enhanced by:
1. Handling base64 data URLs
2. Implementing multipart image upload
3. Adding error handling for image failures

## Monitoring

Set up monitoring:
1. Check cron-job.org logs regularly
2. Monitor Edge Function logs in Supabase
3. Set up alerts for failed posts
4. Track success/failure rates

## Support

If you encounter issues:
1. Check Supabase Edge Function logs
2. Verify cron job configuration
3. Test LinkedIn API credentials manually
4. Check environment variables in Supabase Dashboard
