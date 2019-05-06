import cron from 'node-cron'
import { runCron } from './scraper'

cron.schedule('*/15 * * * *', () => {
  const date = new Date()
  console.log(`💀 Running the cron.\nThe time is ${date.getHours()}:${date.getMinutes()}`);
  runCron()
})
