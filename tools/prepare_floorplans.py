"""Rebuild the supplied SpacePlanner GLBs as small, texture-free architecture.

Development helper only. Requires numpy; the delivered game does not.
Usage: python3 tools/prepare_floorplans.py /path/to/original/upload
Door leaves are omitted so the educational walkthrough has open doorways.
"""
import sys, json, struct, pathlib, shutil
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = pathlib.Path(sys.argv[1])

def transform(n):
    if 'matrix' in n:
        return np.array(n['matrix']).reshape((4, 4), order='F')
    x, y, z, w = n.get('rotation', [0, 0, 0, 1])
    r = np.array([[1-2*y*y-2*z*z, 2*x*y-2*z*w, 2*x*z+2*y*w],
                  [2*x*y+2*z*w, 1-2*x*x-2*z*z, 2*y*z-2*x*w],
                  [2*x*z-2*y*w, 2*y*z+2*x*w, 1-2*x*x-2*y*y]])
    m = np.eye(4)
    m[:3, :3] = r @ np.diag(n.get('scale', [1, 1, 1]))
    m[:3, 3] = n.get('translation', [0, 0, 0])
    return m

def convert(filename, floor):
    raw = (SOURCE / filename).read_bytes()
    size, _ = struct.unpack_from('<II', raw, 12)
    g = json.loads(raw[20:20+size])
    binary = raw[28+size:]
    def attribute(idx):
        a = g['accessors'][idx]; v = g['bufferViews'][a['bufferView']]
        dtype = {5126: '<f4', 5125: '<u4', 5123: '<u2', 5121: 'u1'}[a['componentType']]
        nc = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
        offset = v.get('byteOffset', 0)+a.get('byteOffset', 0)
        stride = v.get('byteStride', np.dtype(dtype).itemsize*nc)
        return np.ndarray((a['count'], nc), dtype=dtype, buffer=binary, offset=offset,
                          strides=(stride, np.dtype(dtype).itemsize)).copy()
    batches = {0: [[], [], []], 1: [[], [], []]}; counts = {0: 0, 1: 0}
    segments = set(); removed = 0
    def visit(idx, parent):
        nonlocal removed
        n = g['nodes'][idx]; m = parent @ transform(n); name = n.get('name', '')
        if 'mesh' in n and (name.startswith('Wall') or name.startswith('Skirting')):
            for p in g['meshes'][n['mesh']]['primitives']:
                pos = attribute(p['attributes']['POSITION']).astype(float)
                pos = (m @ np.column_stack([pos, np.ones(len(pos))]).T).T[:, :3]
                low, high = pos.min(0), pos.max(0)
                # Door panels, handles and short frame parts are removable.
                skip = name.startswith('Wall') and high[1] < 2.6 and max((high-low)[[0, 2]]) < 1.5
                if skip:
                    removed += 1
                    continue
                normals = attribute(p['attributes']['NORMAL']).astype(float)
                normals = (np.linalg.inv(m[:3, :3]).T @ normals.T).T
                normals /= np.maximum(np.linalg.norm(normals, axis=1)[:, None], 1e-10)
                indices = attribute(p['indices']).flatten().astype('uint32') if 'indices' in p else np.arange(len(pos), dtype='uint32')
                cat = int(name.startswith('Skirting')); b = batches[cat]
                b[0].append(pos); b[1].append(normals); b[2].append(indices+counts[cat]); counts[cat] += len(pos)
                if cat == 0:
                    for tri in pos[indices.reshape(-1, 3)]:
                        cross = []
                        for a, c in [(tri[0],tri[1]),(tri[1],tri[2]),(tri[2],tri[0])]:
                            if (a[1] < 1.0) != (c[1] < 1.0):
                                hit = a+(c-a)*((1.0-a[1])/(c[1]-a[1]))
                                cross.append(tuple(round(float(v), 4) for v in hit[[0, 2]]))
                        if len(cross) == 2 and np.linalg.norm(np.array(cross[0])-cross[1]) > .001:
                            segments.add(tuple(sorted(cross)))
        for c in n.get('children', []): visit(c, m)
    for idx in g['scenes'][0]['nodes']: visit(idx, np.eye(4))
    output = {'asset': {'version': '2.0', 'generator': 'MediLink architecture optimizer'},
              'scene': 0, 'scenes': [{'nodes': []}], 'nodes': [], 'meshes': [], 'bufferViews': [], 'accessors': [],
              'materials': [
                  {'name': 'Hospital wall', 'doubleSided': True, 'pbrMetallicRoughness': {'baseColorFactor': [.77,.84,.83,1], 'metallicFactor': 0, 'roughnessFactor': .85}},
                  {'name': 'Skirting', 'pbrMetallicRoughness': {'baseColorFactor': [.11,.25,.27,1], 'metallicFactor': 0, 'roughnessFactor': .75}}]}
    data = bytearray()
    def accessor(a, kind, component, target):
        while len(data) % 4: data.append(0)
        buf = a.tobytes(); view = len(output['bufferViews'])
        output['bufferViews'].append({'buffer': 0, 'byteOffset': len(data), 'byteLength': len(buf), 'target': target}); data.extend(buf)
        item = {'bufferView': view, 'componentType': component, 'count': len(a), 'type': kind}
        if kind == 'VEC3': item.update(min=a.min(0).tolist(), max=a.max(0).tolist())
        output['accessors'].append(item); return len(output['accessors'])-1
    for cat, b in batches.items():
        if not b[0]: continue
        v = np.concatenate(b[0]).astype('<f4'); n = np.concatenate(b[1]).astype('<f4'); ind = np.concatenate(b[2]).astype('<u4')
        p = {'attributes': {'POSITION': accessor(v, 'VEC3', 5126, 34962), 'NORMAL': accessor(n, 'VEC3', 5126, 34962)},
             'indices': accessor(ind, 'SCALAR', 5125, 34963), 'material': cat}
        i = len(output['meshes']); output['meshes'].append({'primitives': [p]})
        output['nodes'].append({'name': ['Architecture', 'Skirting'][cat], 'mesh': i}); output['scenes'][0]['nodes'].append(i)
    output['buffers'] = [{'byteLength': len(data)}]
    j = json.dumps(output, separators=(',', ':')).encode(); j += b' ' * (-len(j) % 4); data.extend(b'\0' * (-len(data) % 4))
    glb = struct.pack('<III', 0x46546C67, 2, 28+len(j)+len(data))+struct.pack('<II', len(j), 0x4E4F534A)+j+struct.pack('<II', len(data), 0x004E4942)+data
    model_path = ROOT / 'assets' / 'models' / f'floor-{floor}.glb'; model_path.write_bytes(glb)
    walls = [[*a, *b] for a, b in sorted(segments)]
    (ROOT / 'assets' / f'collision-{floor}.json').write_text(json.dumps(walls, separators=(',', ':')))
    return {'floor': floor, 'source': filename, 'originalBytes': len(raw), 'optimizedBytes': len(glb), 'collisionSegments': len(walls), 'removedDoorParts': removed,
            'note': 'Architecture retained and merged. Original furniture replaced by educational low-poly assets. Scene units are illustrative.'}

if __name__ == '__main__':
    report = [convert('floorplan (1).glb', 1), convert('floorplan.glb', 2)]
    for source, target in [('Desain tanpa judul (1).png', 'floor-1.png'), ('Desain tanpa judul (5).png', 'floor-2.png')]:
        shutil.copyfile(SOURCE/source, ROOT/'assets'/'reference'/target)
    (ROOT/'assets'/'floorplan-manifest.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))
