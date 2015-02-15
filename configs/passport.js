//https://github.com/manjeshpv/node-express-passport-mysql/blob/master/config/passport.js

var LocalStrategy = require('passport-local').Strategy;
var bcrypt = require('bcrypt-nodejs');


module.exports = function(passport,db){
	
	passport.serializeUser(function(user,done){
		done(null,user.id);
	});
	
	passport.deserializeUser(function(id,done){
		db.query("select * from users where id=?",[id],function(err, rows){
            done(err, rows[0]);
        });
    });
    
    passport.use('local-signup', new LocalStrategy({
			usernameField : 'email',
			passwordField : 'password',
			passReqToCallback : true // allows us to pass back the entire request to the callback
		},
		function(req, email, password, done){
			var name = req.body.firstname.trim()+" "+req.body.lastname.trim();
			
			if(req.body.password!=req.body.password2)
				return done(null,false,req.flash('signupMessage','Passwords do not match'));
			
			process.nextTick(function() {
				db.query("select * from users where email = '"+email+"';",
					function(err,rows){
						if(err)
							return done(err);
						
						if(rows.length!=0){
							return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
						}else{
							var newUser = {
								name : name,
								email : email,
								password : bcrypt.hashSync(password, bcrypt.genSaltSync(8), null)
							};
							
							db.query("insert into users values (?,?,?,NULL,NULL,0,'INACTIVE');",
								[newUser.name,newUser.email,newUser.password],
								function(err,rows){
									if(err)throw err;
									newUser.id = rows.insertId;
									return done(null,newUser);
								});
						}
					});
			});
		}));
		
	passport.use('local-login', new LocalStrategy({
			usernameField : 'email',
			passwordField : 'password',
			passReqToCallback : true
		},
		function(req, email, password, done){
			db.query("select * from users where email='"+email+"';",
				function(err,rows){
					if(err)
						return done(err);
						
					//check if this email is registered
					if(rows.length==0)
						return done(null, false, req.flash('loginMessage', 'No user found.'));

					if(!validPassword(password,rows[0].password))
						return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.'));
					
					return done(null,rows[0]);
				});
		}));
					
};
							
function createNewUser(user,db){
	db.query("insert into users values ('name','?','?',NULL,NULL);",
		[user.email,user.password],
		function(err,rows){
			if(err)throw err;
		});
}
							
function generateHash(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

function validPassword(password,hash) {
    return bcrypt.compareSync(password, hash);
};
							
