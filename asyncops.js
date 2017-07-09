var Nightmare = require('nightmare')
var asyncInterval = require('asyncinterval')
var Twit = require('twit')
var hashObject = require('hash-object')
var datetime = require('node-datetime')
var async = require('async')
var redisLib = require('redis')
var jsonfile = require('jsonfile')
var clone = require('clone')
var redis = redisLib.createClient()
var publisher = redisLib.createClient()
var childProcess = require('child_process')
var _ = require('underscore-node')
var fetchSettings = {}
var settings = {}
settings = loadSettings('./conf.json')
fetchSettings = settings.fetch

var T = new Twit({
  consumer_key: settings.ck,
  consumer_secret: settings.cs,
  access_token: settings.at,
  access_token_secret: settings.ats,
  timeout_ms: 60 * 1000 // optional HTTP request timeout to apply to all requests.
})

var twitrestock = function (params) {
  // first we must post the media to Twitter
  T.post('statuses/update', params, function (err, data, response) {
    if (err) console.log(err)
  })
}

var twitterPost = function (msg, title, url, cb) {
  var dt = datetime.create()
  var formated = dt.format('m/d/Y I:M')
  var twitterData = {
    'status': msg + ' ' + formated + ' ' + title.substring(0, 60) + '  ' + url,
    'altText': title
  }

  cb(twitterData)
}

module.exports = function () {
  var asyncI = asyncInterval(function (done) {
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
              done()
              console.log(e)
              publisher.publish('server', JSON.stringify({ 'message': e, type: 'nc', status: allDataArr[i].status }))
            }
          }
          done()
        })
      } else {
        console.log(err)
        done()
      }
    })
  }, settings.interval * 1000, settings.timeout * 1000)

  asyncI.onTimeout(function () {
    childProcess.exec('killall -9 electron')
    childProcess.exec('killall -9 electron')
  })
}

function fetch (params, cb) {
  process.nextTick(function () {
    var copyOfparams = clone(params)
    var useragents = ['Mozilla/4.0 (compatible; MSIE 7.0; America Online Browser 1.1; Windows NT 5.1; (R1 1.5); .NET CLR 2.0.50727; InfoPath.1)', 'Mozilla/5.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0; Acoo Browser 1.98.744; .NET CLR 3.5.30729)', 'Mozilla/4.0 (compatible; MSIE 7.0; America Online Browser 1.1; Windows NT 5.1; (R1 1.5); .NET CLR 2.0.50727; InfoPath.1)', 'AmigaVoyager/3.2 (AmigaOS/MC680x0)', 'Mozilla/5.0 (compatible; MSIE 9.0; AOL 9.7; AOLBuild 4343.19; Windows NT 6.1; WOW64; Trident/5.0; FunWebProducts)', 'Mozilla/5.0 (X11; U; UNICOS lcLinux; en-US) Gecko/20140730 (KHTML, like Gecko, Safari/419.3) Arora/0.8.0', 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0; Avant Browser; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0)', 'Mozilla/5.0 (Windows; U; WinNT; en; rv:1.0.2) Gecko/20030311 Beonex/0.8.2-stable', 'Mozilla/5.0 (X11; U; Linux i686; nl; rv:1.8.1b2) Gecko/20060821 BonEcho/2.0b2 (Debian-1.99+2.0b2+dfsg-1)', 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko', 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X; en-US) AppleWebKit/528.16 (KHTML, like Gecko, Safari/528.16) OmniWeb/v622.8.0.112941', 'Opera/9.80 (X11; Linux i686; Ubuntu/14.10) Presto/2.12.388 Version/12.16', 'Mozilla/5.0 (Windows; U; Windows NT 6.1; rv:2.2) Gecko/20110201', 'Mozilla/5.0 (Windows; U; Windows NT 5.1; pt-BR) AppleWebKit/533.3 (KHTML, like Gecko)  QtWeb Internet Browser/3.7', 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10.6; en-US; rv:1.9.2.3) Gecko/20100402 Prism/1.0b4', 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:40.0) Gecko/20100101 Firefox/40.1', 'Mozilla/5.0 (X11; U; Linux i686; pt-BR) AppleWebKit/533.3 (KHTML, like Gecko) Navscape/Pre-0.2 Safari/533.3', 'Mozilla/5.0 (Windows; U; Windows NT 6.1; x64; fr; rv:1.9.2.13) Gecko/20101203 Firebird/3.6.13', 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36', 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:2.0) Treco/20110515 Fireweb Navigator/2.4', 'Mozilla/5.0 (Linux; U; Android 4.0.3; ko-kr; LG-L160L Build/IML74K) AppleWebkit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30', 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_5_7; en-us) AppleWebKit/530.17 (KHTML, like Gecko) Version/4.0 Safari/530.17 Skyfire/2.0']
    var allData = {}
    try {
      allData['olddata'] = copyOfparams
      var pLen = fetchSettings.proxyList.length
      var proxy = fetchSettings.proxyList[Math.floor(Math.random() * pLen)]

      fetchSettings.options.electronPath = require('electron')

      if (fetchSettings.useProxy) {
        fetchSettings.options.switches['proxy-server'] = proxy.proxyUrl
      }

      var nightmare = new Nightmare(fetchSettings.options)

      if (proxy.proxyUser && proxy.proxyPass && fetchSettings.useProxy) {
        nightmare.authentication(proxy.proxyUser, proxy.proxyPass)
      }

      nightmare.useragent(useragents[Math.floor((Math.random() * useragents.length))]).goto(params.url).wait(3000)

      nightmare.inject('js', 'node_modules/jquery/dist/jquery.js')
      .inject('js', 'jquery.xpath.min.js')
      .evaluate(function (keyword, negKeyword, posKeySel, negKeySel) {
        var result = {}
        var keywordUrls = []
        var negKeywordArr = []
        var posKeywordArr = []
        var keywords = new RegExp(keyword, 'ig')

        $('a').each(function () {
          var url = this.href
          var matchLen = url.toString().match(keywords) === null ? 0 : url.toString().match(keywords).length
          var keywordLen = keyword.split('|').length || 0
          var percentageLen = Math.floor((keywordLen / 100) * 0.8 * 100)
          if (matchLen >= percentageLen) {
            if (keywordUrls.indexOf(url) === -1) {
              keywordUrls.push(url)
            }
          }
        })

        $(document).xpath(negKeySel).each(function () {
          var str = $(this).text()
          if (str.toLowerCase().trim() === negKeyword.toLowerCase()) {
            negKeywordArr.push(str)
          }
        })
         
        $(document).xpath(posKeySel).each(function () {
          var element = $(this)
          var str = element.text()
          var matchLen = str.toString().match(keywords) === null ? 0 : str.toString().match(keywords).length
          var keywordLen = keyword.split('|').length
          if (matchLen === keywordLen && str.length <= (keyword.split('|').join(' ').length * 5)) {
            posKeywordArr.push(str)
          }
        })

        result.title = $('title').text()

        result.keywordUrls = keywordUrls

        result.posKeywords = posKeywordArr

        result.negKeywords = negKeywordArr

        return result
      }, params.keywords.toString().trim(), params.negKeywords.toString().trim(), '//text()[matches(., "' + params.keywords.toString().trim() + '", "i")]', '//text()[matches(., "' + params.negKeywords.toString().trim() + '", "i")]')
      .end()
      .then(function (result) {
        var dataset = clone(params)
        dataset.result = result
        dataset.urlHash = hashObject(result.keywordUrls)
        dataset.negHash = hashObject(result.negKeywords)
        dataset.posHash = hashObject(result.posKeywords)
        dataset.hash = hashObject(result, 'md5')
        dataset.status = {success: true, message: ''}
        allData['newdata'] = dataset
        allData['status'] = true
        cb(null, allData)
      })
      .catch(function (err) {
        copyOfparams.status = {success: false, message: err}
        allData['newdata'] = copyOfparams
        allData['status'] = false
        cb(null, allData)
      })
    } catch (err) {
      copyOfparams.status = {success: false, message: JSON.stringify(err)}
      allData['newdata'] = copyOfparams
      allData['status'] = false
      cb(null, allData)
    }
  })
}

// ========================================================= HELPER FUNCTIONS ============================================================================
function getAllRedis (redisClient, table, cb) {
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

function loadSettings (file) {
  var config = jsonfile.readFileSync(file)
  var twitterSettings = config.twitter
  var monitorSettings = config.monitor
  var settings = {}
  settings.ck = twitterSettings.consumer_key
  settings.cs = twitterSettings.consumer_secret
  settings.at = twitterSettings.access_token
  settings.ats = twitterSettings.access_token_secret
  settings.interval = monitorSettings.interval
  settings.lps = monitorSettings.lps
  settings.timeout = monitorSettings.timeout
  settings.fetch = config.fetch
  return settings
}

