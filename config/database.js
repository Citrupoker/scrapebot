
// default to a 'localhost' configuration:
 var connectionString = '127.0.0.1:27017/kicks'

// if OPENSHIFT env variables are present, use the available connection info:
 if (process.env.OPENSHIFT_MONGODB_DB_PASSWORD) {
   connectionString = process.env.OPENSHIFT_MONGODB_DB_USERNAME + ':' +
  process.env.OPENSHIFT_MONGODB_DB_PASSWORD + '@' +
  process.env.OPENSHIFT_MONGODB_DB_HOST + ':' +
  process.env.OPENSHIFT_MONGODB_DB_PORT + '/' +
  process.env.OPENSHIFT_APP_NAME
 }




 module.exports = {url: 'mongodb://' + connectionString}
