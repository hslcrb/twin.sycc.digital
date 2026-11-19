import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

type Primitive = { mode?: number; indices?: number; attributes?: Record<string, number> };
type GlbNode = {
    name?: string; mesh?: number; children?: number[];
    extensions?: { EXT_mesh_gpu_instancing?: { attributes: Record<string, number> } };
};
type Gltf = {
    asset?: { version?: string };
    scene?: number; scenes?: { nodes?: number[] }[]; nodes?: GlbNode[];
    buffers?: { uri?: string; byteLength: number }[];
    images?: { uri?: string }[];
    meshes?: { primitives: Primitive[] }[];
    materials?: unknown[]; accessors?: { count: number }[];
};
const headerLength = 12;
const version = 2;
const jsonChunk = 0x4e4f534a;
const binaryChunk = 0x004e4942;

export function inspectGlb(bytes: Buffer) {
    if (bytes.length < 20 || bytes.toString('ascii', 0, 4) !== 'glTF' || bytes.readUInt32LE(4) !== version) {
        throw new Error('Expected GLB v2 magic and header');
    }
    if (bytes.readUInt32LE(8) !== bytes.length) throw new Error('GLB length does not match its header');
    let metadata: Gltf | undefined;
    let binaryLength: number | undefined;

    for (let offset = headerLength; offset < bytes.length;) {
        if (offset + 8 > bytes.length) throw new Error('Truncated GLB chunk header');
        const length = bytes.readUInt32LE(offset);
        const type = bytes.readUInt32LE(offset + 4);
        const next = offset + 8 + length;
        if (length % 4 || next > bytes.length) throw new Error('Invalid GLB chunk length or alignment');
        if (offset === headerLength && type !== jsonChunk) throw new Error('GLB JSON must be the first chunk');
        if (type === jsonChunk) {
            if (metadata) throw new Error('Duplicate GLB JSON chunk');
            metadata = JSON.parse(bytes.toString('utf8', offset + 8, next)) as Gltf;
        }
        if (type === binaryChunk) {
            if (binaryLength !== undefined) throw new Error('Duplicate GLB binary chunk');
            binaryLength = length;
        }
        offset = next;
    }

    if (metadata?.asset?.version !== '2.0') throw new Error('Expected glTF asset version 2.0');
    const { buffers = [], images = [], accessors = [], nodes = [], meshes = [], materials = [] } = metadata;
    if (images.some(image => image.uri && !image.uri.startsWith('data:'))) throw new Error('External image URI is not allowed');
    if (buffers.length > 1 || buffers.some(buffer => buffer.uri)) throw new Error('A single embedded binary buffer is required');
    if (buffers[0] && (binaryLength === undefined || binaryLength < buffers[0].byteLength || binaryLength - buffers[0].byteLength > 3)) {
        throw new Error('GLB binary chunk does not match declared buffer length');
    }

    function accessorCount(index: number | undefined) {
        const value = index === undefined ? undefined : accessors[index]?.count;
        if (value === undefined || !Number.isSafeInteger(value) || value < 0) throw new Error('Invalid accessor count');
        return value;
    }
    const metrics = meshes.map(mesh => ({
        primitives: mesh.primitives.length,
        triangles: mesh.primitives.reduce((total, primitive) => {
            const mode = primitive.mode ?? 4;
            if (mode < 4 || mode > 6) return total;
            const count = accessorCount(primitive.indices ?? primitive.attributes?.POSITION);
            return total + (mode === 4 ? Math.floor(count / 3) : Math.max(0, count - 2));
        }, 0),
    }));

    const roots = metadata.scenes?.[metadata.scene ?? 0]?.nodes || [];
    const remaining = [...roots];
    const visited = new Set<number>();
    let sceneTriangles = 0;
    let sceneDrawPrimitives = 0;
    for (let index = 0; index < remaining.length; index++) {
        const key = remaining[index];
        if (visited.has(key)) throw new Error('Default scene contains a cycle or reuses node');
        visited.add(key);
        const node = nodes[key];
        if (!node) throw new Error('Invalid default-scene node index');
        for (const child of node.children ?? []) remaining.push(child);
        if (node.mesh === undefined) continue;
        const geometry = metrics[node.mesh];
        if (!geometry) throw new Error('Invalid node mesh index');
        const instanced = Object.values(node.extensions?.EXT_mesh_gpu_instancing?.attributes ?? {});
        const instanceCounts = instanced.map(accessorCount);
        const instances = instanceCounts[0] ?? 1;
        if (instanceCounts.some(count => count !== instances)) throw new Error('Mismatched GPU instance counts');
        sceneDrawPrimitives += geometry.primitives;
        sceneTriangles += geometry.triangles * instances;
    }

    return {
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        nodes: visited.size,
        meshes: meshes.length,
        materials: materials.length,
        embeddedImages: images.length,
        uniqueSourceTriangles: metrics.reduce((sum, mesh) => sum + mesh.triangles, 0),
        sceneTriangles,
        sceneDrawPrimitives,
        waypoints: [...visited].map(key => nodes[key].name).filter((name): name is string => !!name?.startsWith('Waypoint_')),
    };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
    const path = process.argv[2] ?? 'public/models/sycc.glb';
    console.info(JSON.stringify(inspectGlb(readFileSync(path)), null, 2));
}
