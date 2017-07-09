var mongoose = require('mongoose')
var bcrypt = require('bcrypt-nodejs')

var userSchema = mongoose.Schema({
  email: { type: String, required: true, unique: true },
  dealership: {type: String},
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  isAdmin: {type: Boolean, default: false},
  verified: {type: Boolean, default: false}
})

// generating a hash
userSchema.methods.generateHash = function (password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null)
}

// checking if password is valid
userSchema.methods.validPassword = function (password) {
  return bcrypt.compareSync(password, this.password)
}

module.exports = mongoose.model('user', userSchema)
