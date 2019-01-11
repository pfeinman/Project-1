/* ---------- Math.random functions ---------- */
const rand = (min, max) => ~~(Math.random() * (max - min)) + min

const randFloat = (min, max) => Math.random() * (max - min) + min

// random Hex digit //
const randomHex = () => {
    const hexVals = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'A', 'B', 'C', 'D', 'E', 'F'];
    return hexVals[~~(Math.random() * hexVals.length)]
};

// random Hex color //
const randomColor = () => {
    const hexVal = ['#'];
    for(let i = 0; i < 6; i++){
        hexVal.push(randomHex())
    }
    return hexVal.join('')
};

// dom Functions //
const updateScoresOverlay = () => {
    for(let i = 0; i < maxHighScores; i++){
        if(highScores[i]){
            scoreElements[i] = highScores[i];
        }
    }
    scoresOverlay.textContent = '';
    scoreElements.forEach( s => {
        scoresOverlay.innerHTML += `<li>${s.score} ${s.initials.toUpperCase()}</li>`
    })
}

const randomFromArray = (array) => array[~~(Math.random()*array.length)]

const randomTitle = () => {
    const prefixes = ['HYPER'];
    const suffixes = ['SPACE', 'LIGHT', 'GROOVE'];
    const nouns = ['CUBE', 'BOX', 'POLYGON', 'GEOMETRY', 'STAR'];
    const endNouns = ['DRIFTER', 'GLIDER', 'COLLIDER', 'DODGER', 'RUNNER', 'FLYER', 'SURFER'];
    const phrase = `${randomFromArray(prefixes)}${randomFromArray(suffixes)} ${randomFromArray(nouns)} ${randomFromArray(endNouns)}`;
    gameTitle.textContent = phrase;
}

const recolor = () => {
    obstacles.forEach(obstacle => {
        obstacle.material = new THREE.MeshLambertMaterial({color: randomColor(), transparent: true, opacity: .75});
    })
}

const intro = () => {
    if(score === 0) remesher(14000);
        if(score < 11 ){
            obstacles.forEach(o => o.override = true)
        } else {
            obstacles.forEach(o => o.override = false) ;   
        }
    if(score === 46){
        remesher(2000)
    }
};

const remesher = (interval) => {
    for(let obstacle of obstacles){
        obstacle.material = new THREE.MeshNormalMaterial({wireframe: true})
    }
    setTimeout(function(){
        for(let obstacle of obstacles){
            obstacle.material = new THREE.MeshLambertMaterial({color: randomColor(), transparent: true, opacity: 0.75})
        }
    }, interval)
}

const keyControls = () => {
    if( keyboard.pressed( 'W' ) ) {
        if( player.model.position.y < 3.0 ) player.model.position.y += 0.1
    }
    if( keyboard.pressed( 'S' ) ) {
        if( player.model.position.y > -2.5 ) player.model.position.y -= 0.1;
    }
    if( keyboard.pressed( 'A' ) ) {
        if( player.model.position.x > -5.0 ) player.model.position.x -= 0.1;
        player.model.rotation.y += 0.1;
    }
    if( keyboard.pressed( 'D' ) ) {
        if( player.model.position.x < 5.5 ) player.model.position.x += 0.1;
        player.model.rotation.y -= 0.1;
    }
    if( keyboard.pressed( 'space' ) ) {
        remesher(2000);
    }
}

// Adapted from http://stemkoski.github.io/Three.js/Collision-Detection.html
const checkCollisions = () => {

    const originPoint = player.model.position.clone();
    player.hitbox.position.set(originPoint.x, originPoint.y, originPoint.z);

    const rot = player.model.rotation.clone();
    player.hitbox.rotation.set(rot.x, rot.y, rot.z);

    for(let vertexIndex = 0; vertexIndex < player.hitbox.geometry.vertices.length; vertexIndex++){
        const localVertex = player.hitbox.geometry.vertices[vertexIndex].clone();
        const globalVertex = localVertex.applyMatrix4( player.hitbox.matrix );
        const dirVector = globalVertex.sub( player.hitbox.position );
        
        const ray = new THREE.Raycaster(originPoint, dirVector.clone().normalize())

        const collisions = ray.intersectObjects(obstacles);
        if(collisions.length > 0 && collisions[0].distance < dirVector.length()){
                player.health -=1;
        }
    }

}
const rotator = () => {
    for(let obj of obstacles){
        rot = rand(0.01, 0.05) * Math.abs(Math.sin(velocity));
        obj.rotation.z += rot;
    }
};

const resetRotation = () => {
    for(let obj of obstacles){
        obj.rotation.z = 0;
    }
};

const resetDistances = () => {
    nearDist = -40;
    farDist = -60;
};

const displayEndingScreen = () => {
    if(clock.running) clock.stop();
    document.querySelector('#endGame > p > span').textContent = score;
    highScorer.style.visibility = 'hidden';

    // check if made high score list
    highScorer.style.visibility = (highScores.length < maxHighScores || score > highScores[highScores.length - 1].score) ? 'visible' : 'hidden';
    endGame.style.visibility = 'visible'
    velocity = 0.01;
}

const repositionStars = () => {
    stars.forEach(star => {
        star.position.set(rand(-20, 20), rand(-20, 20), rand(-10,-30));
    })
}

// re-init function
const replay = () =>{
    firstTry = false;
    // ensure highScore input is hidden
    highScorer.style.visibility = 'hidden'
    resetRotation();
    resetDistances();
    repositionStars();

    // reset game stuff
    player.model.position.set(0,0,-5)
    player.model.rotation.set(Math.PI/2,0,0)
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
    audio.mp3 = new Audio('audio/dynamite.mp3');
    audio.artist = 'Todd Terje'
    audio.title = 'Delorean Dynamite'
}

const songDisplay = () => {
    songInfo.style.visibility = 'visible'
    songInfo.textContent = `Music: "${audio.title}" by ${audio.artist}`;
}

const playAudio = () => {
    audio.mp3.play();
    audio.mp3.loop = true;
}

const bloomTweak = () => {
    bloomPass.strength = 0.5 + Math.abs(0.2 + Math.cos( 2.0 * clock.getElapsedTime() / 2 )) / 8
}

const nearReduce = () => {
    nearDist += 0.01;
    if(nearDist > -6){
        nearDist = -6
    }
}