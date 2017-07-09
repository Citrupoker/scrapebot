$(document).ready(function () {
  var socket = io.connect()

  socket.on('update', function (data) {
    var selector = '[data-id=' + data.id + ']'

    if (data.type.toString() === 'change') {
      $(selector).html('<span class="label label-success">change detected</span>')
    }

    if (data.type.toString() === 'nochange') {
      $(selector).html('<span class="label label-primary">monitoring</span>')
    }

    if (data.type.toString() === 'posted') {
      $(selector).html('<span class="label label-warning">posted</span>')
    }

    if (data.type.toString() === 'blocked') {
      $(selector).html('<span class="label label-danger">blocked</span>')
    }
  })

  socket.on('keywords', function (data) {
    var keywordSelector = '[data-row-id=' + data.id + '] .keyword-span'
    var negKeywordSelector = '[data-row-id=' + data.id + '] .negKeyword-span'
    if (data.type.keyword) {
      $(keywordSelector).text('found')
    } else {
      $(keywordSelector).text('not found')
    }

    if (data.type.negKeyword) {
      $(negKeywordSelector).text('found')
    } else {
      $(negKeywordSelector).text('not found')
    }
  })

  $('#clear').click(function () {
    $.get('/clearRedis', function (data) {
      if (data) {
        alert('cleared')
      }
    })
  })

  socket.on('server', function (data) {
    if (data.status) {
      if (data.type === 'nc') {
        var ncmessage = '<p class="btn btn-warning">' + data.message + '</p>'
        $('#server').append(ncmessage)
        var elem = document.getElementById('server')
        elem.scrollTop = elem.scrollHeight
      }
      if (data.type === 'ch') {
        var chmessage = '<p class="btn btn-success">' + data.message + '</p>'
        $('#server').append(chmessage)
        var elem = document.getElementById('server')
        elem.scrollTop = elem.scrollHeight
      }
      if (data.type === 'er') {
        var ermessage = '<p class="btn btn-danger">' + JSON.stringify(data.message) + '</p>'
        $('#server').append(ermessage)
        var elem = document.getElementById('server')
        elem.scrollTop = elem.scrollHeight
      }
    } else {
      if (data.type === 'nc') {
        var ncmessage = '<p class="btn btn-danger">' + data.message + '</p>'
        $('#server').append(ncmessage)
        var elem = document.getElementById('server')
        elem.scrollTop = elem.scrollHeight
      }
    }
  })
  loadSettings()
  function loadSettings () {
    $.get('/getconfig', function (data) {
      data = JSON.parse(data)
      var mset = data.monitor
      var fetch = data.fetch
      var state = fetch.useProxy ? 'on' : 'off'
      $('#interval-label').text(mset.interval)
      $('#lps-label').text(mset.lps)
      $('#timeout-label').text(mset.timeout)
      $("[name='useProxy']").bootstrapToggle(state)
    })
  }

  $('#reload').click(function () {
    $.get('/reload', function (data) {
      if (data) {
        alert('loaded')
      }
    })
  })

  $('#update-interval').click(function () {
    var val = isNaN($('[name=interval]').val()) ? 10 : Number($('[name=interval]').val())
    $.get('/getconfig', function (data) {
      var settings = JSON.parse(data)
      settings.monitor.interval = val
      $.post('/postconfig', {'data': JSON.stringify(settings)}, function (data) {
        loadSettings()
        $('[name=interval]').val('')
        alert('upated')
      })
    })
  })

  $('#update-lps').click(function () {
    var val = isNaN($('[name=lps]').val()) ? 1 : Number($('[name=lps]').val())
    $.get('/getconfig', function (data) {
      var settings = JSON.parse(data)
      settings.monitor.lps = val
      $.post('/postconfig', {'data': JSON.stringify(settings)}, function (data) {
        loadSettings()
        $('[name=lps]').val('')
        alert('upated')
      })
    })
  })

  $('#update-timeout').click(function () {
    var val = isNaN($('[name=timeout]').val()) ? 1 : Number($('[name=timeout]').val())
    $.get('/getconfig', function (data) {
      var settings = JSON.parse(data)
      settings.monitor.timeout = val
      $.post('/postconfig', {'data': JSON.stringify(settings)}, function (data) {
        loadSettings()
        $('[name=timeout]').val('')
        alert('upated')
      })
    })
  })

  $('#update-twitter').click(function () {
    var consumerKey = $('[name=consumer-key]').val()
    var consumerSecret = $('[name=consumer-secret]').val()
    var accessToken = $('[name=access-token]').val()
    var accessTokenSecret = $('[name=access-token-secret]').val()
    if (consumerKey.length > 0 && consumerSecret.length > 0 && accessToken.length > 0 && accessTokenSecret.length > 0) {
      $.get('/getconfig', function (data) {
        var settings = JSON.parse(data)
        settings.twitter.consumer_key = consumerKey
        settings.twitter.consumer_secret = consumerSecret
        settings.twitter.access_token = accessToken
        settings.twitter.access_token_secret = accessTokenSecret
        $.post('/postconfig', {'data': JSON.stringify(settings)}, function (data) {
          alert('updated')
          $('[name=consumer-key]').val('')
          $('[name=consumer-secret]').val('')
          $('[name=access-token]').val('')
          $('[name=access-token-secret]').val('')
        })
      })
    } else {
      alert('Fill all fields')
    }
  })

  function linkdata (link) {
    $.get(link, function (data, status) {
      var tablebody = $('#table-data')
      tablebody.html('')

      var jsonData = JSON.parse(data)

      $(jsonData).each(function (index, value) {
        var tablerow = $('<tr data-row-id=""> </tr>').attr('data-row-id', value._id)
        var keywords = $('<td> </td>').html(value.keywords + ' <span class="label label-default keyword-span">Not found</span>')
        var monitor = $('<td> </td>').html(value.negKeywords + ' <span class="label label-default negKeyword-span">Not found</span>')
        var url = $('<a href="#" target="_blank"></a>').attr('href', value.url)
        url.text(value.url)
        var urlTableData = $('<td> </td>').append(url)
        var deleteButton = $('<input type="checkbox" name="link" class="data-checkbox" style="width:14px; height:14px; border-radius:2px" value="">').attr('value', value._id)
        var buttonTableData = $('<td></td>')
        var statusTableData = $('<td data-id=""> <span class="label label-danger">off</span></td>').attr('data-id', value._id)

        deleteButton.appendTo(buttonTableData)
        keywords.appendTo(tablerow)
        monitor.appendTo(tablerow)
        urlTableData.appendTo(tablerow)
        statusTableData.appendTo(tablerow)
        buttonTableData.appendTo(tablerow)
        tablerow.appendTo(tablebody)
      })
    })
  }

  linkdata('/getLinkData')
  $('#delete-links').click(function () {
    var permision = confirm('Are you sure you want to delete all links')
    if (permision) {
      $.get('/deleteLinks', function (data, status) {
        linkdata('/getLinkData')
      })
    }
  })

  $('#delete-slectedlinks').click(function () {
    var permision = confirm('Are you sure you want the delete selected links')
    var ids = []

    $('#table-data  input:checked').each(function (index, val) {
      ids.push($(this).attr('value'))
    })
    if (ids.length > 0) {
      if (permision) {
        $.post('/deleteSelectedLinks', {'ids': ids}, function (data, status) {
          linkdata('/getLinkData')
        })
      }
    } else {
      alert('Select a link')
    }
  })

// ==============================================================================================================================================================================
//
// ======================================================================================= ADD LINK =============================================================================
  $('#add-link').click(function () {
    $('#add-link').prop('disabled', true)
    var link = $('#add-textbox').val()
    var keywords = $('#keywords').val()
    var negKeywords = $('#changed-keywords').val()

    if ($('#add-textbox').val().length > 0 && $('#keywords').val().length > 0 && $('#changed-keywords').val().length > 0) {
      $.post('/addLink', { keywords: keywords, link: link, negKeywords: negKeywords }, function (data) {
        if (data) {
          alert(data)
        }
        $('#add-link').prop('disabled', false)
        linkdata('/getLinkData')
        $('#add-textbox').val('')
        $('#keywords').val('')
        $('#changed-keywords').val('')
      })
    } else {
      alert('Fill all Fields')
      $('#add-link').prop('disabled', false)
    }
  })

// ================================================================================================================================================================
//
// =============================================================================== MONITOR LINK ===================================================================

  $('#reset').click(function () {
    var permision = confirm('Monitor Link')
    var ids = []

    $('#table-data  input:checked').each(function (index, val) {
      ids.push($(this).attr('value'))
    })
    if (ids.length > 0) {
      if (permision) {
        $.post('/reset', {'ids': ids})
          .done(function(data) {
            alert(data)
            linkdata('/getLinkData')
          })
    .fail(function(jqXHR){
        alert(jqXHR.status)
        });
        
      }
    } else {
      alert('Select a link')
    }
  })

  $('#add-proxy').click(function () {
    var proxy = {}
    proxy.proxyUrl = $('[name=proxyUrl]').val() + ':' + $('[name=proxyPort]').val()
    proxy.proxyUser = $('[name=proxyUser]').val()
    proxy.proxyPass = $('[name=proxyPass]').val()
    console.log(proxy)
    if ($('[name=proxyUrl]').val().length > 0 && $('[name=proxyPort]').val().length > 0) {
      $.get('/getconfig', function (data) {
        var settings = JSON.parse(data)
        if (settings.fetch.proxyList.indexOf(proxy) === -1) {
          settings.fetch.proxyList.push(proxy)
          $.post('/postconfig', {'data': JSON.stringify(settings)}, function (data) {
            $('[name=proxyUrl]').val('')
            $('[name=proxyPort]').val('')
            $('[name=proxyUser]').val('')
            $('[name=proxyPass]').val('')
            getProxies()
          })
        } else {
          alert('Proxy already exist')
        }
      })
    } else {
      alert('Input proxy (Url or IP) and Port')
    }
  })
// =======================================================================================================================================================================
//
// =========================================================================== Get Proxy =================================================================================
  getProxies()
  function getProxies () {
    $.get('/getconfig', function (data) {
      var settings = JSON.parse(data)
      var list = settings.fetch.proxyList
      $('#proxy-list').html('')
      for (var i in list) {
        $('#proxy-list').append("<button class='btn btn-default delete-proxy' style='margin:5px;'>" + list[i].proxyUrl + "&nbsp&nbsp&nbsp<i class='fa fa-trash-o' aria-hidden='true'></i></button>")
      }
    })
  }

// =========================================================================================================================================================================
//
// ================================================================================ Delete Proxy ============================================================================
  $('#proxy-list').on('click', '.btn.btn-default.delete-proxy', function () {
    var proxyUrl = $(this).text()
    $.get('/getconfig', function (data) {
      var settings = JSON.parse(data)
      var listClone = JSON.parse(JSON.stringify(settings.fetch.proxyList))
      var idx = -1

      for (var i in listClone) {
        if (listClone[i].proxyUrl.toString().trim() === proxyUrl.toString().trim()) {
          console.log(i)
          idx = i
          break
        }
      }

      if (idx !== -1) {
        settings.fetch.proxyList.splice(idx, 1)
      }

      $.post('/postconfig', {'data': JSON.stringify(settings)}, function (data) {
        getProxies()
      })
    })
  })

// ==================================================================================================================================================================
//
// =============================================================================Use Proxy Switch============================================================================

  $(function () {
    $("[name='useProxy']").change(function () {
      var val = $(this).prop('checked')
      $.get('/getconfig', function (data) {
        var settings = JSON.parse(data)
        settings.fetch.useProxy = val
        $.post('/postconfig', {'data': JSON.stringify(settings)}, function (data) {
        })
      })
    })
  })
})

// =================================================================================================================================================================
