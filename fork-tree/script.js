// Value between 0 and 1 that controls zoom speed
// Smaller -> faster, bigger -> slower
const ZOOM_SCALE_FACTOR = 0.99;

// Graph layout settings
const NODE_POOL_RADIUS = 100.0;
const NODE_CLUSTER_SPREAD = 0.75;
const START_EDGE_LENGTH = 0.5935;

// Uniforms to play around with
const NODE_SIZE = 0.04;
const EDGE_WIDTH = 0.005;
const EDGE_HEAD_WIDTH = 0.015;
const EDGE_HEAD_LENGTH = 0.035;
const EDGE_COLOR = [1.0, 1.0, 1.0];

const nodeGeometry = new Float32Array([
     0.000000,  0.000000,
     1.000000,  0.000000,
     0.994869,  0.101168,
     0.979530,  0.201299,
     0.954139,  0.299363,
     0.918958,  0.394356,
     0.874347,  0.485302,
     0.820763,  0.571268,
     0.758758,  0.651372,
     0.688967,  0.724793,
     0.612106,  0.790776,
     0.528964,  0.848644,
     0.440394,  0.897805,
     0.347305,  0.937752,
     0.250652,  0.968077,
     0.151428,  0.988468,
     0.050649,  0.998717,
    -0.050649,  0.998717,
    -0.151428,  0.988468,
    -0.250653,  0.968077,
    -0.347305,  0.937752,
    -0.440394,  0.897804,
    -0.528964,  0.848644,
    -0.612106,  0.790776,
    -0.688967,  0.724793,
    -0.758758,  0.651372,
    -0.820764,  0.571268,
    -0.874347,  0.485302,
    -0.918958,  0.394356,
    -0.954139,  0.299363,
    -0.979530,  0.201298,
    -0.994869,  0.101168,
    -1.000000, -0.000000,
    -0.994869, -0.101168,
    -0.979530, -0.201299,
    -0.954139, -0.299363,
    -0.918958, -0.394356,
    -0.874347, -0.485302,
    -0.820763, -0.571268,
    -0.758758, -0.651373,
    -0.688967, -0.724793,
    -0.612106, -0.790776,
    -0.528964, -0.848644,
    -0.440394, -0.897805,
    -0.347305, -0.937752,
    -0.250652, -0.968077,
    -0.151428, -0.988468,
    -0.050649, -0.998717,
     0.050649, -0.998717,
     0.151428, -0.988468,
     0.250653, -0.968077,
     0.347305, -0.937752,
     0.440394, -0.897805,
     0.528964, -0.848644,
     0.612106, -0.790776,
     0.688967, -0.724793,
     0.758758, -0.651372,
     0.820764, -0.571268,
     0.874347, -0.485302,
     0.918958, -0.394356,
     0.954139, -0.299363,
     0.979530, -0.201298,
     0.994869, -0.101168,
     1.000000,  0.000000
]);

const edgeGeometry = new Float32Array([
    -1.00,  0.50,
    -1.00, -0.50,
     0.00, -0.50,
     0.00, -0.50,
     0.00,  0.50,
    -1.00,  0.50,
     0.00,  1.25,
     0.00, -1.25,
     1.00,  0.00
]);

// Graph interaction state
var mouseIsDragging = false;
var dragStartX = 0.0;
var dragStartY = 0.0;
var graphOldPosX = 0.0;
var graphOldPosY = 0.0;
var graphPosX = 0.0;
var graphPosY = 0.0;
var graphScale = 1.0;

class ShaderProgram {
    constructor(gl, name, shaders, uniforms, attribs) {
        this.context = gl;
        this.program = gl.createProgram();
        this.uniforms = {};
        this.attribs = {};

        var compiledShaders = [];
        for (var desc of shaders) {
            var shader = gl.createShader(desc.type);
            gl.shaderSource(shader, desc.code);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                // Debug compilation errors and dispose of this shader
                console.log(name + ":" + desc.name + ":" + gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
            } else {
                gl.attachShader(this.program, shader);
                compiledShaders.push(shader);
            }
        }

        gl.linkProgram(this.program);
        if (compiledShaders.length != shaders.length || !gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            // Failed to compile some shaders and/or failed to link program
            // Make sure to clean everything up
            gl.deleteProgram(this.program);
            for (var shader of compiledShaders) gl.deleteShader(shader);
            this.program = null;
        } else {
            var foundAllLocs = true;

            // Cache uniform locations
            for (var uniform of uniforms) {
                if ((this.uniforms[uniform] = gl.getUniformLocation(this.program, uniform)) == null) {
                    // Uniform could not be located
                    console.log(name + ":ERROR: uniform \"" + uniform + "\" not found");
                    foundAllLocs = false;
                }
            }

            // Cache attribute locations
            for (var attrib of attribs) {
                if ((this.attribs[attrib] = gl.getAttribLocation(this.program, attrib)) < 0) {
                    // Attribute could not be located
                    console.log(name + ":ERROR: attribute \"" + attrib + "\" not found");
                    foundAllLocs = false;
                }
            }

            // The shaders have been copied into the program so we are now free to delete them
            for (var shader of compiledShaders) {
                gl.detachShader(this.program, shader);
                gl.deleteShader(shader);
            }

            if (!foundAllLocs) {
                gl.deleteProgram(this.program);
                this.program = null;
            }
        }
    }

    get compiled() {
        return this.program != null;
    }

    use() {
        this.context.useProgram(this.program);
    }

    delete() {
        this.context.deleteProgram(this.program);
    }
}

function createBuffer(gl, target, data, usage) {
    var buffer = gl.createBuffer();
    gl.bindBuffer(target, buffer);
    gl.bufferData(target, data, usage);
    return buffer;
}

window.addEventListener("load", async function main() {
    var canvas = document.querySelector("canvas");
    var gl = canvas.getContext("webgl");
    if (!gl) {
        alert("No WebGL for you :(");
        return;
    }

    var [
        shaderInfo,
        shaderLinks,
        nodeDrawingVertShader,
        nodeDrawingFragShader,
        edgeDrawingVertShader,
        edgeDrawingFragShader
    ] = await Promise.all([
        fetch("../starch_summary.json").then((response) => response.json()),
        fetch("../starch_links.json").then((response) => response.json()),
        fetch("node.vs").then((response) => response.text()),
        fetch("node.fs").then((response) => response.text()),
        fetch("edge.vs").then((response) => response.text()),
        fetch("edge.fs").then((response) => response.text())
    ]);

    var nodeDrawingProgram = new ShaderProgram(
        gl, "NodeDrawingProgram", [
            {
                name: "VertexShader",
                type: gl.VERTEX_SHADER,
                code: nodeDrawingVertShader
            }, {
                name: "FragmentShader",
                type: gl.FRAGMENT_SHADER,
                code: nodeDrawingFragShader
            }
        ], [
            "invAspectRatio",
            "graphPos",
            "graphScale",
            "nodeSize"
        ], [
            "nodeVertex",
            "nodePosition",
            "nodeColor"
        ]
    );

    var edgeDrawingProgram = new ShaderProgram(
        gl, "EdgeDrawingProgram", [
            {
                name: "VertexShader",
                type: gl.VERTEX_SHADER,
                code: edgeDrawingVertShader
            }, {
                name: "FragmentShader",
                type: gl.FRAGMENT_SHADER,
                code: edgeDrawingFragShader
            }
        ], [
            "invAspectRatio",
            "graphPos",
            "graphScale",
            "edgeWidth",
            "headWidth",
            "headLength",
            "targetNodeSize",
            "edgeColor"
        ], [
            "edgeVertex",
            "edgePosition"
        ]
    );

    if (!(nodeDrawingProgram.compiled && edgeDrawingProgram.compiled)) {
        nodeDrawingProgram.delete();
        edgeDrawingProgram.delete();
        console.log("fatal: failed to compile shaders");
        alert("Something went wrong :(");
        return;
    }

    //unsigned int nodeVertexBuffer = createBuffer(GL_ARRAY_BUFFER, sizeof(nodeVertices), nodeVertices, GL_STATIC_DRAW);
    //unsigned int nodePositionBuffer = createBuffer(GL_ARRAY_BUFFER, numNodes * 2 * sizeof(float), nodePositions, GL_DYNAMIC_DRAW);
    //unsigned int nodeColorBuffer = createBuffer(GL_ARRAY_BUFFER, numNodes * 3 * sizeof(float), nodeColors, GL_STATIC_DRAW);
    //unsigned int edgeVertexBuffer = createBuffer(GL_ARRAY_BUFFER, sizeof(edgeVertices), edgeVertices, GL_STATIC_DRAW);
    //unsigned int edgePositionBuffer = createBuffer(GL_ARRAY_BUFFER, numEdges * 4 * sizeof(float), NULL, GL_DYNAMIC_DRAW);
});