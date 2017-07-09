var mongoose = require('mongoose')

var linkSchema = mongoose.Schema({
  url: { type: String },
  keywords: { type: String },
  negKeywords: { type: String }
})

module.exports = mongoose.model('link', linkSchema)
