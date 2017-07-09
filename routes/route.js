var main = require('../controler/main')

function isAuthenticated (req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }
  // if they aren't redirect then to the home page
  res.render('login')
}

module.exports = function (app, passport) {
  app.get('/', isAuthenticated, main.index)
  app.get('/settings', isAuthenticated, main.settings)
  app.get('/login', isAuthenticated, main.login)
  app.get('/logout', isAuthenticated, main.logout)
  app.post('/addLink', isAuthenticated, main.addLink)
  app.get('/getLinkData', isAuthenticated, main.getLinkData)
  app.get('/deleteLinks', isAuthenticated, main.deleteAllLinks)
  app.post('/reset', isAuthenticated, main.reset)
  app.post('/deleteSelectedLinks', isAuthenticated, main.deleteSelectedLinks)
  app.post('/postconfig', isAuthenticated, main.postconfig)
  app.get('/getconfig', isAuthenticated, main.getconfig)
  app.get('/signupinfo', main.signupinfoView)
  app.get('/logininfo', main.logininfoView)
  app.get('/regfail', main.regFailView)

  app.post('/login', passport.authenticate('local-login', {
    successRedirect: '/', // redirect to the secure profile section
    failureRedirect: '/logininfo', // redirect to the login info page if there is an error
    failureFlash: true // allow flash messages
  }))

  app.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/signupinfo', // redirect to the secure profile section
    failureRedirect: '/regfail', // redirect back to the signup page if there is an error
    failureFlash: true // allow flash messages
  }))
}
