define(function() {
	result= {};

	result.default_scores= [
		{player:'TLS', score:'1000'},
		{player:'TLS', score:'800'},
		{player:'TLS', score:'600'},
		{player:'TLS', score:'400'},
		{player:'TLS', score:'200'}
	];

	if(typeof(Storage) !== "undefined"){
		// local store available so use it
		result.LOCALAVAILABLE= true;
		if(typeof(localStorage.scores) == 'undefined'){
			localStorage.scores= JSON.stringify(result.default_scores.slice(0));
		}
		result.getScores= function(){
			try{
				var scores= JSON.parse(localStorage.scores);
				scores= scores.sort(function(a,b){ return b.score - a.score; });
				return scores;
			} catch(e){
				localStorage.scores= JSON.stringify(this.default_scores.slice(0));
				return this.default_scores.slice(0);
			}
		};
		result.addScore= function(player, score){
			player= (player + "---").toUpperCase().slice(0,3);
			var scores= this.getScores();
			scores.push({player:player, score:score});
			scores.sort(function(a,b){ return b.score - a.score; });
			if(scores.length > 5){
				scores.splice(5)
			}
			localStorage.scores= JSON.stringify(scores);
		};
		result.isHighScore= function(player_score){
			var saved_high_scores= this.getScores();
			// is this player score greater than the worst score in the high score list?
			if(saved_high_scores[saved_high_scores.length -1].score < player_score){
				return true;
			}
			return false;
		};
	} else {
		// no local store available 
		result.LOCALAVAILABLE= false;
		result.scores= result.default_scores.slice(0);
		result.getScores= function(){
			return this.scores;
		};
		result.addScore= function(player, score){
			result.scores.push({player:player, score:score});
			result.scores.sort(function(a,b){
				return a.score - b.score;
			});
			if(result.scores.length > 5){
				result.scores.splice(5)
			}
		};
		result.isHighScore= function(player_score){
			var saved_high_scores= this.getScores();
			// is this player score greater than the worst score in the high score list?
			if(saved_high_scores[saved_high_scores.length -1].score < player_score){
				return true;
			}
			return false;
		};
	}

	return result;
});
