import { WebIO, type Document, type Node } from '@gltf-transform/core';
import type { Measurements } from '../types';
import { UNIT_TO_METERS } from '../types';

/**
 * Reescala un GLB para que su bounding box coincida con las medidas reales
 * proporcionadas por el usuario. Esto hace que el modelo descargado tenga las
 * dimensiones físicas correctas en software CAD / impresión 3D.
 *
 * - Si se dan las 3 dimensiones (ancho/alto/profundo) aplica escala por eje
 *   (corrige proporciones que la IA pudo estimar mal).
 * - Si se dan menos, aplica escala uniforme basada en la dimensión disponible.
 *
 * Devuelve un Blob GLB nuevo, o null si no hay medidas suficientes.
 */
export async function scaleGlbToMeasurements(
  glbUrl: string,
  m: Measurements,
): Promise<Blob | null> {
  const factor = UNIT_TO_METERS[m.unit];
  const targetW = parseFloat(m.width) * factor || 0;
  const targetH = parseFloat(m.height) * factor || 0;
  const targetD = parseFloat(m.depth) * factor || 0;

  if (targetW <= 0 && targetH <= 0 && targetD <= 0) return null;

  const buffer = await fetch(glbUrl).then((r) => r.arrayBuffer());
  const io = new WebIO();
  const doc = await io.readBinary(new Uint8Array(buffer));

  const scene = doc.getRoot().listScenes()[0];
  if (!scene) return null;

  // Bounding box actual (en X, Y, Z) recorriendo la geometría con transforms.
  const box = computeSceneBounds(doc);
  if (!box) return null;

  const sizeX = box.max[0] - box.min[0];
  const sizeY = box.max[1] - box.min[1];
  const sizeZ = box.max[2] - box.min[2];

  // glTF: Y = alto, X = ancho, Z = profundidad
  let sx: number, sy: number, sz: number;

  const haveAll = targetW > 0 && targetH > 0 && targetD > 0;
  if (haveAll) {
    sx = sizeX > 1e-6 ? targetW / sizeX : 1;
    sy = sizeY > 1e-6 ? targetH / sizeY : 1;
    sz = sizeZ > 1e-6 ? targetD / sizeZ : 1;
  } else {
    // Escala uniforme con la primera medida disponible
    let f = 1;
    if (targetH > 0 && sizeY > 1e-6) f = targetH / sizeY;
    else if (targetW > 0 && sizeX > 1e-6) f = targetW / sizeX;
    else if (targetD > 0 && sizeZ > 1e-6) f = targetD / sizeZ;
    sx = sy = sz = f;
  }

  // Envolver los nodos raíz en un nodo con la escala aplicada.
  const wrapper = doc.createNode('measurement-scale').setScale([sx, sy, sz]);
  for (const child of scene.listChildren()) {
    scene.removeChild(child);
    wrapper.addChild(child);
  }
  scene.addChild(wrapper);

  // getAsset() devuelve la referencia viva del asset; se muta directamente.
  doc.getRoot().getAsset().generator = 'Generador-3D (escalado a medidas reales)';

  const out = await io.writeBinary(doc);
  return new Blob([out as BlobPart], { type: 'model/gltf-binary' });
}

interface Bounds {
  min: [number, number, number];
  max: [number, number, number];
}

/** Calcula el bounding box mundial recorriendo nodos y sus matrices. */
function computeSceneBounds(doc: Document): Bounds | null {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  let found = false;

  const scene = doc.getRoot().listScenes()[0];
  if (!scene) return null;

  const visit = (node: Node, parentMatrix: number[]) => {
    const local = node.getMatrix();
    const world = multiplyMat4(parentMatrix, local);

    const mesh = node.getMesh();
    if (mesh) {
      for (const prim of mesh.listPrimitives()) {
        const pos = prim.getAttribute('POSITION');
        if (!pos) continue;
        const arr = pos.getArray();
        if (!arr) continue;
        const count = pos.getCount();
        for (let i = 0; i < count; i++) {
          const v = transformPoint(world, [
            arr[i * 3],
            arr[i * 3 + 1],
            arr[i * 3 + 2],
          ]);
          for (let a = 0; a < 3; a++) {
            if (v[a] < min[a]) min[a] = v[a];
            if (v[a] > max[a]) max[a] = v[a];
          }
          found = true;
        }
      }
    }
    for (const child of node.listChildren()) visit(child, world);
  };

  for (const root of scene.listChildren()) visit(root, identityMat4());

  return found ? { min, max } : null;
}

function identityMat4(): number[] {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

// Multiplicación column-major (formato glTF)
function multiplyMat4(a: number[], b: number[]): number[] {
  const out = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + r] * b[c * 4 + k];
      }
      out[c * 4 + r] = sum;
    }
  }
  return out;
}

function transformPoint(
  m: number[],
  p: [number, number, number],
): [number, number, number] {
  const [x, y, z] = p;
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}
