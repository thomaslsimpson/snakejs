// 
// Create a snake object and return it.
// Works with requirejs.
//
define(function() {
	// main return object
	result= {};

	// ----------------------------------------------------------------
	//
	// Globals that need not reset.
	//
	// ----------------------------------------------------------------
	result.game_running= false; // is the game still running?
	result.game_over= false;    // is the game over?
	result.board_grid= 0;       // optimization grid for look ups

	// ----------------------------------------------------------------
	//
	// Settings used throughout the snake game
	//
	// ----------------------------------------------------------------
	result.default_settings= {
		difficulty: "Normal",                   // Easy, Normal, Hard, Abusive
		score: 0,                               // Current score
		snake: { // snake attributes
			tail: [],                       // tail segment positions
			position: { x:0, y:0 },         // location of the snake
			speed: 120.0,                   // snake movement speed
			delta: { x:0, y:0 },            // direction snake is moving
		},
		board: { // board attributes
			wall_color: "#47bcdf",
			field_color: "#1E282C",
			field_color2: "#656565",
			snake_color: "#FA7E86",
			block_color: "#FFEB3B",
			posts_color: "#FF0000",
			pixels_wide: 0,                 // filled in when we resize
			pixels_high: 0,                 // filled in when we resize
			block_size: 0,                  // block pixels - figured on resize
			grid_pad_pixels: 2,             // pixels of padding between blocks 
			block_location: { x:3, y:3 },   // current location of the target block - moves
			posts: [],                      // post positions {x:x,y:y} if there are any
			blocks_wide: 50,                // field block width
			blocks_high: 30                 // field block height
		}
	};

	// ----------------------------------------------------------------
	//
	// The scorekeeper is set externally. It manages highscores and can
	// be replaced if we wanted to do a database or something else.
	//
	// ----------------------------------------------------------------
	result.setScoreKeeper= function(scorekeeper){
		result.gamescores= scorekeeper;
	};

	// ----------------------------------------------------------------
	//
	// Starts over with the default settings.
	//
	// ----------------------------------------------------------------
	result.reset= function(){
		this.game_over= false;
		this.pause();
		this.settings= JSON.parse(JSON.stringify(this.default_settings));
		this.settings.snake.position= {x:this.settings.board.blocks_wide>>1,y:this.settings.board.blocks_high>>1};
		this.moveTargetBlock();
		this.setScore(0);
		this.resize();
		this.resume();

		// gradient for painting the playing field
		this.settings.board.field_gradient=this.ctx.createLinearGradient(0,0,0,170);
		this.settings.board.field_gradient.addColorStop(0,this.settings.board.field_color);
		this.settings.board.field_gradient.addColorStop(1,this.settings.board.field_color2);

		this.settings.bigfont= "small-caps bold 30pt sans-serif";
		this.settings.smallfont= "small-caps 12pt sans-serif";

		msg("Press a cursor key to start.");
	};

	// ----------------------------------------------------------------
	// 
	// First time initialization.
	//
	// ----------------------------------------------------------------
	result.init= function($wrapper){
		this.$canvas= $("<canvas width=1000 height=1000 />");
		this.$canvas.attr('width', $wrapper.width());
		this.$canvas.attr('height', $wrapper.height());

		this.$wrapper= $wrapper;
		$wrapper.append(this.$canvas);
		this.canvas= this.$canvas[0];
		this.ctx= this.canvas.getContext('2d');

		this.reset();
		this.moveTargetBlock();
	};

	// ----------------------------------------------------------------
	//
	// Call anytime the wrapper/canvas has changed shape.
	//
	// ----------------------------------------------------------------
	result.resize= function(){
		var w= this.$wrapper.width();
		var h= this.$wrapper.height();

		var b= this.settings.board;
		var bw= Math.floor(w/(b.blocks_wide+2));
		var bh= Math.floor(h/(b.blocks_high+2));
		b.block_size= Math.min(bw, bh);

		b.pixels_wide= b.block_size * (b.blocks_wide +2);
		b.pixels_high= b.block_size * (b.blocks_high +2);

		this.$canvas.attr('width', b.pixels_wide);
		this.$canvas.attr('height', b.pixels_high);

		this.left= Math.floor( (this.$wrapper.width() - b.pixels_wide) / 2);
		this.$canvas.css({
			"margin-left": this.left
		});

		this.draw();

		//
		// build a marker grid that we can use to know where
		// it is safe to locate blocks
		//
		this.board_grid= [];
		for(var i=0; i < b.blocks_wide; i++){
			var col= [];
			for(var j=0; j < b.blocks_high; j++){
				col.push(0);
			}
			this.board_grid.push(col);
		}
	};


	// ----------------------------------------------------------------
	//
	// This is the outside animation holder, not the actual render function.
	// It uses the requestAnimationFrame method to manage the clock and 
	// render frames. We check a time delta since the last move and if 
	// we have crossed a threshold (speed) then we move.
	//
	// ----------------------------------------------------------------
	result.frameid=0;               // frame waiting to render
	result.lastMoveTime= 0;         // last time we moved
	result.draw= function(){
		var self= this;

		// Is there already an animation frame waiting to render?
		if(self.frameid){
			// if so, we clear it
			window.cancelAnimationFrame(self.frameid);
		}

		// 
		// The contents of this function will run when the browser
		// is about to redraw the screen. (Think of it like the 
		// old verticle refresh sync from back in the day.)
		//
		self.frameid= window.requestAnimationFrame(function(ts){
			// has enough time passed to move yet?
			var timedelta= ts - result.lastMoveTime;
			if(timedelta > self.settings.snake.speed){
				// Yes, move.
				self.lastMoveTime= ts;
				self.moveSnake();
			}
			self.drawOnRepaint(ts);
			if(self.game_running){
				self.draw();
			}
			self.frameid=0;
		});
	};

	// ----------------------------------------------------------------
	//
	//  Moves the snake one block based on the delta settings.
	//  Also checks for collisions with the target, walls, posts, and 
	//  self.
	//
	// ----------------------------------------------------------------
	result.moveSnake= function(){
		var b= this.settings.board;
		var s= this.settings.snake;

		for(var i=s.tail.length -1; i > 0; i--){
			s.tail[i]= s.tail[i-1];
		}
		if(s.tail.length > 0){
			s.tail[0]= {x:s.position.x, y:s.position.y};
		}

		s.position.x+= s.delta.x;
		s.position.y+= s.delta.y;

		// 
		// Did we hit the target block?
		//
		if(s.position.x == b.block_location.x && s.position.y == b.block_location.y){
			this.moveTargetBlock();
			s.speed *= .9;
			var newsegment;
			if(s.tail.length < 1){
				newsegment= {x:s.position.x,y:s.position.y};
			} else {
				newsegment= s.tail[s.tail.length-1];
			}
			
			s.tail.push({x:newsegment.x, y:newsegment.y});

			var newscore= ((200 - s.speed) * (+1 +s.tail.length));
			if(this.settings.difficulty == 'Easy'){
				newscore= Math.floor(newscore * .7);
			} else if(this.settings.difficulty == 'Normal'){
			} else if(this.settings.difficulty == 'Hard'){
				newscore= Math.floor(newscore * 1.5);
			} else if(this.settings.difficulty == 'Abusive'){
				newscore= Math.floor(newscore * 2);
			}
			this.setScore(newscore);
		} else {
			if(this.settings.difficulty != 'Easy'){
				// 
				// Did we hit ourself?
				// We only check this when we did not hit a block - so we won't
				// catch the tail chucnk we just added.
				//
				for(var i=0; i < s.tail.length; i++){
					var e= s.tail[i];
					if(e.x == s.position.x && e.y == s.position.y){
						this.gameOver();
					}
				}
			}
		}
	
		// 
		// hit the wall?
		if(s.position.x < 0 || s.position.x >= b.blocks_wide || s.position.y < 0 || s.position.y >= b.blocks_high){
			msg("BOOM");
			this.gameOver();
		}

		// hit a post?
		for(var i=0; i < b.posts.length; i++){
			var post= b.posts[i];
			if(post.x == s.position.x && post.y == s.position.y){
				this.gameOver();
			}
		}

	};

	// ----------------------------------------------------------------
	//
	// Actual render function.
	// Draws a single frame.
	//
	// ----------------------------------------------------------------
	result.drawOnRepaint= function(ts){
		var b= this.settings.board;

		this.ctx.clearRect(0, 0, b.pixels_wide, b.pixels_high); // necessary?

		// draw walls
		this.ctx.fillStyle= b.wall_color;
		this.ctx.fillRect(0, 0, b.pixels_wide, b.pixels_high);

		// draw the play field
		this.ctx.fillStyle= b.field_gradient;
		this.ctx.fillRect(b.block_size, b.block_size, b.pixels_wide - b.block_size * 2, b.pixels_high - b.block_size * 2);
	
		// draw target block
		this.ctx.fillStyle= b.block_color;
		this.drawBlock(b.block_location.x, b.block_location.y);

		// draw snake
		this.ctx.fillStyle= b.snake_color;
		this.drawBlock(this.settings.snake.position.x, this.settings.snake.position.y);
		for(var i=0; i < this.settings.snake.tail.length; i++){
			this.drawBlock(this.settings.snake.tail[i].x, this.settings.snake.tail[i].y);
		}

		// draw posts if there are any
		this.ctx.fillStyle= this.randomColor();
		for(var i=0; i < this.settings.board.posts.length; i++){
			var post= this.settings.board.posts[i];
			this.drawBlock(post.x, post.y);
		}
	};

	// ----------------------------------------------------------------
	//
	// Place the target block away from the snake 
	// and make sure we don't hit the walls.
	//
	// ----------------------------------------------------------------
	result.moveTargetBlock= function(){
		var b= this.settings.board;
		var s= this.settings.snake;
		
		try{
			if(this.settings.difficulty == 'Easy' || this.settings.difficulty == 'Normal'){
				var open_grids= this.getClearLocation(1);
				b.block_location= open_grids[0];
			} else if(this.settings.difficulty == 'Hard'){
				var open_grids= this.getClearLocation(7);
				b.block_location= open_grids.pop();
				b.posts= [];
				b.posts= b.posts.concat(open_grids);
			} else if(this.settings.difficulty == 'Abusive'){
				var open_grids= this.getClearLocation(23);
				b.block_location= open_grids.pop();
				b.posts= [];
				b.posts= b.posts.concat(open_grids);
			}
		} catch (ex){
			console.log(ex);
			var open_grids= this.getClearLocation(1);
			b.block_location= open_grids[0];
		}

	};

	// ----------------------------------------------------------------
	//
	// Finds a location on the board that is no occupied.
	//
	// ----------------------------------------------------------------
	result.getClearLocation= function(count){
		if(!this.board_grid){
			return {x:3,y:3};
		}

		// clear the grid to 0
		var b= this.settings.board;
		var s= this.settings.snake;
		this.board_grid.map(function(x){ 
			x.map(function(y){
				return 0; 
			});
		});

		// remove snake head 
		for(var i= -2; i <= 2 ; i++){
			for(var j= -2; j <= 2 ; j++){
				var x= s.position.x + i;
				var y= s.position.y + j;
				if(x > 0 && x < b.blocks_wide && y > 0 && y < b.blocks_high){
					this.board_grid[x][y]= 1;
				}
			}
		}

		//
		// remove snake tail from the available grid positions
		//
		for(var i=0; i < s.tail.length; i++){
			var t= s.tail[i];
			this.board_grid[t.x][t.y]= 1;
		}

		//
		// find one empty spot for each location we are supposed to return
		// 
		var open_list= [];
		for(var n=0; n < count; n++){

			// start in a random location on the grid
			var bx= _.random(3,b.blocks_wide-4);
			var by= _.random(3,b.blocks_high-4);

			// loop forward X, then Y, looking for an open spot until we find one.
			var runs= 0;
			while(runs < b.blocks_high && this.board_grid[bx][by] != 0 && by < b.blocks_high){
				bx++;
				if(bx > b.blocks_wide){
					bx= 0;
					by++;
					by= by % b.blocks_high;
					runs++;
				}
			}

			// did we find an open spot or fall out for some other reason?
			if(this.board_grid[bx][by] != 0){
				console.error("Could not find a blank space!");
				open_list.push({x:3,y:3});
				this.board_grid[3][3]= 1;
			} else {
				open_list.push({x:bx,y:by});
				this.board_grid[bx][by]= 1;
			}
		}
		return open_list;
	};


	// ----------------------------------------------------------------
	// Change the score.
	//
	result.setScore= function(newscore){
		this.settings.score= Math.floor(newscore);
		$(document).trigger("snake:score");
	};

	// ----------------------------------------------------------------
	// Draws a single block
	//
	result.drawBlock= function(x,y){
		var b= this.settings.board;
		this.ctx.fillRect((x+1) * b.block_size, (y+1) * b.block_size, b.block_size - b.grid_pad_pixels, b.block_size - b.grid_pad_pixels);
	};

	// ----------------------------------------------------------------
	// Start the game
	//
	result.start= function(){
		this.game_running= true;
		this.draw();
	};
	// ----------------------------------------------------------------
	// Pause the game
	//
	result.pause= function(){
		this.game_running= false;
		msg("PAUSED: Press SPACE to continue");
	};
	// ----------------------------------------------------------------
	// resume the game
	//
	result.resume= function(){
		if(this.game_over){
			return;
		}
		this.game_running= true;
		this.draw();
		msg("Ready");
	};

	// ----------------------------------------------------------------
	// Toggle back and forth between paused and not paused
	//
	result.togglePause= function(){
		if(this.game_running){
			this.pause();
		} else {
			this.resume();
		}
	};

	// ----------------------------------------------------------------
	//
	//  Handlers for movement events
	//
	// ----------------------------------------------------------------
	result.moveL= function(){
		this.settings.snake.delta.x= -1;
		this.settings.snake.delta.y= 0;
	};
	result.moveR= function(){
		this.settings.snake.delta.x= +1;
		this.settings.snake.delta.y= 0;
	};
	result.moveU= function(){
		this.settings.snake.delta.x= 0;
		this.settings.snake.delta.y= -1;
	};
	result.moveD= function(){
		this.settings.snake.delta.x= 0;
		this.settings.snake.delta.y= +1;
	};

	result.randomColor= function(){
		return ("rgb("+[_.random(10,255),_.random(10,255),_.random(10,255)].join(',')+")");
	};

	// ----------------------------------------------------------------
	// 
	// Called when a game ending event is detected elsewhere.
	//
	// ----------------------------------------------------------------
	result.gameOver= function(){
		this.game_running= false;
		this.game_over= true;
		msg("Game Over: click to restart.");

		// play end game sequence
		var s= this.settings.snake;
		this.ctx.fillStyle= "red";
		this.drawBlock(s.position.x, s.position.y);
		this.blowUpTail(0);

	};

	// ----------------------------------------------------------------
	//
	// Makes the tail pop and flash after losing
	//
	// ----------------------------------------------------------------
	result.blowUpTail= function(ts){
		var self= this;
		var s= this.settings.snake;
		if(s.tail.length > 0){
			self.frameid= window.requestAnimationFrame(function(ts){
				if(Math.floor(ts) % (Math.min(2, 21 - s.tail.length)) == 0){
					var t= s.tail.pop();
					self.ctx.fillStyle= "black";
					self.drawBlock(t.x, t.y);
				} else {
					self.ctx.fillStyle= self.randomColor();
					var t= s.tail[s.tail.length -1];
					self.drawBlock(t.x, t.y);
				}
				self.ctx.font=self.settings.bigfont;
				self.ctx.fillStyle= self.randomColor();
				self.ctx.textAlign="center";
				self.ctx.fillText("GAME OVER", self.canvas.width/2, self.canvas.height/2);

				self.blowUpTail(ts);
			});
		} else {
			// done
			self.frameid= window.requestAnimationFrame(function(ts){
				self.ctx.fillStyle= "black";
				self.drawBlock(s.position.x, s.position.y);

				self.ctx.font=self.settings.bigfont;
				self.ctx.fillStyle="white";
				self.ctx.textAlign="center";
				self.ctx.fillText("GAME OVER", self.canvas.width/2, self.canvas.height/2);

				//
				// Highscore?
				// If so, pop up the high scroe window and get the new score.
				//
				if(self.gamescores.isHighScore(self.settings.score)){
					var $popup= $("<div />");
					var $initials= $("<input type=text size=3 />");
					var $done= $("<button>Done</button>");

					var submit= function(){
						self.gamescores.addScore($initials.val(), self.settings.score);
						$popup.hide();
						$popup.remove();
						self.displayHighScores();
					};

					$popup.css({
						"position": "absolute",
						"font-family" : "Verdana, Helvetica",
						"font-size" : "14pt",
						"text-align" : "center",
						"top": "30%",
						"left": "30%",
						"width" : "40%",
						"height" : "40%",
						"border": "solid #FA7E86 2px",
						"border-radius" : "12px",
						"background-color" : "#47bcdf",
						"color": "black"
					});
					$popup.append("<div>You are on the Board!</div>");
					$popup.append("<div>Enter your Initials!</div>");
					$initials.css({
						"font-family" : "Verdana, Helvetica",
						"font-size" : "18pt",
						"padding" : "8px",
						"border": "solid #FA7E86 2px",
						"border-radius" : "12px",
						"margin" : "8px"
					});
					$initials.keyup(function(e){
						if(e.keyCode == 13){
							submit();
						}
					});
					$popup.append($initials);
					$done.css({
						"padding" : "8px",
						"margin" : "8px",
						"font-size" : "14pt"
					});
					$done.click(function(){
						//self.gamescores.addScore($initials.val(), self.settings.score);
						//$popup.hide();
						//$popup.remove();
						//self.displayHighScores();
						submit();
					});
					$popup.append($done);
					$("body").append($popup);
					$initials.focus();

					//var player= prompt("Enter 3 initials for you high score!");
					//self.gamescores.addScore(player, self.settings.score);
					
				} else {
					// high score display
					self.displayHighScores();
				}
			});
		}
	};

	//
	// Displays the high scores.
	// It's a littie old school - like a stand-up arcade coin-op.
	//
	result.displayHighScores= function(){
		// high score display
		var highscores= this.gamescores.getScores();

		var cx= this.canvas.width/2;
		var cy= this.canvas.height/2;

		var c1= this.canvas.width/4;
		var c2= this.canvas.width/4 * 3;

		this.ctx.font= this.settings.smallfont;
		this.ctx.fillStyle= "#ffff55";
		this.ctx.textAlign= "center";

		// high score - top center
		this.ctx.fillText(highscores[0].player + " - " + highscores[0].score, cx, cy + 30);

		this.ctx.fillStyle="#ffffff";
		this.ctx.fillText(highscores[1].player + " - " + highscores[1].score, c1, cy + 50);
		this.ctx.fillText(highscores[2].player + " - " + highscores[2].score, c2, cy + 50);
		this.ctx.fillText(highscores[3].player + " - " + highscores[3].score, c1, cy + 70);
		this.ctx.fillText(highscores[4].player + " - " + highscores[4].score, c2, cy + 70);
				
	};

	return result;
});

