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
	
	// route for facebook authentication and login
    app.get('/assassin/auth/facebook', passport.authenticate('facebook', { scope : 'email' }));

    // handle the callback after facebook has authenticated the user
    app.get('/assassin/auth/facebook/callback',
        passport.authenticate('facebook', {
            successRedirect : '/assassin/dash',
            failureRedirect : '/assassin'
        }));
	
	
	//dashboard
	app.get('/assassin/dash',isLoggedIn,function(req,res){
		//get target list
		db.query("SELECT name,id FROM users JOIN targets ON users.id=targets.targetid where targets.hunterid=? and targets.gameid=? and users.status='ALIVE';",
			[req.user.id,req.user.gameid],function(err,rows){
				if(err)throw err;
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
				res.redirect("/assassin/dash");
			});
	});
	
	app.get('/assassin/witness',isLoggedIn,function(req,res){
		db.query("select name,id from users where gameid=?;", [req.user.gameid],
			function(err,rows){
				if(err) return res.end(err);
				
				//alphabetize the list
				rows.sort(function(a, b){
					if(a.name < b.name) return -1;
					if(a.name > b.name) return 1;
					return 0;
				});
				//console.log(req.flash('witnessMessage'));
				res.render('witness.ejs',{message:req.flash('witnessMessage'),user:req.user,players:rows});
			});
	});
	
	app.post('/assassin/witness',isLoggedIn,function(req,res){
		//check if the secret phrase matches
		db.query('select status from users where id=? and phrase=?',
			[req.body.hunterID,req.body.hunterPhrase],
			function(err,rows){
				if(err) console.log(err);
				if(rows.length==0){		//no match for id and phrase
					req.flash('witnessMessage',"That phrase doesn't match that user");
					console.log("no match");
					res.redirect('/assassin/witness');
				}else if(rows[0].status=="DEAD"){		// if the user matches but is dead
					req.flash('witnessMessage',"That assassin is already dead!");
					console.log("already dead");
					res.redirect('/assassin/witness');
				}else{					//if everything checks out, find the kill record
					
					db.query('select * from kills where hunterid=? and targetid=? and gameid=?',
						[req.body.hunterID,req.body.targetID,req.user.gameid],
						function(err,rows){
							if(err) console.log(err);
							if(rows.length==0){
								console.log("no recored");
								req.flash('witnessMessage',"There is no record of that kill occurring");
								res.redirect('/assassin/witness');
							}else{
								console.log("confirmed");
								req.flash('witnessMessage',"Kill confirmed. You are a witness!");
								///TODO
								///update targetting info
								db.query('update targets set hunterid=? where hunterid=?;',
									[req.user.id,req.body.hunterID],function(err,rows){
										if(err)console.log(err)
									});
								db.query('update targets set targetid=? where targetid=?;',
									[req.user.id,req.body.hunterID],function(err,rows){
										if(err)console.log(err)
									});
								db.query('update users set status="WITNESSED" where id=?;',
									[req.body.hunterID],function(err,rows){
										if(err)console.log(err)
									});
									
								res.redirect('/assassin/witness');
							}
						});
				}
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
					var phrase = generateSecretPhrase();
					db.query("update users set gameid=?,status='ALIVE',phrase=? where id=?;",
						[req.body.gameID,phrase,req.user.id],
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
		res.render('gameManager.ejs',{status:req.user.status});
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

function generateSecretPhrase(){
	return firstWord[Math.floor(Math.random()*firstWord.length)] + " " + secondWord[Math.floor(Math.random()*secondWord.length)];
}

var secondWord = [
	"piecake","candy","chocolate","cookie","donut","doughnut","fruit","ice cream","muffin",
	"pie","pudding","bagel","bread","cereal","cheese","noodles","pancakes","pasta","salad","sandwich"
	];


var firstWord = [
	"gator","bear","bird","camel","cat","cheetah","chicken","chimp","cow",
	"deer","dolphin","duck","eagle","elephant","fish","fly","fox","frog","giraffe","goat",
	"hippo","horse","kangaroo","kitten","leopard","lion","lizard","lobster","monkey","octopus",
	"ostrich","otter","owl","oyster","panda","parrot","pelican","pig","puppy","rabbit","rat",
	"rhino","rooster","scorpion","seal","shark","sheep","shrimp","snake","spider","squirrel",
	"swallow","swan","tiger","turtle","vulture","walrus","weasel","whale","wolf","zebra"
	];
