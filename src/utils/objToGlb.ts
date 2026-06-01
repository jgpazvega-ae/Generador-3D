export async function convertObjToGlb(objBlob: Blob): Promise<Blob> {
  const THREE = await import('three');
  const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');

  const objText = await objBlob.text();
  const loader = new OBJLoader();
  const object = loader.parse(objText);

  // Center the object at origin
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  object.position.sub(center);

  // Normalize scale to fit in a unit cube
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) object.scale.setScalar(1 / maxDim);

  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(
      object,
      (result) => resolve(new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' })),
      (err) => reject(err),
      { binary: true },
    );
  });
}
