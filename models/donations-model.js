const mongoose = require('mongoose')
const Schema = mongoose.Schema

const donationsSchema = new Schema({
  id: String,
  names: Array,
  donations: Array,
})

const Donations = mongoose.model('donations', donationsSchema)

module.exports = Donations
