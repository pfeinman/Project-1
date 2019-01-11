const splashParams = {
    bloomStrength: 1.0
}

const splash = () => {
    requestAnimationFrame(splash)

    splashMesh.rotation.x += 0.02;
    splashMesh.rotation.y += 0.02;
    splashBloom.bloomStrength = Math.abs(Math.cos(Date.now()))

    splashComposer.render(splashScene, splashCamera)
};

const initSplash = () => {
    randomTitle();
    welcomeScreen.style.visibility = 'visible';
    highScoreHUD.style.visibility = 'hidden';
    
    splashScene = new THREE.Scene();

    splashCamera = new THREE.PerspectiveCamera(35, splashCanvas.clientWidth / splashCanvas.clientHeight, 0.1, 1000)
    splashCamera.position.set(0,0,5)
    splashRenderer = new THREE.WebGLRenderer({antialias: true, canvas: splashCanvas});
    splashRenderer.setSize(splashCanvas.clientWidth, splashCanvas.clientHeight)


    splashMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1,1,1),
        new THREE.MeshNormalMaterial({wireframe: true})
    );
    splashMesh.position.set(0,0,0)
    splashScene.add(splashMesh)

    splashRenderScene = new THREE.RenderPass(splashScene, splashCamera);
    splashBloom = new THREE.UnrealBloomPass(new THREE.Vector2(splashCanvas.clientWidth, splashCanvas.clientHeight), 1.5, 0.5, 0.85 );
    splashBloom.renderToScreen = true;
    splashBloom.exposure = 1;
    splashBloom.bloomStrength = 1;
    splashBloom.threshold = 0;
    splashBloom.radius = 0;

    splashComposer = new THREE.EffectComposer(splashRenderer);
    splashComposer.setSize(splashCanvas.clientWidth, splashCanvas.clientHeight);
    splashComposer.addPass(splashRenderScene);
    splashComposer.addPass(splashBloom)

    audioLoader();
    splash();
}