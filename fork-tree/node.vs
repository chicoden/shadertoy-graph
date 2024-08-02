#version 100

precision highp float;

uniform float invAspectRatio;
uniform vec2 graphPos;
uniform float graphScale;
uniform float nodeSize;

attribute vec2 nodeVertex;
attribute vec2 nodePosition;
attribute vec3 nodeColor;

varying vec3 color;

void main() {
    gl_Position = vec4((nodeVertex * nodeSize + nodePosition + graphPos) * graphScale, 0.0, 1.0);
    gl_Position.x *= invAspectRatio;
    color = nodeColor;
}
