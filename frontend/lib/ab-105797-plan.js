// Measured from 670 105797.pdf, in the original 842 x 595 PDF coordinates.
export const pdf105797Points = (points) => points.map(([x, y]) => [
  Number((x / 842 * 100).toFixed(6)), Number((y / 595 * 100).toFixed(6)),
]);
const face = (componentKey, points, extra = {}) => ({
  componentKey, points: pdf105797Points(points), preserveManualSize: true, ...extra,
});

export const AB_105797_SINK_POINTS = pdf105797Points([
  [313.32,324.28],[316.44,324.04],[430.44,312.4],[433.2,312.16],
  [438.36,312.16],[442.32,312.52],[486.6,319],[488.64,320.44],
  [485.64,320.68],[370.08,332.2],[367.08,332.56],[364.2,332.56],[359.64,332.2],
  [315.36,325.72],[313.32,325.48],
]);

export const AB_105797_COOKTOP_POINTS = pdf105797Points([
  [476.88,326.68],[559.8,318.28],[596.04,323.44],
  [596.04,334],[554.4,338.2],[480.36,327.52],[476.88,326.92],
]);
export const AB_105797_OVEN_PART_POINTS = {
  oven: pdf105797Points([[476.88,336.04],[555,347.32],[555,463.96],[476.88,452.68]]),
  "oven-drawer": pdf105797Points([[476.88,452.68],[555,463.96],[555,523.84],[476.88,512.44]]),
};

export const AB_105797_HOTSPOTS = [
  face("refrigerator", [[596.04,170.08],[689.16,160.48],[761.52,171.04],[668.4,180.52]]),
  face("refrigerator", [[596.04,170.08],[668.4,180.52],[668.4,537.28],[596.04,526.72]]),
  face("refrigerator", [[668.4,180.52],[761.52,171.04],[761.52,527.8],[668.4,537.28]]),
  // Separate physical surfaces meet at the PDF's corner seam.
  face("worktop", [[38.28,351.88],[485.28,306.16],[563.4,317.56],[116.4,363.28]]),
  face("worktop", [[470.4,327.04],[563.4,317.56],[596.04,322.24],[596.04,345.28]]),
  face("worktop", [[38.28,351.88],[116.4,363.28],[470.4,327.04],[470.4,335.08],[116.4,371.32],[38.28,359.92]]),
  face("worktop", [[470.4,327.04],[596.04,345.28],[596.04,353.32],[470.4,335.08]]),
  face("worktop", [[38.28,359.92],[116.4,371.32],[116.4,547.72],[38.28,536.44]], { claimFurniturePartKey: "worktop-end-panel-left" }),
  face("worktop", [[116.4,371.32],[118.92,370.96],[118.92,547.48],[116.4,547.72]], { claimFurniturePartKey: "worktop-end-panel-left", separateLockedSidePanel: true }),
  face("worktop", [[273.96,355.12],[276.48,354.88],[276.48,531.4],[273.96,531.64]], { claimFurniturePartKey: "worktop-end-panel-left", separateLockedSidePanel: true }),
  face("worktop", [[594,353.08],[596.04,353.32],[596.04,529.84],[594,529.48]], { claimFurniturePartKey: "worktop-end-panel", separateLockedSidePanel: true }),
  face("base-module-1", [[118.92,370.96],[180.96,364.72],[180.96,541.12],[118.92,547.48]]),
  face("base-module-2", [[180.96,364.72],[273.96,355.12],[273.96,531.64],[180.96,541.12]]),
  face("dishwasher-base", [[276.48,354.88],[369.6,345.4],[369.6,521.8],[276.48,531.4]]),
  face("sink-base", [[369.6,345.4],[462.6,335.92],[462.6,512.32],[369.6,521.8]]),
  face("static-corner-blende", [[462.6,335.92],[470.4,335.08],[470.4,511.48],[462.6,512.32]], { claimExcludeFromSelection: true }),
  face("static-corner-blende", [[470.4,335.08],[476.88,336.04],[476.88,512.44],[470.4,511.48]], { claimExcludeFromSelection: true }),
  face("oven-module", [[476.88,336.04],[555,347.32],[555,523.84],[476.88,512.44]], { claimApplianceSurface: "oven" }),
  { componentKey: "oven-module", points: AB_105797_COOKTOP_POINTS, preserveManualSize: true, claimApplianceSurface: "cooktop" },
  face("base-module-3", [[555,347.32],[594,353.08],[594,529.48],[555,523.84]]),
  face("wall-cabinet-1", [[439.08,61.72],[517.2,73],[517.2,218.32],[439.08,207.04]]),
  face("wall-cabinet-1", [[439.08,61.72],[491.88,56.32],[569.88,67.6],[517.2,73]]),
  face("wall-cabinet-1", [[432.6,60.76],[439.08,61.72],[439.08,207.04],[432.6,206.08]]),
  face("wall-cabinet-1", [[432.6,60.76],[435.72,60.4],[442.2,61.36],[439.08,61.72]]),
  face("wall-cabinet-2", [[517.2,73],[595.32,84.4],[595.32,229.72],[517.2,218.32]]),
  face("wall-cabinet-2", [[517.2,73],[569.88,67.6],[648,79],[595.32,84.4]]),
  face("extractor-hood", [[517.2,218.32],[595.32,229.72],[595.32,239.68],[517.2,228.4]]),
  face("extractor-hood", [[534.84,237.96],[541.44,238.92],[545.76,256.44],[538.2,255.24],[530.52,254.16]]),
  face("extractor-hood", [[574.44,243.72],[581.04,244.68],[585.36,262.2],[577.68,261],[570.12,259.92]]),
  // H3002 is partly occluded by the refrigerator: select only its visible faces.
  face("wall-cabinet-3", [[595.32,84.4],[634.32,90.04],[634.32,166.12],[596.04,170.08],[596.04,229.825],[595.32,229.72]]),
  face("wall-cabinet-3", [[595.32,84.4],[648,79],[687.12,84.64],[634.32,90.04]]),
  face("wall-cabinet-3", [[634.32,90.04],[687.12,84.64],[687.12,160.24],[634.32,166.12]]),
  { componentKey: "sink-faucet", points: AB_105797_SINK_POINTS, preserveManualSize: true, claimFixturePartKey: "sink" },
  face("sink-faucet", [[358.08,260.56],[363.84,261.16],[361.92,282.04],[356.4,281.56]], { claimFixturePartKey: "faucet" }),
  face("sink-faucet", [[336.12,270.76],[358.08,266.56],[357.6,272.32],[336.48,276.4]], { claimFixturePartKey: "faucet" }),
  face("sink-faucet", [[324.6,288.04],[325.08,283.72],[326.76,279.16],[329.4,275.2],[333,272.32],[336.12,270.76],[336.48,276.4],[333.6,277.6],[331.08,280.24],[329.4,283.84],[328.92,287.56],[328.92,303.28],[324.6,303.76]], { claimFixturePartKey: "faucet" }),
  face("sink-faucet", [[324.6,303.76],[328.92,303.28],[329.52,326.8],[325.56,327.16]], { claimFixturePartKey: "faucet" }),
];

const bounds = (points) => {
  const p = pdf105797Points(points), xs = p.map(([x]) => x), ys = p.map(([, y]) => y);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
};
export const AB_105797_BLENDE_CALIBRATION = {
  "wall-cabinet-1": { side: "left", wholeFacesOnly: true, wholeBlendeFaces: [
    bounds([[432.6,60.76],[439.08,61.72],[439.08,207.04],[432.6,206.08]]),
    bounds([[432.6,60.76],[435.72,60.4],[442.2,61.36],[439.08,61.72]]),
  ] },
};
const lightDetail = (key, points) => {
  const { left, right, top, bottom } = bounds(points);
  return { key, componentKey: "dishwasher-base", persistWhenSelected: true, left, top, width: right-left, height: bottom-top };
};
export const AB_105797_LIGHT_DETAILS = [
  lightDetail("dishwasher-basket", [[279.84,405.88],[366.24,456.36]]),
  lightDetail("dishwasher-gs-mark", [[315.24,470.92],[332.52,493]]),
];
