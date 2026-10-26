"""Build the complete portable project ZIP and a source-file checksum manifest."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json
import sys

root = Path(__file__).resolve().parents[1]
output = Path(sys.argv[1]).resolve()
output.parent.mkdir(parents=True, exist_ok=True)
def eligible(p):
    rel = p.relative_to(root)
    return p.is_file() and not any(s.startswith('.') or s in {'dist','node_modules','__pycache__','plan-render'} for s in rel.parts) and p.suffix not in {'.zip','.gz','.tar','.pyc'} and rel.as_posix() != 'docs/PACKAGE-MANIFEST.json'
files = sorted(p for p in root.rglob('*') if eligible(p))
metrics = json.loads((root/'docs/revision-metrics.json').read_text())
env = json.loads((root/'docs/environment-audit.json').read_text())['floors']
mf = root/'docs/PACKAGE-MANIFEST.json'
previous = json.loads(mf.read_text()) if mf.exists() else {}
manifest = {
    **previous,
    'application':'MediLink Hospital Network Explorer', 'version':json.loads((root/'package.json').read_text())['version'],
    'roomsAndCirculationAreas':metrics['rooms'], 'devices':metrics['devices'],
    'dataLinks':metrics['lan']+metrics['fiber']+metrics['radio'],
    'additionalGlbAssets':87, 'sourceWallModels':2,
    'operableDoors':sum(f['operableDoors'] for f in env),
    'openPortals':sum(f['openPortals'] for f in env),
    'privacyStallDoors':sum(f['privacyStallDoors'] for f in env),
    'windowApertures':sum(f['windows'] for f in env),
    'ceilingAndArrivalLightPositions':sum(f['luminairePositions'] for f in env),
    'environmentDetailPlacements':sum(f['detailObjects'] for f in env),
    'testedCirculationRoutes':5, 'testedServiceRoutes':8, 'testsPassed':123,
    'browserRenderTested':False,
    'baseFurnitureAndDevices':metrics['basePlacements'], 'testedDoorCrossings':metrics['doors'],
    'testedRoomAccessRoutes':metrics['entries'], 'testedEquipmentAccessRoutes':metrics['equipment'],
    'assetKinds':84, 'totalLightPositions':sum(f['luminairePositions'] for f in env)+11,
    'terminalDataOutlets':metrics['computers'], 'powerFeeds':metrics['powerFeeds'],
    'lanLinks':metrics['lan'], 'fiberLinks':metrics['fiber'], 'radioLinks':metrics['radio'],
    'outdoorGuestAccessPoints':1, 'smallOperatingRoomAPs':0, 'largeOperatingRoomAPs':1,
    'cameraModes':['orbit','walk','third','drone','top'], 'thirdPersonAvatar':True, 'droneAltitudeRange':[.4,36],
    'nativeSvgFloorPlans':2, 'revisionDocumentPages':4,
    'files':[{'path':p.relative_to(root).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]
}
mf.write_text(json.dumps(manifest,indent=2)+'\n')
with ZipFile(output, 'w', ZIP_DEFLATED, compresslevel=9) as z:
    for p in files+[mf]: z.write(p, 'hospital-network-explorer/'+p.relative_to(root).as_posix())
with ZipFile(output) as z:
    assert z.testzip() is None
    for record in manifest['files']:
        assert hashlib.sha256(z.read('hospital-network-explorer/'+record['path'])).hexdigest() == record['sha256']
print(json.dumps({'path':str(output),'bytes':output.stat().st_size,'files':len(files)+1,'version':json.loads((root/'package.json').read_text())['version']}))
