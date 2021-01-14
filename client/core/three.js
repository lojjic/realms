export * from 'https://cdn.jsdelivr.net/npm/three@0.124.0/build/three.module.js';
export { BufferGeometryUtils } from 'https://cdn.jsdelivr.net/npm/three@0.124.0/examples/jsm/utils/BufferGeometryUtils.js';

// Hack to get a THREE global for use by addon scripts that expect it
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124.0/build/three.module.js'
window.THREE = THREE

