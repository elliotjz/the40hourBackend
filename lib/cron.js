import cron from 'node-cron'
import { saveLatestDonationData } from './scraper'

cron.schedule('*/15 * * * *', () => {
  const date = new Date()
  console.log('Running the cron')
  console.log(`The time is ${date.getHours()}:${date.getMinutes()}`);
  // saveLatestDonationData()
})
