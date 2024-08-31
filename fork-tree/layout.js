// Command and result codes
const CMD_INITIALIZE_LAYOUT = 0;
const CMD_OPTIMIZE_LAYOUT = 1;
const RES_INITIAL_LAYOUT = 0;
const RES_UPDATED_LAYOUT = 1;

// Graph layout settings
const NODE_POOL_RADIUS = 100.0;
const NODE_CLUSTER_SPREAD = 0.75;
const START_EDGE_LENGTH = 0.5935;

var shaderInfo;
var shaderLinks;
var numEdges;

String.prototype.hashCode = function() {
    var hash = 0;
    for (var i = 0; i < this.length; i++) hash = (((hash << 5) - hash) + this.charCodeAt(i)) & 0xffffffff;
    return hash;
};

function generateEdgePositions(nodePositions) {
    var edgePositions = new Float32Array(numEdges * 4);
    var edgeOffs = 0;
    for (var i = 0; i < shaderLinks.length; i++) {
        var startNodeOffs = i * 2;
        for (var j of shaderLinks[i].childIndices) {
            var endNodeOffs = j * 2;
            edgePositions[edgeOffs    ] = nodePositions[startNodeOffs    ];
            edgePositions[edgeOffs + 1] = nodePositions[startNodeOffs + 1];
            edgePositions[edgeOffs + 2] = nodePositions[  endNodeOffs    ];
            edgePositions[edgeOffs + 3] = nodePositions[  endNodeOffs + 1];
            edgeOffs += 4;
        }
    }

    return edgePositions;
}

function generateSubLayout(nodePositions, links, nodeIndex, edgeAngle, edgeLength) {
    var nodeX = nodePositions[nodeIndex * 2    ];
    var nodeY = nodePositions[nodeIndex * 2 + 1];
    for (var childIndex of links[nodeIndex].childIndices) {
        var childAngle = edgeAngle + (Math.random() * 2 - 1) * NODE_CLUSTER_SPREAD;
        nodePositions[childIndex * 2    ] = nodeX + Math.cos(childAngle) * edgeLength;
        nodePositions[childIndex * 2 + 1] = nodeY + Math.sin(childAngle) * edgeLength;
        generateSubLayout(nodePositions, links, childIndex, childAngle, edgeLength);
    }
}

function initializeLayout(command) {
    shaderInfo = command.shaderInfo;
    shaderLinks = command.shaderLinks;

    // Precompute total number of edges
    numEdges = 0;
    for (var link of shaderLinks) numEdges += link.childIndices.length;

    // Generate random initial tree layouts
    var nodePositions = new Float32Array(shaderInfo.length * 2);
    for (var i = 0; i < shaderInfo.length; i++) {
        if (shaderLinks[i].parentIndex < 0) {
            var x, y;
            do { // Fast and simple rejection sampling (27.32% chance of continuing)
                x = Math.random() * 2 - 1;
                y = Math.random() * 2 - 1;
            } while (x * x + y * y > 1);

            nodePositions[i * 2    ] = x * NODE_POOL_RADIUS;
            nodePositions[i * 2 + 1] = y * NODE_POOL_RADIUS;
            generateSubLayout(nodePositions, shaderLinks, i, Math.random() * 2 * Math.PI, START_EDGE_LENGTH);
        }
    }

    // Generate colors for each node identifying the corresponding shader's creator
    var nodeColors = new Float32Array(shaderInfo.length * 3);
    for (var i = 0; i < shaderInfo.length; i++) {
        var creatorHash = shaderInfo[i].creator.hashCode();
        nodeColors[i * 3    ] = (((creatorHash >>  8) & 0xff) ^ (creatorHash & 0xff)) / 255;
        nodeColors[i * 3 + 1] = (((creatorHash >> 16) & 0xff) ^ (creatorHash & 0xff)) / 255;
        nodeColors[i * 3 + 2] = (((creatorHash >> 24) & 0xff) ^ (creatorHash & 0xff)) / 255;
    }

    // Copy node positions into a buffer in pairs by edge
    var edgePositions = generateEdgePositions(nodePositions);

    postMessage({
        type: RES_INITIAL_LAYOUT,
        nodePositions: nodePositions,
        nodeColors: nodeColors,
        edgePositions: edgePositions
    }, [
        nodePositions.buffer,
        nodeColors.buffer,
        edgePositions.buffer
    ]);
}

function optimizeLayout(command) {
    console.log("COMMAND:OPTIMIZE: [" + command.nodePositions.join(", ") + "]");
}

onmessage = function(event) {
    var command = event.data;
    if (command.type == CMD_INITIALIZE_LAYOUT) initializeLayout(command);
    else if (command.type == CMD_OPTIMIZE_LAYOUT) optimizeLayout(command);
};