import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'

import { saveLatestDonationData } from './lib/scraper'
import './lib/cron' // runs cron tasks
import DonationsSnapshot from './models/donations-snapshot-model'
import { CURRENT_CAMPAIGN } from './constants'


// Get app secrets
let keys
let production
try {
  keys = require('./config/keys')
  production = false
} catch(e) {
  production = true
}

const app = express()
app.use(cors())

// Connect to mongodb
const uri = production ? process.env.mongodbURI : keys.mongodb.dbURI
mongoose.connect(uri, { useNewUrlParser: true }, () => {
  console.log('connected to mongodb')
})
mongoose.set('useFindAndModify', false);

/**
 * Scrape data from donation pages and save to DB
 */
app.post('/api/scrape', async (req, res, next) => {
  const result = await saveLatestDonationData();

  if (result.error) {
    res.status(500).send(result.error);
  } else {
    res.status(200).send();
  }
});

/**
 * Get stored donation data
 */
app.get('/api/data', async (req, res, next) => {
  const donationData = await DonationsSnapshot.find({ campaign: CURRENT_CAMPAIGN });
  res.json(donationData);
});

const port = process.env.PORT || 5000
app.listen(port, () => console.log(`40 Hour Jammin Scraper running on http://localhost:${port}`))
