import * as THREE from "three";

const DEFAULT_ISO_ANGLE = Math.atan(1 / Math.SQRT2);

export interface IsoCameraConfig {
  frustumSize: number;
  near: number;
  far: number;
}

export function createIsometricCamera(
  aspect: number,
  config: IsoCameraConfig = { frustumSize: 24, near: 0.1, far: 1000 }
) {
  const { frustumSize, near, far } = config;
  const half = frustumSize * aspect / 2;
  const camera = new THREE.OrthographicCamera(-half, half, frustumSize / 2, -frustumSize / 2, near, far);
  camera.position.set(12, 12, 12);
  camera.lookAt(0, 0, 0);
  camera.rotation.order = "YXZ";
  camera.rotation.y = Math.PI / 4;
  camera.rotation.x = -DEFAULT_ISO_ANGLE;
  return camera;
}

export function updateIsoCameraZoom(camera: THREE.OrthographicCamera, aspect: number, zoom: number) {
  const baseFrustum = 24;
  const frustum = baseFrustum / zoom;
  const half = frustum * aspect / 2;
  camera.left = -half;
  camera.right = half;
  camera.top = frustum / 2;
  camera.bottom = -frustum / 2;
  camera.updateProjectionMatrix();
}
