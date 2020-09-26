import axios from 'axios'
import cheerio from 'cheerio'

import { CURRENT_CAMPAIGN } from '../constants';
const DonationsSnapshot = require('../models/donations-snapshot-model')

const CONST_FACEBOOK_PAGES = [
  { name: 'Test', url: 'https://www.facebook.com/donate/243841887004884/' }
];

/**
 * scrape facebook pages for donation data
 * 
 * @param {[{ name: String, url: String }]} pages list of pages to get data from
 * @returns {[{
 *  name: String,
 *  amount: Number
 *  target: number
 * }}]}
 */
const scrapeFacebook = async (pages) => {
  return await Promise.all(
    pages.map(async page => {
      const { name, url } = page;
      const html = await getHTML(url);
      const { amount, target } = await getCurrentDonation(html);
      return { name, amount, target }; 
    })
  );
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
 * @returns {[{
  *  amount: Number
  *  target: number
  * }}]}
 */
const getCurrentDonation = async (html) => {
  try {
    const $ = cheerio.load(html);
    
    // Find donation progress card
    const donationSpan1 = $('#progress_card ._1r05').html();
    
    // Fundraisers that are over have a different class name
    const donationSpan2 = $('#progress_card ._1r08').html();
    const donationSpan = donationSpan1 || donationSpan2;

    if (!donationSpan) {
      console.log("\nUnable to find donation span");
      return { amount: null, target: null };
    }
    
    return getNumbersFromSpan(donationSpan);
  } catch (err) {
    console.log('Error getting data from facebook pages.');
    return { amount: null, target: null };
  }
}

/**
 * Parses the given HTML span find the current donation amount of the fundraiser
 * 
 * @param {String} span HTML content of the span containing donation info
 * @returns {[{
  *  name: String,
  *  amount: Number
  *  target: number
  * }}]}
 */
const getNumbersFromSpan = (span) => {
  const amountStr = span.substring(1).split('&')[0];
  const targetStr = span.split('of $')[1].split('&')[0];
  let amount = parseInt(amountStr.replace(',', ''));
  let target = parseInt(targetStr.replace(',', ''));

  if (!span.includes('AUD')) {
    // Convert from USD to AUD
    amount = Math.round(amount * 1.4446691708);
    target = Math.round(target * 1.4446691708);
  }

  return { amount, target };
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
 * @returns {{ error: Boolean|String }}  Object with error property
 */
export const saveLatestDonationData = async () => {
  try {
    const facebookScrapeData = await scrapeFacebook(CONST_FACEBOOK_PAGES);
    
    const validDonationData = facebookScrapeData.filter(donationData => {
      if (!donationData.amount) {
        console.log(`Error getting amount for ${donationData.name} - got ${donationData.amount}`);
      }
      return donationData.amount;
    });

    const snapshot = {
      date: Date.now(),
      campaign: CURRENT_CAMPAIGN,
      donationData: validDonationData
    };

    console.log('\nSaving snapshot:');
    console.log(snapshot);
    await DonationsSnapshot.create(snapshot);
    return { error: false };
  } catch (error) {
    console.log('Error getting donation data');
    console.log(error);
    return { error: error };
  }
}
