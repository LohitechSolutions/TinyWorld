import * as THREE from 'three'

export class ResourcePool {
  geometries: THREE.BufferGeometry[] = []
  materials: THREE.Material[] = []

  geo<T extends THREE.BufferGeometry>(geometry: T): T {
    this.geometries.push(geometry)
    return geometry
  }

  mat<T extends THREE.Material>(material: T): T {
    this.materials.push(material)
    return material
  }

  std(color: string | number, extras: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
    return this.mat(new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05, ...extras }))
  }

  dispose(): void {
    for (const geometry of this.geometries) geometry.dispose()
    for (const material of this.materials) material.dispose()
    this.geometries = []
    this.materials = []
  }
}

export function enableShadows(object: THREE.Object3D, cast = true, receive = true): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (mesh.isMesh) {
      mesh.castShadow = cast
      mesh.receiveShadow = receive
    }
  })
}
