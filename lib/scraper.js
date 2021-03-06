import axios from 'axios'
import cheerio from 'cheerio'

import { CURRENT_CAMPAIGN } from '../constants';
const DonationsSnapshot = require('../models/donations-snapshot-model')

const CONST_FACEBOOK_PAGES = [
  { name: 'ACT', url: 'https://www.facebook.com/donate/243841887004884/' },
  { name: 'NSW', url: 'https://www.facebook.com/donate/243841887004884/' },
  { name: 'NT', url: 'https://www.facebook.com/donate/243841887004884/' },
  { name: 'QLD', url: 'https://www.facebook.com/donate/243841887004884/' },
  { name: 'SA', url: 'https://www.facebook.com/donate/243841887004884/' },
  { name: 'TAS', url: 'https://www.facebook.com/donate/243841887004884/' },
  { name: 'VIC', url: 'https://www.facebook.com/donate/243841887004884/' },
  { name: 'TAS', url: 'https://www.facebook.com/donate/243841887004884/' }
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
 * Finds the last valid donation amount and target for the given name
 * 
 * @param {*} name                Name to get the data for
 * @param {*} previousSnapshots   Previous snapshots in the DB
 * @returns {{
 *  name: String,
 *  amount: String,
 *  target: String
 * }}
 */
const getPreviousData = (name, previousSnapshot) => {
  const previousValues = previousSnapshot.donationData.find(
    competitorData => competitorData.name === name
  );
  if (!previousValues || !previousValues.name || !previousValues.target) {
    return null;
  }

  const { amount, target } = previousValues;
  return { name, amount, target };
}
/**
 * Runs the scraper to get all of the most recent donation amounts
 * 
 * @returns {{ error: Boolean|String }}  Object with error property
 */
export const saveLatestDonationData = async () => {
  try {
    const facebookScrapeData = await scrapeFacebook(CONST_FACEBOOK_PAGES);
    const previousSnapshot = await DonationsSnapshot.findOne(
      { campaign: CURRENT_CAMPAIGN }, {}, { sort: { 'date' : -1 } }
    );

    const validDonationData = facebookScrapeData.map(competitorData => {
      return (competitorData.amount && competitorData.target)
        ? competitorData
        : getPreviousData(competitorData.name, previousSnapshot);
    }).filter(competitorData => competitorData);

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
