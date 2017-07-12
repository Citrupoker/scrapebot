var Link = require('../models/link')
var jsonfile = require('jsonfile')
var redisLib = require('redis')
var hashObject = require('hash-object')
var Nightmare = require('nightmare')
var fetchSettings = {}
var redis = redisLib.createClient()
var jsonconf = '/root/kicks/conf.json'
fetchSettings = loadSettings(jsonconf)
jsonfile.spaces = 4

module.exports.logout = function (req, res) {
  req.logout()
  req.session.destroy()
  res.redirect('/login')
}

module.exports.login = function (req, res) {
  res.render('login', { signinMessage: req.flash('signinMessage'), signupMessage: req.flash('signupMessage') })
}

module.exports.settings = function (req, res) {
  res.render('settings')
}

module.exports.index = function (req, res) {
  Link.find(function (err, links) {
    if (!err) {
      res.render('index', { title: 'Kicks', linkdata: links })
    } else {
      res.render('index', { title: 'Kicks' })
    }
  })
}

module.exports.getLinkData = function (req, res) {
  Link.find({}, function (err, links) {
    if (!err) {
      res.send(JSON.stringify(links))
    } else {
      res.send(JSON.stringify({}))
    }
  })
}

module.exports.deleteAllLinks = function (req, res) {
  process.nextTick(function () {
    try {
      getAllRedis(redis, 'links', function (err, data) {
        if (err) { throw err }
        for (var i in data) {
          redis.hdel(['links', data[i]._id.toString()], function (err) {
            if (err) { throw err }
          })
        }
      })

      getAllRedis(redis, 'posted', function (err, data) {
        if (err) { throw err }
        for (var i in data) {
          redis.hdel(['posted', data[i]._id.toString()], function (err) {
            if (err) { throw err }
          })
        }
      })

      Link.remove({}, function (err) {
        if (err) { throw err }
      })

      res.send('links deleted')
    } catch (e) {
      console.log(e)
      res.end()
    }
  })
}

module.exports.deleteSelectedLinks = function (req, res) {
  var data = req.body.ids
  process.nextTick(function () {
    try {
      for (var i in data) {
        redis.hdel(['links', data[i].toString()], function (err) {
          if (err) { throw err }
        })
      }

      for (var x in data) {
        redis.hdel(['posted', data[x].toString()], function (err) {
          if (err) { throw err }
        })
      }
      Link.remove({_id: {$in: data}}, function (err) {
        if (err) { throw err }
      })

      res.send('links deleted')
    } catch (e) {
      console.log(e)
      res.end()
    }
  })
}

module.exports.reset = function (req, res) {
  var dataarr = req.body.ids
  try {
    process.nextTick(function () {
      Link.find({ _id: { $in: dataarr } }, function (err, data) {
        if (err) console.log('encountred an error please try again error')
        if (data.length > 0) {
          for (var x in data) {
            fetchMain(data[x], function (err, dataset) {
              if (err) console.log('encountred an error please try again error')
              console.log(dataset)
              redis.hset(['links', dataset._id.toString(), JSON.stringify(dataset)])
              redis.hdel(['posted', dataset._id.toString()], function (err) {
                if (err) { throw err }
              })
              redis.hdel(['blocked', dataset._id.toString()], function (err) {
                if (err) { throw err }
              })
            })
          }
          res.end()
        }
      })
    })
  } catch (e) {
    console.log('catch', e)
    res.send('encountred an error please try again')
  }
}

module.exports.addLink = function (req, res) {
  var savedata = new Link()
  var url = req.body.link
  var linkType = req.body.linkType
  var keywords = req.body.keywords
  var negKeywords = req.body.negKeywords
  var regNegKeywords = negKeywords.toString().split(',').length > 1 ? trimAllWhiteSpaces(negKeywords.toString().split(',')).join('|') : negKeywords.toString()
  var regKeywords = keywords.toString().split(/[^A-Za-z0-9]/ig).length > 1 ? trimAllWhiteSpaces(keywords.toString().split(/[^A-Za-z0-9]/ig)).join('|') : keywords.toString()

  try {
    Link.findOne({ url: url }, function (err, data) {
      if (err) return res.send('encountred an error please try again')
      if (!data) {
        savedata.url = url.toString().trim()
        savedata.linkType = linkType
        savedata.keywords = regKeywords
        savedata.negKeywords = regNegKeywords
        savedata.save(function (err, data) {
          if (err) return res.send('encountred an error please try again')
          res.end()
        })
      } else {
        res.send('Duplicate Link')
      }
    })
  } catch (e) {
    console.log(e)
    res.send('encountred an error please try again')
  }
}

module.exports.postconfig = function (req, res) {
  var settings = req.body.data
  jsonfile.writeFile(jsonconf, JSON.parse(settings), function (err, data) {
    console.log(err)
    if (!err) {
      res.send(true)
    } else {
      res.send(false)
    }
  })
}

module.exports.getconfig = function (req, res) {
  jsonfile.readFile(jsonconf, function (err, obj) {
    if (!err) {
      res.send(JSON.stringify(obj))
    } else {
      res.send(JSON.stringify(err))
    }
  })
}

module.exports.signupinfoView = function (req, res) {
  res.render('signupinfo.html')
}

module.exports.logininfoView = function (req, res) {
  res.render('logininfo.html')
}

module.exports.regFailView = function (req, res) {
  res.render('regFail.html')
}

// ===============================================================HELPER FUNCTIONS==================================================================

function trimAllWhiteSpaces (arr) {
  var trimedArr = arr.map(Function.prototype.call, String.prototype.trim)
  return trimedArr
}

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

function fetchMain (params, cb) {
  
  process.nextTick(function () {
    var useragents = ['Mozilla/4.0 (compatible; MSIE 7.0; America Online Browser 1.1; Windows NT 5.1; (R1 1.5); .NET CLR 2.0.50727; InfoPath.1)', 'Mozilla/5.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0; Acoo Browser 1.98.744; .NET CLR 3.5.30729)', 'Mozilla/4.0 (compatible; MSIE 7.0; America Online Browser 1.1; Windows NT 5.1; (R1 1.5); .NET CLR 2.0.50727; InfoPath.1)', 'AmigaVoyager/3.2 (AmigaOS/MC680x0)', 'Mozilla/5.0 (compatible; MSIE 9.0; AOL 9.7; AOLBuild 4343.19; Windows NT 6.1; WOW64; Trident/5.0; FunWebProducts)', 'Mozilla/5.0 (X11; U; UNICOS lcLinux; en-US) Gecko/20140730 (KHTML, like Gecko, Safari/419.3) Arora/0.8.0', 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0; Avant Browser; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0)', 'Mozilla/5.0 (Windows; U; WinNT; en; rv:1.0.2) Gecko/20030311 Beonex/0.8.2-stable', 'Mozilla/5.0 (X11; U; Linux i686; nl; rv:1.8.1b2) Gecko/20060821 BonEcho/2.0b2 (Debian-1.99+2.0b2+dfsg-1)', 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko', 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X; en-US) AppleWebKit/528.16 (KHTML, like Gecko, Safari/528.16) OmniWeb/v622.8.0.112941', 'Opera/9.80 (X11; Linux i686; Ubuntu/14.10) Presto/2.12.388 Version/12.16', 'Mozilla/5.0 (Windows; U; Windows NT 6.1; rv:2.2) Gecko/20110201', 'Mozilla/5.0 (Windows; U; Windows NT 5.1; pt-BR) AppleWebKit/533.3 (KHTML, like Gecko)  QtWeb Internet Browser/3.7', 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10.6; en-US; rv:1.9.2.3) Gecko/20100402 Prism/1.0b4', 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:40.0) Gecko/20100101 Firefox/40.1', 'Mozilla/5.0 (X11; U; Linux i686; pt-BR) AppleWebKit/533.3 (KHTML, like Gecko) Navscape/Pre-0.2 Safari/533.3', 'Mozilla/5.0 (Windows; U; Windows NT 6.1; x64; fr; rv:1.9.2.13) Gecko/20101203 Firebird/3.6.13', 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36', 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:2.0) Treco/20110515 Fireweb Navigator/2.4', 'Mozilla/5.0 (Linux; U; Android 4.0.3; ko-kr; LG-L160L Build/IML74K) AppleWebkit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30', 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_5_7; en-us) AppleWebKit/530.17 (KHTML, like Gecko) Version/4.0 Safari/530.17 Skyfire/2.0']
    
    try {
      console.log('inside try top');
      var pLen = fetchSettings.proxyList.length || 0
      var proxy = fetchSettings.proxyList[Math.floor(Math.random() * pLen)]
      fetchSettings.options.electronPath = require('electron')

      if (fetchSettings.useProxy) {
        
        fetchSettings.options.switches['proxy-server'] = proxy.proxyUrl
      
      }
    
      var nightmare = new Nightmare(fetchSettings.options)

      if (proxy.proxyUser && proxy.proxyPass && fetchSettings.useProxy) {
      
        nightmare.authentication(proxy.proxyUser, proxy.proxyPass)
      }

      nightmare.useragent(useragents[Math.floor((Math.random() * useragents.length))]).goto(params.url).wait()
      nightmare.on('console', (log, msg) => {
        console.log(msg)
    })
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
            negKeywordArr.push(str.trim())
          }
          
        })
      function test(){
          console.log("nkArray", negKeywordArr)
        }
        test()
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
      console.log('inside then');
      var dataset = {}
      dataset._id = params._id
      dataset.url = params.url
      dataset.keywords = params.keywords
      dataset.negKeywords = params.negKeywords
      dataset.result = result
      dataset.urlHash = hashObject(result.keywordUrls)
      dataset.negHash = hashObject(result.negKeywords)
      dataset.posHash = hashObject(result.posKeywords)
      dataset.hash = hashObject(result, 'md5')
      cb(null, dataset)
    })
    .catch(function (error) {
      console.log('inside catch');
      console.log(error)
      cb(error)
    })
    } catch (e) {
      console.log('inside try catch');
      console.log(e)
      //cb(e)
    }
  })
}

function loadSettings (file) {
  var config = jsonfile.readFileSync(file)
  return config.fetch
}

