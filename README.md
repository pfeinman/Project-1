# Hyperspace Cube Dodger

## Technologies Used
- JavaScript, HTML, CSS
- Blender, Photoshop
- THREE.js by MrDoob (version 100)
    - WebGL Library
- GLTF Exporter 2.0 by Khronos Group
    - Used to export ship model with embedded textures
- Node HTTP-Server for development
  - Necessary to circumvent Chrome's cross-origin policy when importing 3D Models.

# Art Pipeline
1. Export UV Layout for Starship

Blender

![Blender UV Layout](images/README/blenderUV.png)

2. Import UV to Photoshop and hand-paint texture
![Photoshop UV Image](images/README/shipUV.png)

3. Reimport texture to Blender and use GLTF Metallic Roughness Shader for Material
![PBR Node](images/README/materialNodes.png)

4. Final export from Blender as .glb using [glTF Exporter 2.0](https://github.com/KhronosGroup/glTF-Blender-Exporter)



5. Load model to browser using [GLTFLoader](https://threejs.org/docs/#examples/loaders/GLTFLoader) and add it to THREE scene
```javascript
const loader = new THREE.GLTFLoader();
loader.load('models/starship.glb', (gltf) => {
    scene.add(gltf.scene)
})
```

6. Use THREE RenderPass and EffectComposer for real-time post processing
```javascript
const renderScene = new THREE.RenderPass(scene, camera)
const bloomPass = new THREE.UnrealBloomPass(...)
const composer = new THREE.EffectComposer(renderer);
...
composer.addPass(renderScene);
composer.addPass(bloomPass)
```
7. Final call to renderer (happens continuously):
```javascript
composer.render();
```

# Particles / Obstacles Logic
All geometries (aside from ship) are generated procedurally during initialization (no models)
```javascript
/* 10 particles */
mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);
```
The illusion of motion is implemented by incrementing z-positions by velocity, which increases with acceleration.

- +z => closer to near clip (camera) <br>
- -z => closer to far clip (further from camera)
```javascript
const acceleration = 0.001;
let velocity = 0.1;
velocity += acceleration;

for( let particle of particles ) {
    particle.position.z += velocity
}
```
Meshes are 'recycled' when they move behind the camera by giving them a random position closer to the far clip.
This gives the illusion of a continous stream of objects!



## Known Bugs / Unsolved Issues

# Collision Detection
- Due to 6 faulty collisions detected during initialization, player starts with 94% HP...

- Current collision detection logic means that the faster you move, the less damage you take...

## Icebox / Future Plans
- Implement lasers... pew pew.
- Custom GLSL shader for ship's booster/engine.