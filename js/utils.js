// random fn
const rand = (min, max) => Math.floor(Math.random() * (max - min)) + min

// random hex
const randomHex = () => {
    const hexVals = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'A', 'B', 'C', 'D', 'E', 'F'];
    return hexVals[Math.floor(Math.random() * hexVals.length)]
};
const randomColor = () => {
    const hexVal = ['#'];
    for(let i = 0; i < 6; i++){
        hexVal.push(randomHex())
    }
    return hexVal.join('')
};

// dom Functions
const updateScoresOverlay = () => {
    for(let i = 0; i < maxHighScores; i++){
        if(highScores[i]){
            scoreElements[i] = highScores[i];
        }
    }
    scoresOverlay.textContent = '';
    scoreElements.forEach(s => {
        scoresOverlay.innerHTML += `<li>${s.score} ${s.initials.toUpperCase()}</li>`
    })
}

const randomFromArray = (array) => array[~~(Math.random()*array.length)]

const randomTitle = () => {
    const prefixes = ['HYPER', 'MEGA', 'SUPER'];
    const suffixes = ['SPACE', 'LIGHT', 'TIME'];
    const nouns = ['CUBE', 'BOX', 'POLYGON', 'GEOMETRY'];
    const endNouns = ['DRIFTER', 'GLIDER', 'COLLIDER', 'DODGER', 'RUNNER', 'FLYER'];
    const phrase = `${randomFromArray(prefixes)}${randomFromArray(suffixes)} ${randomFromArray(nouns)} ${randomFromArray(endNouns)}`;
    gameTitle.textContent = phrase;
}


// keyboard controls
const keyControls = () => {
    if( keyboard.pressed( 'W' ) ) {
        if( shipModel.position.y < 3.0 ) shipModel.position.y += 0.1
    }
    if( keyboard.pressed( 'S' ) ) {
        if( shipModel.position.y > -2.5 ) shipModel.position.y -= 0.1;
    }
    if( keyboard.pressed( 'A' ) ) {
        if( shipModel.position.x > -5.0 ) shipModel.position.x -= 0.1;
        shipModel.rotation.y += 0.1;
    }
    if( keyboard.pressed( 'D' ) ) {
        if( shipModel.position.x < 5.5 ) shipModel.position.x += 0.1;
        shipModel.rotation.y -= 0.1;
    }
}

const checkCollisions = () => {
    const originPoint = shipModel.position.clone();
    player.hitbox.position.set(originPoint.x, originPoint.y, originPoint.z);

    const rot = shipModel.rotation.clone();
    player.hitbox.rotation.set(rot.x, rot.y, rot.z);
    
    for(let vertexIndex = 0; vertexIndex < player.hitbox.geometry.vertices.length; vertexIndex++){
        const localVertex = player.hitbox.geometry.vertices[vertexIndex].clone();
        const globalVertex = localVertex.applyMatrix4( player.hitbox.matrix );
        const dirVector = globalVertex.sub(player.hitbox.position);
        
        const ray = new THREE.Raycaster(originPoint, dirVector.clone().normalize())
        const collisions = ray.intersectObjects(obstacles);
        if(collisions.length > 0 && collisions[0].distance < dirVector.length()){
            player.health -= 1;
            // hit !
        }
    }
}

const rotator = () => {
    for(let obj of obstacles){
        rot = rand(0.01, 0.05) * Math.abs(Math.sin(velocity));
        obj.rotation.z += rot
    }
}

const resetRotation = () => {
    for(let obj of obstacles){
        obj.rotation.z = 0;
    }
};

// splash screen
const displayWelcome = () => {
    randomTitle();
    welcomeScreen.style.visibility = 'visible';
    highScoreHUD.style.visibility = 'hidden';
}

const displayEndingScreen = () => {
    if(clock.running) clock.stop();
    document.querySelector('#endGame > p > span').textContent = score;
    highScorer.style.visibility = 'hidden';

    // check if made high score list
    highScorer.style.visibility = (highScores.length < maxHighScores || score > highScores[highScores.length - 1].score) ? 'visible' : 'hidden';
    endGame.style.visibility = 'visible'
    velocity = 0.01;
}


// re-init function
const replay = () =>{
    // ensure highScore input is hidden
    highScorer.style.visibility = 'hidden'
    resetRotation();

    // reset game stuff
    shipModel.position.set(0,0,-5)
    shipModel.rotation.set(Math.PI/2,0,0)
    obstacleMax = 10;
    for(let i = 0; i < obstacles.length; i++){
        obstacles[i].position.set(rand(-100,1000), rand(-20,20), rand(40, 100))
        if(i < obstacleMax){
            obstacles[i].visible = true;
        } else {
            obstacles[i].visible = false;
        }
    }
    score = 0;
    gameOver = false;
    endGame.style.visibility = 'hidden';

    velocity = 0.1;
    acceleration = 0.0001;
    player.health = 100;
    clock.start();
    gameLoop();
}

const updateShields = () => {
    shieldHUD.style.visibility = 'visible';
    shieldBar.style.backgroundColor = player.health < 25 ? 'red' : 'blue'
    shieldBar.style.width = `${player.health}%`;
};

const audioLoader = () => {
    audio.push(
        new Audio('audio/dynamite.mp3')
    )

    audio[0].artist = 'Todd Terje';
    audio[0].trackName = 'Delorean Dynamite'
}

const songDisplay = () => {
    currentSong.style.visibility = 'visible'
    currentSong.textContent = `Music: "${audio[0].trackName}" by ${audio[0].artist}`;
}

const audioPlayer = () => {
    audio[0].play();
    audio[0].loop = true;
}