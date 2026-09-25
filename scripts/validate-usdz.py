"""Optional: pip install usd-core; python scripts/validate-usdz.py FILE.usdz"""
import sys, zipfile, struct
from pxr import Usd, UsdGeom
filename = sys.argv[1]
stage = Usd.Stage.Open(filename)
assert stage and stage.GetDefaultPrim().GetName() == 'Artwork'
assert UsdGeom.GetStageMetersPerUnit(stage) == 1
assert stage.GetDefaultPrim().GetAttribute('preliminary:planeAnchoring:alignment').Get() == 'vertical'
with zipfile.ZipFile(filename) as archive, open(filename, 'rb') as stream:
    assert archive.testzip() is None
    assert archive.namelist()[0] == 'model.usda'
    for entry in archive.infolist():
        assert entry.compress_type == zipfile.ZIP_STORED
        stream.seek(entry.header_offset + 26)
        n, extra = struct.unpack('<HH', stream.read(4))
        assert (entry.header_offset + 30 + n + extra) % 64 == 0
    for prim in stage.Traverse():
        if prim.GetTypeName() == 'Shader':
            texture = prim.GetAttribute('inputs:file')
            if texture:
                assert texture.Get().path in archive.namelist()
print('PASS: OpenUSD, vertical anchor, meters, textures, ZIP CRC and alignment.')
