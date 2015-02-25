//controls the starting and stopping of games in the database

module.exports = function(db){
	//setInterval(checkAllGames,900000,db);
	setInterval(checkAllGames,6000,db);
};

function checkAllGames(db){
	startNewGames(db);
	
				
/*			for each game
				make secret phrases*/
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
						//set secret phrases
						for(var c=0; c<players.length; c++){
							db.query("update users set phrase=? where id=?;",
								[generateSecretPhrase(),players[c].id],
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
