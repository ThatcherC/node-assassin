module.exports = function(app, passport,db){
	//homepage
	app.get('/',function(req,res){
		res.render('index.ejs');
	});
	
	//login
	app.get('/login',function(req,res){
		res.render('login.ejs',{message:req.flash('loginMessage')});
	});

	//process the login info
	app.post('/login',passport.authenticate('local-login', {
		successRedirect : '/dash',
		failureRedirect : '/login',
		failureFlash : true
	}));
		
	
	//signup
	app.get('/signup',function(req,res){
		res.render('signup.ejs',{message:req.flash('signupMessage')});
	});
	
	//process the signup info
	app.post('/signup',passport.authenticate('local-signup',{
		successRedirect : '/dash',
		failureRedirect : '/signup',
		failureFlash : true
	}));
	
	//dashboard
	app.get('/dash',isLoggedIn,function(req,res){
		//get target list
		db.query("SELECT name,id FROM users JOIN targets ON users.id=targets.targetid where targets.gameid=? and targets.hunterid=? and users.status='ALIVE';",
			[req.user.gameid, req.user.id],function(err,rows){
				if(err)throw err;
				//console.log(rows);
				res.render('dash.ejs',{user:req.user, targets:rows, postKillMessage:req.flash('postKillMessage')});
			});
	});
	
	app.post('/dash',isLoggedIn,function(req,res){
		//check if the passphrase matches
		//if it does, put in a kill record
		//else, return a failure message
		db.query("SELECT phrase FROM users where id=?;",[req.body.targetID],
			function(err,rows){
				if(req.body.passphrase==rows[0].phrase){
					req.flash("postKillMessage","Success!");
					//record the kill
					db.query("insert into kills values(?,?,?,NULL);",
						[req.user.id,req.body.targetID,req.user.gameID],
						function(err,rows){
							if(err)throw err;
						});
					//update player status
					db.query("update users set status='DEAD' where id=?;",
						[req.body.targetID],function(err,rows){
								if(err)throw err;
						});
					//transfer targets
					db.query("update targets set hunterid=? where hunterid=?;",
						[req.user.id,req.body.targetID],
						function(err,rows){
							if(err)throw err;
						});
				}else{
					req.flash("postKillMessage","Failure");
				}
				res.redirect("/dash");
			});
	});
	
	app.get('/join',isLoggedIn,function(req,res){
		res.render('join.ejs',{message:req.flash('joinMessage')});
	});
	
	//need an isLoggedIn here?
	app.post('/join',function(req,res){
		db.query("select * from games where id=? and status='o';",
			[req.body.gameID],function(err,rows){
				if(err) throw err;
				if(rows.length==0){
					req.flash('joinMessage',"Unable to join.");
					res.redirect("/join");
				}else{
					db.query("update users set gameid=?,status='ALIVE' where id=?;",
						[req.body.gameID,req.user.id],
						function(err, rows){
							if(err)throw err;
					});
					res.redirect('/dash');
				}
			});

	});
	
	app.get('/logout',function(req,res){
		req.logout();
		res.redirect('/');
    });
    
    // route middleware to make sure a user is logged in
	function isLoggedIn(req, res, next) {
		// if user is authenticated in the session, carry on 
		if (req.isAuthenticated())
			return next();
		// if they aren't redirect them to the home page
		res.redirect('/');
	}
};
