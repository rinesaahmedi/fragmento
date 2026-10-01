// Vertices measured from the original 842 x 595 vector PDF, in PDF points.
// Both FRG and ASC consume these faces so responsive crops use identical edges.
function face(componentKey, vertices, extra = {}) {
  return {
    componentKey,
    points: vertices.map(([x, y]) => [Number((x / 842 * 100).toFixed(6)), Number((y / 595 * 100).toFixed(6))]),
    preserveManualSize: true,
    ...extra,
  };
}

export const AB_104296_HOTSPOTS = [
  // GI88214-01 is furniture around the customer's appliance.
  // DBK50 closes the top; SP20214K is only the narrow 91 mm front filler.
  // The wide exposed side remains the GI88214-01 cabinet body.
  face('fridge-top-panel', [[138.72,36.64],[141.36,37],[245.88,26.32],[243.24,25.84]], { claimFurniturePartKey: 'housing-top-front' }),
  face('fridge-cabinet', [[138.72,36.64],[141.36,37],[141.36,526.6],[63.24,515.32],[63.24,18.64]], { claimFurniturePartKey: 'housing-cabinet' }),
  face('fridge-side-filler', [[141.36,115.48],[152.76,114.28],[152.76,525.4],[141.36,526.6]], { claimFurniturePartKey: 'housing-side-panel' }),
  face('fridge-top-panel', [[141.36,37],[245.88,26.32],[245.88,104.8],[152.76,114.28],[141.36,115.48]], { claimFurniturePartKey: 'housing-top-front' }),
  face('fridge-cabinet', [[152.76,114.28],[245.88,104.8],[245.88,177.88],[152.76,187.48]], { claimFurniturePartKey: 'housing-cabinet' }),
  face('fridge-cabinet', [[152.76,187.48],[245.88,177.88],[245.88,359.56],[152.76,369.04]], { claimFurniturePartKey: 'housing-cabinet' }),
  // The drawer seam is a continuous PDF path to the neighboring US2A50.
  face('fridge-cabinet', [[152.76,369.04],[245.88,359.56],[245.88,399.74484],[152.76,409.24]], { claimFurniturePartKey: 'housing-cabinet' }),
  face('fridge-cabinet', [[152.76,409.24],[245.88,399.74484],[245.88,515.92],[152.76,525.4]], { claimFurniturePartKey: 'housing-cabinet' }),
  face('fridge-cabinet', [[63.24,515.32],[141.36,526.6],[141.36,546.76],[63.24,535.36]], { claimFurniturePartKey: 'housing-cabinet' }),
  face('fridge-cabinet', [[141.36,526.6],[152.76,525.4],[245.88,515.92],[245.88,536.08],[152.76,545.56],[141.36,546.76]], { claimFurniturePartKey: 'housing-cabinet' }),
  face('base-module-1', [[245.88,359.56],[323.4,351.64],[323.4,528.16],[245.88,536.08]]),
  face('corner-blende', [[323.4,351.64],[331.2,350.8],[331.2,527.32],[323.4,528.16]]),
  face('corner-blende', [[331.2,350.8],[337.68,351.76],[337.68,528.28],[331.2,527.32]]),
  face('drawer-module', [[337.68,351.76],[376.68,357.52],[376.68,533.92],[337.68,528.28]]),
  face('oven-module', [[376.68,357.52],[454.8,368.8],[454.8,497.68],[376.68,486.4]], { claimAppliancePartKey: 'oven-set', claimApplianceSurface: 'oven' }),
  face('oven-cabinet', [[376.68,486.4],[454.8,497.68],[454.8,545.32],[376.68,533.92]]),
  face('dishwasher-front', [[454.8,368.8],[534.96,380.44],[534.96,556.96],[454.8,545.32]]),
  // Include the outside filler and the exposed right side with SPDT60.
  face('sink-base', [[534.96,380.44],[627.36,393.88],[627.36,570.28],[534.96,556.96]]),
  face('sink-base', [[627.36,393.88],[720.48,384.4],[720.48,560.8],[627.36,570.28]]),
  face('wall-cabinet-1', [[293.4,76.6],[304.44,78.16],[304.44,223.48],[293.4,221.8]]),
  face('wall-cabinet-1', [[293.4,76.6],[296.52,76.24],[307.56,77.8],[304.44,78.16]]),
  face('wall-cabinet-1', [[304.44,78.16],[357.24,72.76],[435.24,84.16],[382.56,89.56]]),
  face('wall-cabinet-1', [[304.44,78.16],[382.56,89.56],[382.56,234.76],[304.44,223.48]]),
  face('wall-cabinet-2', [[382.56,89.56],[435.24,84.16],[474.36,89.8],[421.56,95.2]]),
  face('wall-cabinet-2', [[382.56,89.56],[421.56,95.2],[421.56,240.52],[382.56,234.76]]),
  face('wall-cabinet-3', [[421.56,95.2],[474.36,89.8],[552.48,101.08],[499.68,106.48]]),
  face('wall-cabinet-3', [[421.56,95.2],[499.68,106.48],[499.68,251.8],[421.56,240.52]]),
  face('extractor-hood', [[421.56,240.52],[499.68,251.8],[499.68,261.88],[421.56,250.48]]),
  face('extractor-hood', [[499.68,251.8],[538.8,257.44],[499.68,261.88]]),
  face('wall-cabinet-4', [[499.68,106.48],[552.48,101.08],[630.48,112.48],[577.8,117.88]]),
  face('wall-cabinet-4', [[499.68,106.48],[577.8,117.88],[577.8,263.2],[499.68,251.8]]),
  face('wall-cabinet-5', [[577.8,117.88],[630.48,112.48],[708.6,123.76],[655.92,129.16]]),
  face('wall-cabinet-5', [[577.8,117.88],[655.92,129.16],[655.92,274.48],[577.8,263.2]]),
  face('wall-cabinet-5', [[655.92,129.16],[708.6,123.76],[708.6,269.08],[655.92,274.48]]),
  face('worktop', [[245.88,332.92],[346.08,322.36],[426.12,333.88],[331.2,342.76],[331.2,350.8],[245.88,359.56]]),
  face('worktop', [[426.12,333.88],[720.48,376.36],[720.48,384.4],[627.36,393.88],[331.2,350.8],[331.2,342.76]]),
  face('oven-module', [[378.96,347.68],[458.76,339.52],[536.16,350.32],[458.04,359.32],[378.84,347.8]], { claimAppliancePartKey: 'oven-set', claimApplianceSurface: 'cooktop' }),
  face('sink-faucet', [[521.16,364.6],[524.16,364],[576.96,358.6],[588.96,358.84],[684.6,372.64],[684.6,373.24],[683.52,374.32],[630.84,379.72],[621.36,379.6],[523.2,365.68]], { claimFixturePartKey: 'sink' }),
  face('sink-faucet', [[588.72,308.08],[594.36,307.48],[596.04,328],[590.76,328.72]], { claimFixturePartKey: 'faucet' }),
  face('sink-faucet', [[594.36,312.88],[616.32,312.64],[617.4,312.64],[620.64,313.6],[623.16,315.4],[624.96,317.44],[626.64,320.56],[627.48,323.32],[627.84,327.52],[627.84,343.24],[626.76,345.04],[626.76,368.2],[620.88,368.2],[620.88,366.88],[624.72,366.4],[624.72,343.96],[623.52,343.6],[623.52,327.88],[623.28,325.24],[622.68,323.44],[621.36,321.04],[619.56,319.24],[617.4,318.4],[616.08,318.28],[594.96,318.52]], { claimFixturePartKey: 'faucet' }),
];
