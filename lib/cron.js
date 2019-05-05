import cron from 'node-cron'
import { runCron } from './scraper'

cron.schedule('* * * * *', () => {
  console.log("💀 Running the cron.");
  // runCron()
})
