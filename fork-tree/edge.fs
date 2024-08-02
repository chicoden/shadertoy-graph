#version 100

precision mediump float;

uniform vec3 edgeColor;

void main() {
    gl_FragColor = vec4(edgeColor, 1.0);
}
