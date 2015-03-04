var elements = ['Hydrogen', 'Helium', 'Lithium', 'Beryllium', 'Boron', 'Carbon', 'Nitrogen', 'Oxygen', 'Fluorine', 'Neon', 'Sodium', 'Magnesium', 'Aluminum', 'Silicon', 'Phosphorus', 'Sulfur', 'Chlorine', 'Argon', 'Potassium', 'Calcium', 'Scandium', 'Titanium', 'Vanadium', 'Chromium'];

var config = {
    tunnelHeight: 128,
    tunnelWidth: 192,
    polarityHeight: 8,
    tileCount: 5,
    initialSpeed: 100,
    acceleration: 20,
    maxSpeed: 10000,
    elementCount: 24,
    elementHeight: 4,
    elementWidth: 4,
    pointsPerSecond: 4,
    trailTTL: 0.1,
    spawnTimer: 4,
    configNumElements: 24,
    numObstructions: 3,
    difficulty: 0.5,
    debug: true
}

var tunnels;
var positives;
var negatives;
var elements;
var trails;
var largeElements;
var obstructions;

var gameStarted = false;

var lastTunnel;
var polarity = true;
var polarityButton;
var tunnelSpeed = 0;
var score = 0;
var scoreText;
var deltaT;
var spawnTime = config.spawnTimer;

var game = new Phaser.Game(config.tunnelWidth * config.tileCount, config.tunnelHeight, Phaser.AUTO, 'super-collider');
var SuperCollider = function(game) {};
SuperCollider.Boot = function(game) {};

SuperCollider.Boot.prototype = {
    preload: function() {
        game.time.advancedTiming = true;
        game.load.image('tunnel', '/images/tunnel.png');
        game.load.image('positive', '/images/positive.png');
        game.load.image('negative', '/images/negative.png');
        game.load.spritesheet('elements', '/images/elements.png', config.elementWidth, config.elementHeight, config.elementCount);
        
        for (var i = 0; i < config.numObstructions; ++i) {
            game.load.image('obstruction_' + i, '/images/obstructions/' + i + '.png');   
        }
    },
    create: function() {
        gameStarted = false;
        score = 0;
        
        game.physics.startSystem(Phaser.Physics.Arcade);
        initializeGroups();
        
        polarityButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
        tunnelSpeed = config.initialSpeed;
        
        for (var i = 0; i < config.tileCount + 2; ++i) {
            tunnels.add(game.add.sprite(i * config.tunnelWidth, 0, 'tunnel'));
            game.physics.arcade.enable(tunnels.children[i], Phaser.Physics.Arcade, true);
            
            positives.add(game.add.sprite(i * config.tunnelWidth, -config.polarityHeight, 'positive'));
            negatives.add(game.add.sprite(i * config.tunnelWidth, config.tunnelHeight - config.polarityHeight, 'negative'));
        }
        lastTunnel = tunnels.children[config.tileCount + 1];
        
        var element = game.add.sprite(config.tunnelWidth / 2, config.tunnelHeight / 2, 'elements');
        element.frame = 0;
        elements.add(element);
        
        scoreText = game.add.text(config.tileCount * config.tunnelWidth - 100, 14, 'Score: 0', { font: "20px Arial", fill: "#ffffff", alight: "left" });
    },
    update: function() {
        if (gameStarted == false) {
            if (polarityButton.justDown) {
                startGame();
            }
            return;    
        }
        
        deltaT = (game.time.elapsedMS / 1000);
        
        addTrails();
        updateTrails();
        
        if (tunnelSpeed < config.maxSpeed) {
            tunnelSpeed += config.acceleration * deltaT;
        }
        
        elements.forEachAlive(updateElement, this);
        largeElements.forEach(updateObject, this);
        obstructions.forEach(updateObject, this);
        tunnels.forEach(moveTunnel, this);
        
        if (polarityButton.justDown) {
            reversePolarity();    
        }
        
        if (polarityButton.justUp) {
            reversePolarity();   
        }
        
        game.physics.arcade.overlap(elements, positives, collisionHandler, null, this);
        game.physics.arcade.overlap(elements, negatives, collisionHandler, null, this);
        game.physics.arcade.overlap(elements, obstructions, collisionHandler, null, this);
        game.physics.arcade.overlap(elements, largeElements, collisionHandlerLargeElements, null, this);
        
        score += config.pointsPerSecond * deltaT;
        
        spawnTime -= deltaT;
        if (spawnTime <= 0) {
            generateObject();
            spawnTime = config.spawnTimer;
        }
    },
    render: function() {
        if (config.debug) {
            game.debug.text(game.time.fps || '--', 2, 14, '#00ff00');
        }
        scoreText.text = 'Score: ' + score.toFixed(0);
    }    
}

function initializeGroups() {
    tunnels = game.add.group();
    positives = game.add.group();
    positives.enableBody = true;
    positives.physicsBodyType = Phaser.Physics.ARCADE;

    negatives = game.add.group();
    negatives.enableBody = true;
    negatives.physicsBodyType = Phaser.Physics.ARCADE;

    trails = game.add.group();
    trails.enableBody = true;
    trails.physicsBodyType = Phaser.Physics.ARCADE;

    largeElements = game.add.group();
    largeElements.enableBody = true;
    largeElements.physicsBodyType = Phaser.Physics.ARCADE;
    
    obstructions = game.add.group();
    obstructions.enableBody = true;
    obstructions.physicsBodyType = Phaser.Physics.ARCADE;
    
    elements = game.add.group();
    elements.enableBody = true;
    elements.physicsBodyType = Phaser.Physics.ARCADE;
}

function generateObject() {
    if (Math.random() < config.difficulty) {
        generateLargeElement();   
    } else {
        generateObstruction();   
    }
}

function generateObstruction() {
    var y = randomRange(25, config.tunnelHeight - 25);
    var x = config.tunnelWidth * config.tileCount + 100;
    
    var obstructionId = randomRange(0, config.numObstructions);
    var obstruction = game.add.sprite(x, y, 'obstruction_' + obstructionId);
    obstructions.add(obstruction);
    obstruction.body.velocity.x = -tunnelSpeed;
    obstruction.outOfBoundsKill = true;
}

function generateLargeElement() {
    var y = randomRange(25, config.tunnelHeight - 25);
    var x = config.tunnelWidth * config.tileCount + 100;
        
    var size = randomRange(3, 8);
    console.log('Pos: ', x, ', ', y, 'Size: ', size);
    var element = Math.floor(Math.random() * config.elementCount);
    
    var largeElement = game.add.sprite(x, y, 'elements');
    largeElement.width *= size;
    largeElement.height *= size;
    largeElements.add(largeElement);
    largeElement.body.velocity.x = -tunnelSpeed;
    largeElement.outOfBoundsKill = true;
    largeElement.size = size;
    largeElement.frame = element;
}

function moveTunnel(tunnel) {
    tunnel.body.velocity.x = -tunnelSpeed;
    if (tunnel.position.x <= -config.tunnelWidth) {
        tunnel.position.x = lastTunnel.position.x + config.tunnelWidth;
        lastTunnel = tunnel;
    }
}

function updateObject(object) {
    if (object === undefined) {
        return;    
    }
    
    if (object.alive === false) {
        object.destroy();    
        return;
    }
    
    if (object.position.x < -100) {
        object.kill();    
    }
    
    object.body.velocity.x = -tunnelSpeed;
}

function updateElement(element) {
    if (element.body.velocity.x > 0) {
        element.body.velocity.x -= 1 * deltaT;
        
        if (element.body.velocity.x <= 0) {
            element.body.velocity.x = 0;
        }
    }
    
    var maxX = config.tileCount * config.tunnelWidth - 100;
    if (element.position.x > maxX) {
        element.position.x = maxX;
    }
}

function reversePolarity() {
    polarity = !polarity;
    
    var pY = polarity ? -config.polarityHeight :  config.tunnelHeight - config.polarityHeight;
    var nY = polarity ? config.tunnelHeight - config.polarityHeight : -config.polarityHeight;
    
    for (var i = 0; i < positives.children.length; i++) {
        positives.children[i].position.y = pY;
        negatives.children[i].position.y = nY;
    }
    
    _.forEach(elements.children, function(element) {
        element.body.velocity.y *= -1;
    });
}

function collisionHandler(element, wall) {
    element.kill();
    
    if (elements.checkAll('alive', false)) {
        gameStarted = false;
        game.state.start('Boot', false, false);   
    }
}

function collisionHandlerLargeElements(element, largeElement) {
    var size = largeElement.size;
    for (var i = 0; i < size; ++i) {
        var forwardSpeed = randomRange(15, 25);
        var up = Math.random() >= 0.5 ? -1 : 1;
        var xOffset = randomRange(0, largeElement.size);
        var yOffset = randomRange(0, largeElement.size) * -up;
        
        var e = game.add.sprite(largeElement.position.x + xOffset, largeElement.position.y + yOffset, 'elements');
        e.frame = largeElement.frame;
        elements.add(e);
        e.body.velocity.y = config.initialSpeed * up;
        e.body.velocity.x = forwardSpeed;
    }
    
    largeElement.destroy();
}

function addTrails() {
    elements.forEachAlive(function(e) {
        var tail = game.add.sprite(e.position.x, e.position.y, 'elements');
        tail.frame = e.frame;
        tail.ttl = config.trailTTL;
        trails.add(tail);
        tail.body.velocity.x = -tunnelSpeed;
    }, this);
}

function updateTrails() {
    _.forEach(trails.children, function(t) {
        if (t !== undefined) {
            t.ttl -= deltaT;

            if (t.ttl <= 0) {
                t.destroy();   
            }
        }
    });
}

function startGame() {
    _.forEach(tunnels.children, moveTunnel);
    _.forEach(elements.children, function(e) {
       e.body.velocity.y = -tunnelSpeed; 
    });
    gameStarted = true;
}

function randomRange(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

game.state.add('Boot', SuperCollider.Boot);
game.state.start('Boot');