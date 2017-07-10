
var asyncInterval = require('asyncinterval')
var appDebug = require('debug')('scheduler')
var childProcess = require('child_process')

var jobs = {}

var addJob = function (name, job, response, args, interval, timeout) {
  jobs[name] = asyncInterval(function (done) {
    job(args)
    done()
    setTimeout(function () {
      response()
    }, interval || 3600000)
  }, interval || 3600000, timeout || 4600000)

  jobs[name].onTimeout(function () { childProcess.exec('killall -9 electron') })
  appDebug(name + ' Job added')
}

var killJob = function (name) {
  jobs[name].clear()
  appDebug(name + ' Job stopped')
}

var killJobSoon = function (name, time) {
  setTimeout(function () { killJob(name) }, time)
  appDebug(name + ' Job stop after ' + time)
}

var listJobs = function () {
  return Object.keys(jobs)
}

var restartJob = function (name, job, response, args, interval, timeout) {
  if (jobs[name]) {
    jobs[name].clear()
    jobs[name] = asyncInterval(function (done) {
      job(done, args)
      setTimeout(function () {
        response()
      }, interval || 3600000)
    }, interval || 3600000, timeout || 4600000)

    jobs[name].onTimeout(function () { childProcess.exec('killall -9 electron') })
    appDebug(name + ' restarted job')
  } else {
    appDebug('Job does not exist')
  }
}

module.exports = function () {
  return {
    addJob: addJob,
    killJob: killJob,
    killJobSoon: killJobSoon,
    listJobs: listJobs,
    restartJob: restartJob
  }
}
