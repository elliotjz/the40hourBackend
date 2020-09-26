const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const donationsSnapshotSchema = new Schema({
  date: String,
  campaign: String,
  donationData: Array,
})

const DonationsSnapshot = mongoose.model('donations-snapshot', donationsSnapshotSchema)

module.exports = DonationsSnapshot
