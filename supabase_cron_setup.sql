-- Enable required extensions (pg_net is usually enabled by default on Supabase, but good to be safe)
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove the old cron job if it exists to prevent duplicates
SELECT cron.unschedule('publish-linkedin-posts');

-- Schedule the native Supabase cron job to run every 5 minutes
SELECT cron.schedule(
  'publish-linkedin-posts', -- name of the cron job
  '*/5 * * * *',            -- run every 5 minutes
  $$
    SELECT net.http_post(
      url:='https://lhdmmvvklknamtxrkztv.supabase.co/functions/v1/publish-scheduled-posts',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        -- This automatically securely pulls your CRON_SECRET from your Supabase vault!
        'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
      ),
      body:='{}'::jsonb
    );
  $$
);

-- Note: You can view the status of your cron jobs using:
-- SELECT * FROM cron.job;
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
