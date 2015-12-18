//
// Use requirejs to manage dependancies.
//
requirejs(['underscore', 'jquery', 'gamescores', 'snake'], function(_, $, gamescores, snake){
	//
	// Set up the snake using the snake container from the html page.
	//
	snake.init($("#snake-container"));
	snake.resize();
	snake.setScoreKeeper(gamescores);

	// ----------------------------------------------------------------
	//
	// Set up our UI for game settings
	//
	// ----------------------------------------------------------------
	for(var i=30; i < 80; i++){
		$("#bwide").append($("<option>"+i+"</option>"));
		$("#bhigh").append($("<option>"+i+"</option>"));
	}

	//
	// Fill in the difficulty settings.
	// - these string names are hardcoded - don't change them.
	//
	$("#difficulty").append($("<option>Easy</option>"));
	$("#difficulty").append($("<option>Normal</option>"));
	$("#difficulty").append($("<option>Hard</option>"));
	$("#difficulty").append($("<option>Abusive</option>"));
	
	//
	// Set from the snake game defaults
	//
	$("#bwide").val(snake.settings.board.blocks_wide);
	$("#bhigh").val(snake.settings.board.blocks_high);
	$("#difficulty").val(snake.settings.difficulty);

	//
	// Event handlers
	//
	$("#bwide").change(function(){
		snake.settings.board.blocks_wide= parseInt($("#bwide").val());
		snake.resize();
	});
	$("#bhigh").change(function(){
		snake.settings.board.blocks_high= parseInt($("#bhigh").val());
		snake.resize();
	});
	$("#difficulty").change(function(){
		snake.settings.difficulty= $("#difficulty").val();
	});
	$("#fstoggle").click(function(){
		toggleFullScreen();
	});
	$("#playagain").click(function(){
		var w= $("#bwide").val();	
		var h= $("#bhigh").val();	
		var d= $("#difficulty").val()
		snake.reset();
		snake.settings.board.blocks_wide= parseInt(w);
		snake.settings.board.blocks_high= parseInt(h);
		snake.settings.difficulty= d;
		snake.resize();
	});
	$("#help").click(function(){
		window.open("help.html", "_blank");
	});


	// ----------------------------------------------------------------
	//
	// Handle the resize events
	//
	// ----------------------------------------------------------------
	$(window).resize(function(){
		snake.resize();
	});

	// ----------------------------------------------------------------
	//
	// Catch the keyboard events we are interested in
	//
	// ----------------------------------------------------------------
	$(document).keydown(function(event){
		if(event.which == 32) {         // space
			snake.togglePause();
			return false;
		} else if (event.which == 37) { // left
			snake.moveL();
			return false;
		} else if (event.which == 38) { // up
			snake.moveU();
			return false;
		} else if (event.which == 39) { // rigth
			snake.moveR();
			return false;
		} else if (event.which == 40) { // down
			snake.moveD();
			return false;
		}
	});

	// ----------------------------------------------------------------
	// catch a click on the canvas to generate a reset
	$("#snake-container").mousedown(function(){
		var w= $("#bwide").val();	
		var h= $("#bhigh").val();	
		var d= $("#difficulty").val()
		snake.reset();
		snake.settings.board.blocks_wide= parseInt(w);
		snake.settings.board.blocks_high= parseInt(h);
		snake.settings.difficulty= d;
		snake.resize();
	});

	$("#resetgame").click(function(){
		snake.reset();
		$("#bwide").val(snake.settings.board.blocks_wide);
		$("#bhigh").val(snake.settings.board.blocks_high);
		$("#difficulty").val(snake.settings.difficulty);
	});

	// ----------------------------------------------------------------
	//
	// Register a listener for the score event that our snake object
	// generates so we can update the score.
	//
	// ----------------------------------------------------------------
	$(document).on("snake:score", function(e){
		$("#score").val(snake.settings.score);
	});


	// ----------------------------------------------------------------
	// ----------------------------------------------------------------
	// ----------------------------------------------------------------

	snake.start();
});


// ----------------------------------------------------------------
//
// Full screen 
//
// ----------------------------------------------------------------

function toggleFullScreen(){
	if(inFullScreen()){
		console.log("exit fullscreen");
		exitFullscreen();
	} else {
		console.log("enter fullscreen");
		launchIntoFullscreen($("body")[0]);
	}
}


function launchIntoFullscreen(element) {
	if(element.requestFullscreen) {
		element.requestFullscreen();
	} else if(element.mozRequestFullScreen) {
		element.mozRequestFullScreen();
	} else if(element.webkitRequestFullscreen) {
		element.webkitRequestFullscreen();
	} else if(element.msRequestFullscreen) {
		element.msRequestFullscreen();
	}
}


function exitFullscreen() {
	if(document.exitFullscreen) {
		document.exitFullscreen();
	} else if(document.mozCancelFullScreen) {
		document.mozCancelFullScreen();
	} else if(document.webkitExitFullscreen) {
		document.webkitExitFullscreen();
	}
}

function inFullScreen(){
	// works in chrome
	return( window.innerHeight == screen.height); 
}



function msg(m){
	$("#msg").val(m);
}

