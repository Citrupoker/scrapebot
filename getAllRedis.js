module.exports = function(redisClient, table, cb) {
  redisClient.hgetall([table], function (err, reply) {
    if (err) throw err
    var data = []
    if (reply) {
      Object.keys(reply).forEach(function (key) {
        data.push(JSON.parse(reply[key]))
      })
    }
    cb(null, data)
  })
}