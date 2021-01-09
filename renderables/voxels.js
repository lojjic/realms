import {
  BoxBufferGeometry,
  BufferGeometryUtils,
  BufferAttribute,
  Color,
  DynamicDrawUsage,
  Frustum,
  InstancedBufferGeometry,
  InstancedBufferAttribute,
  Matrix4,
  Mesh,
  ShaderLib,
  ShaderMaterial,
  Sphere,
  UniformsUtils,
  Vector3,
} from '../core/three.js';

class Voxels extends Mesh {
  static setupMaterial() {
    const { uniforms, vertexShader, fragmentShader } = ShaderLib.basic;
    Voxels.material = new ShaderMaterial({
      uniforms: {
        ...UniformsUtils.clone(uniforms),
        ambientLight: { value: new Color() },
        lightChannel1: { value: new Color() },
        lightChannel2: { value: new Color() },
        lightChannel3: { value: new Color() },
        lightChannel4: { value: new Color() },
      },
      vertexShader: vertexShader
        .replace(
          '#include <common>',
          [
            '#include <common>',
            'attribute vec4 lighting;',
            'attribute vec3 offset;',
            'uniform vec3 ambientLight;',
            'uniform vec3 lightChannel1;',
            'uniform vec3 lightChannel2;',
            'uniform vec3 lightChannel3;',
            'uniform vec3 lightChannel4;',
          ].join('\n')
        )
        .replace(
          '#include <color_vertex>',
          [
            '#include <color_vertex>',
            'vColor.xyz /= 255.0;',
            'vColor.xyz *= max( ambientLight, pow(lighting.x / 255.0, 2.0) * lightChannel1 + pow((lighting.y / 255.0), 2.0) * lightChannel2 + pow((lighting.z / 255.0), 2.0) * lightChannel3 + pow((lighting.w / 255.0), 2.0) * lightChannel4 );',
          ].join('\n')
        )
        .replace(
          '#include <begin_vertex>',
          [
            `vec3 transformed = vec3( position * ${Voxels.scale} + offset );`,
          ].join('\n')
        ),
      fragmentShader,
      fog: true,
      vertexColors: true,
    });
  }

  static setupOffsets({
    width,
    height,
    depth,
    intersectRadius = 1,
    renderRadius,
  }) {
    const { scale } = Voxels;
    const intersects = [];
    const spheres = [];
    const center = new Vector3(width * 0.5 * scale, height * 0.5 * scale, depth * 0.5 * scale);
    const radius = center.length();
    const vector = new Vector3();
    for (let z = -renderRadius, i = 0, j = 0; z <= renderRadius; z += 1) {
      for (let y = -renderRadius; y <= renderRadius; y += 1) {
        for (let x = -renderRadius; x <= renderRadius; x += 1) {
          if (vector.set(x, y, z).length() >= renderRadius) {
            // eslint-disable-next-line no-continue
            continue;
          }
          const offset = new Vector3(x * width * scale, y * height * scale, z * depth * scale);
          const sphere = new Sphere(offset.clone().add(center), radius);
          sphere.offset = offset;
          spheres[i] = sphere;
          i += 1;
          if (
            x >= -intersectRadius && x <= intersectRadius
            && y >= -intersectRadius && y <= intersectRadius
            && z >= -intersectRadius && z <= intersectRadius
          ) {
            const mesh = new Mesh();
            mesh.position.copy(offset);
            mesh.updateMatrixWorld();
            mesh.matrixAutoUpdate = false;
            intersects[j] = mesh;
            j += 1;
          }
        }
      }
    }
    Voxels.intersects = intersects;
    Voxels.offsets = new InstancedBufferAttribute(new Float32Array(spheres.length * 3), 3);
    Voxels.offsets.setUsage(DynamicDrawUsage);
    Voxels.spheres = spheres;
  }

  static updateLighting({
    ambient,
    light1,
    light2,
    light3,
    light4,
  }) {
    if (!Voxels.material) {
      Voxels.setupMaterial();
    }
    const { material: { uniforms } } = Voxels;
    if (ambient) uniforms.ambientLight.value.copy(ambient);
    if (light1) uniforms.lightChannel1.value.copy(light1);
    if (light2) uniforms.lightChannel2.value.copy(light2);
    if (light3) uniforms.lightChannel3.value.copy(light3);
    if (light4) uniforms.lightChannel4.value.copy(light4);
  }

  static updateIntersects(boxes) {
    const { vector } = Voxels.aux;
    const geometry = BufferGeometryUtils.mergeBufferGeometries(
      [...Array(boxes.length / 6)].map((v, i) => {
        const [x, y, z, sx, sy, sz] = boxes.slice(i * 6);
        vector
          .set(
            x + sx * 0.5,
            y + sy * 0.5,
            z + sz * 0.5
          )
          .multiplyScalar(Voxels.scale);
        const box = new BoxBufferGeometry(sx * Voxels.scale, sy * Voxels.scale, sz * Voxels.scale);
        box.translate(vector.x, vector.y, vector.z);
        return box;
      })
    );
    geometry.computeBoundingSphere();
    Voxels.intersects.forEach((intersect) => {
      intersect.geometry = geometry;
    });
  }

  static updateOffsets(camera) {
    const { frustum, matrix } = Voxels.aux;
    const { spheres, offsets } = Voxels;
    matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(matrix);
    let visible = 0;
    spheres.forEach((sphere) => {
      if (frustum.intersectsSphere(sphere)) {
        const { offset } = sphere;
        const i = visible * 3;
        offsets.array[i] = offset.x;
        offsets.array[i + 1] = offset.y;
        offsets.array[i + 2] = offset.z;
        visible += 1;
      }
    });
    offsets.visible = visible;
    offsets.needsUpdate = true;
  }

  constructor() {
    if (!Voxels.material) {
      Voxels.setupMaterial();
    }
    const geometry = new InstancedBufferGeometry();
    geometry.setAttribute('offset', Voxels.offsets);
    super(geometry, Voxels.material);
    this.frustumCulled = false;
    this.matrixAutoUpdate = false;
  }

  update({
    color,
    lighting,
    position,
    index,
  }) {
    if (!position.length) {
      this.visible = false;
      return;
    }
    const { geometry } = this;
    geometry.setAttribute('color', new BufferAttribute(color, 3));
    geometry.setAttribute('lighting', new BufferAttribute(lighting, 4));
    geometry.setAttribute('position', new BufferAttribute(position, 3));
    geometry.setIndex(new BufferAttribute(index, 1));
    this.visible = true;
  }
}

Voxels.aux = {
  frustum: new Frustum(),
  matrix: new Matrix4(),
  vector: new Vector3(),
};

Voxels.scale = 0.5;

export default Voxels;
