"""Build exact AB 105779 faces from measured 842 x 595 PDF coordinates.

Run from the repository root. Convex clipping partitions the worktop around
the sink and cooktop without painting over their claim areas.
"""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
hotspots = []
worktop_parts = []

def percent(points):
    return [[round(x / 842 * 100, 6), round(y / 595 * 100, 6)] for x, y in points]

def face(key, points, **extra):
    hotspots.append(dict(componentKey=key, points=percent(points), preserveManualSize=True, **extra))

def signed_area(points):
    return sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(points,points[1:]+points[:1])) / 2

def clip(points, a, b, keep_inside):
    def distance(p):
        return (b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0])
    output = []
    for start, end in zip(points, points[1:]+points[:1]):
        ds, de = distance(start), distance(end)
        si = ds >= -1e-8 if keep_inside else ds <= 1e-8
        ei = de >= -1e-8 if keep_inside else de <= 1e-8
        if si:
            output.append(start)
        if si != ei:
            t = ds / (ds-de)
            output.append([start[0]+t*(end[0]-start[0]), start[1]+t*(end[1]-start[1])])
    return output

def subtract(subject, hole):
    if signed_area(hole) < 0:
        hole = hole[::-1]
    inside, outside = subject, []
    for a, b in zip(hole, hole[1:]+hole[:1]):
        if not inside:
            break
        piece = clip(inside, a, b, False)
        if len(piece) >= 3 and abs(signed_area(piece)) > 0.0001:
            outside.append(piece)
        inside = clip(inside, a, b, True)
    return outside

def convex_hull(points):
    def turn(a,b,c):
        return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
    points = sorted(set(tuple(p) for p in points))
    lower, upper = [], []
    for p in points:
        while len(lower)>1 and turn(lower[-2],lower[-1],p)<=0:
            lower.pop()
        lower.append(p)
    for p in points[::-1]:
        while len(upper)>1 and turn(upper[-2],upper[-1],p)<=0:
            upper.pop()
        upper.append(p)
    return lower[:-1]+upper[:-1]

COOKTOP = [[235.32,330.52],[309.48,322.60],[377.4,332.56],[282.84,343.0]]
SINK = convex_hull([[399.48,331.72],[452.28,326.32],[464.28,326.44],[559.92,340.36],[559.92,340.6],[558.84,342.04],[506.04,347.44],[495.96,347.32],[400.08,333.16]])

face('refrigerator', [[71.04,171.28],[157.2,162.52],[235.32,173.8],[149.04,182.68]])
face('refrigerator', [[71.04,171.28],[149.04,182.68],[149.04,539.32],[71.04,528.04]])
face('refrigerator', [[149.04,182.68],[235.32,173.8],[235.32,530.56],[149.04,539.32]])

face('wall-cabinet-1', [[157.2,86.92],[203.76,82.12],[248.04,88.6],[201.48,93.28]])
face('wall-cabinet-1', [[157.2,86.92],[201.48,93.28],[201.48,168.88],[157.2,162.52]])
face('wall-cabinet-1', [[201.48,93.28],[248.04,88.6],[248.04,233.92],[235.32,235.12],[235.32,173.8],[201.48,168.88]])
face('wall-cabinet-2', [[203.76,82.12],[296.76,72.64],[341.04,79],[248.04,88.6]])
face('wall-cabinet-2', [[248.04,88.6],[341.04,79],[341.04,224.32],[248.04,233.92]])
face('wall-cabinet-3', [[296.76,72.64],[389.88,63.16],[434.16,69.52],[341.04,79]])
face('wall-cabinet-3', [[341.04,79],[434.16,69.52],[434.16,214.84],[341.04,224.32]])
BLENDE_FACES = [
    [[434.16,69.52],[441.84,68.8],[441.84,214],[434.16,214.84]],
    [[431.52,69.16],[439.32,68.32],[441.84,68.8],[434.16,69.52]],
]
for points in BLENDE_FACES:
    face('wall-cabinet-3',points)
face('extractor-hood', [[248.04,233.92],[341.04,224.32],[341.04,234.4],[248.04,243.88]])
face('extractor-hood', [[235.32,235.12],[248.04,233.92],[248.04,243.88],[235.32,242.08]])
face('extractor-hood', [[264,247.96],[282.12,247.96],[282.12,266.2],[264,266.2]])
face('extractor-hood', [[311.16,243.16],[329.16,243.16],[329.16,261.4],[311.16,261.4]])

for part, surface, cutout in [
    ('worktop-left', [[235.32,329.68],[307.08,322.36],[385.2,333.76],[235.32,349.12]], COOKTOP),
    ('worktop-right', [[307.08,322.36],[400.08,312.88],[775.2,367.36],[682.2,376.84],[385.2,333.76]], SINK),
]:
    for piece in subtract(surface,cutout):
        face('worktop',piece)
        worktop_parts.append(part)
for part, points in [
    ('worktop-left', [[235.32,349.12],[385.2,333.76],[385.2,341.8],[235.32,357.04]]),
    ('worktop-right', [[385.2,333.76],[682.2,376.84],[775.2,367.36],[775.2,375.4],[682.2,384.88],[385.2,341.8]]),
]:
    face('worktop',points)
    worktop_parts.append(part)
face('worktop', [[682.2,384.88],[775.2,375.4],[775.2,551.8],[682.2,561.4]], separateLockedSidePanel=True)
worktop_parts.append('worktop-end-panel')

face('sink-faucet',SINK,claimFixturePartKey='sink')
face('sink-faucet',[[463.68,275.44],[469.32,274.72],[471.12,295.36],[465.72,295.96]],claimFixturePartKey='faucet')
face('sink-faucet',[[469.44,279.88],[491.4,279.88],[491.04,285.52],[469.92,285.52]],claimFixturePartKey='faucet')
face('sink-faucet',[[491.4,279.88],[496,281],[500,285],[502.92,294.76],[502.92,310.48],[498.6,310.96],[498.6,295.24],[496,289.6],[491.04,285.52]],claimFixturePartKey='faucet')
face('sink-faucet',[[499.68,311.2],[501.72,312.4],[501.72,333.76],[499.68,334.48]],claimFixturePartKey='faucet')

face('base-module-1', [[237.84,356.8],[284.28,352.12],[284.28,528.52],[237.84,533.32]])
face('worktop', [[235.32,357.04],[237.84,356.8],[237.84,533.32],[235.32,533.56]],separateLockedSidePanel=True,claimExcludeFromWorktop=True)
worktop_parts.append(None)
face('oven-module', [[284.28,352.12],[377.4,342.52],[377.4,519.04],[284.28,528.52]],claimApplianceSurface='oven')
face('oven-module',COOKTOP,claimApplianceSurface='cooktop')
# The customer excluded this corner gap from the configured elements.
# Leave both source faces unpainted and without any selection hotspot.
face('sink-base', [[391.68,342.76],[469.68,354.04],[469.68,530.56],[391.68,519.16]])
face('dishwasher-base', [[469.68,354.04],[547.8,365.44],[547.8,541.84],[469.68,530.56]])
face('base-module-2', [[549.96,365.68],[627.96,377.08],[627.96,553.48],[549.96,542.2]])
face('worktop', [[547.8,365.44],[549.96,365.68],[549.96,542.2],[547.8,541.84]],separateLockedSidePanel=True,claimExcludeFromWorktop=True)
worktop_parts.append(None)
face('base-module-3', [[627.96,377.08],[680.04,384.64],[680.04,561.04],[627.96,553.48]])
face('base-module-3', [[680.04,384.64],[682.2,384.88],[682.2,561.4],[680.04,561.04]])

out = ROOT / 'frontend/lib/ab-105779-plan.js'
exports = {
    'AB_105779_HOTSPOTS': hotspots,
    'AB_105779_WORKTOP_PART_KEYS': worktop_parts,
    'AB_105779_SINK_POINTS': percent(SINK),
    'AB_105779_COOKTOP_POINTS': percent(COOKTOP),
    'AB_105779_OVEN_PART_POINTS': {
        'oven': percent([[284.28,352.12],[377.4,342.52],[377.4,459.28],[284.28,468.76]]),
        'oven-drawer': percent([[284.28,468.76],[377.4,459.28],[377.4,519.04],[284.28,528.52]]),
    },
    'AB_105779_BLENDE_FACES': [dict(left=min(p[0] for p in percent(face)),right=max(p[0] for p in percent(face)),top=min(p[1] for p in percent(face)),bottom=max(p[1] for p in percent(face))) for face in BLENDE_FACES],
}
def js_export(name,value):
    if name == 'AB_105779_HOTSPOTS':
        return 'export const '+name+' = [\n'+''.join('  '+json.dumps(row,separators=(',',':'))+',\n' for row in value)+'];\n'
    return 'export const '+name+' = '+json.dumps(value,separators=(',',':'))+';\n'
out.write_text('// Measured from 670 105779.pdf. Generated by docs/build-105779-hotspots.py.\n'+
    '\n'.join(js_export(name,value) for name,value in exports.items()),encoding='utf-8')
boxes = []
for h in hotspots:
    xs,ys=zip(*h['points'])
    boxes.append(dict(h,name=h['componentKey'],left=min(xs),top=min(ys),width=max(xs)-min(xs),height=max(ys)-min(ys)))
(ROOT/'frontend/public/hotspot-overlays/105779-boxes.json').write_text(json.dumps(boxes,indent=2))
print(f'{out}: {len(hotspots)} faces, {len(worktop_parts)} worktop regions')
