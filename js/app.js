// localStorage.clear();

/* -----------Global Constants----------- */
const maxHighScores = 5, obstacleHardCap = 100, starMax = 50;
const obstacles = [], stars = [];

const player = {
    health: null,
    model: null,
}

const audio = {};

/* -----------Global Variables----------- */
let scene, camera, renderer;
let pointLight;
let clock, keyboard,  velocity, acceleration;
let gameOver, score, highScores, initials;
let nearDist, farDist;
let obstacleMax, particles;
let firstTry;

let splashScene, splashCamera, splashRenderer, splashMesh;
let splashComposer, splashRenderScene, splashBloom;

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

const songInfo = document.querySelector('#data-song');
const splashCanvas = document.querySelector('#splash-graphic')

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
initSplash();
// splash();
/* ------------ */

function init(){

    highScores = JSON.parse(localStorage.getItem('scores')) || [];
    localStorage.setItem('scores', JSON.stringify(highScores));

    updateScoresOverlay();
    nearDist = -20;
    farDist = -40;

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
        player.model = gltf.scene.children[0];
        player.model.castShadow = true;
        player.model.receiveShadow = true;
        player.model.position.z = -5.0;
        scene.add(player.model);
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

    // stars
    for(let i = 0; i < starMax; i++){
        let size = randFloat(0.01, 0.1);
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(size, size, size),
            new THREE.MeshNormalMaterial({wireframe: true})
        );
        mesh.position.set(rand(-20, 20), rand(-20, 20), rand(-10,-30))
        // mesh.position.set(0,0,-6);
        mesh.name = 'star'
        stars.push(mesh)
        scene.add(mesh);
    }

    // obstacles
    obstacleMax = 0;
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
    scene.add(new THREE.AmbientLight(0xDEDEDE))

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

    firstTry = true;
    playAudio();
    // call gameLoop in a second
    setTimeout(gameLoop, 500);
}

function gameLoop(){
    pointLight.lookAt(camera)
    score = ~~clock.getElapsedTime();
    bloomTweak();

    if(firstTry){
        intro();
    }

    runningScore.innerHTML = `SCORE: ${score}`

    songDisplay();
    updateShields();

    if ( player.health <= 0 ){
        gameOver = true;
    }
    keyControls();

    // motion 101
    velocity += acceleration
    if(velocity > 10){
        velocity = 10;
    }

    // remesh effect
    if(score > 60 && score % 31 === 0) remesher(2000)

    // difficulty scaling
    if(score >= 60) rotator();
    if(score >= 90) nearReduce();
    
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
    for (let i of obstacles) {
        i.position.z += velocity;
        if (i.position.z > .1) {
            if(!i.override) {
                i.material = new THREE.MeshLambertMaterial({color: randomColor(), transparent: true, opacity: randFloat(.60, .80)})
            }
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
        if(particle.position.z > .1){
            particle.position.set(rand(-20,20), rand(-10, 10), rand(-20,-100));
        }
    }
    // motion logic for stars
    for(let star of stars){
        star.rotation.z += velocity/10;
        star.rotation.x += 0.01;
        star.rotation.y += 0.01;
    }

    renderer.clear();
    composer.render();
    camera.updateProjectionMatrix();
    gameOver ? displayEndingScreen() : requestAnimationFrame(gameLoop);
}