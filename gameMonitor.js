//controls the starting and stopping of games in the database

module.exports = function(db){
	setInterval(checkAllGames,900000,db);
	//setInterval(checkAllGames,6000,db);
};

function checkAllGames(db){
	startNewGames(db);
	endGames(db);
}

//@ http://jsfromhell.com/array/shuffle [v1.0]
function shuffle(o){ //v1.0
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
};

function startNewGames(db){
	//find games that should be started
	db.query("select id from games where startdate <= current_date and status='OPEN';",
		function(err,games){
			if(err) throw err;
			//start the selected games
			for(var i = 0; i < games.length; i++){
				db.query("select id,gameid from users where gameid=? and status='ALIVE';",
					[games[i].id],function(err,players){
						shuffle(players);
						console.log(players);
						if(players.length>0){
							//set new targets
							for(var c=0; c<players.length-1;c++){
								db.query("insert into targets values(?,?,?);",
									[players[c].id,players[c+1].id,players[c].gameid],
									function(err,rows){
										if(err)throw err;
									});
							}
							db.query("insert into targets values(?,?,?);",
									[players[players.length-1].id,players[0].id,players[0].gameid],
									function(err,rows){
										if(err)throw err;
									});
						}
					});
					
				//update game status
				db.query("update games set status='ACTIVE' where id=?;",
					[games[i].id],function(err,rows){
						if(err) throw err;
					});
			}
		});
}

function endGames(db){
	//When a game is over:
	//1. Set status to "FINISHED"
	//2. Set winners to status="WINNER",phrase=NULL
	
	
	//Games ending on a date can be automatically ended
	/*db.query("select id from games where status='ACTIVE' and (endcondition='DATE' and enddate<=current_date;",
		function(err,games){
			if(err)throw err;
		});*/
	db.query("update games set status='FINISHED' where status='ACTIVE' and (endcondition='DATE' or endcondition='EITHER') and enddate<=current_date;",
		function(err,rows){
			if(err)throw err;
		});
	db.query("update users inner join games on users.gameid=games.id set users.status='WINNER' where games.status='FINISHED' and users.status='ALIVE';",
		function(err,rows){
			if(err)throw err;
		});
	
	//Games ending with NUMBER have to be individually evaluated
	//db.query("select * from games where status='ACTIVE' and endcondition='NUMBER';",
	//	function(err,games){
			
}
