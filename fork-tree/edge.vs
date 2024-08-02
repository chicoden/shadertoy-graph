#version 100

precision highp float;

uniform float invAspectRatio;
uniform vec2 graphPos;
uniform float graphScale;
uniform float edgeWidth;
uniform float headWidth;
uniform float headLength;
uniform float targetNodeSize;

attribute vec2 edgeVertex;
attribute vec4 edgePosition;

void main() {
    vec2 edgeVector = edgePosition.zw - edgePosition.xy;
    float edgeLength = length(edgeVector);
    edgeVector /= edgeLength;
    edgeLength -= headLength + targetNodeSize;

    gl_Position = vec4(edgeVertex, 0.0, 1.0);
    gl_Position.x *= gl_Position.x < 0.0 ? edgeLength : headLength;
    gl_Position.y *= abs(gl_Position.y) < 1.0 ? edgeWidth * 2.0 : headWidth * 0.8;
    gl_Position.x += edgeLength;
    gl_Position.xy = mat2(edgeVector, -edgeVector.y, edgeVector.x) * gl_Position.xy + edgePosition.xy;

    gl_Position.xy = (gl_Position.xy + graphPos) * graphScale;
    gl_Position.x *= invAspectRatio;
}
