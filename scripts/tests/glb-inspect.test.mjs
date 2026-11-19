import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectGlb } from '../glb-inspect.ts';

function makeGlb(json, binary = Buffer.alloc(4)) {
    const source = Buffer.from(JSON.stringify(json));
    const padding = Buffer.alloc((4 - source.length % 4) % 4, 32);
    const data = Buffer.concat([source, padding]);
    const file = Buffer.alloc(12 + 8 + data.length + (binary.length ? 8 + binary.length : 0));
    file.write('glTF');
    file.writeUInt32LE(2, 4);
    file.writeUInt32LE(file.length, 8);
    file.writeUInt32LE(data.length, 12);
    file.write('JSON', 16);
    data.copy(file, 20);
    if (binary.length) {
        file.writeUInt32LE(binary.length, 20 + data.length);
        file.write('BIN\0', 24 + data.length);
        binary.copy(file, 28 + data.length);
    }
    return file;
}
const document = {
    asset: { version: '2.0' }, scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ children: [1, 2] }, { mesh: 0 }, { mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
    accessors: [{ count: 4 }, { count: 6 }], buffers: [{ byteLength: 4 }],
};

test('counts source primitives separately from instantiated default-scene triangles', () => {
    const result = inspectGlb(makeGlb(document));
    assert.equal(result.meshes, 1);
    assert.equal(result.sceneDrawPrimitives, 2);
    assert.equal(result.uniqueSourceTriangles, 2);
    assert.equal(result.sceneTriangles, 4);
});

test('accounts for GPU instances without treating them as separate primitives', () => {
    const input = structuredClone(document);
    input.nodes[1].extensions = { EXT_mesh_gpu_instancing: { attributes: { TRANSLATION: 2 } } };
    input.accessors.push({ count: 10 });
    const result = inspectGlb(makeGlb(input));
    assert.equal(result.sceneDrawPrimitives, 2);
    assert.equal(result.sceneTriangles, 22);
});

test('rejects truncation, linked images and missing binary data', () => {
    assert.throws(() => inspectGlb(makeGlb(document).subarray(0, -1)), /length/i);
    assert.throws(() => inspectGlb(makeGlb({ ...document, images: [{ uri: 'outside.png' }] })), /image URI/i);
    assert.throws(() => inspectGlb(makeGlb(document, Buffer.alloc(0))), /binary/i);
});

test('rejects cyclic and multiply parented scenes', () => {
    const cycle = structuredClone(document);
    cycle.nodes[1].children = [0];
    assert.throws(() => inspectGlb(makeGlb(cycle)), /cycle|reuses node/i);
    const reuse = structuredClone(document);
    reuse.nodes[1].children = [2];
    assert.throws(() => inspectGlb(makeGlb(reuse)), /reuses node/i);
});
