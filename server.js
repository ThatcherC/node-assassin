//https://scotch.io/tutorials/easy-node-authentication-setup-and-local

var express = 		require('express');
var app = 			express();
var port =			8083;
var mysql = 		require('mysql');
var passport = 		require('passport');
var flash    = 		require('connect-flash');

//var morgan = 		require('morgan');
var cookieParser = 	require('cookie-parser');
var bodyParser = 	require('body-parser');
var session = 		require('express-session');

var configs =		require('./configs/database.js');

var db = mysql.createConnection(configs.DBsettings);
db.connect();

require('./configs/passport')(passport,db);

// set up the express application
//app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser()); // get information from html forms
app.use("/assassin/static",express.static(__dirname+"/static"));

app.set('view engine', 'ejs'); // set up ejs for templating

// required for passport
app.use(session({ secret: 'ilovescotchscotchyscotchscotch' })); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session


require('./router.js')(app,passport,db);
app.listen(port);

