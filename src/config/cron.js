import cron from "cron";
import https from "https";

const CronJob = cron.CronJob;

export const cronJob = new CronJob("*/14 * * * *", function () {
  const apiUrl = process.env.API_URL;

  if (!apiUrl) {
    console.warn("⚠️ API_URL not set - cron job cannot ping server");
    return;
  }

  console.log("🔄 Cron: Pinging server to keep alive...");

  https
    .get(apiUrl, (res) => {
      if (res.statusCode === 200) {
        console.log("✅ Cron: Server pinged successfully");
      } else {
        console.log(`⚠️ Cron: Ping failed with status ${res.statusCode}`);
      }
    })
    .on("error", (e) => {
      console.error("❌ Cron: Error while pinging server:", e.message);
    });
});
