require('dotenv').config()
var appDebug = require('debug')('kicksbot:main')
var Admin = require('./models/user')
var express = require('express')
var path = require('path')
var mongoose = require('mongoose')
var passport = require('passport')
var flash = require('connect-flash')
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser')
var session = require('express-session')
var redis = require('redis')
var Redisstore = require('connect-redis')(session)
var client = redis.createClient()
var Xvfb = require('xvfb')
var xvfb = new Xvfb({reuse: true})
var app = express()
var server = require('https').Server(app);
var io = require('socket.io')(server)

// add all values in the .env file

mongoose.connect(process.env.MONGO_URL)

Admin.findOne({email: process.env.ADMIN_EMAIL}, function (err, admin) {
  if (err) throw err
  if (!admin) {
    var newAdmin = new Admin()
    newAdmin.email = process.env.ADMIN_EMAIL
    newAdmin.password = newAdmin.generateHash(process.env.ADMIN_PASS)
    newAdmin.verified = true
    newAdmin.isAdmin = true
    newAdmin.save(function (err) {
      if (err) throw err
    })
  }
})


app.set('views', path.resolve(__dirname, 'views'))
app.use(express.static('public'))
app.set('view engine', 'html')
app.engine('html', require('hbs').__express)


app.use(cookieParser()) // read cookies (needed for auth)
app.use(bodyParser()) // get information from html forms
app.use(bodyParser.json()) // get JSON data
app.use(session({
  //add .env file
  secret: process.env.SESSION_TOKEN,
  store: new Redisstore({host: process.env.REDIS_HOST, port: process.env.REDIS_PORT, client: client, ttl: process.env.REDIS_TTL}),
  saveUninitialized: false,
  resave: false
}))

app.use(passport.initialize())
app.use(passport.session()) // persistent login sessions
app.use(flash()) // use connect-flash for flash messages stored in session

xvfb.start(function (err, xvfbProcess) {
  // code that uses the virtual frame buffer here
  if (err) throw err
  require('./routes/route')(app, passport)
  require('./config/passport')(passport)
  require('./comms')(io)
  
  process.nextTick(function () {
   require('./asyncops')()
  })
})
        

server.listen(process.env.PORT, process.env.ADDR, function () {
  appDebug('Listening on ' + process.env.PORT)
})
