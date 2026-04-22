# Complete LinkedIn Auto-Posting Setup Guide

## Overview

1. Schedule posts in the web app → stored in `post_templates` table
2. Cron job (cron-job.org) calls Supabase Edge Function every 5 minutes
3. Edge Function finds due posts → publishes to LinkedIn → updates status
4. Works even when you're logged out of the app

---

## Step 1: Set Environment Variables in Supabase

Go to **Supabase Dashboard** → **Settings** → **Edge Functions** → **Secrets**

Add these 3 secrets:

| Name | Value | Where to find it |
|------|-------|-----------------|
| `SUPABASE_URL` | `https://hdmmvvdknamberkztv.supabase.co` | Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | `eyJhbGciOi...` (long string) | Settings → API → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOi...` (long string) | Settings → API → service_role key |

**Do NOT add CRON_API_KEY — it's no longer used.**

---

## Step 2: Deploy the Edge Function

1. Go to **Supabase Dashboard** → **Edge Functions**
2. If `publish-scheduled-posts` exists → **Delete** it
3. Click **"New Function"**
4. **Name**: `publish-scheduled-posts`
5. Paste the code from `supabase/functions/publish-scheduled-posts/index.ts`
6. Click **"Deploy"**

---

## Step 3: Create Cron Job in cron-job.org

1. Go to https://console.cron-job.org
2. Click **"Create cronjob"**

### Basic Tab:
- **Title**: LinkedIn Auto-Poster
- **URL**: `https://hdmmvvdknamberkztv.supabase.co/functions/v1/publish-scheduled-posts`
- **Method**: POST
- **Schedule**: Every 5 minutes

### Advanced Tab — Headers:

| Header Name | Header Value |
|-------------|-------------|
| `Content-Type` | `application/json` |
| `apikey` | `YOUR_SUPABASE_ANON_KEY` |

**Replace `YOUR_SUPABASE_ANON_KEY`** with the exact value from:
Supabase Dashboard → Settings → API → Project API keys → `anon` `public`

### Advanced Tab — Request Body:
```json
{}
```

### Click **"Create cronjob"**

---

## Step 4: Test

1. Click **"Test Run"** in cron-job.org
2. Expected response:
```json
{ "message": "No scheduled posts due", "processed": 0 }
```
3. If you see this → ✅ Everything works!

---

## Step 5: Schedule a Post and Verify

1. Open your app → **Templates** → Create a template
2. Go to **Calendar** → Click a date 2-3 minutes in the future
3. Select template → Set time → **Schedule**
4. Wait for cron job to run (every 5 minutes)
5. Check **History** page → post should show as **Published**
6. Check your **LinkedIn profile** → post should appear

---

## Troubleshooting

### 401 Unauthorized
- The `apikey` header value must match `SUPABASE_ANON_KEY` in Supabase Secrets exactly
- Copy the anon key from Supabase Dashboard → Settings → API
- No extra spaces, no quotes

### "User LinkedIn token not found"
- User must connect LinkedIn in the app first (Calendar page → Connect LinkedIn)
- Check `users` table has `linkedin_access_token` and `linkedin_urn` columns
- Verify `post_templates` has `user_id` set correctly

### Posts stuck as "scheduled"
- Check cron job is running (execution logs in cron-job.org)
- Check `scheduled_at` is in the past (UTC timezone)
- Check Edge Function logs in Supabase Dashboard

### LinkedIn API error
- LinkedIn access tokens expire after 60 days — user must reconnect
- Check token has `w_member_social` scope
