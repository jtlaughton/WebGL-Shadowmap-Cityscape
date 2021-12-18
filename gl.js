import layerVertShaderSrc from './layerVert.glsl.js';
import layerFragShaderSrc from './layerFrag.glsl.js';
import shadowFragShaderSrc from './shadowFrag.glsl.js';
import shadowVertShaderSrc from './shadowVert.glsl.js';
import depthFragShaderSrc from './depthFrag.glsl.js';
import depthVertShaderSrc from './depthVert.glsl.js';

var gl;

var layers = null
var renderToScreen = null;
var fbo = null;
var currRotate = 0;
var currLightRotate = 0;
var currLightDirection = null;
var currZoom = 1.0;
var currProj = 'perspective';
var currResolution = 8192;
var displayShadowmap = false;

/*
    FBO
*/
class FBO {
    constructor(size) {
        // TODO: Create FBO and texture with size
        this.size = size;

        this.texture = createTexture2D(gl, this.size, this.size, gl.DEPTH_COMPONENT32F, 0, gl.DEPTH_COMPONENT, gl.FLOAT, null, gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);

        this.fbo = createFBO(gl, gl.DEPTH_ATTACHMENT, this.texture);
    }

    start() {
        // TODO: Bind FBO, set viewport to size, clear depth buffer
   
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
        gl.viewport(0, 0, this.size, this.size);
        gl.clearDepth(1.0);
        gl.clear(gl.DEPTH_BUFFER_BIT);
    }

    stop() {
        // TODO: unbind FBO
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
}

/*
    Shadow map
*/
class ShadowMapProgram {
    constructor() {
        this.vertexShader = createShader(gl, gl.VERTEX_SHADER, shadowVertShaderSrc);
        this.fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, shadowFragShaderSrc);
        this.program = createProgram(gl, this.vertexShader, this.fragmentShader);

        this.posAttribLoc = gl.getAttribLocation(this.program, "position");
        this.colorAttribLoc = gl.getUniformLocation(this.program, "uColor");
        this.modelLoc = gl.getUniformLocation(this.program, "uModel");
        this.projectionLoc = gl.getUniformLocation(this.program, "uProjection");
        this.viewLoc = gl.getUniformLocation(this.program, "uView");
        this.lightViewLoc = gl.getUniformLocation(this.program, "uLightView");
        this.lightProjectionLoc = gl.getUniformLocation(this.program, "uLightProjection");
        this.samplerLoc = gl.getUniformLocation(this.program, "uSampler");
        this.hasNormalsAttribLoc = gl.getUniformLocation(this.program, "uHasNormals");
        this.lightDirAttribLoc = gl.getUniformLocation(this.program, "uLightDir");
    }

    use() {
        gl.useProgram(this.program);
    }
}

/*
    Render to screen program
*/
// RenderToScreenProgram
class RenderToScreenProgram {
    constructor() {
        this.vertexShader = createShader(gl, gl.VERTEX_SHADER, depthVertShaderSrc);
        this.fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, depthFragShaderSrc);

        this.program = createProgram(gl, this.vertexShader, this.fragmentShader);
        this.posAttribLoc = gl.getAttribLocation(this.program, "position");
        this.samplerLoc = gl.getUniformLocation(this.program, "uSampler");

        this.vert = [-1, -1, 0, 1, -1, 0, 1, 1, 0, 1, 1, 0, -1, 1, 0, -1, -1, 0];
        this.vertexBuffer = createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(this.vert));
        this.vao = createVAO(gl, this.posAttribLoc, this.vertexBuffer);
    }

    draw(texture) {
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.useProgram(this.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(this.samplerLoc, 0);
        gl.bindVertexArray(this.vao);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}

/*
    Layer program
*/
class LayerProgram {
    constructor() {
        this.vertexShader = createShader(gl, gl.VERTEX_SHADER, layerVertShaderSrc);
        this.fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, layerFragShaderSrc);
        this.program = createProgram(gl, this.vertexShader, this.fragmentShader);

        this.posAttribLoc = gl.getAttribLocation(this.program, "position");
        this.colorAttribLoc = gl.getUniformLocation(this.program, "uColor");
        this.modelLoc = gl.getUniformLocation(this.program, "uModel");
        this.projectionLoc = gl.getUniformLocation(this.program, "uProjection");
        this.viewLoc = gl.getUniformLocation(this.program, "uView");
    }

    use() {
        gl.useProgram(this.program);
    }
}


/*
    Collection of layers
*/
class Layers {
    constructor() {
        this.layers = {};
        this.centroid = [0,0,0];
    }

    addLayer(name, vertices, indices, color, normals) {
        if(normals == undefined)
            normals = null;
        var layer = new Layer(vertices, indices, color, normals);
        layer.init();
        this.layers[name] = layer;
        this.centroid = this.getCentroid();
    }

    removeLayer(name) {
        delete this.layers[name];
    }

    draw(modelMatrix, viewMatrix, projectionMatrix, lightViewMatrix = null, lightProjectionMatrix = null, shadowPass = false, texture = null) {
        for(var layer in this.layers) {
            if(layer == 'surface') {
                gl.polygonOffset(1, 1);
            }
            else {
                gl.polygonOffset(0, 0);
            }
            this.layers[layer].draw(modelMatrix, viewMatrix, projectionMatrix, lightViewMatrix, lightProjectionMatrix, shadowPass, texture);
        }
    }

    
    getCentroid() {
        var sum = [0,0,0];
        var numpts = 0;

        for(var layer in this.layers) {
            numpts += this.layers[layer].vertices.length/3;
            for(var i=0; i<this.layers[layer].vertices.length; i+=3) {
                var x = this.layers[layer].vertices[i];
                var y = this.layers[layer].vertices[i+1];
                var z = this.layers[layer].vertices[i+2];
    
                sum[0]+=x;
                sum[1]+=y;
                sum[2]+=z;
            }
        }

        return [sum[0]/numpts,sum[1]/numpts,sum[2]/numpts];
    }
}

/*
    Layers without normals (water, parks, surface)
*/
class Layer {
    constructor(vertices, indices, color, normals = null) {
        this.vertices = vertices;
        this.indices = indices;
        this.color = color;
        this.normals = normals;

        this.hasNormals = false;
        if(this.normals) {
            this.hasNormals = true;
        }

        console.log(this.hasNormals);
    }

    init() {
        this.layerProgram = new LayerProgram();
        this.shadowProgram = new ShadowMapProgram();

        this.vertexBuffer = createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(this.vertices));
        this.indexBuffer = createBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.indices));

        if(this.normals) {
            this.normalBuffer = createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(this.normals));
            this.vao = createVAO(gl, 0, this.vertexBuffer, 1, this.normalBuffer);
        }
        else {
            this.vao = createVAO(gl, 0, this.vertexBuffer);
        }
    }

    draw(modelMatrix, viewMatrix, projectionMatrix, lightViewMatrix, lightProjectionMatrix, shadowPass = false, texture = null) {
        // TODO: Handle shadow pass (using ShadowMapProgram) and regular pass (using LayerProgram)
        
        if(!shadowPass){
            this.layerProgram.use();

            gl.uniform4fv(this.layerProgram.colorAttribLoc, new Float32Array(this.color));
            gl.uniformMatrix4fv(this.layerProgram.modelLoc, false, new Float32Array(modelMatrix));
            gl.uniformMatrix4fv(this.layerProgram.projectionLoc, false, new Float32Array(lightProjectionMatrix));
            gl.uniformMatrix4fv(this.layerProgram.viewLoc, false, new Float32Array(lightViewMatrix));

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
        }
        else{
            this.shadowProgram.use();

            gl.uniform4fv(this.shadowProgram.colorAttribLoc, new Float32Array(this.color));
            gl.uniform3fv(this.shadowProgram.lightDirAttribLoc, new Float32Array(currLightDirection));
            gl.uniformMatrix4fv(this.shadowProgram.modelLoc, false, new Float32Array(modelMatrix));
            gl.uniformMatrix4fv(this.shadowProgram.projectionLoc, false, new Float32Array(projectionMatrix));
            gl.uniformMatrix4fv(this.shadowProgram.viewLoc, false, new Float32Array(viewMatrix));
            gl.uniformMatrix4fv(this.shadowProgram.lightProjectionLoc, false, new Float32Array(lightProjectionMatrix));
            gl.uniformMatrix4fv(this.shadowProgram.lightViewLoc, false, new Float32Array(lightViewMatrix));
            gl.uniform1i(this.shadowProgram.hasNormalsAttribLoc, this.hasNormals);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.uniform1i(this.shadowProgram.samplerLoc, 0);
        }
        
        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_INT, 0);
    }
}

/*
    Event handlers
*/
window.updateRotate = function() {
    currRotate = parseInt(document.querySelector("#rotate").value);
    currRotate = (Math.PI / 180) * currRotate;
}

window.updateLightRotate = function() {
    currLightRotate = parseInt(document.querySelector("#lightRotate").value);
    currLightRotate = (Math.PI / 180) * currLightRotate;
}

window.updateZoom = function() {
    currZoom = parseFloat(document.querySelector("#zoom").value);
}

window.updateProjection = function() {
    currProj = document.querySelector("#projection").value;
}

window.displayShadowmap = function(e) {
    displayShadowmap = e.checked;
}

/*
    File handler
*/
window.handleFile = function(e) {
    var reader = new FileReader();
    reader.onload = function(evt) {
        var parsed = JSON.parse(evt.target.result);
        for(var layer in parsed){
            var aux = parsed[layer];
            layers.addLayer(layer, aux['coordinates'], aux['indices'], aux['color'], aux['normals']);
        }
    }
    reader.readAsText(e.files[0]);
}

/*
    Update transformation matrices
*/
function updateModelMatrix(centroid) {
    return identityMatrix();
}

function updateProjectionMatrix() {
    // TODO: Projection matrix
    var projectionMatrix = identityMatrix();

    var aspect = window.innerWidth / window.innerHeight;
    if(currProj == 'perspective'){
      projectionMatrix = perspectiveMatrix(45.0 * Math.PI / 180.0, aspect, 1, 9000);
    }
    else if(currProj == 'orthographic'){
      projectionMatrix = multiplyArrayOfMatrices(
        [
          orthographicMatrix(-gl.canvas.clientWidth/(2), gl.canvas.clientWidth/(2), -gl.canvas.clientHeight/(2), gl.canvas.clientHeight/(2), 0, 10000),
          scaleMatrix(currZoom/4, currZoom/4, currZoom/4)
        ]
      );
    }

    return projectionMatrix;
}

function updateViewMatrix(centroid){
    // TODO: View matrix
    var camPosX = (2500 - centroid[0]);
    var camPosY = (-2500 - centroid[1]);
    var tempX = Math.cos(currRotate)*camPosX - Math.sin(currRotate)*camPosY;
    var tempY = Math.sin(currRotate)*camPosX + Math.cos(currRotate)*camPosY;

    var cameraPosition = [((1 /currZoom) * tempX) + centroid[0], ((1 / currZoom) * tempY) + centroid[1], (1 /currZoom) * 5000];

    var lookMatrix = lookAt(cameraPosition, centroid, [0,0,1]);

    return lookMatrix;
}

function updateLightViewMatrix(centroid) {
    // TODO: Light view matrix
    var lightPosX = (2500 - centroid[0]);
    var lightPosY = (-2500 - centroid[1]);
    var tempX = Math.cos(currLightRotate)*lightPosX - Math.sin(currLightRotate)*lightPosY;
    var tempY = Math.sin(currLightRotate)*lightPosX + Math.cos(currLightRotate)*lightPosY;

    var lightPosition = sub(add(centroid, [tempX, tempY, 2500]),centroid);
    currLightDirection = normalize(sub(add(centroid, [tempX, tempY, 2500]),centroid));

    var lookMatrix = lookAt(lightPosition, centroid, [0,0,1]);

    return lookMatrix;
}

function updateLightProjectionMatrix() {
    // TODO: Light projection matrix
    var lightProjectionMatrix;

    var curBounds = 2900;
    var curFar = 7000;
    lightProjectionMatrix = orthographicMatrix(-curBounds, curBounds, -curBounds, curBounds, -1, curFar);
    return lightProjectionMatrix;
}

/*
    Main draw function (should call layers.draw)
*/
function draw() {

    gl.clearColor(190/255, 210/255, 215/255, 1);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // TODO: First rendering pass, rendering using FBO
    var centroid = layers.getCentroid();

    var modelMatrix = updateModelMatrix(centroid);
    var lightProj = updateLightProjectionMatrix();
    var proj = updateProjectionMatrix();

    var lightView = updateLightViewMatrix(centroid);
    var view = updateViewMatrix(centroid);

    fbo.start();
    layers.draw(modelMatrix, view, proj, lightView, lightProj, false, null);
    fbo.stop();

    if(!displayShadowmap) {
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // TODO: Second rendering pass, render to screen
        layers.draw(modelMatrix, view, proj, lightView, lightProj, true, fbo.texture);
    }
    else {
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // TODO: Render shadowmap texture computed in first pass
        renderToScreen.draw(fbo.texture, modelMatrix, proj, view);
    }

    requestAnimationFrame(draw);

}

/*
    Initialize everything
*/
function initialize() {

    var canvas = document.querySelector("#glcanvas");
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    gl = canvas.getContext("webgl2");

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);

    gl.enable(gl.POLYGON_OFFSET_FILL);

    layers = new Layers();
    fbo = new FBO(currResolution);
    renderToScreen = new RenderToScreenProgram();

    window.requestAnimationFrame(draw);

}


window.onload = initialize;