import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'

import { runCron } from './lib/scraper'
import './lib/cron' // runs cron tasks


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

const Donations = require('./models/donations-model')

app.get('/api/scrape', async (req, res, next) => {
  runCron()
  res.json({ success: true })
})

app.get('/api/data', async (req, res, next) => {
  // get the scrape data
  Donations.findOne(
    { id: "1" },
    (err, donations) => {
      if (err) {
        res.json({ error: err })
      } else {
        res.json(donations)
      }
    }
  )
})

const port = 5000
app.listen(port, () => console.log(`40 Hour Jammin Scraper running on http://localhost:${port}`))
