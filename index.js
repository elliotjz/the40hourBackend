import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'

import { runScraper } from './lib/scraper'
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
  runScraper(res)
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

/* app.get('/api/clean', async (req, res, next) => {
  // Delete the useless scrapes
  Donations.findOne(
    { id: "1" },
    (err, data) => {
      if (err) {
        res.json({ error: err })
      } else {
        const dataObj = data.toObject()
        const scrapes = dataObj.donations
        const filteredScrapes = []
        let prevScrape = null
        scrapes.forEach(scrape => {
          if (!prevScrape ||
            JSON.stringify(prevScrape.people) !== JSON.stringify(scrape.people)) {
            // Either the scrape is the first one
            // Or there are changes since the last scrape
            // So add it to the filtered scrapes
            filteredScrapes.push(scrape)
          }
          prevScrape = scrape
        })

        Donations.findOneAndUpdate(
          { id: "1" },
          { $set: { donations: filteredScrapes } },
          (err, data) => {
            if (err) {
              console.log(`Error: ${err}`);
              res.json({ error: err })
            } else {
              res.json({ success: true })
            }
          }
        )
      }
    }
  )
}) */

const port = process.env.PORT || 5000
app.listen(port, () => console.log(`40 Hour Jammin Scraper running on http://localhost:${port}`))
