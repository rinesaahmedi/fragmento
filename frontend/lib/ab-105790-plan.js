// Traced from AB 105790.pdf, in its original 842 x 595 coordinate system.
export const pdf105790Points = (points) => points.map(([x, y]) => [
  Number((x / 842 * 100).toFixed(6)), Number((y / 595 * 100).toFixed(6)),
]);
const face = (componentKey, points, extra = {}) => ({
  componentKey, points: pdf105790Points(points), preserveManualSize: true, ...extra,
});

export const AB_105790_SINK_POINTS = pdf105790Points([
  [399.24,327.16],[400.2,326.68],[402.24,326.44],[455.04,321.04],
  [457.8,320.8],[462.96,320.8],[467.04,321.16],[562.68,335.08],
  [562.68,335.2],[561.6,336.76],[508.8,342.16],[501.48,342.04],
  [401.16,328.12],[399.24,327.52],
]);
export const AB_105790_COOKTOP_POINTS = pdf105790Points([
  [534.48,349.72],[617.4,341.2],[692.16,352],[692.4,353.08],
  [612,361.24],[537.96,350.44],
]);
export const AB_105790_OVEN_PART_POINTS = {
  oven: pdf105790Points([[534,358.96],[612,370.24],[612,486.88],[534,475.6]]),
  "oven-drawer": pdf105790Points([[534,475.6],[612,486.88],[612,546.76],[534,535.36]]),
};

export const AB_105790_HOTSPOTS = [
  face("refrigerator", [[36.6,154.36],[122.88,145.6],[200.88,156.88],[114.72,165.76]]),
  face("refrigerator", [[36.6,154.36],[114.72,165.76],[114.72,522.4],[36.6,511.12]]),
  face("refrigerator", [[114.72,165.76],[200.88,156.88],[200.88,513.64],[114.72,522.4]]),
  // Row 4 is a separate included PLR60 with its own ASC identity.
  face("worktop-secondary", [[200.88,313.6],[227.64,310.12],[305.76,321.4],[200.88,332.08]], { claimFurniturePartKey: "worktop-left" }),
  face("worktop-secondary", [[200.88,332.08],[305.76,321.4],[305.76,329.44],[200.88,340.12]], { claimFurniturePartKey: "worktop-left" }),
  face("worktop-secondary", [[200.88,340.12],[203.4,339.88],[203.4,516.4],[200.88,516.64]], { claimFurniturePartKey: "worktop-left", separateLockedSidePanel: true }),
  face("base-module-1", [[203.4,339.88],[296.52,330.4],[296.52,506.8],[203.4,516.4]]),
  face("base-module-1", [[296.52,330.4],[305.76,329.44],[305.76,505.96],[296.52,506.8]]),
  face("worktop", [[371.28,327.28],[464.4,317.8],[774.12,362.8],[681,372.28]], { claimFurniturePartKey: "worktop-right" }),
  face("worktop", [[371.28,327.28],[681,372.28],[774.12,362.8],[774.12,370.84],[681,380.32],[371.28,335.32]], { claimFurniturePartKey: "worktop-right" }),
  face("worktop", [[681,380.32],[774.12,370.84],[774.12,547.24],[681,556.72]], { claimFurniturePartKey: "worktop-end-panel" }),
  face("sink-end-blende", [[371.28,335.32],[377.76,336.28],[377.76,512.68],[371.28,511.72]]),
  face("sink-base", [[377.76,336.28],[455.88,347.56],[455.88,524.08],[377.76,512.68]]),
  face("dishwasher-base", [[455.88,347.56],[534,358.96],[534,535.36],[455.88,524.08]]),
  face("oven-module", [[534,358.96],[612,370.24],[612,546.76],[534,535.36]], { claimApplianceSurface: "oven" }),
  { componentKey: "oven-module", points: AB_105790_COOKTOP_POINTS, preserveManualSize: true, claimApplianceSurface: "cooktop" },
  face("base-module-2", [[612,370.24],[677.16,379.72],[677.16,556.24],[612,546.76]]),
  face("base-module-2", [[677.16,379.72],[681,380.32],[681,556.72],[677.16,556.24]]),
  face("wall-cabinet-1", [[418.08,73.24],[496.2,84.64],[496.2,229.96],[418.08,218.56]]),
  face("wall-cabinet-1", [[418.08,73.24],[470.88,67.84],[548.88,79.24],[496.2,84.64]]),
  face("wall-cabinet-1", [[411.6,72.28],[418.08,73.24],[418.08,218.56],[411.6,217.6]]),
  face("wall-cabinet-1", [[411.6,72.28],[414.72,72.04],[421.2,73],[418.08,73.24]]),
  face("wall-cabinet-2", [[496.2,84.64],[574.32,95.92],[574.32,241.24],[496.2,229.96]]),
  face("wall-cabinet-2", [[496.2,84.64],[548.88,79.24],[627,90.52],[574.32,95.92]]),
  face("wall-cabinet-3", [[574.32,95.92],[652.44,107.32],[652.44,252.64],[574.32,241.24]]),
  face("wall-cabinet-3", [[574.32,95.92],[627,90.52],[705.12,101.92],[652.44,107.32]]),
  face("extractor-hood", [[574.32,241.24],[652.44,252.64],[652.44,262.6],[574.32,251.32]]),
  // Visible right side below H5002, ending on the SVG's 5437/5775 seam.
  face("extractor-hood", [[652.44,252.64],[693,258.52],[652.44,262.6]]),
  face("extractor-hood", [[591.96,260.92],[598.56,261.88],[602.88,279.4],[595.32,278.2],[587.64,277.12]]),
  face("extractor-hood", [[631.56,266.68],[638.16,267.64],[642.48,285.16],[634.8,283.96],[627.24,282.88]]),
  face("wall-cabinet-4", [[652.44,107.32],[717.48,116.8],[717.48,262.12],[652.44,252.64]]),
  face("wall-cabinet-4", [[652.44,107.32],[705.12,101.92],[770.16,111.4],[717.48,116.8]]),
  // Keep the right HPK2002 strip and its top cap separate from the cabinet side.
  face("wall-cabinet-4", [[721.32,116.406378],[770.16,111.4],[770.16,256.72],[721.32,262.6]]),
  face("wall-cabinet-4", [[717.48,116.8],[721.32,117.28],[721.32,262.6],[717.48,262.12]]),
  face("wall-cabinet-4", [[717.48,116.8],[720.6,116.44],[724.44,117.04],[721.32,117.28]]),
  { componentKey: "sink-faucet", points: AB_105790_SINK_POINTS, preserveManualSize: true, claimFixturePartKey: "sink" },
  face("sink-faucet", [[466.44,270.16],[472.08,269.44],[473.88,289.96],[473.88,290.68],[468,291.04]], { claimFixturePartKey: "faucet" }),
  face("sink-faucet", [[472.2,274.84],[494.16,274.6],[493.8,280.24],[472.68,280.48]], { claimFixturePartKey: "faucet" }),
  face("sink-faucet", [
    [494.16,274.6],[495.24,274.72],[496.32,274.84],[497.4,275.2],
    [498.48,275.56],[499.44,276.16],[500.52,277],[501.48,277.84],
    [502.32,278.8],[503.16,280],[503.76,281.2],[504.36,282.52],
    [504.84,283.84],[505.2,285.28],[505.44,286.72],[505.56,288.04],
    [505.68,289.48],[505.68,305.2],[506.16,305.8],[501.36,305.68],
    [501.36,289.96],[501.24,288.16],[500.76,286.24],[500.16,284.56],
    [499.2,283],[498,281.8],[496.68,280.96],[495.24,280.36],[493.8,280.24],
  ], { claimFixturePartKey: "faucet" }),
  face("sink-faucet", [[502.44,305.92],[504.48,307],[504.48,328.48],[502.44,329.2]], { claimFixturePartKey: "faucet" }),
];

const bounds = (points) => {
  const normalized = pdf105790Points(points);
  const xs = normalized.map(([x]) => x), ys = normalized.map(([, y]) => y);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
};
export const AB_105790_BLENDE_CALIBRATION = {
  "base-module-1": { side: "right", wholeFacesOnly: true, wholeBlendeFaces: [bounds([[296.52,330.4],[305.76,329.44],[305.76,505.96],[296.52,506.8]])] },
  "base-module-2": { side: "right", wholeFacesOnly: true, wholeBlendeFaces: [bounds([[677.16,379.72],[681,380.32],[681,556.72],[677.16,556.24]])] },
  "wall-cabinet-1": { side: "left", wholeFacesOnly: true, wholeBlendeFaces: [
    bounds([[411.6,72.28],[418.08,73.24],[418.08,218.56],[411.6,217.6]]),
    bounds([[411.6,72.28],[414.72,72.04],[421.2,73],[418.08,73.24]]),
  ] },
  "wall-cabinet-4": { side: "right", wholeFacesOnly: true, wholeBlendeFaces: [
    bounds([[717.48,116.8],[721.32,117.28],[721.32,262.6],[717.48,262.12]]),
    bounds([[717.48,116.8],[720.6,116.44],[724.44,117.04],[721.32,117.28]]),
  ] },
};
const lightDetail = (key, points) => {
  const { left, right, top, bottom } = bounds(points);
  return { key, componentKey: "dishwasher-base", persistWhenSelected: true, left, top, width: right - left, height: bottom - top };
};
export const AB_105790_LIGHT_DETAILS = [
  lightDetail("dishwasher-basket", [[459.24,407.56],[531.12,459.64]]),
  lightDetail("dishwasher-gs-mark", [[488.52,474.16],[502.8,496.36]]),
];
