//https://scotch.io/tutorials/easy-node-authentication-setup-and-local

var express = 		require('express');
var forceSSL=		require('express-force-ssl');
var app = 			express();
var port =			8083;
var mysql = 		require('mysql');
var passport = 		require('passport');
var flash    = 		require('connect-flash');
var http	 = 		require('http');
var https	 = 		require('https');
var fs		 = 		require('fs');

var cookieParser = 	require('cookie-parser');
var bodyParser = 	require('body-parser');
var session = 		require('express-session');

var configs =		require('./configs/database.js');
var httpsConfigs =	require('./configs/https.js');

var db = mysql.createConnection(configs.DBsettings);
db.connect();

require('./configs/passport')(passport,db);

// set up the express application
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser()); // get information from html forms
var serverOptions;
if(httpsConfigs.usehttps){
	console.log("Using SSL");
	app.use(forceSSL);
	serverOptions = {
		key: fs.readFileSync(httpsConfigs.options.key),
		cert: fs.readFileSync(httpsConfigs.options.crt),
		ca:  fs.readFileSync(httpsConfigs.options.ca)
	};
}
//app.use("/assassin/static",express.static(__dirname+"/static"));

app.set('view engine', 'ejs'); // set up ejs for templating
app.set('httpsPort', 8084);

// required for passport
app.use(session({ secret: 'ilovescotchscotchyscotchscotch' })); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session


require('./router.js')(app,passport,db);
require('./gameMonitor.js')(db);
//app.listen(port);

var server = http.createServer(app);
server.listen(8083);
if(httpsConfigs.usehttps){
	console.log("Creating and starting HTTPS server");
	var secureServer = https.createServer(serverOptions, app);
	secureServer.listen(8084);
}
