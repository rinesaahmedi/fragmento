// Front elevations measured from AB 105802.pdf (842 x 595 points).
export const pdf105802Points = points => points.map(([x,y])=>[
  Number((x/842*100).toFixed(6)),Number((y/595*100).toFixed(6)),
]);
const rect=(x1,y1,x2,y2)=>[[x1,y1],[x2,y1],[x2,y2],[x1,y2]];
const face=(componentKey,points,extra={})=>({componentKey,points:pdf105802Points(points),preserveManualSize:true,...extra});
export const AB_105802_COOKTOP_POINTS=pdf105802Points(rect(133.8,359.44,236.76,366.4));
export const AB_105802_OVEN_PART_POINTS={
  oven:pdf105802Points(rect(133.8,366.4,236.76,466)),
  'oven-drawer':pdf105802Points(rect(133.8,466,236.76,517)),
};
export const AB_105802_HOTSPOTS=[
  face('worktop',rect(3.36,359.44,342.48,366.4),{claimFurniturePartKey:'worktop-left'}),
  face('worktop',rect(339.72,366.4,342.48,517),{claimFurniturePartKey:'worktop-end-panel',separateLockedSidePanel:true}),
  face('worktop-secondary',rect(523.32,359.44,833.88,366.4),{claimFurniturePartKey:'worktop-right'}),
  face('worktop-secondary',rect(523.32,366.4,526.08,517),{claimFurniturePartKey:'worktop-end-panel-right',separateLockedSidePanel:true}),
  face('base-module-1',rect(3.36,366.4,13.68,517)),
  face('base-module-1',rect(13.68,366.4,65.16,517)),
  face('base-module-2',rect(65.16,366.4,133.8,517)),
  face('oven-module',rect(133.8,366.4,236.76,517),{claimApplianceSurface:'oven'}),
  {componentKey:'oven-module',points:AB_105802_COOKTOP_POINTS,preserveManualSize:true,claimApplianceSurface:'cooktop'},
  face('base-module-3',rect(236.76,366.4,339.72,517)),
  face('refrigerator',rect(352.8,208.12,448.2,514.48)),
  face('dishwasher-base',rect(526.08,366.4,629.04,517)),
  face('sink-faucet',[[650.04,359.44],[650.04,358.24],[650.76,358.24],[650.76,344.8],[650.16,344.8],[650.16,337.84],[650.76,337.84],[650.76,328.36],[652.08,328],[652.08,326.68],[653.2,324.88],[656.4,324.88],[657.48,326.68],[658.92,328.36],[658.92,337.84],[659.52,337.84],[659.52,344.8],[658.92,344.8],[658.92,358.24],[659.64,358.24],[659.64,359.44]]),
  face('sink-base',rect(629.04,366.4,732,517)),
  face('base-module-4',rect(732,366.4,817.68,517)),
  face('base-module-4',rect(817.68,366.4,833.88,517)),
  face('wall-cabinet-1',rect(3.36,145.36,13.68,269.44)),
  face('wall-cabinet-1',rect(13.68,145.36,65.16,269.44)),
  face('wall-cabinet-2',rect(65.16,145.36,133.8,269.44)),
  face('wall-cabinet-3',rect(133.8,145.6,236.76,269.68)),
  face('wall-cabinet-4',rect(236.76,145.6,339.72,269.68)),
  face('wall-cabinet-5',rect(526.08,145.6,629.04,269.68)),
  face('wall-cabinet-6',rect(629.04,145.6,732,269.68)),
  face('wall-cabinet-7',rect(732,145.6,817.68,269.68)),
  face('wall-cabinet-7',rect(817.68,145.6,833.88,269.68)),
  face('extractor-hood',rect(133.8,269.68,236.76,278.2)),
  face('extractor-hood',[[157.08,284.32],[165.84,284.32],[171.48,298.6],[151.44,298.6]]),
  face('extractor-hood',[[209.28,284.32],[218.04,284.32],[223.68,298.6],[203.64,298.6]]),
];
const bounds=(x1,y1,x2,y2)=>({left:x1/842*100,right:x2/842*100,top:y1/595*100,bottom:y2/595*100});
const blende=(side,box)=>({side,wholeFacesOnly:true,wholeBlendeFaces:[box]});
export const AB_105802_BLENDE_CALIBRATION={
  'base-module-1':blende('left',bounds(3.36,366.4,13.68,517)),
  'base-module-4':blende('right',bounds(817.68,366.4,833.88,517)),
  'wall-cabinet-1':blende('left',bounds(3.36,145.36,13.68,269.44)),
  'wall-cabinet-7':blende('right',bounds(817.68,145.6,833.88,269.68)),
};
const detail=(key,x1,y1,x2,y2)=>({key,componentKey:'dishwasher-base',persistWhenSelected:true,left:x1/842*100,top:y1/595*100,width:(x2-x1)/842*100,height:(y2-y1)/595*100});
export const AB_105802_LIGHT_DETAILS=[
  detail('dishwasher-basket',530,417,625,454.8),
  detail('dishwasher-gs-mark',568.9,470.2,588.1,488.1),
];
