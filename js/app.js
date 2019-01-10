localStorage.clear();

/* Global Variables */
let scene, camera, renderer;
let shipModel, pointLight;
let clock, velocity, acceleration;
let raycaster, keyboard;
let gameOver;
let score, highScores, initials;
const maxHighScores = 5;

let controls;

// Particles and Obstacles
const obstacleHardCap = 100;
let particles, stars;
let obstacleMax = 10;
const obstacles = [];
let nearDist, farDist;


const player = {
    health: null,
    model: null,
}

const audio = [];
let song = '';

// Post Processing
let renderScene, bloomPass, composer;
const params = {
    exposure: 1.0,
    bloomStrength: 1.0,
    bloomThreshold: 0,
    bloomRadius: 0
};

/* ------------------ cached DOM Elements ------------------ */
const gameTitle = document.querySelector('#title')
const welcomeScreen = document.querySelector('#welcome-screen');
const startBtn = document.querySelector('#start');

/* HUD */
const shields = document.querySelector('#shields');
const shieldHUD = document.querySelector('#shieldHUD');
const shieldBar = document.querySelector('#bar');

const runningScore = document.querySelector('#running-score');
const highScoreHUD = document.querySelector('#scores-overlay');
const scoresOverlay = document.querySelector('#scores-overlay > ol');

const scoreButton = document.querySelector('#submit-score');
const endGame = document.querySelector('#endGame');
const initialsField = document.querySelector('#enterScore')
const highScorer = document.querySelector('#highScorer')

const currentSong = document.querySelector('#current-song');

const scoreElements = [];

// Event Listeners
start.addEventListener('click', init);

endGame.addEventListener('click', function(e){
    if(e.target.id === 'replay') replay();
})

scoreButton.addEventListener('click', () => {
    initials = initialsField.value;
    if (highScores.length === maxHighScores) highScores.pop();
        if(!initials){
            initials = '---';
        }
    highScores.push({initials, score})
    highScores.sort((a, b) => b.score - a.score)
    localStorage.setItem('scores', JSON.stringify(highScores));
    highScorer.style.visibility = 'hidden';
    initialsField.value = '';
    
    updateScoresOverlay();
    
});

/* ----do it---- */
displayWelcome();
/* ------------ */

function init(){

    highScores = JSON.parse(localStorage.getItem('scores')) || [];
    localStorage.setItem('scores', JSON.stringify(highScores));

    updateScoresOverlay();
    nearDist = -20;
    farDist = -50;
    

    audioLoader();
    //audio.push(new Audio('audio/things.mp3'));
    // audio[0].addEventListener('canplay', function(e) {
    //     audio[0].play()
    //     .then(function(data) {
    //         console.log(data);
    //     })
    //     .catch(function(err) {
    //         console.log(err);
    //     });
    // });
    // audio[0].play();
    // audio[0].artist = 'Louis Cole';
    // audio[0].trackName = 'Things'
    audioPlayer();

    welcomeScreen.style.visibility = 'hidden';

    highScoreHUD.style.visibility = 'visible';
    shieldHUD.style.visibility = 'visible';


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

    // environment
    particles = new Array(20).fill(null);
    for (let i in particles){
        let size = rand(0.1, 1.0)
        particles[i] = new THREE.Mesh(
            new THREE.BoxGeometry(size, size, size),
            new THREE.MeshNormalMaterial()
        )
        particles[i].position.set(rand(-20,20), rand(-20, 20), rand(-1,-100));
        scene.add(particles[i]);
    }

    stars = new Array(30).fill(null);
    for(let i in stars){
        let size = rand(0.1, 1.0);
        stars[i] = new THREE.Mesh(
            new THREE.BoxGeometry(size, size, size),
            new THREE.MeshNormalMaterial({wireframe: true})
        );
        //stars[i].position.set(rand(-50, 50), rand(-50, 50), rand(-10,-50));
        stars[i].position.set(rand(-20, 20), rand(-20, 20), rand(-10,-30));
        scene.add(stars[i])
    }

    // obstacles
    obstacleMax = 10;
    for(let i = 0; i < obstacleHardCap; i++){
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

    // lighting
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
    composer.addPass(bloomPass);

    window.addEventListener('resize', function(){
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        composer.setSize(window.innerWidth, window.innerHeight)
        renderer.setSize(window.innerWidth, window.innerHeight);
    }, false);
    

    // time delayed call to gameLoop
    setTimeout(gameLoop, 1000);
}

function gameLoop(){
    pointLight.lookAt(camera)
    score = ~~clock.getElapsedTime();

    runningScore.innerHTML = `SCORE: ${score}`

    songDisplay();
    if(score >= 60) rotator();
    updateShields();

    //shieldBar.style.width = `${player.health}%`;

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

    if(obstacleMax < obstacleHardCap){
        for(let i = 0; i < obstacleMax; i++){
            obstacles[i].visible = true
         }
    }

    /* Collision Detection */
    

    checkCollisions();
    
    // motion logic for obstacles
    for (let i of obstacles){
        i.position.z += velocity;
        if (i.position.z > 1.0) {
            i.position.x = rand(-20, 20)
            i.position.y = rand(-5, 20)
            i.position.z = rand(nearDist, farDist);   
        }
    }
    // motion for particles
    for(let particle of particles){
        if(particle.position.x == 0 && particle.position.y == 0){
            // no dead-center particles
            particle.position.set(rand(-20,20), rand(-10, 10), rand(-20,-100));
        }
        particle.position.z += velocity * 4;
        // z boundary
        if(particle.position.z > 1){
            particle.position.set(rand(-20,20), rand(-10, 10), rand(-20,-100));
        }
    }
    // motion logic for stars
    for(let star of stars){
        star.position.z += velocity/100;
        star.rotation.x += 0.01;
        star.rotation.y += 0.01;
        if(star.position.z > 1){
            star.position.set(rand(-20, 20), rand(-20, 20), rand(-10,-30));
            //star.position.set(rand(-20, 20), rand(-5, 5), rand(-10,-50));
        }

    }
    renderer.clear();
    composer.render();
    camera.updateProjectionMatrix();
    gameOver ? displayEndingScreen() : requestAnimationFrame(gameLoop);
}