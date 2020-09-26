import axios from 'axios'
import cheerio from 'cheerio'

const Donations = require('../models/donations-model')

const CONST_FACEBOOK_PAGES = [
  { name: 'Test', url: 'https://www.facebook.com/donate/243841887004884/' }
];

/**
 * scrape facebook pages for donation data
 * 
 * @param {[{ name: String, url: String }]} pages list of pages to get data from
 * @returns {[{
 *  name: String,
 *  url: String,
 *  donationData: { amount: number, target: number }
 * }]}
 */
const scrapeFacebook = async (pages) => {
  const pagesWithHtml = await Promise.all(
    pages.map(async page => {
      const html = await getHTML(page.url);
      return { name: page.name, html }; 
    })
  );

  const pagesWithDonationData = await Promise.all(
    pagesWithHtml.map(async page => {
      const donationData = await getCurrentDonation(page.html);
      return { name: page.name, donationData };
    })
  );
  return pagesWithDonationData;
}

/**
 * Gets the HTML content of the page at the specified URL
 * @param {String} url    URL of the page
 * @returns {String}      HTML data from the page
 */
const getHTML = async (url) => {
  const { data: html } = await axios.get(url)
  return html
}

/**
 * Parses the given HTML for find the current donation amount of the fundraiser
 * 
 * @param {String} html HTML content of the fundraiser page
 * @returns {Object} Object containing amount and target
 */
const getCurrentDonation = async (html) => {
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
    
    return getNumbersFromSpan(donationSpan)
  } catch (err) {
    console.log('Error getting data from facebook pages.');
    return null
  }
}

/**
 * Parses the given HTML span find the current donation amount of the fundraiser
 * 
 * @param {String} span HTML content of the span containing donation info
 * @returns {Object} Object containing amount and target
 */
const getNumbersFromSpan = (span) => {
  const amountStr = span.substring(1).split('&')[0]
  const amount = parseInt(amountStr.replace(',', ''))
  const targetStr = span.split('of $')[1].split('&')[0]
  const target = parseInt(targetStr.replace(',', ''))
  if (span.includes('AUD')) {
    // AUD
    return { amount, target }
  } else {
    // USD
    const amountAUD = Math.round(amount * 1.4446691708)
    const targetAUD = Math.round(target * 1.4446691708)
    return { amount: amountAUD, target: targetAUD }
  }
}

/**
 * Scrapes the 40 hour jammin' artist page to get the list of fundraiser page URLs
 * 
 * @returns {Array} array of objects containing name and url
 */
const scrape40hour = async () => {
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
    return []
  }
}

/**
 * Scrapes a everyday here website page for current donation data
 */
const scrapeHero = async () => {
  try {
    const { data: data1 } = await axios.get("https://give.everydayhero.com/au/40-hours-of-tai-chi-qigong-island-walks-live-music")
    const { data: data2 } = await axios.get("https://40-hour-jammin.everydayhero.com/au/the-40-hour-jammin")
    const $1 = cheerio.load(data1)
    const amountDiv1 = $1(".experiment-donation-bar__progress-raised")
    const $2 = cheerio.load(data2)
    const amountDiv2 = $2(".experiment-donation-bar__progress-raised")

    const amount1 = amountDiv1.text().split('$')
    const amount2 = amountDiv2.text().split('$')

    const int1 = parseInt(amount1[1].replace(',', ''))
    const int2 = parseInt(amount2[1].replace(',', ''))
    return [int1, int2]
  } catch(err) {
    console.log("Error scraping Everyday Hero.");
    return []
  }
}

/**
 * Runs the scraper to get all of the most recent donation amounts
 * 
 * @param {*} res
 */
export const saveLatestDonationData = async (res) => {
  const facebookScrapeData = await scrapeFacebook(CONST_FACEBOOK_PAGES);

  let filteredData = []
  const names = []
  for (let i = 0; i < facebookScrapeData.length; i++) {
    if (facebookScrapeData[i] !== null) {
      filteredData.push({ ...facebookScrapeData[i] })
      names.push(facebookScrapeData[i].name)
    }
  }
  console.log(filteredData);
  console.log(names);

  const snapshot = {
    date: Date.now(),
    people: filteredData
  };

  Donations.findOne({ id: "3" }, (err, data) => {
    if (err) {
      console.log('Error finding entry in DB');
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
}
