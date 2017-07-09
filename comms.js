var redis = require('redis')
var subscriber = redis.createClient()

module.exports = function (io) {
  io.on('connection', function (socket) {
    subscriber.on('message', function (channel, message) {
      socket.emit(channel, JSON.parse(message))
    })
  })

  subscriber.subscribe('update')
  subscriber.subscribe('keywords')
  subscriber.subscribe('server')
}
