// Measured from the vector strokes of 670 105795.pdf (842 x 595 points).
export const pdf105795Points = points => points.map(([x,y]) => [
  Number((x / 842 * 100).toFixed(6)), Number((y / 595 * 100).toFixed(6)),
]);
const rect = (x1,y1,x2,y2) => [[x1,y1],[x2,y1],[x2,y2],[x1,y2]];
const face = (componentKey, points, extra = {}) => ({
  componentKey, points: pdf105795Points(points), preserveManualSize: true, ...extra,
});
export const AB_105795_COOKTOP_POINTS = pdf105795Points(rect(428.64,377.68,562.2,386.68));
export const AB_105795_OVEN_PART_POINTS = {
  oven: pdf105795Points(rect(428.64,386.68,562.2,515.92)),
  'oven-drawer': pdf105795Points(rect(428.64,515.92,562.2,582.16)),
};
export const AB_105795_HOTSPOTS = [
  face('worktop', rect(174.84,377.68,654.84,386.68)),
  face('worktop', rect(651.36,386.68,654.84,582.16), {claimFurniturePartKey:'worktop-end-panel', separateLockedSidePanel:true}),
  face('sink-end-blende', rect(174.84,386.68,183.72,582.16)),
  face('sink-base', rect(183.72,386.68,295.08,582.16)),
  face('dishwasher-base', rect(295.08,386.68,428.64,582.16)),
  face('oven-module', rect(428.64,386.68,562.2,582.16), {claimApplianceSurface:'oven'}),
  {componentKey:'oven-module', points:AB_105795_COOKTOP_POINTS, preserveManualSize:true, claimApplianceSurface:'cooktop'},
  face('base-module-1', rect(562.2,386.68,651.36,582.16)),
  face('wall-cabinet-1', rect(174.84,99.88,183.84,260.8)),
  face('wall-cabinet-1', rect(183.84,99.88,295.2,260.8)),
  face('wall-cabinet-2', rect(295.2,99.88,428.76,260.8)),
  face('wall-cabinet-3', rect(428.76,99.88,562.44,260.8)),
  face('wall-cabinet-4', rect(562.44,99.88,651.48,260.8)),
  face('extractor-hood', rect(428.76,260.8,562.44,271.96)),
  // Both PDF-drawn LED light cones share the extractor's visual selection.
  face('extractor-hood', [[459.12,279.76],[470.4,279.76],[477.72,298.48],[451.68,298.48]]),
  face('extractor-hood', [[526.8,279.76],[538.08,279.76],[545.4,298.48],[519.36,298.48]]),
  face('sink-faucet', [[253.44, 377.68], [265.92, 377.68], [265.92, 376.36], [265.68, 376.36], [265.68, 376.12], [264.96, 376.12], [264.96, 359.32], [263.16, 359.32], [263.16, 358.6], [265.68, 358.6], [265.68, 353.56], [265.68, 353.32], [265.68, 353.08], [265.68, 352.84], [265.44, 352.36], [265.44, 352.12], [265.2, 351.88], [265.2, 351.64], [264.96, 351.64], [264.72, 351.4], [264.36, 351.16], [264.12, 350.92], [263.88, 350.56], [263.64, 350.32], [263.4, 349.84], [263.16, 349.6], [263.16, 334.6], [262.92, 334.12], [262.68, 334.12], [262.44, 333.88], [262.2, 333.64], [261.96, 333.4], [261.6, 333.04], [261.12, 333.04], [260.88, 332.8], [260.4, 332.8], [260.16, 332.8], [259.68, 332.8], [259.2, 332.8], [258.96, 332.8], [258.36, 332.8], [258.12, 333.04], [257.64, 333.04], [257.4, 333.4], [257.16, 333.64], [256.92, 333.88], [256.68, 334.12], [256.44, 334.12], [256.2, 334.6], [256.2, 334.84], [256.2, 335.08], [256.2, 336.88], [256.2, 349.6], [256.2, 349.6], [255.96, 349.84], [255.6, 350.32], [255.36, 350.56], [255.12, 350.92], [254.88, 351.16], [254.64, 351.4], [254.4, 351.64], [254.16, 351.64], [254.16, 351.88], [253.92, 352.12], [253.92, 352.36], [253.68, 352.84], [253.68, 353.08], [253.68, 353.32], [253.68, 353.56], [253.68, 358.6], [256.2, 358.6], [256.2, 359.32], [254.4, 359.32], [254.4, 376.12], [253.68, 376.12], [253.68, 376.36], [253.44, 376.36]]),
];
export const AB_105795_BLENDE_CALIBRATION = {
  'wall-cabinet-1': {side:'left', wholeFacesOnly:true, wholeBlendeFaces:[{
    left:174.84/842*100, right:183.84/842*100, top:99.88/595*100, bottom:260.8/595*100,
  }]},
};
const lightDetail = (key,x1,y1,x2,y2) => ({
  key,componentKey:'dishwasher-base',persistWhenSelected:true,
  left:x1/842*100, top:y1/595*100, width:(x2-x1)/842*100, height:(y2-y1)/595*100,
});
export const AB_105795_LIGHT_DETAILS = [
  lightDetail('dishwasher-basket',300.96,451.6,424,500.2),
  lightDetail('dishwasher-gs-mark',350.88,521.56,375.48,544),
];
