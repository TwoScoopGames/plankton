var canvas = document.getElementById("canvas");

var manifest = {
	"images": {


	},
	"sounds": {


	},
	"fonts": {
		"lato": {
			"embedded-opentype": "font/lato.eot",
			"woff": "font/lato.woff",
			"truetype": "font/Lato.ttf",
			"svg": "font/lato.svg#lato"
		}
	},
	"animations": {
		"two-scoop": {
			"strip": "images/two-scoop-anim.png",
			"frames": 32,
			"msPerFrame": 50,
			"repeatAt": 31
		}
	}
};


var game = new Splat.Game(canvas, manifest);
var dead = false;
var muteSounds = false;
var waitingToStart = true;
var columnsPassed = 0;
var score = 0;

var plankton = [];



function drawCircle(context, color, radius, strokeColor, strokeSize, x, y) {
	context.beginPath();
	context.arc(x, y, radius, 0, 2 * Math.PI, false);
	context.fillStyle = color;
	context.fill();
	context.lineWidth = strokeSize;
	context.strokeStyle = strokeColor;
	context.stroke();
}

function spray(mouse, velocity, radius, quantity) {
	syrupParticles.length = 0;
	for (var q = 0; q < quantity; q++) {
		syrupParticles.push({
			x: mouse.x,
			y: mouse.y,
			xv: (Math.random() - 0.5) * velocity,
			yv: (Math.random() - 0.5) * velocity,
			radius: Math.random() * radius
		});

	}
}

function drawParticles(context, particles) {
	for (var i = 0; i < particles.length; i++) {
		var particle = particles[i];
		drawCircle(context, "#6d511f", particle.radius, "#2d1e05", 0, particle.x, particle.y);
	}
}

function moveParticles(elapsedMillis, particles, gravitySwitch) {
	for (var i = 0; i < particles.length; i++) {
		var particle = particles[i];
		particle.x += particle.xv * elapsedMillis;
		particle.y += particle.yv * elapsedMillis;
		if (gravitySwitch) {
			particle.yv += gravity;
		}
	}
}

function centerText(context, text, offsetX, offsetY) {
	var w = context.measureText(text).width;
	var x = offsetX + (canvas.width / 2) - (w / 2) | 0;
	var y = offsetY | 0;
	context.fillText(text, x, y);
}

function drawScoreScreen(context, scene) {
	var ftb = scene.timers.fadeToBlack.time;
	scene.camera.drawAbsolute(context, function() {
		var opacity = Math.min(ftb / 300, 0.7);
		context.fillStyle = "rgba(0, 0, 0, " + opacity + ")";
		context.fillRect(0, 0, canvas.width, canvas.height);
		context.fillStyle = "#ffffff";
		context.font = "50px lato";
		centerText(context, "SCORE", 0, 300);
		context.font = "100px lato";
		centerText(context, score, 0, 400);
		context.font = "50px lato";
		if (newBest) {
			context.fillStyle = "#be4682";
			centerText(context, "NEW BEST!", 0, 600);
		} else {
			centerText(context, "BEST", 0, 600);
		}

		context.font = "100px lato";
		centerText(context, best, 0, 700);
	});
}

function drawIntroOverlay(context, scene) {
	scene.camera.drawAbsolute(context, function() {


		context.fillStyle = "#000";
		context.fillRect(0, 0, canvas.width, canvas.height);

		context.fillStyle = "#fff";
		context.font = "100px lato";
		centerText(context, "plankton", 0, 600);


		context.fillStyle = "#fff";
		context.font = "28px lato";
		centerText(context, "2014 Two Scoop Games ", 0, canvas.height - 60);

		var adPlaceholder = game.images.get("ad-placeholder");
		context.drawImage(adPlaceholder, 0, 0);


		if (muteSounds) {
			var soundSwitch = game.images.get("sound-off");
		} else {
			var soundSwitch = game.images.get("sound-on");
		}
		context.drawImage(soundSwitch, (canvas.width - soundSwitch.width), 100);
	});
}

function drawFlash(context, scene) {
	var flashTime = scene.timers.flash.time;
	var flashLen = scene.timers.flash.expireMillis;

	if (flashTime > 0) {
		var opacity = Splat.math.oscillate(flashTime, flashLen);
		context.fillStyle = "rgba(255, 255, 255, " + opacity + ")";
		context.fillRect(scene.camera.x, scene.camera.y, canvas.width, canvas.height);
	}
}

function makeSquare(x, y) {
	var waffleHoleImage = game.images.get("waffle-hole");
	var waffleFilledImage = game.images.get("waffle-filled");
	if (x < 800) {
		var isFilled = true;
	} else {
		var isFilled = Math.random() > 0.5;
	}

	var image = isFilled ? waffleFilledImage : waffleHoleImage;
	var entity = new Splat.AnimatedEntity(x, y, tileSize, tileSize, image, 0, 0);
	entity.filled = isFilled;
	return entity;
}

function makeSquareColumn(x) {
	var squares = [];
	for (var y = 0; y < canvas.height; y += tileSize) {
		squares.unshift(makeSquare(x, y));
	}
	return squares;
}

function findMaxX(entities) {
	return entities.reduce(function(a, b) {
		return Math.max(a, b.x);
	}, 0);
}

function makeSquares(scene, squares) {
	var maxX = findMaxX(squares);
	var newSquares = [];
	if (maxX < scene.camera.x + canvas.width) {
		newSquares = newSquares.concat(makeSquareColumn(maxX + tileSize));
	}
	return newSquares;
}

function fillSound() {
	var i = Math.random() * fillSounds.length | 0;
	game.sounds.play(fillSounds[i]);
}

function isInside(container, x, y) {
	return x >= container.x &&
		x < container.x + container.width &&
		y >= container.y &&
		y < container.y + container.height;
}

/*=========================================
				 Scenes 
===========================================*/

game.scenes.add("title", new Splat.Scene(canvas, function() {
	this.timers.running = new Splat.Timer(null, 2000, function() {
		game.scenes.switchTo("main");
	});
	this.timers.running.start();
}, function(elapsedMillis) {
	game.animations.get("two-scoop").move(elapsedMillis);
}, function(context) {
	context.fillStyle = "#93cbcd";
	context.fillRect(0, 0, canvas.width, canvas.height);
	var anim = game.animations.get("two-scoop");
	context.fillStyle = "#ffffff";
	context.font = "50px lato";
	centerText(context, "Two Scoop Games", 0, (canvas.height / 2) + (anim.height / 2) + 30);
	anim.draw(context, (canvas.width / 2) - (anim.width / 2), (canvas.height / 2) - (anim.height / 2));
}));

game.scenes.add("main", new Splat.Scene(canvas, function() {
		waitingToStart = true;
		this.timers.fadeToBlack = new Splat.Timer(null, 1000, function() {
			game.scenes.switchTo("main");
		});
	},
	function simulation(elapsedMillis) {
		moveParticles(elapsedMillis, plankton, false);
		if (muteSounds) {
			//game.sounds.stop("music");
		}

		if (waitingToStart) {
			var soundSwitch = new Splat.Entity((canvas.width - 115), 100, 115, 109);
			if (isInside(soundSwitch, game.mouse.x, game.mouse.y)) {

				if (game.mouse.consumePressed(0)) {
					if (muteSounds === true) {
						muteSounds = false;
					} else {
						muteSounds = true;
					}
				}
			} else {
				if (game.mouse.consumePressed(0)) {
					// if (!muteSounds) {
					// 	game.sounds.play("button");
					// }
					setTimeout(function() {

						// if (!muteSounds) {
						// 	game.sounds.play("music", true);
						// }
						waitingToStart = false;
						dead = false;
					}, 200);
				}
			}
		}

		if (!waitingToStart) {
			// main game
			if (dead) {
				this.timers.fadeToBlack.start();
				return;
			}
		}

		if (this.timers.fadeToBlack.running) {
			return;
		}
	},
	function draw(context) {

		context.fillStyle = "#000";
		context.fillRect(0, 0, canvas.width, canvas.height);


		if (waitingToStart) {
			drawIntroOverlay(context, this);
		} else {
			this.camera.drawAbsolute(context, function() {
				context.fillStyle = "#ffffff";
				context.font = "100px lato";
				centerText(context, Math.floor(score), 0, 100);
				drawParticles(context, plankton);
			});
		}

	}));

game.scenes.switchTo("loading");