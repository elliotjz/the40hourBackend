import axios from 'axios'
import cheerio from 'cheerio'

const Donations = require('../models/donations-model')

async function scrapeFacebook(pages) {
  const htmlArray = await Promise.all(pages.map(page => getHTML(page.url)))
  const donations = await Promise.all(htmlArray.map(html => getCurrentDonation(html)))
  console.log('\n\ndonations:');
  console.log(donations);
  return donations
}

async function getHTML(url) {
  const { data: html } = await axios.get(url)
  return html
}

async function getCurrentDonation(html) {
  try {
    const $ = cheerio.load(html)
    // Find donation progress card
    const donationSpan1 = $('#progress_card ._1r05').html()

    // Fundraisers that are over have a different class name
    const donationSpan2 = $('#progress_card ._1r08').html()
    const donationSpan = donationSpan1 || donationSpan2

    if (!donationSpan) {
      console.log("\nUnable to find donation span");
      return null
    }

    const spanArr = donationSpan.split(";")

    console.log(`\nspanArr:`);
    console.log(spanArr);

    if (spanArr.length === 1) {
      // No AUD displayed
      const amountStr = spanArr[0].split(' ')[0].substring(1)
      if (!amountStr) {
        console.log(`\nNo amount String.`);
        return null
      }
      const amount = parseInt(amountStr.replace(',', ''))
  
      if (!amount && amount !== 0) {
        console.log(`\nNo amount. Amount Str:`);
        console.log(amountStr);
        return null
      }
  
      const targetStr = spanArr[0].split(' ')[3]
        .split('<')[0].substring(1)
      if (!targetStr) {
        console.log(`\nNo target String.`);
        return null
      }
      const target = parseInt(targetStr.replace(',', ''))
      if (!target) {
        console.log(`\nNo amount. Amount Str:`);
        console.log(targetStr);
        return null
      }
  
      return { amount, target }
    } else {
      // AUD is displayed
      const amountStr = spanArr[0].split('&')[0].substring(1)
      if (!amountStr) {
        console.log(`\nNo amount String.`);
        return null
      }
      const amount = parseInt(amountStr.replace(',', ''))
  
      if (!amount && amount !== 0) {
        console.log(`\nNo amount. Amount Str:`);
        console.log(amountStr);
        return null
      }
  
      const targetStr = spanArr[1].split('&')[0].split('$')[1]
      if (!targetStr) {
        console.log(`\nNo target String.`);
        return null
      }
      const target = parseInt(targetStr.replace(',', ''))
      if (!target) {
        console.log(`\nNo amount. Amount Str:`);
        console.log(targetStr);
        return null
      }
  
      return { amount, target }
    }
  } catch (err) {
    console.log('Error getting data from facebook pages.');
    console.log(err);
    return null
  }
}

async function scrape40hour() {
  try {
    const { data } = await axios.get("https://www.the40hourjammin.com/artists")
    const $ = cheerio.load(data)
    const artistH3s = $('#comp-jsfy9kn4 h3 a')
    let pages = []
    artistH3s.each((i, el) => {
      let span = $('span', el)
      while ($('span', span).length) {
        span = $('span', span)
      }
      const name = span.text()
      pages.push({ name, url: el.attribs.href })
    })
    return pages
  } catch(err) {
    console.log("Error scraping the 40 hour jammin.");
    console.log(err);
    return []
  }
}

async function runCron(res) {
  console.log('Scraping');

  // Get URLs from the40hourjammin.com
  const pages = await scrape40hour()
  console.log(`Found ${pages.length} donation pages to scrape.`);

  // Get data from donation pages
  const data = await scrapeFacebook(pages)
  const filteredData = []
  const names = []
  for (let i = 0; i < data.length; i++) {
    if (data[i] !== null) {
      filteredData.push({ ...data[i], name: pages[i].name })
      names.push(pages[i].name)
    }
  }

  const snapshot = {
    date: Date.now(),
    people: filteredData,
  }

  Donations.findOne({ id: "1" }, (err, data) => {
    if (err) {
      console.log(err);
      res.json({ error: err })
    } else {
      // Find last scrape
      const scrapes = data.toObject().donations
      const lastScrape = scrapes[scrapes.length -1]
      const oldNews = JSON.stringify(lastScrape.people) === JSON.stringify(snapshot.people)
      if (oldNews) {
        console.log("Successful Scrape.\nNo new donations.");
        if (res) res.json({ success: true })
      } else {
        Donations.findOneAndUpdate(
          { id: "1" },
          {
            $push: { donations: snapshot },
            $addToSet: { names: names }
          },
          { new: true },
          (err2, data2) => {
            if (err2) {
              console.log(`Error: ${err}`);
              if (res) res.json({ error: err2 })
            } else {
              console.log("Successful Scrape.\nNew donations found and saved.");
              if (res) res.json({ success: true })
            }
          }
        )
      }
    }
  })

  /*  */
}

export { getHTML, getCurrentDonation, scrapeFacebook, runCron }
