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
var xvfb = new Xvfb()
var app = express()
var server = require('http').Server(app)
var io = require('socket.io')(server)
var Admin = require('./models/user')
var getAllRedis = require('./asyncops').getAllRedis
var redis = require('./asyncops').redis;
var asyncI = require('./asyncops').asyncI;

mongoose.connect(require('./config/database').url)

Admin.findOne({email: 'admin@monitor.kicks'}, function (err, admin) {
  if (err) throw err
  if (!admin) {
    var newAdmin = new Admin()
    newAdmin.email = 'admin@monitor.kicks'
    newAdmin.password = newAdmin.generateHash('k1ck3monitor')
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
  secret: 'ilovescotchscotchyscotchscotch',
    // create new redis store.
  store: new Redisstore({host: 'localhost', port: 6379, client: client, ttl: 760}),
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
  
  getAllRedis(redis, 'posted', function (err, data) {
      if (err) throw err
      for (var i in data) {
        publisher.publish('update', JSON.stringify({ 'id': data[i]._id.toString(), type: 'posted' }))
      }
    })
    getAllRedis(redis, 'blocked', function (err, data) {
      if (err) throw err
      for (var i in data) {
        publisher.publish('update', JSON.stringify({ 'id': data[i]._id.toString(), type: 'blocked' }))
      }
    })
    console.log('monitoring')
    getAllRedis(redis, 'links', function (err, datasets) {
      if (!err) {
        async.mapLimit(datasets, settings.lps, fetch, function (err, allDataArr) {
          for (var i in allDataArr) {
            try {
              if (err) throw err
              var oldData = allDataArr[i].olddata
              var newData = allDataArr[i].newdata
              console.log(newData)
              if (oldData.hash !== newData.hash) {
                if ((oldData.negHash !== newData.negHash) && (newData.result.negKeywords.length < oldData.result.negKeywords.length) && newData.result.posKeywords.length) {
                  twitterPost('Now avilable', newData.result.title, newData.url, twitrestock)
                  redis.hset(['posted', newData._id.toString(), JSON.stringify(newData)])
                  redis.hdel(['links', newData._id.toString(), function (err) {
                    if (err) throw err
                  }])
                }

                if (newData.result.negKeywords.length === 0 && newData.result.posKeywords.length === 0) {
                  redis.hset(['blocked', newData._id.toString(), JSON.stringify(newData)])
                  redis.hdel(['links', newData._id.toString(), function (err) {
                    if (err) throw err
                  }])
                }

                publisher.publish('update', JSON.stringify({ 'id': newData._id, type: 'nochange' }))
                publisher.publish('keywords', JSON.stringify({'id': newData._id, type: {keyword: Boolean(newData.result.posKeywords.length), negKeyword: Boolean(newData.result.negKeywords.length)}}))
                publisher.publish('server', JSON.stringify({'message': 'updated', type: 'ch', status: allDataArr[i].status}))
              } else {
                publisher.publish('update', JSON.stringify({ 'id': newData._id, type: 'nochange' }))
                publisher.publish('keywords', JSON.stringify({'id': newData._id, type: {keyword: Boolean(newData.result.posKeywords.length), negKeyword: Boolean(newData.result.negKeywords.length)}}))
                publisher.publish('server', JSON.stringify({'message': 'updated', type: 'ch', status: allDataArr[i].status}))
                console.log('no changes:  ' + allDataArr[i].status)
              }
            } catch (e) {
              
              console.log(e)
              publisher.publish('server', JSON.stringify({ 'message': e, type: 'nc', status: allDataArr[i].status }))
            }
          }
          
        })
      } else {
        console.log(err)
      }
    })
        
  process.nextTick(function () {
    asyncI();
  })
})

server.listen(8080, '0.0.0.0', function () {
  console.log('Listening on 80')
})
