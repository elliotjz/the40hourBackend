import cron from 'node-cron'
import { runScraper } from './scraper'

cron.schedule('*/15 * * * *', () => {
  const date = new Date()
  console.log(`💀 Running the cron.\nThe time is ${date.getHours()}:${date.getMinutes()}`);
  runScraper()
})
