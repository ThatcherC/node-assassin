module.exports = function(app, passport,db){
	//homepage
	app.get('/assassin/',function(req,res){
		res.render('index.ejs');
	});

	//login
	app.get('/assassin/login',function(req,res){
		res.render('login.ejs',{message:req.flash('loginMessage')});
	});

	//process the login info
	app.post('/assassin/login',passport.authenticate('local-login', {
		successRedirect : '/assassin/dash',
		failureRedirect : '/assassin/login',
		failureFlash : true
	}));
		
	
	//signup
	app.get('/assassin/signup',function(req,res){
		res.render('signup.ejs',{message:req.flash('signupMessage')});
	});
	
	//process the signup info
	app.post('/assassin/signup',passport.authenticate('local-signup',{
		successRedirect : '/assassin/dash',
		failureRedirect : '/assassin/signup',
		failureFlash : true
	}));
	
	//dashboard
	app.get('/assassin/dash',isLoggedIn,function(req,res){
		//get target list
		db.query("SELECT name,id FROM users JOIN targets ON users.id=targets.targetid where targets.gameid=? and targets.hunterid=? and users.status='ALIVE';",
			[req.user.gameid, req.user.id],function(err,rows){
				if(err)throw err;
				//console.log(rows);
				res.render('dash.ejs',{user:req.user, targets:rows, postKillMessage:req.flash('postKillMessage')});
			});
	});
	
	app.post('/assassin/dash',isLoggedIn,function(req,res){
		//check if the passphrase matches
		//if it does, put in a kill record
		//else, return a failure message
		db.query("SELECT phrase FROM users where id=?;",[req.body.targetID],
			function(err,rows){
				if(req.body.passphrase==rows[0].phrase){
					req.flash("postKillMessage","Success!");
					//record the kill
					db.query("insert into kills values(?,?,?,NULL);",
						[req.user.id,req.body.targetID,req.user.gameid],
						function(err,rows){
							if(err)throw err;
						});
					//update player status
					db.query("update users set status='DEAD',gameid=0 where id=?;",
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
				res.redirect("/assassin/dash");
			});
	});
	
	app.get('/assassin/join',isLoggedIn,function(req,res){
		res.render('join.ejs',{message:req.flash('joinMessage'),user:req.user});
	});
	
	//need an isLoggedIn here?
	app.post('/assassin/join',function(req,res){
		db.query("select * from games where id=? and status='OPEN';",
			[req.body.gameID],function(err,rows){
				if(err) throw err;
				if(rows.length==0){
					req.flash('joinMessage',"Unable to join.");
					res.redirect("/assassin/join");
				}else{
					db.query("update users set gameid=?,status='ALIVE' where id=?;",
						[req.body.gameID,req.user.id],
						function(err, rows){
							if(err)throw err;
							
							//update req.user info -- possible not necessary?
							var user = req.user;
							user.gameid=req.body.gameID;
							user.status="ALIVE";
							req.logIn(user,function(err){
								if(err)
									console.log(err);
							});
					});
					res.redirect('/assassin/dash');
				}
			});

	});
	
	app.get('/assassin/gameMaker',isLoggedIn,function(req,res){
		res.render('gameManager.ejs',{gameid:req.user.gameid});
	});
	
	app.post('/assassin/gameMaker',isLoggedIn,function(req,res){
		//id int, status VARCHAR(10),startdate date, enddate date, starttime time, endtime time, endcondition varchar(20), creatorid int
		var id = 1+Math.floor(Math.random()*9999);
		var body = req.body;
		console.log(body);
		db.query("INSERT into games values(?,'OPEN',?,?,?,?,?,?,?);",
			[id,body.startdate,body.enddate,body.starttime+":00",body.endtime+":00",body.endnumber,body.endstate,req.user.id],
			function(err,rows){
				if(err)
					throw err;
			});
		db.query("UPDATE users set gameid=?,status='ALIVE' where id=?;",
			[id,req.user.id],function(err,rows){
				if(err)
					throw err;
			});
		res.redirect('/assassin/dash');
	});
	
	app.get('/assassin/instructions',function(req,res){
		res.render('instructions.ejs');
	});
	
	app.get('/assassin/logout',function(req,res){
		req.logout();
		res.redirect('/assassin/');
    });
    
    // route middleware to make sure a user is logged in
	function isLoggedIn(req, res, next) {
		// if user is authenticated in the session, carry on 
		if (req.isAuthenticated())
			return next();
		// if they aren't redirect them to the home page
		res.redirect('/assassin/');
	}
};
