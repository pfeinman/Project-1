// Global Variables
let scene, camera, renderer;

let clock, time;
let velocity, acceleration;
let shipModel, raycaster;
let keyboard, score, gameOver;
let controls;

let pointLight;

let stars;

const player = {
    health: null,
    model: null,
}

const audio = [];

// mobs
const enemies = [];
let obstacles = [];
let obstacleMax = 10;

// cached DOM Elements
const initScreen = document.querySelector('#initScreen');
const debugTxt = document.querySelector('#debug-data');
const endGame = document.querySelector('#endGame');
const shields = document.querySelector('#shields');
const shieldHUD = document.querySelector('#shieldHUD');
const shieldBar = document.querySelector('#bar');
const runningScore = document.querySelector('#runningScore');

// Post processing
const params = {
    exposure: 1.0,
    bloomStrength: 0.8,
    bloomThreshold: 0,
    bloodRadius: 0
}

let renderScene, bloomPass, composer;



init();
setTimeout(gameLoop, 1000);


function init(){

    audio.push(new Audio('audio/things.mp3'));
    
    initScreen.style.visibility = 'hidden';

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

    stars = new Array(30).fill(null);
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

    controls = new THREE.OrbitControls(camera, renderer.domElement);

    // post Processing
    renderScene = new THREE.RenderPass(scene, camera);
    bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.5, 0.85 );
    bloomPass.renderToScreen = true;
    bloomPass.threshold = params.bloomThreshold;
    bloomPass.strnegth = params.bloomStrength;
    bloomPass.radius = params.bloomRadius;

    composer = new THREE.EffectComposer(renderer);
    composer.setSize(window.innerWidth, window.innerHeight);
    composer.addPass(renderScene);
    composer.addPass(bloomPass)
}

function gameLoop(){
    audio[0].play();
    pointLight.lookAt(camera)
    shieldHUD.style.visibility = 'visible';
    time = ~~clock.getElapsedTime();
    score = time;

    runningScore.innerHTML = `SCORE: ${score}`
    shieldBar.style.width = `${player.health}%`;
    camera.lookAt(scene.position)

    if(player.health <= 0){
        gameOver = true;
    }
    
    keyControls();
    controls.update();

    // motion 101
    velocity += acceleration
    if(velocity > 10){
        velocity *= 0;
    }
    
    // faster = more obstacles
    if (obstacleMax >= obstacles.length-1 ) {
        obstacleMax = obstacles.length
    }
     else {
        obstacleMax = ~~(velocity*100)
     }
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

// function render(){
//     renderer.render(scene, camera);
// }

function endingScreen(){
    audio[0].pause();
    audio[0].currentTime = 0;
    clock.stop();
    score = time;
    endGame.innerHTML = `<p>GGWP<BR>SCORE: ${score}<p><button id="replay">Replay?</button>`;
    endGame.style.visibility = 'visible'
    velocity = 0.01;
    //clock.stop();
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
    if ( keyboard.pressed( 'space' ) ) {
        console.log('zap a laser')
    }
}

// fix proportions on window resize
window.addEventListener('resize', function(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    controls.update();
    composer.setSize(window.innerWidth, window.innerHeight)
    renderer.setSize(window.innerWidth, window.innerHeight);
}, false);

endGame.addEventListener('click', function(e){
    if(e.target.type === 'submit') replay();
})

function replay(){
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