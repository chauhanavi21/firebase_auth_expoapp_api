if (process.env.NODE_ENV === 'production') {
  cronJob.start();
  console.log('🔄 Cron job started - server will self-ping every 14 minutes');
}