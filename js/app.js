const maxHighScores = 5;

// Global Variables
let scene, camera, renderer;
let shipModel, pointLight, stars;
let clock, velocity, acceleration;
let raycaster;
let keyboard, gameOver;
let score, highScores;

let initials;

// Post Processing Variables
let renderScene, bloomPass, composer;

const player = {
    health: null,
    model: null,
}

const audio = [];

let obstacles = [];
let obstacleMax = 10;



// cached DOM Elements
const welcomeScreen = document.querySelector('#welcome-screen');
const debugTxt = document.querySelector('#debug-data');
const endGame = document.querySelector('#endGame');
const shields = document.querySelector('#shields');
const shieldHUD = document.querySelector('#shieldHUD');
const shieldBar = document.querySelector('#bar');
const runningScore = document.querySelector('#runningScore');
const scoreButton = document.querySelector('#submit-score');
const initialsField = document.querySelector('#enterScore')
const highScorer = document.querySelector('#highScorer')
const startBtn = document.querySelector('#start')

// Post processing
const params = {
    exposure: 1.0,
    bloomStrength: 1.0,
    bloomThreshold: 0,
    bloomRadius: 0
};

// Event Listeners
start.addEventListener('click', init);

window.addEventListener('resize', function(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    composer.setSize(window.innerWidth, window.innerHeight)
    renderer.setSize(window.innerWidth, window.innerHeight);
}, false);

endGame.addEventListener('click', function(e){
    if(e.target.id === 'replay') replay();
})

scoreButton.addEventListener('click', () => {
    initials = initialsField.value;
    if (highScores.length === maxHighScores) highScores.pop();
    highScores.push({initials, score})
    highScores.sort((a, b) => b.score - a.score)
    localStorage.setItem('scores', JSON.stringify(highScores));
    highScorer.style.visibility = 'hidden';
    initialsField.value = '';
});

displayWelcome();


function displayWelcome(){
    console.log('hello')
    welcomeScreen.visibility = 'visible'

}


function init(){
    welcomeScreen.visibility = 'hidden'

    highScores = JSON.parse(localStorage.getItem('scores')) || [];
    localStorage.setItem('scores', JSON.stringify(highScores));


    audio.push(new Audio('audio/things.mp3'));
    audio[0].addEventListener('canplay', function(e) {
        audio[0].play()
        .then(function(data) {
            console.log(data);
        })
        .catch(function(err) {
            console.log(err);
        });
    });

    welcomeScreen.style.visibility = 'hidden';

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    gameOver = false;
    player.health = 100;

    // load player model
    const loader = new THREE.GLTFLoader();
    loader.load('models/starship.glb', (gltf) => {
        gltf.scene.traverse(node => {
            if(node.isMesh) node.castShadow = true;
        });
        shipModel = gltf.scene.children[0];
        shipModel.castShadow = true;
        shipModel.receiveShadow = true;
        shipModel.position.z = -5.0;
        scene.add(shipModel);
    });
    player.hitbox = new THREE.Mesh(
        new THREE.BoxGeometry( 1.1, 2.0, 0.8),
        new THREE.MeshNormalMaterial({wireframe:true})
    );
    player.hitbox.position.set(0, 2, 0);
    scene.add(player.hitbox)
    player.hitbox.visible = false;

    // time and motion
    clock = new THREE.Clock();
    velocity = 0.1;
    acceleration = 0.0001;

    // input
    keyboard = new THREEx.KeyboardState();


    // ENVIRONMENT
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(10,10,10, 10),
        new THREE.MeshPhongMaterial( { color: 0x00ffea, side: THREE.DoubleSide, wireframe: false } )
    )

    floor.receiveShadow = true;
    floor.rotation.x = Math.PI/2
    floor.scale.set(20,20,50);
    scene.add(floor);

    stars = new Array(20).fill(null);
    for (let i in stars){
        let size = rand(0.1, 1.0)
        stars[i] = new THREE.Mesh(
            new THREE.BoxGeometry(size, size, size),
            new THREE.MeshNormalMaterial()
        )
        stars[i].position.set(rand(-20,20), rand(-20, 20), rand(-1,-100));
        scene.add(stars[i]);
    }

    // Obstacles
    for(let i = 0; i < 50; i++){
        let obstacle = new THREE.Mesh(
            new THREE.BoxGeometry(rand(1,5),rand(1,5),rand(4,5)),
            new THREE.MeshLambertMaterial({color: randomColor(), transparent: true, opacity: 0.75})
        )
        obstacle.visible = false;
        obstacle.receiveShadow = true;
        obstacle.position.set(rand(-100,1000), rand(-20,20), rand(40, 100))
        obstacles.push(obstacle);
        scene.add(obstacle)
    }


    scene.add(new THREE.AmbientLight(0x111111))


    pointLight = new THREE.PointLight(0xffffff, 0.7);
    pointLight.castShadow = true;
    pointLight.position.set(0,10,6)
   
    scene.add(pointLight)

    
    // renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ReinhardToneMapping;
    document.body.appendChild(renderer.domElement);

    // post Processing
    renderScene = new THREE.RenderPass(scene, camera);
    bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.5, 0.85 );
    bloomPass.renderToScreen = true;
    bloomPass.threshold = params.bloomThreshold;
    bloomPass.strength = params.bloomStrength;
    bloomPass.radius = params.bloomRadius;

    composer = new THREE.EffectComposer(renderer);
    composer.setSize(window.innerWidth, window.innerHeight);
    composer.addPass(renderScene);
    composer.addPass(bloomPass)

    setTimeout(gameLoop, 1000);
}

function gameLoop(){
    pointLight.lookAt(camera)
    shieldHUD.style.visibility = 'visible';
    score = ~~clock.getElapsedTime();

    runningScore.innerHTML = `SCORE: ${score}`
    shieldBar.style.width = `${player.health}%`;
    // camera.lookAt(scene.position)

    if ( player.health <= 0 ){
        gameOver = true;
    }
    
    keyControls();

    // motion 101
    velocity += acceleration
    if(velocity > 10){
        velocity *= 0;
    }
    
    // faster = more obstacles
    obstacleMax > obstacles.length ?
        obstacleMax = obstacles.length :
        obstacleMax = ~~(velocity*100);

    if(obstacleMax < 50){
        for(let i = 0; i < obstacleMax; i++){
            obstacles[i].visible = true
         }
    }

    /* Collision Detection */
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
    
    // motion logic for obstacles
    for (let i of obstacles){
        i.position.z += velocity;
        if (i.position.z > 1.0){
            i.position.x = rand(-20, 20)
            i.position.y = rand(-5, 20)
            i.position.z = rand(-30, -50);
        }
    }
    // motion for stars
    for(let star of stars){
        if(star.position.x == 0 && star.position.y == 0){
            console.log('heres one');
        }
        star.position.z += velocity * 4;
        // z boundary
        if(star.position.z > 1){
            star.position.set(rand(-20,20), rand(-10, 10), rand(-20,-100));
        }
    }
    renderer.clear();
    composer.render();
    gameOver ? endingScreen() : requestAnimationFrame(gameLoop);
}

function endingScreen(){
    clock.stop();
    document.querySelector('#endGame > p > span').textContent = score;
    highScorer.style.visibility = 'hidden';

    // check if made high score list
    highScorer.style.visibility = (highScores.length < maxHighScores || score > highScores[highScores.length - 1].score) ? 'visible' : 'hidden';
    endGame.style.visibility = 'visible'
    velocity = 0.01;
}

function keyControls() {
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

function replay(){
    // force this thing to be invisible
    highScorer.style.visibility = 'hidden'

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
