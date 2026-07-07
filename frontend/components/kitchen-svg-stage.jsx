"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./kitchen-configurator.module.css";
import {
  componentIdForItem,
  componentIdForKey,
  getLinkedComponentIds,
  getLocalizedItemName,
  isHiddenLinkedComponent,
  normalizeColor,
  toggleLinkedComponentSelection,
} from "./kitchen-selection-utils";
import { usePublicI18n } from "./public-i18n";
import {
  applyPlanViewportToMarkup,
  refreshKitchenPlanSelection,
  syncKitchenPlan,
} from "./kitchen-svg-plan-utils";

const Kitchen3DViewer = dynamic(() => import("./Kitchen3DViewer"), {
  ssr: false,
  loading: () => (
    <div className={styles.viewerLoading} role="status" aria-live="polite">
      Loading 3D preview…
    </div>
  ),
});

// Vector plans (rendered from the source PDFs via docs/render-plan-svg.py) so the drawing
// stays razor-sharp at any zoom. The pixel-perfect hotspot overlay sits on top unchanged
// (the SVG keeps the PDF's aspect ratio, so the %-based boxes still line up exactly).
export const IMAGE_VIEW_BY_SLUG = {
  "ab-105806": "/plans/AB%20105806.svg",
  "ab-105807": "/plans/AB%20105807.svg",
  "ab-105808": "/plans/AB%20105808.svg",
  // JPG (not SVG) so the stage matches the PDF/hotspot render 1:1 — the PDF-derived SVG
  // can look different in some browsers when loaded as <img>.
  "ab-105805": "/jpg/AB%20105805_page-0001.jpg",
  "ab-105809": "/jpg/AB%20105805_page-0001.jpg",
  "ab-105813": "/jpg/AB%20105805_page-0001.jpg",
  "ab-105817": "/jpg/AB%20105805_page-0001.jpg",
  "ab-105834": "/jpg/AB%20105834_page-0001.jpg",
  "ab-105837": "/jpg/AB%20105837_page-0001.jpg",
  "ab-105840": "/jpg/AB%20105837_page-0001.jpg",
  "ab-105843": "/jpg/AB%20105837_page-0001.jpg",
  "ab-105825": "/plans/AB%20105825.svg",
  "ab-105828": "/plans/AB%20105825.svg",
  "ab-105831": "/plans/AB%20105831.svg",
  "ab-105810": "/plans/AB%20105810.svg",
  "ab-105812": "/plans/AB%20105812.svg",
  "ab-105814": "/plans/AB%20105814.svg",
  "ab-105815": "/plans/AB%20105815.svg",
  "ab-105816": "/plans/AB%20105816.svg",
  "ab-105818": "/plans/AB%20105818.svg",
  "ab-105819": "/plans/AB%20105819.svg",
  "ab-105820": "/plans/AB%20105820.svg",
  "ab-105821": "/plans/AB%20105821.svg",
  "ab-105824": "/plans/AB%20105821.svg",
  "ab-105822": "/plans/AB%20105825.svg",
  "ab-105823": "/plans/AB%20105822.svg",
  "ab-105829": "/plans/AB%20105822.svg",
  "ab-105832": "/plans/AB%20105822.svg",
  "ab-105826": "/plans/AB%20105826.svg",
  "ab-105827": "/plans/AB%20105827.svg",
  "ab-105830": "/plans/AB%20105827.svg",
  "ab-105835": "/plans/AB%20105835.svg",
  "ab-105836": "/plans/AB%20105836.svg",
  "ab-105842": "/plans/AB%20105842.svg",
  "ab-105839": "/plans/AB%20105842.svg",
  "ab-105845": "/plans/AB%20105845.svg",
  "105845-modul-2": "/plans/AB%20105845.svg",
  "ab-105833": "/plans/AB%20105833.svg",
  "ab-105841": "/plans/AB%20105841.svg",
  "ab-105838": "/plans/AB%20105841.svg",
  "ab-105844": "/plans/AB%20105841.svg",
  "ab-105811": "/plans/AB%20105811.svg",
  "108134-modul-1": "/plans/108134%20MODUL%201.svg",
};


// Clickable selection boxes drawn on top of a flat plan image.
// Coordinates are percentages of the rendered image (left/top/width/height),
// so they stay aligned at any display size. `componentKey` must match the
// component's `componentKey` in the kitchen data (see prisma/seed.js).
// Coordinates auto-detected from the 3509x2480 plan render by edge-detecting the CAD
// linework (see docs/detect-plan-hotspots.py). Values are % of image width/height, so they
// stay pixel-aligned at any display size. Use ?calibrate=1 on the kitchen page to verify.
export const IMAGE_HOTSPOTS_BY_SLUG = {
  "ab-105806": [
    { componentKey: "refrigerator", left: 3.59, top: 31.83, width: 13.82, height: 63.35 },
    { componentKey: "wall-cabinet-1", left: 18.35, top: 18.91, width: 9.95, height: 25.47 },
    { componentKey: "wall-cabinet-2", left: 28.3, top: 18.91, width: 14.93, height: 25.47 },
    { componentKey: "extractor-hood", left: 28.3, top: 44.38, width: 14.93, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 43.23, top: 18.91, width: 9.95, height: 25.47 },
    { componentKey: "wall-cabinet-4", left: 53.18, top: 18.91, width: 14.92, height: 25.47 },
    { componentKey: "wall-cabinet-5", left: 68.1, top: 18.91, width: 14.93, height: 25.47 },
    { componentKey: "wall-cabinet-6", left: 83.03, top: 18.91, width: 15.56, height: 25.47 },
    { componentKey: "worktop", left: 17.86, top: 62.86, width: 80.73, height: 1.39 },
    { componentKey: "worktop", left: 17.86, top: 62.86, width: 0.4, height: 32.3 },
    { componentKey: "sink-faucet", left: 70.4, top: 56.6, width: 4, height: 7.8 },
    { componentKey: "base-module-1", left: 18.24, top: 64.25, width: 9.94, height: 30.91 },
    { componentKey: "oven-module", left: 28.18, top: 64.25, width: 14.94, height: 30.91 },
    { componentKey: "base-module-2", left: 43.12, top: 64.25, width: 9.94, height: 30.91 },
    { componentKey: "base-module-3", left: 53.06, top: 64.25, width: 14.92, height: 30.91 },
    { componentKey: "sink-base", left: 67.98, top: 64.25, width: 14.94, height: 30.91 },
    { componentKey: "drawer-module", left: 82.92, top: 64.25, width: 15.67, height: 30.91 },
  ],
  "ab-105807": [
    { componentKey: "wall-cabinet-1", left: 4.49, top: 16.01, width: 16.46, height: 26.73 },
    { componentKey: "wall-cabinet-2", left: 20.95, top: 16.01, width: 15.68, height: 26.73 },
    { componentKey: "wall-cabinet-3", left: 36.63, top: 16.01, width: 15.68, height: 26.73 },
    { componentKey: "wall-cabinet-4", left: 52.31, top: 16.01, width: 15.69, height: 26.73 },
    { componentKey: "extractor-hood", left: 52.31, top: 42.74, width: 15.69, height: 7.05 },
    { componentKey: "worktop", left: 4.49, top: 62.14, width: 63.92, height: 1.49 },
    { componentKey: "sink-faucet", left: 30.7, top: 54.5, width: 4.4, height: 8 },
    { componentKey: "drawer-module", left: 4.49, top: 63.63, width: 16.46, height: 32.5 },
    { componentKey: "base-module-2", left: 20.95, top: 63.63, width: 15.68, height: 32.5 },
    { componentKey: "base-module-3", left: 36.63, top: 63.63, width: 15.68, height: 32.5 },
    { componentKey: "oven-module", left: 52.31, top: 63.63, width: 16.1, height: 32.5 },
    { componentKey: "refrigerator", left: 71.37, top: 29.54, width: 14.55, height: 66.59 },
  ],
  "ab-105805": [
    {
      componentKey: "refrigerator",
      points: [[10.6, 29.8], [20.1, 28.4], [28.3, 30.15], [28.41, 85.51], [19.07, 86.73], [10.57, 84.68]],
    },
    {
      componentKey: "wall-cabinet-1",
      points: [[19.92, 18.27], [27.11, 17.25], [31.5, 18.3], [31.5, 40.75], [28.41, 41.19], [28.3, 30.15], [19.9, 28.43]],
    },
    {
      componentKey: "wall-cabinet-2",
      points: [[31.5, 18.3], [27.11, 17.25], [37.21, 15.8], [41.6, 16.85], [41.6, 39.3], [31.5, 40.75]],
    },
    {
      componentKey: "extractor-hood",
      points: [[31.5, 40.75], [41.6, 39.3], [41.6, 44.45], [31.5, 45.9]],
    },
    {
      componentKey: "under-cabinet-light",
      points: [[31.5, 42.3], [41.6, 40.85], [41.6, 44.45], [31.5, 45.9]],
    },
    {
      componentKey: "wall-cabinet-3",
      points: [[41.6, 16.85], [37.21, 15.8], [45.66, 14.55], [50.05, 15.6], [50.05, 38.06], [41.6, 39.3]],
    },
    {
      componentKey: "wall-cabinet-4",
      points: [[50.05, 15.6], [45.66, 14.55], [56.61, 12.94], [61.02, 13.76], [61.02, 36.65], [50.05, 38.06]],
    },
    {
      componentKey: "worktop",
      points: [
        [28.44, 54.44], [35.45, 53.44], [45.57, 51.94], [55.57, 50.4], [64.05, 51.89], [72.55, 53.68],
        [76.8, 54.5], [87.17, 56.68], [87.17, 57.75], [76.8, 59.27], [72.55, 58.4], [64.05, 56.65],
        [55.57, 54.9], [45.57, 56.13], [35.45, 57.8], [28.4, 58.55],
      ],
    },
    {
      componentKey: "base-module-1",
      points: [[28.7, 58.55], [35.45, 57.58], [35.45, 84.84], [28.7, 85.77]],
    },
    {
      componentKey: "oven-module",
      points: [[35.45, 57.58], [45.57, 56.13], [45.57, 83.35], [35.45, 84.84]],
    },
    {
      componentKey: "base-module-2",
      points: [[45.57, 56.13], [55.52, 54.98], [55.52, 82.23], [45.57, 83.35]],
    },
    {
      componentKey: "corner-base",
      points: [[55.55, 55.05], [64.05, 56.65], [64.05, 83.91], [55.55, 82.25]],
    },
    {
      componentKey: "base-module-3",
      points: [[64.05, 56.65], [72.55, 58.4], [72.55, 85.65], [64.05, 83.91]],
    },
    {
      componentKey: "sink-base",
      points: [[72.55, 58.4], [76.8, 59.27], [76.8, 86.53], [72.55, 85.95]],
    },
    {
      componentKey: "sink-base",
      points: [[76.8, 59.25], [87.17, 58.05], [87.17, 85.12], [76.8, 86.53]],
      preserveManualSize: true,
    },
    // End blende left of the corner sink — belongs to the run on the left, not the sink base.

    // Left fridge-end worktop blende (locked with worktop).
    {
      componentKey: "worktop",
      points: [[28.28, 58.7], [28.65, 58.5], [28.72, 85.50], [28.28, 86.02]],
      preserveManualSize: true,
    },
    {
      componentKey: "sink-faucet",
      left: 64,
      top: 44,
      width: 6,
      height: 10.2,
      preserveManualSize: true,
    },
  ],
  "ab-105809": [
  {
    componentKey: "refrigerator",
    points: [[11.54, 29.71], [21.35, 26.82], [27.74, 31.97], [27.74, 80.87], [17.95, 83.76], [11.54, 78.61]],
  },
  {
    componentKey: "worktop",
    points: [[27.74, 48.69], [28.74, 55.43], [29.03, 80.5], [27.74, 80.58]],
    preserveManualSize: true,
  },
  {
    componentKey: "wall-cabinet-1",
    points: [[24.89, 17.11], [31.95, 15.03], [35.48, 17.85], [35.48, 37.66], [27.74, 39.73], [27.74, 31.97], [24.89, 29.7]],
  },
  {
    componentKey: "wall-cabinet-2",
    points: [[31.95, 15.03], [42.54, 11.9], [46.06, 14.76], [46.06, 34.55], [35.48, 37.66], [35.48, 17.85]],
  },
  {
    componentKey: "extractor-hood",
    points: [[35.48, 37.66], [46.06, 34.55], [46.06, 35.8], [35.48, 38.9]],
  },
  {
    componentKey: "wall-cabinet-3",
    points: [[42.54, 11.9], [51.37, 9.33], [54.88, 12.15], [54.88, 31.95], [46.06, 34.55], [46.06, 14.76]],
  },
  {
    componentKey: "wall-cabinet-4",
    points: [[51.37, 9.33], [60.65, 6.59], [64.89, 9.08], [64.89, 29.01], [54.88, 31.95], [54.88, 12.15]],
  },
  {
    componentKey: "worktop",
    points: [[27.74, 48.69], [50.05, 42.12], [56.45, 47.28], [55.49, 48.66], [46.66, 51.26], [36.08, 54.35], [29.03, 56.44], [28.74, 55.43]],
  },
  {
    componentKey: "worktop",
    points: [[50.05, 42.12], [60.65, 39.01], [83.61, 57.51], [73.03, 60.61], [69.25, 58.67], [62.85, 53.51], [55.49, 48.66], [56.45, 47.28]],
  },
  {
    componentKey: "base-module-1",
    points: [[29.03, 56.44], [36.08, 54.35], [36.08, 78.42], [29.03, 80.5]],
  },
  {
    componentKey: "oven-module",
    points: [[36.08, 54.35], [46.66, 51.26], [46.66, 75.29], [36.08, 78.42]],
  },
  {
    componentKey: "base-module-2",
    points: [[46.66, 51.26], [55.49, 48.66], [56.45, 48.37], [56.45, 72.4], [55.49, 72.71], [46.66, 75.29]],
  },
  {
    "componentKey": "corner-base",
    "points": [[56.45, 48.37], [62.85, 53.51], [62.85, 77.58], [56.45, 72.4]],
  },
  {
    "componentKey": "base-module-3",
    "points": [[62.85, 53.51], [69.25, 58.67], [69.25, 82.72], [62.85, 77.58]],
  },
  {
    componentKey: "sink-base",
    points: [[69.25, 58.67], [73.03, 60.61], [73.03, 85.76], [69.25, 82.72]],
  },
  {
    componentKey: "sink-faucet",
    left: 65.32,
    top: 39.84,
    width: 6.01,
    height: 8.95,
    preserveManualSize: true,
  },
  {
    componentKey: "sink-base",
    points: [[73.03, 61.45], [83.61, 58.35], [83.61, 82.66], [73.03, 85.76]],
    preserveManualSize: true,
  },
  {
    componentKey: "worktop",
    points: [[73.03, 60.61], [83.61, 57.51], [83.61, 58.35], [73.03, 61.45]],
    preserveManualSize: true,
  },
],
  "ab-105834": [
    { componentKey: "refrigerator", points: [[8.38, 26.9], [18.41, 25.44], [29.52, 27.34], [18.41, 28.95]] },
    { componentKey: "refrigerator", points: [[8.38, 26.9], [18.41, 28.95], [29.52, 27.34], [29.52, 92.94], [18.41, 93.99], [8.38, 91.94]] },
    { componentKey: "wall-cabinet-1", points: [[19.81, 11.41], [29.52, 10.06], [35.48, 11.13], [25.51, 12.58]] },
    { componentKey: "wall-cabinet-1", points: [[19.81, 11.41], [25.51, 12.58], [25.51, 26.61], [19.81, 25.44]] },
    { componentKey: "wall-cabinet-1", points: [[25.51, 12.58], [35.48, 11.13], [35.48, 37.86], [29.52, 38.86], [29.52, 27.34], [25.51, 26.61]] },
    { componentKey: "wall-cabinet-2", points: [ [35.48, 37.86], [35.48, 39.6], [29.52, 38.55]] },
    { componentKey: "wall-cabinet-2", points: [[29.52, 10.06], [42.75, 8.12], [47.48, 9.4], [35.48, 11.13]] },
    { componentKey: "wall-cabinet-2", points: [[35.48, 11.13], [47.48, 9.4], [47.48, 37.86], [35.48, 39.6]] },
    
    { componentKey: "extractor-hood", points: [[35.98, 44.3], [47.0, 42.9], [47.0, 38.0], [35.98, 39.65]] },
    { componentKey: "wall-cabinet-3", points: [[42.75, 8.32], [54.53, 6.76], [60.28, 7.78], [47.48, 9.55]] },
    { componentKey: "wall-cabinet-3", points: [[47.48, 9.55], [59.48, 7.84], [59.48, 33.98], [47.48, 36.18]] },
    { componentKey: "wall-cabinet-3", points: [[59.48, 7.84], [60.58, 7.78], [60.58, 33.9], [59.48, 33.98]] },
    {
      componentKey: "worktop",
      points: [
        [29.55, 55.52], [46.4, 53.43], [54.81, 52.22], [67.92, 54.84], [94.73, 60.29], [94.82, 62.25],
        [82.83, 63.71], [67.92, 60.89], [53.81, 57.66], [31.81, 60.48], [29.55, 60.55],
      ],
    },
    { componentKey: "base-module-1", points: [[29.55, 60.65], [39.81, 59.41], [39.81, 91.94], [29.65, 93.09]] },
    { componentKey: "oven-module", points: [[39.81, 59.51], [51.81, 57.35], [51.81, 89.52], [39.81, 91.94]] },
    { componentKey: "base-module-2", points: [[51.92, 57.31], [62.3, 59.31], [62.3, 91.55], [51.92, 89.52]] },
    { componentKey: "base-module-3", points: [[72.33, 61.34], [82.67, 63.36], [82.67, 95.55], [72.33, 93.56]] },
    { componentKey: "base-module-3", points: [[82.67, 63.46], [94.54, 62.03], [94.54, 93.74], [82.67, 95.55]] },
    { componentKey: "corner-base", points: [[62.31, 59.71], [72.3, 61.25], [72.41, 93.32], [62.22, 91.82]], preserveManualSize: true },
    { componentKey: "sink-faucet", points: [[69.95, 45.98], [76.1, 45.98], [76.1, 58.89], [69.95, 58.89]], preserveManualSize: true },
  ],
  "ab-105837": [
    { componentKey: "refrigerator", points: [[10.74, 29.62], [20.82, 28.18], [29.74, 30.02], [19.92, 31.56]] },
    { componentKey: "refrigerator", points: [[10.74, 29.62], [19.92, 31.56], [19.92, 90.92], [10.8, 89.05]] },
    { componentKey: "refrigerator", points: [[19.92, 31.56], [30.2, 30.02], [30.2, 89.62], [19.92, 90.92]] },
    { componentKey: "wall-cabinet-1", points: [[20.92, 15.56], [32.09, 13.87], [37.08, 15.07], [26.1, 16.50]] },
    { componentKey: "wall-cabinet-1", points: [[20.92, 15.50], [26.1, 16.5], [26.1, 29.25], [20.8, 28.3]] },
    { componentKey: "wall-cabinet-1", points: [[26.1, 16.70], [37.08, 15.07], [37.08, 39.28], [30.09, 40.45], [30.09, 30.25], [26.1, 29.15]] },
    { componentKey: "wall-cabinet-2", points: [[37.10, 15.17], [48.07, 13.6], [43.02, 12.29], [32.08, 13.87]] },
    { componentKey: "wall-cabinet-2", points: [[37.08, 15.17], [48.02, 13.59], [48.02, 37.69], [37.08, 39.38]] },
    { componentKey: "extractor-hood", points: [[37.09, 41.05], [37.08, 39.28], [32.08, 40.08]], preserveManualSize: true },
    { componentKey: "extractor-hood", points: [[37.08, 39.38], [48.02, 37.69], [48.02, 39.38], [37.08, 41.0]], preserveManualSize: true },
    { componentKey: "extractor-hood", points: [[38.08, 45.38], [47.02, 44.09], [47.02, 39.58], [38.08, 41.0]] },
    { componentKey: "wall-cabinet-3", points: [[43.1, 12.22], [53.55, 10.85], [58.76, 11.9], [48.02, 13.75]] },
    { componentKey: "wall-cabinet-3", points: [[48.02, 13.55], [60.02, 11.80], [60.02, 36.0], [48.02, 37.85]] },
   
    { componentKey: "worktop", points: [[30.34, 56.08], [33.07, 55.93], [52.05, 53.0], [52.05, 55.82], [41.07, 58.02], [30.34, 60.02]] },
    { componentKey: "worktop", points: [[52.05, 53.0], [53.98, 52.7], [61.64, 53.95], [70.85, 55.88], [80.05, 57.72], [91.22, 59.92], [91.22, 60.48], [80.05, 61.82], [70.85, 59.38], [61.64, 57.48], [53.98, 55.95], [52.05, 55.82]] },
    { componentKey: "worktop", points: [[30.34, 60.02], [41.07, 58.02], [52.05, 55.82], [52.05, 57.45], [41.07, 59.05], [30.09, 60.73]], preserveManualSize: true },
    { componentKey: "worktop", points: [[52.05, 55.82], [53.98, 55.95], [61.64, 57.48], [70.85, 59.38], [80.05, 61.82], [91.22, 60.48], [91.22, 61.3], [80.05, 63.02], [70.85, 61.08], [61.64, 59.08], [52.05, 57.25]], preserveManualSize: true },
    { componentKey: "base-module-1", points: [[30.09, 60.73], [41.07, 59.05], [41.07, 88.51], [30.09, 89.90]] },
    { componentKey: "oven-module", points: [[41.07, 59.05], [52.05, 57.45], [52.05, 86.80], [41.07, 88.51]] },
    { componentKey: "base-module-2", points: [[52.05, 57.25], [61.64, 58.92], [61.64, 88.5], [52.05, 86.62]] },
    { componentKey: "base-module-4", points: [[61.64, 59.08], [70.85, 60.88], [70.85, 90.69], [61.64, 88.69]] },
    { componentKey: "base-module-3", points: [[70.85, 61.08], [80.05, 62.82], [80.05, 92.25], [70.85, 90.55]] },
    { componentKey: "base-module-3", points: [[80.05, 63.02], [91.22, 61.30], [91.22, 91.1], [80.05, 92.25]] },
    
    { componentKey: "sink-faucet", points: [[68.6, 46.7], [75.1, 46.7], [75.1, 56.5], [68.6, 56.75]], preserveManualSize: true },
  ],
  "ab-105825": [
    {
      componentKey: "wall-cabinet-1",
      points: [[48.1, 12.2], [57.90, 14.08], [57.90, 37.63], [48.1, 35.63]],
    },
    {
      componentKey: "wall-cabinet-1",
      points: [[48.9, 12.51], [55.16, 11.35], [63.28, 13.32], [57.78, 14.08]],
    },
    {
      componentKey: "wall-cabinet-2",
      points: [[57.9, 13.98], [66.98, 16.1], [66.98, 39.25], [57.98, 37.42]],
    },
    {
      componentKey: "wall-cabinet-2",
      points: [[58.08, 13.98], [63.18, 13.15], [72.86, 15.19], [66.5, 16.03]],
    },
    {
      componentKey: "extractor-hood",
      points: [[57.98, 37.42], [66.98, 39.25], [66.75, 46.22], [58.43, 45.21]],
      preserveManualSize: true,
    },
    {
      componentKey: "extractor-hood",
      points: [[66.75, 39.25], [71.95, 40.55], [66.75, 41.08]],
      preserveManualSize: true,
    },
    {
      componentKey: "wall-cabinet-3",
      points: [[66.68, 16.1], [75.65, 17.88], [75.65, 41.34], [66.78, 39.58]],
    },
    {
      componentKey: "wall-cabinet-3",
      points: [[66.9, 16.0], [75.65, 17.88], [80.98, 17.0], [73.07, 15.09]],
    },
    {
      componentKey: "wall-cabinet-4",
      points: [[75.65, 17.88], [81.88, 17.03], [85.99, 17.8], [80.29, 18.82]],
    },
    {
      componentKey: "wall-cabinet-4",
      points: [[75.65, 17.88], [80.29, 18.7], [80.29, 31.26], [75.65, 31.92]],
    },
    {
      componentKey: "wall-cabinet-4",
      points: [[80.29, 18.82], [86.19, 17.8], [86.19, 30.25], [80.29, 31.26]],
    },
    {
      componentKey: "worktop",
      points: [[6.65, 55.63], [16.75, 54.12], [34.92, 51.09], [41.69, 52.77], [43.71, 54.45], [39.55, 55.13], [34.92, 55.8], [15.8, 58.49], [6.65, 56.81]],
    },
    {
      componentKey: "worktop",
      points: [[37.71, 54.45], [54.51, 51.43], [75.77, 56.13], [75.65, 61.34], [70.43, 59.83], [65.8, 58.82], [55.46, 56.64], [49.64, 55.8]],
    },
    {
      componentKey: "worktop",
      points: [[44.71, 54.45], [75.65, 61.55], [75.65, 61.12], [70.43, 59.83], [65.8, 58.82], [55.46, 56.64], [49.64, 55.8], [45.71, 54.95]],
      preserveManualSize: true,
    },
   
    {
      componentKey: "sink-faucet",
      points: [[22.35, 42.85], [29.5, 42.85], [29.5, 54.3], [22.35, 55.2]],
      preserveManualSize: true,
    },
    {
      componentKey: "base-module-1",
      points: [[6.78, 56.85], [15.56, 58.61], [15.56, 87.16], [6.78, 85.38]],
    },
    {
      componentKey: "base-module-1",
      points: [[15.56, 58.61], [21.63, 57.78], [21.63, 86.31], [15.56, 87.16]],
    },
    {
      componentKey: "dishwasher-base",
      points: [[21.62, 57.88], [32.19, 56.27], [32.19, 84.87], [21.62, 86.39]],
    },
    {
      componentKey: "sink-base",
      points: [[32.19, 56.37], [42.67, 54.78], [42.67, 83.36], [32.19, 84.87]],
    },
    {
      componentKey: "base-module-2",
      points: [[42.47, 54.8], [44.18, 54.8], [53.44, 56.8], [53.44, 85.21], [45.18, 83.36], [42.7, 83.36]],
    },
    {
      componentKey: "oven-base",
      points: [[53.44, 56.8], [62.20, 58.55], [62.20, 87.06], [53.44, 85.21]],
    },
    {
      componentKey: "base-module-3",
      points: [[62.0, 58.55], [71.02, 60.20], [71.02, 88.74], [62.0, 87.06]],
    },
    {
      componentKey: "drawer-base",
      points: [[71.02, 60.40], [75.65, 61.2], [75.65, 89.75], [71.02, 88.74]],
    },
    {
      componentKey: "refrigerator",
      points: [[75.65, 31.76], [84.2, 33.61], [84.2, 90.92], [75.65, 89.75]],
    },
    {
      componentKey: "refrigerator",
      points: [[84.2, 33.61], [94.89, 31.93], [94.79, 89.28], [84.2, 90.92]],
    },
    {
      componentKey: "refrigerator",
      points: [[75.65, 31.76], [85.99, 30.25], [94.89, 31.93], [84.2, 33.61]],
    },
  ],
  "ab-105831": [
    {
      componentKey: "wall-cabinet-1",
      points: [[48.02, 15.85], [57.97, 17.85], [57.97, 41.9], [48.02, 40.35]],
    },
    {
      componentKey: "wall-cabinet-1",
      points: [[48.02, 15.85], [54.05, 15.05], [64.05, 16.85], [57.97, 17.85]],
    },
    {
      componentKey: "wall-cabinet-2",
      points: [[57.97, 18.14], [67.11, 20.0], [67.11, 43.85], [57.97, 42.45]],
    },
    {
      componentKey: "wall-cabinet-2",
      points: [[57.97, 18.14], [67.11, 20.0], [73.9, 19.24], [64.05, 16.85]],
    },
    {
      componentKey: "extractor-hood",
      points: [[57.97, 42.05], [67.11, 43.85], [66.85, 49.85], [58.25, 48.0]],
      preserveManualSize: true,
    },
    {
      componentKey: "extractor-hood",
      points: [[66.85, 43.55], [70.55, 45.05], [66.85, 45.75]],
      preserveManualSize: true,
    },
    {
      componentKey: "wall-cabinet-3",
      points: [[67.11, 20.0], [74.78, 21.25], [74.78, 45.48], [67.11, 43.87]],
    },
    {
      componentKey: "wall-cabinet-3",
      points: [[67.11, 20.0], [74.78, 21.25], [80.87, 20.18], [73.9, 19.24]],
    },
    {
      componentKey: "wall-cabinet-4",
      points: [[74.78, 21.25], [79.37, 20.52], [85.58, 21.25], [85.58, 33.9], [79.37, 34.9], [74.78, 35.32]],
    },
    {
      componentKey: "worktop",
      points: [[5.3, 60.85], [14.55, 59.0], [35.05, 56.45], [43.35, 58.3], [43.35, 59.8], [35.45, 60.55], [15.55, 63.8], [5.3, 62.0]],
    },
    {
      componentKey: "worktop",
      points: [[43.35, 58.3], [55.25, 56.75], [65.55, 59.05], [74.95, 61.0], [74.75, 62.65], [62.35, 61.55], [53.25, 60.35], [43.35, 59.8]],
    },
    {
      componentKey: "worktop",
      points: [  [31.45, 60.55], [42.35, 59.8], [35.35, 60.95], [30.05, 61.5], [10.55, 62.55], [7.3, 63.05]],
      preserveManualSize: true,
    },
    {
      componentKey: "worktop",
      points: [[43.5, 59.8], [55.25, 60.35], [62.35, 61.55], [75.05, 62.65], [74.75, 66.2], [59.35, 62.7], [52.25, 61.5], [45.35, 59.95]],
      preserveManualSize: true,
    },
  
    {
      componentKey: "sink-faucet",
      points: [[25.05, 47.15], [30.8, 47.15], [30.8, 58.15], [25.05, 58.65]],
      preserveManualSize: true,
    },
    {
      componentKey: "base-module-1",
      points: [[5.3, 61.70], [14.55, 63.82], [14.55, 93.2], [5.3, 91.3]],
    },
    {
      componentKey: "base-module-1",
      points: [[14.55, 63.92], [20.45, 62.75], [20.45, 92.27], [14.55, 93.2]],
    },
    {
      componentKey: "base-module-3",
      points: [[20.45, 62.85], [31.45, 61.45], [31.45, 90.8], [20.45, 92.27]],
    },
    {
      componentKey: "sink-base",
      points: [[31.45, 61.55], [42.55, 59.8], [42.25, 89.25], [31.45, 90.8]],
    },
    {
      componentKey: "base-module-2",
      points: [[42.55, 59.58], [53.25, 61.55], [53.25, 91.2], [42.45, 88.85]],
    },
    {
      componentKey: "oven-module",
      points: [[53.25, 61.55], [62.35, 63.55], [62.35, 92.70], [53.25, 91.2]],
    },
    {
      componentKey: "drawer-module",
      points: [[62.35, 63.55], [70.08, 65.24], [70.08, 94.56], [62.35, 93.0]],
    },
    {
      componentKey: "base-module-4",
      points: [[70.08, 65.24], [74.75, 65.95], [74.65, 95.5], [70.08, 94.56]],
    },
    {
      componentKey: "refrigerator",
      points: [[74.89, 35.91], [83.39, 37.34], [83.39, 96.49], [74.89, 95.16]],
    },
    {
      componentKey: "refrigerator",
      points: [[83.39, 37.04], [94.33, 36.01], [94.33, 95.16], [83.39, 96.89]],
    },
    {
      componentKey: "refrigerator",
      points: [[85.89, 34.31], [85.39, 33.45], [86.33, 34.31], [94.53, 35.65], [83.39, 37.34], [73.89, 35.45]],
    },
  ],
  "ab-105808": [
    { componentKey: "refrigerator", left: 3.31, top: 28.08, width: 13.08, height: 59.98 },
    { componentKey: "wall-cabinet-1", left: 17.67, top: 15.89, width: 7.05, height: 24.09 },
    { componentKey: "wall-cabinet-2", left: 24.72, top: 15.89, width: 14.14, height: 24.09 },
    { componentKey: "extractor-hood", left: 24.72, top: 39.98, width: 14.14, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 38.86, top: 15.89, width: 14.12, height: 24.09 },
    { componentKey: "wall-cabinet-4", left: 52.98, top: 15.89, width: 14.12, height: 24.09 },
    { componentKey: "wall-cabinet-5", left: 67.1, top: 15.89, width: 14.13, height: 24.09 },
    { componentKey: "wall-cabinet-6", left: 81.23, top: 15.89, width: 15.07, height: 24.09 },
    { componentKey: "worktop", left: 17.67, top: 57.46, width: 78.63, height: 1.35 },
    { componentKey: "worktop", left: 17.2, top: 57.42, width: 0.45, height: 30.64 },
    { componentKey: "sink-faucet", left: 68.85, top: 50.73, width: 4.85, height: 8 },
    { componentKey: "base-module-1", left: 17.65, top: 58.81, width: 7.07, height: 29.25 },
    { componentKey: "oven-module", left: 24.72, top: 58.81, width: 14.14, height: 29.25 },
    { componentKey: "base-module-2", left: 38.86, top: 58.81, width: 14.12, height: 29.25 },
    { componentKey: "base-module-3", left: 52.98, top: 58.81, width: 14.12, height: 29.25 },
    { componentKey: "sink-base", left: 67.1, top: 58.81, width: 14.13, height: 29.25 },
    { componentKey: "drawer-module", left: 81.23, top: 58.81, width: 15.07, height: 29.25 },
  ],
  "ab-105810": [
    { componentKey: "refrigerator", left: 3.9, top: 27.88, width: 12.97, height: 59.48 },
    { componentKey: "wall-cabinet-1", left: 18.12, top: 15.77, width: 10.51, height: 23.91 },
    { componentKey: "wall-cabinet-2", left: 28.63, top: 15.77, width: 14.02, height: 23.91 },
    { componentKey: "extractor-hood", left: 28.63, top: 39.68, width: 14.02, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 42.65, top: 15.77, width: 9.34, height: 23.91 },
    { componentKey: "wall-cabinet-4", left: 51.99, top: 15.77, width: 14.01, height: 23.91 },
    { componentKey: "wall-cabinet-5", left: 66, top: 15.77, width: 14.01, height: 23.91 },
    { componentKey: "wall-cabinet-6", left: 80.01, top: 15.77, width: 14.85, height: 23.91 },
    { componentKey: "worktop", left: 18.12, top: 57.02, width: 76.61, height: 1.35 },
    { componentKey: "worktop", left: 17.67, top: 56.98, width: 0.45, height: 30.38 },
    { componentKey: "sink-faucet", left: 67.65, top: 50.15, width: 4.35, height: 8 },
    { componentKey: "base-module-1", left: 18.12, top: 58.37, width: 10.51, height: 28.99 },
    { componentKey: "oven-module", left: 28.63, top: 58.37, width: 14.02, height: 28.99 },
    { componentKey: "base-module-2", left: 42.65, top: 58.37, width: 9.34, height: 28.99 },
    { componentKey: "base-module-3", left: 51.99, top: 58.37, width: 14.01, height: 28.99 },
    { componentKey: "sink-base", left: 66, top: 58.37, width: 14.01, height: 28.99 },
    { componentKey: "drawer-module", left: 80.01, top: 58.37, width: 14.85, height: 28.99 },
  ],
  "ab-105812": [
    { componentKey: "refrigerator", left: 2.51, top: 29.15, width: 13.19, height: 60.54 },
    { componentKey: "wall-cabinet-1", left: 17.07, top: 16.85, width: 7.11, height: 24.32 },
    { componentKey: "wall-cabinet-2", left: 24.18, top: 16.85, width: 14.28, height: 24.32 },
    { componentKey: "extractor-hood", left: 24.18, top: 41.17, width: 14.28, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 38.46, top: 16.85, width: 14.26, height: 24.32 },
    { componentKey: "wall-cabinet-4", left: 52.72, top: 16.85, width: 14.25, height: 24.32 },
    { componentKey: "wall-cabinet-5", left: 66.97, top: 16.85, width: 14.26, height: 24.32 },
    { componentKey: "wall-cabinet-6", left: 81.23, top: 16.85, width: 15.17, height: 24.32 },
    { componentKey: "worktop", left: 17.07, top: 58.83, width: 79.33, height: 1.33 },
    { componentKey: "worktop", left: 16.62, top: 58.79, width: 0.45, height: 30.91 },
    { componentKey: "sink-faucet", left: 68.77, top: 52.16, width: 4.85, height: 8 },
    { componentKey: "base-module-1", left: 17.07, top: 60.16, width: 7.11, height: 29.54 },
    { componentKey: "oven-module", left: 24.18, top: 60.16, width: 14.28, height: 29.54 },
    { componentKey: "base-module-2", left: 38.46, top: 60.16, width: 14.26, height: 29.54 },
    { componentKey: "base-module-3", left: 52.72, top: 60.16, width: 14.25, height: 29.54 },
    { componentKey: "sink-base", left: 66.97, top: 60.16, width: 14.26, height: 29.54 },
    { componentKey: "drawer-module", left: 81.23, top: 60.16, width: 15.17, height: 29.54 },
  ],
  "ab-105814": [
    { componentKey: "refrigerator", left: 3.9, top: 27.88, width: 12.97, height: 59.48 },
    { componentKey: "wall-cabinet-1", left: 18.12, top: 15.77, width: 10.51, height: 23.91 },
    { componentKey: "wall-cabinet-2", left: 28.63, top: 15.77, width: 14.02, height: 23.91 },
    { componentKey: "extractor-hood", left: 28.63, top: 39.68, width: 14.02, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 42.65, top: 15.77, width: 9.34, height: 23.91 },
    { componentKey: "wall-cabinet-4", left: 51.99, top: 15.77, width: 14.01, height: 23.91 },
    { componentKey: "wall-cabinet-5", left: 66, top: 15.77, width: 14.01, height: 23.91 },
    { componentKey: "wall-cabinet-6", left: 80.01, top: 15.77, width: 14.85, height: 23.91 },
    { componentKey: "worktop", left: 17.77, top: 57.04, width: 76.96, height: 1.33 },
    { componentKey: "worktop", left: 17.77, top: 57.04, width: 0.37, height: 30.33 },
    { componentKey: "sink-faucet", left: 68.2, top: 51.95, width: 4.85, height: 8 },
    { componentKey: "base-module-1", left: 17.77, top: 58.37, width: 10.88, height: 29.0 },
    { componentKey: "oven-module", left: 28.65, top: 58.37, width: 14.01, height: 29.0 },
    { componentKey: "base-module-2", left: 42.66, top: 58.37, width: 9.35, height: 29.0 },
    { componentKey: "base-module-3", left: 52.01, top: 58.37, width: 14.0, height: 29.0 },
    { componentKey: "sink-base", left: 66.01, top: 58.37, width: 14.01, height: 29.0 },
    { componentKey: "drawer-module", left: 80.02, top: 58.37, width: 14.71, height: 29.0 },
  ],
  "ab-105816": [
    { componentKey: "refrigerator", left: 2.96, top: 28.31, width: 13.19, height: 60.44 },
    { componentKey: "wall-cabinet-1", left: 17.18, top: 15.97, width: 7.11, height: 24.27 },
    { componentKey: "wall-cabinet-2", left: 24.29, top: 15.97, width: 14.25, height: 24.27 },
    { componentKey: "extractor-hood", left: 24.29, top: 40.24, width: 14.25, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 38.54, top: 15.97, width: 14.24, height: 24.27 },
    { componentKey: "wall-cabinet-4", left: 52.78, top: 15.97, width: 14.22, height: 24.27 },
    { componentKey: "wall-cabinet-5", left: 67.0, top: 15.97, width: 14.23, height: 24.27 },
    { componentKey: "wall-cabinet-6", left: 81.23, top: 15.97, width: 15.21, height: 24.27 },
    { componentKey: "worktop", left: 17.17, top: 57.9, width: 79.27, height: 1.35 },
    { componentKey: "worktop", left: 16.72, top: 57.86, width: 0.45, height: 30.89 },
    { componentKey: "sink-faucet", left: 68.75, top: 51.95, width: 4.35, height: 8 },
    { componentKey: "base-module-1", left: 17.17, top: 59.25, width: 7.12, height: 29.5 },
    { componentKey: "oven-module", left: 24.29, top: 59.25, width: 14.25, height: 29.5 },
    { componentKey: "base-module-2", left: 38.54, top: 59.25, width: 14.24, height: 29.5 },
    { componentKey: "base-module-3", left: 52.78, top: 59.25, width: 14.22, height: 29.5 },
    { componentKey: "sink-base", left: 67.0, top: 59.25, width: 14.23, height: 29.5 },
    { componentKey: "drawer-module", left: 81.23, top: 59.25, width: 15.21, height: 29.5 },
  ],
  "ab-105819": [
    { componentKey: "wall-cabinet-1", left: 3.0, top: 17.34, width: 16.51, height: 26.73 },
    { componentKey: "wall-cabinet-2", left: 19.34, top: 17.34, width: 15.67, height: 26.73 },
    { componentKey: "wall-cabinet-3", left: 35.01, top: 17.34, width: 15.67, height: 26.73 },
    { componentKey: "wall-cabinet-4", left: 50.68, top: 17.34, width: 15.68, height: 26.73 },
    { componentKey: "extractor-hood", left: 50.68, top: 44.07, width: 15.68, height: 7.05 },
    { componentKey: "worktop", left: 3.08, top: 63.47, width: 62.88, height: 1.35 },
    { componentKey: "worktop", left: 66.36, top: 63.57, width: 0.45, height: 33.87 },
    { componentKey: "sink-faucet", left: 30.18, top: 56.05, width: 1.48, height: 7.42 },
    { componentKey: "base-module-1", left: 3.0, top: 64.82, width: 16.51, height: 32.62 },
    { componentKey: "sink-base", left: 19.34, top: 64.82, width: 15.67, height: 32.62 },
    { componentKey: "base-module-3", left: 35.01, top: 64.82, width: 15.67, height: 32.62 },
    { componentKey: "oven-module", left: 50.68, top: 64.82, width: 15.68, height: 32.62 },
    { componentKey: "refrigerator", left: 69.75, top: 31.0, width: 14.52, height: 66.43 },
  ],
  "ab-105821": [
    { componentKey: "wall-cabinet-1", left: 6.27, top: 17.98, width: 14.76, height: 26.45 },
    { componentKey: "wall-cabinet-2", left: 21.03, top: 17.98, width: 15.47, height: 26.45 },
    { componentKey: "wall-cabinet-3", left: 36.51, top: 17.98, width: 15.5, height: 26.45 },
    { componentKey: "wall-cabinet-4", left: 52.01, top: 17.98, width: 15.5, height: 26.45 },
    { componentKey: "extractor-hood", left: 52.01, top: 44.44, width: 15.5, height: 7.05 },
    { componentKey: "wall-cabinet-5", left: 67.51, top: 17.98, width: 7.75, height: 26.45 },
    { componentKey: "worktop", left: 6.27, top: 63.63, width: 69.39, height: 1.49 },
    { componentKey: "worktop", left: 75.26, top: 63.63, width: 0.41, height: 33.59 },
    { componentKey: "sink-faucet", left: 31.43, top: 56.21, width: 1.51, height: 7.42, preserveManualSize: true },
    { componentKey: "base-module-1", left: 6.27, top: 65.12, width: 14.76, height: 32.1 },
    { componentKey: "sink-base", left: 21.03, top: 65.12, width: 15.47, height: 32.1 },
    { componentKey: "base-module-3", left: 36.51, top: 65.12, width: 15.5, height: 32.1 },
    { componentKey: "oven-module", left: 52.01, top: 65.12, width: 15.5, height: 32.1 },
    { componentKey: "drawer-module", left: 67.51, top: 65.12, width: 7.75, height: 32.1 },
    { componentKey: "refrigerator", left: 77.2, top: 31.37, width: 14.38, height: 66.08 },
  ],
  "ab-105827": [
    { componentKey: "wall-cabinet-1", left: 12.11, top: 15.85, width: 12.28, height: 22.88 },
    { componentKey: "wall-cabinet-2", left: 24.39, top: 15.85, width: 13.41, height: 22.88 },
    { componentKey: "wall-cabinet-3", left: 37.8, top: 15.85, width: 13.44, height: 22.88 },
    { componentKey: "wall-cabinet-4", left: 51.24, top: 15.85, width: 13.42, height: 22.88 },
    { componentKey: "extractor-hood", left: 51.24, top: 38.73, width: 13.42, height: 7.05 },
    { componentKey: "wall-cabinet-5", left: 64.66, top: 15.85, width: 7.01, height: 22.88 },
    { componentKey: "worktop", left: 12.11, top: 55.36, width: 59.71, height: 1.25 },
    { componentKey: "worktop", left: 71.37, top: 55.36, width: 0.45, height: 24.12 },
    { componentKey: "sink-faucet", left: 31.5, top: 47.5, width: 3.25, height: 9.4, preserveManualSize: true },
    { componentKey: "base-module-1", left: 12.11, top: 56.61, width: 12.28, height: 22.87 },
    { componentKey: "sink-base", left: 24.39, top: 56.61, width: 13.41, height: 22.87 },
    { componentKey: "base-module-3", left: 37.8, top: 56.61, width: 13.44, height: 22.87 },
    { componentKey: "oven-module", left: 51.24, top: 56.61, width: 13.42, height: 22.87 },
    { componentKey: "drawer-module", left: 64.66, top: 56.61, width: 7.16, height: 22.87 },
    { componentKey: "refrigerator", left: 73.04, top: 27.44, width: 12.44, height: 56.99 },
  ],
  "ab-105835": [
    { componentKey: "wall-cabinet-1", left: 0.9, top: 18.87, width: 14.46, height: 22.8 },
    { componentKey: "wall-cabinet-2", left: 15.36, top: 18.87, width: 13.38, height: 22.8 },
    { componentKey: "extractor-hood", left: 15.36, top: 41.67, width: 13.38, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 28.74, top: 18.87, width: 13.38, height: 22.8 },
    { componentKey: "wall-cabinet-4", left: 42.12, top: 18.87, width: 13.38, height: 22.8 },
    { componentKey: "wall-cabinet-5", left: 55.5, top: 18.87, width: 13.37, height: 22.8 },
    { componentKey: "wall-cabinet-6", left: 68.87, top: 18.87, width: 13.37, height: 22.8, preserveManualSize: true },
    { componentKey: "worktop", left: 0.9, top: 58.25, width: 82.14, height: 1.23 },
    { componentKey: "worktop", left: 82.09, top: 58.25, width: 0.55, height: 24.05 },
    { componentKey: "sink-faucet", left: 49.5, top: 51.5, width: 3.85, height: 8 },
    { componentKey: "base-module-1", left: 0.9, top: 59.48, width: 14.46, height: 22.82 },
    { componentKey: "oven-module", left: 15.36, top: 59.48, width: 13.38, height: 22.82 },
    { componentKey: "base-module-2", left: 28.74, top: 59.48, width: 13.38, height: 22.82 },
    { componentKey: "sink-base", left: 42.12, top: 59.48, width: 13.38, height: 22.82 },
    { componentKey: "base-module-3", left: 55.5, top: 59.48, width: 13.23, height: 22.82 },
    { componentKey: "drawer-module", left: 68.87, top: 59.48, width: 12.17, height: 22.82 },
    { componentKey: "refrigerator", left: 84.61, top: 30.3, width: 12.4, height: 56.7 },
  ],
  "ab-105836": [
    { componentKey: "refrigerator", left: 2.3, top: 31.85, width: 10.54, height: 46.8, preserveManualSize: true },
    { componentKey: "worktop", left: 13.23, top: 54.78, width: 0.45, height: 23.94, preserveManualSize: true },
    { componentKey: "wall-cabinet-1", left: 13.75, top: 22.3, width: 10.85, height: 18.71 },
    { componentKey: "wall-cabinet-2", left: 24.73, top: 22.3, width: 11.06, height: 18.71 },
    { componentKey: "extractor-hood", left: 24.73, top: 41.07, width: 11.06, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 35.79, top: 22.3, width: 14.0, height: 18.71 },
    { componentKey: "worktop", left: 13.68, top: 54.78, width: 35.96, height: 1.05 },
    { componentKey: "base-module-1", left: 13.68, top: 55.83, width: 11.04, height: 22.89, preserveManualSize: true },
    { componentKey: "oven-module", left: 24.73, top: 55.83, width: 11.06, height: 22.89, preserveManualSize: true },
    { componentKey: "base-module-2", left: 35.79, top: 55.83, width: 14.0, height: 22.89, preserveManualSize: true },
    { componentKey: "wall-cabinet-4", left: 63.66, top: 22.94, width: 10.55, height: 18.71 },
    { componentKey: "wall-cabinet-5", left: 74.21, top: 22.94, width: 11.06, height: 18.71 },
    { componentKey: "wall-cabinet-6", left: 85.27, top: 22.94, width: 11.75, height: 18.71 },
    { componentKey: "worktop", left: 63.66, top: 54.78, width: 33.37, height: 1.05 },
    { componentKey: "sink-faucet", left: 80.5, top: 48.0, width: 2.85, height: 8, preserveManualSize: true },
    { componentKey: "base-module-3", left: 63.66, top: 55.83, width: 10.55, height: 22.89, preserveManualSize: true },
    { componentKey: "sink-base", left: 74.21, top: 55.83, width: 11.06, height: 22.89, preserveManualSize: true },
    { componentKey: "drawer-module", left: 85.27, top: 55.83, width: 11.76, height: 22.89, preserveManualSize: true },
  ],
  "ab-105842": [
    { componentKey: "refrigerator", left: 3.27, top: 33.29, width: 10.04, height: 44.93, preserveManualSize: true },
    { componentKey: "worktop", left: 14.62, top: 55.55, width: 0.27, height: 22.99, preserveManualSize: true },
    { componentKey: "wall-cabinet-1", left: 14.89, top: 24.29, width: 10.62, height: 18.11 },
    { componentKey: "wall-cabinet-2", left: 25.51, top: 24.25, width: 10.62, height: 18.11 },
    { componentKey: "extractor-hood", left: 25.51, top: 42.36, width: 10.62, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 36.13, top: 24.25, width: 11.5, height: 18.11 },
    { componentKey: "worktop", left: 14.89, top: 55.55, width: 32.74, height: 1.01 },
    { componentKey: "base-module-1", left: 14.89, top: 56.56, width: 10.62, height: 21.98, preserveManualSize: true },
    { componentKey: "oven-module", left: 25.51, top: 56.56, width: 10.62, height: 21.98, preserveManualSize: true },
    { componentKey: "base-module-2", left: 36.13, top: 56.56, width: 11.5, height: 21.98, preserveManualSize: true },
    { componentKey: "wall-cabinet-4", left: 65.15, top: 24.25, width: 10.17, height: 18.11 },
    { componentKey: "wall-cabinet-5", left: 75.32, top: 24.25, width: 10.62, height: 18.11 },
    { componentKey: "wall-cabinet-6", left: 85.94, top: 24.25, width: 11.13, height: 18.11 },
    { componentKey: "worktop", left: 65.15, top: 55.55, width: 31.92, height: 1.01 },
    { componentKey: "sink-faucet", left: 80.6, top: 49.0, width: 3.85, height: 7, preserveManualSize: true },
    { componentKey: "base-module-3", left: 65.15, top: 56.56, width: 10.17, height: 21.98, preserveManualSize: true },
    { componentKey: "sink-base", left: 75.32, top: 56.56, width: 10.62, height: 21.98, preserveManualSize: true },
    { componentKey: "drawer-module", left: 85.94, top: 56.56, width: 11.13, height: 21.98, preserveManualSize: true },
  ],
  "ab-105822": [
    { componentKey: "refrigerator", left: 8.54, top: 28.69, width: 13.13, height: 59.66 },
    { componentKey: "wall-cabinet-1", left: 23.62, top: 16.41, width: 11.79, height: 24.19 },
    { componentKey: "wall-cabinet-2", left: 35.41, top: 16.41, width: 14.18, height: 24.19 },
    { componentKey: "extractor-hood", left: 35.41, top: 40.6, width: 14.18, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 49.59, top: 16.41, width: 14.17, height: 24.19 },
    { componentKey: "wall-cabinet-4", left: 63.76, top: 16.41, width: 14.17, height: 24.19 },
    { componentKey: "wall-cabinet-5", left: 77.93, top: 16.41, width: 15.81, height: 24.19 },
    { componentKey: "worktop", left: 23.24, top: 58.17, width: 70.5, height: 1.33 },
    { componentKey: "worktop", left: 23.24, top: 59.5, width: 0.45, height: 29.16, preserveManualSize: true },
    { componentKey: "base-module-1", left: 23.63, top: 59.5, width: 11.8, height: 24.16 },
    { componentKey: "oven-module", left: 35.43, top: 59.5, width: 14.16, height: 24.16 },
    { componentKey: "base-module-2", left: 49.6, top: 59.5, width: 14.17, height: 24.16 },
    { componentKey: "base-module-3", left: 63.77, top: 59.5, width: 14.16, height: 24.16 },
    { componentKey: "sink-base", left: 77.94, top: 59.5, width: 15.8, height: 24.16 },
    { componentKey: "sink-faucet", left: 80.05, top: 51, width: 4.25, height: 7.5, preserveManualSize: true },
  ],
  "ab-105826": [
    { componentKey: "refrigerator", left: 6.10, top: 28.5, width: 13.0, height: 59.5 },
    { componentKey: "wall-cabinet-1", left: 20.8, top: 16.45, width: 14.05, height: 23.99 },
    { componentKey: "wall-cabinet-2", left: 34.85, top: 16.45, width: 14.1, height: 23.99 },
    { componentKey: "extractor-hood", left: 34.85, top: 40.44, width: 14.1, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 48.95, top: 16.45, width: 14.06, height: 23.99 },
    { componentKey: "wall-cabinet-4", left: 63.01, top: 16.45, width: 14.08, height: 23.99 },
    { componentKey: "wall-cabinet-5", left: 77.09, top: 16.45, width: 15.73, height: 23.99 },
    { componentKey: "worktop", left: 20.8, top: 57.89, width: 72.02, height: 1.35 },
    { componentKey: "worktop", left: 20.35, top: 57.89, width: 0.45, height: 25.3 },
    { componentKey: "sink-faucet", left: 79.05, top: 51.0, width: 4.85, height: 8 },
    { componentKey: "base-module-1", left: 20.8, top: 59.15, width: 14.05, height: 24.04 },
    { componentKey: "oven-module", left: 34.85, top: 59.15, width: 14.1, height: 24.04 },
    { componentKey: "base-module-2", left: 48.95, top: 59.15, width: 14.06, height: 24.04 },
    { componentKey: "base-module-3", left: 63.01, top: 59.15, width: 14.08, height: 24.04 },
    { componentKey: "sink-base", left: 77.09, top: 59.15, width: 15.73, height: 24.04 },
  ],
  "ab-105833": [
    { componentKey: "refrigerator", left: 5.42, top: 31.88, width: 10.17, height: 46.12 },
    { componentKey: "wall-cabinet-1", left: 17.1, top: 22.37, width: 9.08, height: 18.75 },
    { componentKey: "wall-cabinet-2", left: 26.14, top: 22.37, width: 10.90, height: 18.75 },
    { componentKey: "extractor-hood", left: 26.18, top: 41.0, width: 10.91, height: 5.5 },
    { componentKey: "wall-cabinet-3", left: 37.09, top: 22.37
      , width: 11.9, height: 18.75 },
    { componentKey: "wall-cabinet-4", left: 64.21, top: 22.37, width: 10.44, height:18.75 },
    { componentKey: "wall-cabinet-5", left: 74.65, top: 22.37, width: 10.89, height: 18.75 },
    { componentKey: "wall-cabinet-6", left: 85.54, top: 22.37, width: 11.6, height: 18.75},
    { componentKey: "worktop", left: 16.81, top: 54.56, width: 32.09, height: 1.04 },
    { componentKey: "worktop", left: 64.21, top: 54.56, width: 32.83, height: 1.04 },
    { componentKey: "worktop", left: 16.81, top: 54.56, width: 0.29, height: 23.61, preserveManualSize: true },
    { componentKey: "sink-faucet", left: 81.05, top: 49.25, width: 3.35, height: 5.45, preserveManualSize: true },
    { componentKey: "base-module-1", left: 17.1, top: 55.6, width: 9.08, height: 22.57, preserveManualSize: true },
    { componentKey: "oven-module", left: 26.18, top: 55.6, width: 10.91, height: 22.57, preserveManualSize: true },
    { componentKey: "base-module-2", left: 37.09, top: 55.6, width: 11.8, height: 22.57, preserveManualSize: true },
    { componentKey: "base-module-3", left: 64.21, top: 55.6, width: 10.44, height: 22.57, preserveManualSize: true },
    { componentKey: "sink-base", left: 74.65, top: 55.6, width: 10.89, height: 22.57, preserveManualSize: true },
    { componentKey: "drawer-module", left: 85.54, top: 55.6, width: 11.6, height: 22.57, preserveManualSize: true },
  ],
  "ab-105820": [
    { componentKey: "refrigerator", left: 2.14, top: 29.82, width: 13.19, height: 60.48 },
    { componentKey: "wall-cabinet-1", left: 17.16, top: 17.5, width: 7.12, height: 24.27 },
    { componentKey: "wall-cabinet-2", left: 24.28, top: 17.5, width: 14.24, height: 24.27 },
    { componentKey: "extractor-hood", left: 24.28, top: 41.77, width: 14.24, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 38.52, top: 17.5, width: 14.26, height: 24.27 },
    { componentKey: "wall-cabinet-4", left: 52.78, top: 17.5, width: 14.23, height: 24.27 },
    { componentKey: "wall-cabinet-5", left: 67.01, top: 17.5, width: 14.25, height: 24.27 },
    { componentKey: "wall-cabinet-6", left: 81.26, top: 17.5, width: 15.04, height: 24.27 },
    { componentKey: "worktop", left: 17.16, top: 59.48, width: 79.14, height: 1.4 },
    { componentKey: "worktop", left: 16.71, top: 59.44, width: 0.45, height: 30.86 },
    { componentKey: "sink-faucet", left: 68.06, top: 52.88, width: 4.85, height: 8 },
    { componentKey: "base-module-1", left: 17.16, top: 60.88, width: 7.12, height: 29.42 },
    { componentKey: "oven-module", left: 24.28, top: 60.88, width: 14.24, height: 29.42 },
    { componentKey: "base-module-2", left: 38.52, top: 60.88, width: 14.26, height: 29.42 },
    { componentKey: "base-module-3", left: 52.78, top: 60.88, width: 14.23, height: 29.42 },
    { componentKey: "sink-base", left: 67.01, top: 60.88, width: 14.25, height: 29.42 },
    { componentKey: "drawer-module", left: 81.26, top: 60.88, width: 15.04, height: 29.42 },
  ],
  "ab-105841": [
    { componentKey: "wall-cabinet-1", left: 0.9, top: 19.23, width: 13.98, height: 22.73 },
    { componentKey: "wall-cabinet-2", left: 14.88, top: 19.23, width: 13.32, height: 22.73 },
    { componentKey: "extractor-hood", left: 14.88, top: 41.9, width: 13.32, height: 5.5 },
    { componentKey: "wall-cabinet-3", left: 28.2, top: 19.23, width: 13.34, height: 22.73 },
    { componentKey: "wall-cabinet-4", left: 41.54, top: 19.23, width: 13.32, height: 22.73 },
    { componentKey: "wall-cabinet-5", left: 54.86, top: 19.23, width: 13.32, height: 22.73 },
    { componentKey: "wall-cabinet-6", left: 68.18, top: 19.23, width: 13.34, height: 22.73 },
    { componentKey: "worktop", left: 0.9, top: 58.47, width: 80.98, height: 1.4 },
    { componentKey: "worktop", left: 81.88, top: 59.9, width: 0.45, height: 27.44 },
    { componentKey: "sink-faucet", left: 49.19, top: 51.87, width: 4.53, height: 8 },
    { componentKey: "base-module-1", left: 0.9, top: 59.9, width: 13.98, height: 27.44 },
    { componentKey: "oven-module", left: 14.88, top: 59.9, width: 13.32, height: 27.44 },
    { componentKey: "base-module-2", left: 28.2, top: 59.9, width: 13.34, height: 27.44 },
    { componentKey: "sink-base", left: 41.54, top: 59.9, width: 13.32, height: 27.44 },
    { componentKey: "base-module-3", left: 54.86, top: 59.9, width: 13.32, height: 27.44 },
    { componentKey: "drawer-module", left: 68.55, top: 59.9, width: 13.34, height: 27.44 },
    { componentKey: "refrigerator", left: 85.15, top: 30.75, width: 12.35, height: 56.59 },
  ],
  "ab-105845": [
    { componentKey: "refrigerator", left: 1.19, top: 45.04, width: 10.67, height: 48.88, preserveManualSize: true },
    { componentKey: "extractor-hood", left: 29.84, top: 26.22, width: 3.11, height: 16.79, preserveManualSize: true },
    { componentKey: "extractor-hood", left: 25.63, top: 43.01, width: 11.53, height: 10.97, preserveManualSize: true },
    { componentKey: "extractor-hood", left: 25.9, top: 53.9, width: 10.9, height: 6.4, preserveManualSize: true },
    { componentKey: "worktop", left: 13.53, top: 68.94, width: 35.69, height: 1.15, preserveManualSize: true },
    { componentKey: "cook-base-left", left: 14.1, top: 70.09, width: 11.53, height: 23.83, preserveManualSize: true },
    { componentKey: "oven-module", left: 25.63, top: 70.09, width: 11.53, height: 23.83, preserveManualSize: true },
    { componentKey: "cook-base-right", left: 37.16, top: 70.09, width: 11.48, height: 23.83, preserveManualSize: true },
    { componentKey: "wall-cabinet-1", left: 51.64, top: 33.28, width: 11.7, height: 19.92, preserveManualSize: true },
    { componentKey: "wall-cabinet-2", left: 63.34, top: 33.28, width: 11.7, height: 19.92, preserveManualSize: true },
    { componentKey: "wall-cabinet-3", left: 75.04, top: 33.28, width: 11.67, height: 19.92, preserveManualSize: true },
    { componentKey: "wall-cabinet-4", left: 86.71, top: 33.28, width: 11.67, height: 19.92, preserveManualSize: true },
    { componentKey: "under-cabinet-light", left: 60.4, top: 52.6, width: 6.0, height: 7.5, preserveManualSize: true },
    { componentKey: "under-cabinet-light", left: 72.1, top: 52.6, width: 6.0, height: 7.5, preserveManualSize: true },
    { componentKey: "under-cabinet-light", left: 83.8, top: 52.6, width: 6.0, height: 7.5, preserveManualSize: true },
    { componentKey: "worktop", left: 51.31, top: 68.76, width: 47.55, height: 1.16, preserveManualSize: true },
    { componentKey: "sink-faucet", left: 71.43, top: 63.25, width: 1.73, height: 5.57, preserveManualSize: true },
    { componentKey: "wm-base", left: 51.64, top: 69.85, width: 11.7, height: 24.33, preserveManualSize: true },
    { componentKey: "sink-base", left: 63.34, top: 69.85, width: 11.7, height: 24.33, preserveManualSize: true },
    { componentKey: "dishwasher-base", left: 75.04, top: 69.85, width: 11.67, height: 24.33, preserveManualSize: true },
    { componentKey: "drawer-module", left: 86.71, top: 69.85, width: 11.67, height: 24.33, preserveManualSize: true },
  ],
  // AB 105811 reuses the AB 105819 plan render (same view + source PDF), so it mirrors
  // the 105819 hotspot geometry and component layout (dishwasher on base-module-3).
  "ab-105811": [
    { componentKey: "wall-cabinet-1", left: 2.8, top: 17.34, width: 16.54, height: 26.73 },
    { componentKey: "wall-cabinet-2", left: 19.34, top: 17.34, width: 15.67, height: 26.73 },
    { componentKey: "wall-cabinet-3", left: 35.01, top: 17.34, width: 15.67, height: 26.73 },
    { componentKey: "wall-cabinet-4", left: 50.68, top: 17.34, width: 15.68, height: 26.73 },
    { componentKey: "extractor-hood", left: 50.68, top: 44.07, width: 15.68, height: 7.05 },
    { componentKey: "worktop", left: 2.8, top: 63.57, width: 63.56, height: 1.35 },
    { componentKey: "worktop", left: 66.36, top: 63.57, width: 0.45, height: 33.87 },
    { componentKey: "sink-faucet", left: 30.18, top: 56.05, width: 1.48, height: 7.42 },
    { componentKey: "base-module-1", left: 2.8, top: 64.92, width: 16.54, height: 32.52 },
    { componentKey: "sink-base", left: 19.34, top: 64.92, width: 15.67, height: 32.52 },
    { componentKey: "base-module-3", left: 35.01, top: 64.92, width: 15.67, height: 32.52 },
    { componentKey: "oven-module", left: 50.68, top: 64.92, width: 15.68, height: 32.52 },
    { componentKey: "refrigerator", left: 69.75, top: 31.0, width: 14.52, height: 66.43 },
  ],
  // 108134 MODUL 1 — single-wall run, fridge tall unit on the right. Edges auto-detected
  // from the 3509x2480 render (docs/detect-plan-hotspots.py) and overlay-verified.
  // Wall + base columns share dividers at 7.78/22.40/37.02/51.64/66.27/80.89% of width.
  "108134-modul-1": [
    { componentKey: "wall-cabinet-1", left: 7.78, top: 16.96, width: 14.62, height: 24.92 },
    { componentKey: "wall-cabinet-2", left: 22.4, top: 16.96, width: 14.62, height: 24.92 },
    { componentKey: "wall-cabinet-3", left: 37.02, top: 16.96, width: 14.63, height: 24.92 },
    { componentKey: "wall-cabinet-4", left: 51.65, top: 16.96, width: 14.62, height: 24.92 },
    { componentKey: "extractor-hood", left: 51.65, top: 41.88, width: 14.62, height: 7.05 },
    // Under-cabinet LED strip — one box per light symbol drawn beneath wall cabinets 1-3.
    // All three map to the same LED set, so clicking any one toggles the whole lighting set.
    { componentKey: "under-cabinet-light", left: 12.06, top: 41.88, width: 6.0, height: 7.5 },
    { componentKey: "under-cabinet-light", left: 26.65, top: 41.88, width: 6.0, height: 7.5 },
    { componentKey: "under-cabinet-light", left: 41.39, top: 41.88, width: 6.0, height: 7.5 },
    { componentKey: "wall-cabinet-5", left: 66.27, top: 16.96, width: 14.62, height: 24.92 },
    { componentKey: "worktop", left: 7.78, top: 61.35, width: 73.55, height: 1.4 },
    { componentKey: "sink-faucet", left: 29.5, top: 54.0, width: 4.4, height: 8 },
    { componentKey: "base-module-1", left: 7.78, top: 62.72, width: 14.62, height: 25.12 },
    { componentKey: "base-module-2", left: 22.4, top: 62.72, width: 14.62, height: 25.12 },
    { componentKey: "base-module-3", left: 37.02, top: 62.72, width: 14.62, height: 25.12 },
    { componentKey: "oven-module", left: 51.64, top: 62.72, width: 14.63, height: 25.12 },
    { componentKey: "drawer-module", left: 66.27, top: 62.72, width: 14.62, height: 25.12 },
    { componentKey: "refrigerator", left: 83.7, top: 30.93, width: 13.29, height: 61.57 },
    // Left side blende/end panel of the base run — part of the (locked, blue) worktop.
    // Rendered last so its blue locked fill layers above the washing-machine body.
    { componentKey: "worktop", left: 7.34, top: 61.35, width: 0.44, height: 26.49 },
  ],
};

IMAGE_HOTSPOTS_BY_SLUG["ab-105815"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105811"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105809"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105805"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105813"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105805"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105817"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105805"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105840"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105837"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105843"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105837"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105818"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105810"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105824"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105821"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105823"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105822"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105829"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105822"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105832"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105822"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105822"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105825"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105828"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105825"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105830"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105827"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105839"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105842"];
IMAGE_HOTSPOTS_BY_SLUG["105845-modul-2"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105845"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105838"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105841"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105844"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105841"];


const PDF_VIEW_BY_SLUG = {};

const CALIBRATION_TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
export const PLAN_IMAGE_SOURCE_WIDTH = 842;
export const PLAN_IMAGE_SOURCE_HEIGHT = 595;
const PLAN_DIMENSION_LINE_PERCENT = 98.43;
const WALL_CABINET_COMPONENT_KEY_PATTERN = /^wall-cabinet-\d+$/;
const BASE_BODY_COMPONENT_KEYS = new Set([
  "base-module-1",
  "base-module-2",
  "base-module-3",
  "oven-module",
  "sink-base",
  "drawer-module",
]);
const CORNER_BLENDE_MAX_WIDTH = 1.25;
const CORNER_BLENDE_MIN_HEIGHT = 15;
const CORNER_BLENDE_EDGE_TOLERANCE = 1.2;
const CORNER_BLENDE_VERTICAL_TOLERANCE = 0.35;
const BASE_PLINTH_EXTENSION_DISABLED_SLUGS = new Set([
  "ab-105808",
  "ab-105805",
  "ab-105809",
  "ab-105813",
  "ab-105817",
  "ab-105834",
  "ab-105810",
  "ab-105812",
  "ab-105814",
  "ab-105818",
  "ab-105820",
  "ab-105841",
  "ab-105838",
  "ab-105844",
  // L-shaped perspective drawing: base hotspots already include each cabinet's drawn bottom
  // and sit at different heights, so the flat-elevation plinth extension would over-extend them.
  "ab-105837",
  "ab-105840",
  "ab-105843",
  "ab-105831",
  "ab-105816",
]);
// Typical toe-kick height on the 3509×2480 CAD renders (~5.2–5.3% of image height).
const BASE_PLINTH_EXTENSION_PERCENT = 5.25;
// If the base run already reaches within this margin of the floor dimension line, assume
// plinth is included and do not extend (avoids double-counting on older hotspot maps).
const BASE_PLINTH_ALREADY_INCLUDED_GAP = 8;
const PLAN_DISPLAY_CROP_TUNING_BY_SLUG = {
  // AB 105833 has a split run with a large blank page area below the lower cabinets.
  // Keep the crop close to the plinth/floor line instead of carrying the full page tail.
  "ab-105833": {
    bottomPadding: 4,
    bottomLimit: 84,
  },
  "ab-105842": {
    bottomPadding: 4.8,
  },
  "ab-105845": {
    bottomPadding: 4.8,
  },
  "105845-modul-2": {
    bottomPadding: 4.8,
  },
  "ab-105839": {
    bottomPadding: 4.8,
  },
  "ab-105836": {
    bottomPadding: 4.8,
  },
};
const SPLIT_SIDE_WORKTOP_GAP_PERCENT = 8;
const SPLIT_SIDE_OVEN_KEYS = new Set(["oven-module", "oven-base"]);
const SPLIT_SIDE_SINK_KEYS = new Set(["sink-base"]);
const SPLIT_SIDE_LABEL_SLUGS = new Set([
  "ab-105833",
  "ab-105836",
  "ab-105839",
  "ab-105842",
]);

function isBaseBodyHotspot(definition) {
  if (Array.isArray(definition.points) && definition.points.length) {
    return false;
  }
  if (definition.preserveManualSize) {
    return false;
  }
  if (BASE_BODY_COMPONENT_KEYS.has(definition.componentKey)) {
    return true;
  }
  // Tall worktop side strips share the base body column and should include the plinth too.
  return definition.componentKey === "worktop" && definition.height >= 15;
}

function isWallCabinetHotspot(definition) {
  return WALL_CABINET_COMPONENT_KEY_PATTERN.test(definition.componentKey);
}

function isHorizontalWorktopHotspot(definition) {
  return (
    definition.componentKey === "worktop" &&
    definition.width >= 5 &&
    definition.height <= 2
  );
}

function isCornerBlendeHotspot(definition) {
  return (
    definition.componentKey === "worktop" &&
    definition.width > 0 &&
    definition.width <= CORNER_BLENDE_MAX_WIDTH &&
    definition.height >= CORNER_BLENDE_MIN_HEIGHT
  );
}

function canExtendToCornerBlende(definition) {
  if (Array.isArray(definition.points) && definition.points.length) {
    return false;
  }
  if (definition.preserveManualSize) {
    return false;
  }
  return (
    isWallCabinetHotspot(definition) ||
    isBaseBodyHotspot(definition) ||
    isHorizontalWorktopHotspot(definition)
  );
}

function roundHotspotPercent(value) {
  return Math.round(value * 100) / 100;
}

function getHotspotSourceBounds(definition) {
  const points = Array.isArray(definition.points) ? definition.points : [];
  if (points.length) {
    const xs = points.map((point) => Number(point[0])).filter(Number.isFinite);
    const ys = points.map((point) => Number(point[1])).filter(Number.isFinite);
    if (xs.length && ys.length) {
      const left = Math.min(...xs);
      const top = Math.min(...ys);
      const right = Math.max(...xs);
      const bottom = Math.max(...ys);
      return {
        left,
        top,
        right,
        bottom,
        width: Math.max(right - left, 0),
        height: Math.max(bottom - top, 0),
      };
    }
  }

  const left = Number(definition.left || 0);
  const top = Number(definition.top || 0);
  const width = Number(definition.width || 0);
  const height = Number(definition.height || 0);
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  };
}

export function withHotspotSourceBounds(definition) {
  if (!Array.isArray(definition.points) || !definition.points.length) {
    return definition;
  }

  const bounds = getHotspotSourceBounds(definition);
  return {
    ...definition,
    left: roundHotspotPercent(bounds.left),
    top: roundHotspotPercent(bounds.top),
    width: roundHotspotPercent(bounds.width),
    height: roundHotspotPercent(bounds.height),
  };
}

function verticallyOverlapsCornerBlende(definition, blende) {
  const top = definition.top;
  const bottom = definition.top + definition.height;
  const blendeTop = blende.top;
  const blendeBottom = blende.top + blende.height;

  return (
    blendeBottom >= top - CORNER_BLENDE_VERTICAL_TOLERANCE &&
    blendeTop <= bottom + CORNER_BLENDE_VERTICAL_TOLERANCE
  );
}

export function withCornerBlendeExtensions(definitions) {
  const cornerBlenden = definitions.filter(isCornerBlendeHotspot);
  if (!cornerBlenden.length) return definitions;

  return definitions.map((definition) => {
    if (!canExtendToCornerBlende(definition) || isCornerBlendeHotspot(definition)) {
      return definition;
    }

    let left = definition.left;
    let right = definition.left + definition.width;

    cornerBlenden.forEach((blende) => {
      const blendeLeft = blende.left;
      const blendeRight = blende.left + blende.width;
      if (!verticallyOverlapsCornerBlende(definition, blende)) {
        return;
      }

      if (
        blendeRight >= left - CORNER_BLENDE_EDGE_TOLERANCE &&
        blendeRight <= left + CORNER_BLENDE_EDGE_TOLERANCE
      ) {
        left = Math.min(left, blendeLeft);
      }

      if (
        blendeLeft >= right - CORNER_BLENDE_EDGE_TOLERANCE &&
        blendeLeft <= right + CORNER_BLENDE_EDGE_TOLERANCE
      ) {
        right = Math.max(right, blendeRight);
      }
    });

    const nextLeft = roundHotspotPercent(left);
    const nextWidth = roundHotspotPercent(right - left);
    if (nextLeft === definition.left && nextWidth === definition.width) {
      return definition;
    }

    return {
      ...definition,
      left: nextLeft,
      width: nextWidth,
    };
  });
}

// Base hotspots are measured from the door top down to the cabinet bottom, which sits above
// the plinth/toe-kick. Extend them downward so the whole drawn cabinet—including the kick
// board—is clickable, without re-measuring every kitchen.
export function withBasePlinthExtension(definitions, slug) {
  if (BASE_PLINTH_EXTENSION_DISABLED_SLUGS.has(slug)) {
    return definitions;
  }

  const baseBodies = definitions.filter(isBaseBodyHotspot);
  if (!baseBodies.length) return definitions;

  const bodyBottom = Math.max(...baseBodies.map((hotspot) => hotspot.top + hotspot.height));
  const gapToFloor = PLAN_DIMENSION_LINE_PERCENT - bodyBottom;
  if (gapToFloor <= BASE_PLINTH_ALREADY_INCLUDED_GAP) {
    return definitions;
  }

  const targetBottom = Math.min(
    bodyBottom + BASE_PLINTH_EXTENSION_PERCENT,
    PLAN_DIMENSION_LINE_PERCENT - 1,
  );

  return definitions.map((definition) => {
    if (!isBaseBodyHotspot(definition)) {
      return definition;
    }
    const currentBottom = definition.top + definition.height;
    if (currentBottom >= targetBottom - 0.2) {
      return definition;
    }
    return {
      ...definition,
      height: targetBottom - definition.top,
    };
  });
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}

export function getPlanDisplayCrop(hotspots, slug) {
  if (!hotspots.length) {
    return { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 };
  }

  const bounds = hotspots.reduce(
    (current, hotspot) => {
      const hotspotBounds = getHotspotSourceBounds(hotspot);
      return {
        left: Math.min(current.left, hotspotBounds.left),
        top: Math.min(current.top, hotspotBounds.top),
        right: Math.max(current.right, hotspotBounds.right),
        bottom: Math.max(current.bottom, hotspotBounds.bottom),
      };
    },
    { left: 100, top: 100, right: 0, bottom: 0 },
  );

  // Hotspots hug cabinet bodies; the CAD frame, end panels, and fridge alcove often extend
  // beyond them. Pull the crop toward the page edges when there is still margin left.
  const trailingX = 100 - bounds.right;
  const trailingY = 100 - bounds.bottom;
  const leadingX = bounds.left;
  const leadingY = bounds.top;
  const cropTuning = PLAN_DISPLAY_CROP_TUNING_BY_SLUG[slug] || {};

  const left = clampPercent(bounds.left - Math.max(2.6, leadingX * 0.6));
  const top = clampPercent(bounds.top - Math.max(4, leadingY * 0.5));
  const right = clampPercent(Math.min(99.5, bounds.right + Math.max(3.2, trailingX * 0.92)));
  const bottomPadding = cropTuning.bottomPadding ?? Math.max(1, trailingY * 0.85);
  const bottomLimit = cropTuning.bottomLimit ?? 99.5;
  const bottom = clampPercent(Math.min(bottomLimit, bounds.bottom + bottomPadding));

  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(right - left, 1),
    height: Math.max(bottom - top, 1),
  };
}

export function cropPlanHotspot(hotspot, crop) {
  const points = Array.isArray(hotspot.points) ? hotspot.points : [];
  if (points.length) {
    const croppedPoints = points.map((point) => [
      (Number(point[0]) - crop.left) / crop.width * 100,
      (Number(point[1]) - crop.top) / crop.height * 100,
    ]);
    const xs = croppedPoints.map((point) => point[0]).filter(Number.isFinite);
    const ys = croppedPoints.map((point) => point[1]).filter(Number.isFinite);
    if (!xs.length || !ys.length) {
      return { ...hotspot, left: 0, top: 0, width: 0, height: 0 };
    }

    const left = Math.min(...xs);
    const top = Math.min(...ys);
    const right = Math.max(...xs);
    const bottom = Math.max(...ys);
    const width = Math.max(right - left, 0);
    const height = Math.max(bottom - top, 0);
    const clipPathPoints = croppedPoints
      .map(([x, y]) => {
        const localX = width > 0 ? (x - left) / width * 100 : 0;
        const localY = height > 0 ? (y - top) / height * 100 : 0;
        return `${roundHotspotPercent(localX)}% ${roundHotspotPercent(localY)}%`;
      })
      .join(", ");

    return {
      ...hotspot,
      left,
      top,
      width,
      height,
      clipPath: `polygon(${clipPathPoints})`,
    };
  }

  const left = Math.max(hotspot.left, crop.left);
  const top = Math.max(hotspot.top, crop.top);
  const right = Math.min(hotspot.left + hotspot.width, crop.right);
  const bottom = Math.min(hotspot.top + hotspot.height, crop.bottom);

  return {
    ...hotspot,
    left: (left - crop.left) / crop.width * 100,
    top: (top - crop.top) / crop.height * 100,
    width: Math.max(right - left, 0) / crop.width * 100,
    height: Math.max(bottom - top, 0) / crop.height * 100,
  };
}

function cropPlanBox(box, crop) {
  const left = Math.max(box.left, crop.left);
  const top = Math.max(box.top, crop.top);
  const right = Math.min(box.left + box.width, crop.right);
  const bottom = Math.min(box.top + box.height, crop.bottom);

  return {
    ...box,
    left: (left - crop.left) / crop.width * 100,
    top: (top - crop.top) / crop.height * 100,
    width: Math.max(right - left, 0) / crop.width * 100,
    height: Math.max(bottom - top, 0) / crop.height * 100,
  };
}

function getSplitKitchenSideLabels(definitions, crop, slug, translate, language) {
  if (!SPLIT_SIDE_LABEL_SLUGS.has(slug)) return [];

  const worktopRuns = definitions
    .filter(isHorizontalWorktopHotspot)
    .map(getHotspotSourceBounds)
    .filter((bounds) => bounds.width >= 8)
    .sort((a, b) => a.left - b.left);
  if (worktopRuns.length < 2) return [];

  const separatedRuns = worktopRuns.filter((run, index) => {
    const previous = worktopRuns[index - 1];
    const next = worktopRuns[index + 1];
    return (
      (previous && run.left - previous.right >= SPLIT_SIDE_WORKTOP_GAP_PERCENT) ||
      (next && next.left - run.right >= SPLIT_SIDE_WORKTOP_GAP_PERCENT)
    );
  });
  if (separatedRuns.length < 2) return [];

  const findRunForComponent = (componentKeys) => {
    const component = definitions
      .filter((definition) => componentKeys.has(definition.componentKey))
      .map(getHotspotSourceBounds)
      .sort((a, b) => b.width * b.height - a.width * a.height)[0];
    if (!component) return null;

    const centerX = component.left + component.width / 2;
    return separatedRuns.find((run) => centerX >= run.left && centerX <= run.right) || null;
  };

  const ovenRun = findRunForComponent(SPLIT_SIDE_OVEN_KEYS);
  const sinkRun = findRunForComponent(SPLIT_SIDE_SINK_KEYS);
  if (!ovenRun || !sinkRun || ovenRun === sinkRun) return [];

  const getRunLabelTop = (run) => {
    const runElements = definitions
      .map(getHotspotSourceBounds)
      .filter((bounds) => bounds.left < run.right && bounds.right > run.left);
    const runTop = runElements.length ? Math.min(...runElements.map((bounds) => bounds.top)) : run.top;
    return Math.max(0, runTop - 7);
  };

  const toLabel = (run, label) =>
    cropPlanBox(
      {
        label,
        left: run.left,
        top: getRunLabelTop(run),
        width: run.width,
        height: 6,
      },
      crop,
    );

  return [
    toLabel(
      ovenRun,
      translate("configurator.splitKitchenSideA", language === "de" ? "Seite A" : "Side A"),
    ),
    toLabel(
      sinkRun,
      translate("configurator.splitKitchenSideB", language === "de" ? "Seite B" : "Side B"),
    ),
  ].filter((label) => label.width > 0 && label.height > 0);
}

// The sink (faucet + waste) is always part of the default configuration and usually sits on
// the worktop directly above the sink base. Derive a consistent fallback box for those plans,
// while allowing manually calibrated hotspots when the visible bowl/faucet is offset.
export function withDerivedSinkFaucet(definitions, components) {
  if (!definitions.length) return definitions;
  const hasFaucetComponent = components.some(
    (item) => String(item?.componentKey || "").toLowerCase() === "sink-faucet",
  );
  if (!hasFaucetComponent) return definitions;

  const sinkBase = definitions.find((definition) => definition.componentKey === "sink-base");
  const worktop = definitions.find((definition) => definition.componentKey === "worktop");
  if (!sinkBase || !worktop) return definitions;

  const existingFaucet = definitions.find((definition) => definition.componentKey === "sink-faucet");
  if (existingFaucet?.preserveManualSize) {
    return definitions;
  }

  const width = Math.max(4.6, Math.min(sinkBase.width * 0.34, 5.1));
  const height = 8;
  const center = existingFaucet
    ? existingFaucet.left + existingFaucet.width / 2
    : sinkBase.left + sinkBase.width / 2;
  const faucet = {
    componentKey: "sink-faucet",
    left: center - width / 2,
    top: worktop.top - height,
    width,
    height,
  };
  return [
    ...definitions.filter((definition) => definition.componentKey !== "sink-faucet"),
    faucet,
  ];
}

export default function useKitchenSvgStage({
  svgMarkup,
  kitchenConfig,
  kitchenSlug,
  planViewport,
  fixedComponentIds,
  planLockedComponentIds = fixedComponentIds,
  selectedComponentIds,
  setSelectedComponentIds,
  onResetSelection,
}) {
  const { translate, language } = usePublicI18n();
  const svgHostRef = useRef(null);
  const has3dModel = kitchenSlug === "test-3d-kitchen";
  const normalizedKitchenSlug = String(kitchenSlug || "").trim().toLowerCase();
  const imageViewHref = IMAGE_VIEW_BY_SLUG[normalizedKitchenSlug] || "";
  const pdfViewHref = PDF_VIEW_BY_SLUG[normalizedKitchenSlug] || "";
  const hasImageView = Boolean(imageViewHref);
  const hasPdfView = Boolean(pdfViewHref);
  const [activeView, setActiveView] = useState("2d");
  const resolvedSvgMarkup = useMemo(
    () => applyPlanViewportToMarkup(svgMarkup, kitchenConfig.kitchen.slug),
    [kitchenConfig.kitchen.slug, svgMarkup],
  );
  const fixedComponentIdsKey = fixedComponentIds.join("|");
  const planLockedComponentIdsKey = planLockedComponentIds.join("|");
  const componentIds = useMemo(
    () =>
      new Set(
        kitchenConfig.components
          .map((item) => componentIdForItem(item))
          .filter((componentId) => !isHiddenLinkedComponent(kitchenSlug, componentId)),
      ),
    [kitchenConfig.components, kitchenSlug],
  );
  const imageHotspots = useMemo(() => {
    const sourceDefinitions = (IMAGE_HOTSPOTS_BY_SLUG[normalizedKitchenSlug] || [])
      .map(withHotspotSourceBounds);
    const definitions = withBasePlinthExtension(
      withCornerBlendeExtensions(
        withDerivedSinkFaucet(
          sourceDefinitions,
          kitchenConfig.components,
        ),
      ),
      normalizedKitchenSlug,
    );
    if (!definitions.length) return [];

    const componentById = new Map(
      kitchenConfig.components.map((item) => [componentIdForItem(item), item]),
    );

    return definitions
      .map((definition) => {
        const componentId = componentIdForKey(definition.componentKey);
        const item =
          componentById.get(componentId) ||
          getLinkedComponentIds(normalizedKitchenSlug, componentId)
            .map((linkedComponentId) => componentById.get(linkedComponentId))
            .find(Boolean);
        if (!item) {
          return null;
        }
        return {
          ...definition,
          componentId,
          label: getLocalizedItemName(item, translate, language) || item.name || "",
        };
      })
      .filter(Boolean);
  }, [kitchenConfig.components, normalizedKitchenSlug, translate, language]);
  const hasImageHotspots = imageHotspots.length > 0;
  const legendFixedText = translate("configurator.stageLegendFixed", "Fixed parts always remain active");
  const legendPrimaryText =
    has3dModel && activeView === "3d"
      ? "Click parts in the 3D preview or choose on the right"
      : hasImageView
        ? hasImageHotspots
          ? translate("configurator.stageLegendClick", "Click in the plan or choose on the right")
          : translate("configurator.stageLegendChooseRight", "Choose elements on the right")
        : hasPdfView
          ? translate("configurator.stageLegendChooseRight", "Choose elements on the right")
          : translate("configurator.stageLegendClick", "Click in the plan or choose on the right");
  const planDisplayCrop = useMemo(
    () => getPlanDisplayCrop(imageHotspots, normalizedKitchenSlug),
    [imageHotspots, normalizedKitchenSlug],
  );
  const croppedImageHotspots = useMemo(
    () =>
      imageHotspots
        .map((hotspot) => cropPlanHotspot(hotspot, planDisplayCrop))
        .filter((hotspot) => hotspot.width > 0 && hotspot.height > 0),
    [imageHotspots, planDisplayCrop],
  );
  const splitKitchenSideLabels = useMemo(
    () => getSplitKitchenSideLabels(imageHotspots, planDisplayCrop, normalizedKitchenSlug, translate, language),
    [imageHotspots, planDisplayCrop, normalizedKitchenSlug, translate, language],
  );
  const croppedPlanAspectRatio =
    `${planDisplayCrop.width * PLAN_IMAGE_SOURCE_WIDTH} / ${planDisplayCrop.height * PLAN_IMAGE_SOURCE_HEIGHT}`;
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [hoveredComponentId, setHoveredComponentId] = useState(null);
  // Linked parts (e.g. the hood wall cabinet + its pull-out extractor hood) should react as
  // one unit, so hovering either hotspot highlights the whole group.
  const hoveredLinkedGroup = useMemo(
    () => (hoveredComponentId ? getLinkedComponentIds(normalizedKitchenSlug, hoveredComponentId) : []),
    [hoveredComponentId, normalizedKitchenSlug],
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const value = new URLSearchParams(window.location.search).get("calibrate");
    setIsCalibrating(value === "1" || value === "true");
  }, []);

  useEffect(() => {
    if (activeView !== "2d" || hasImageView || hasPdfView) {
      return undefined;
    }

    const host = svgHostRef.current;
    const svg = syncKitchenPlan({
      host,
      svgMarkup: resolvedSvgMarkup,
      planViewport,
      kitchenConfig,
      selectedComponentIds,
      lockedComponentIds: planLockedComponentIds,
      componentIdForItem,
      normalizeColor,
    });

    if (!host || !svg) {
      return undefined;
    }

    const onClick = (event) => {
      const groupsAtPoint = typeof document.elementsFromPoint === "function"
        ? document.elementsFromPoint(event.clientX, event.clientY)
          .map((element) => element.closest?.("[data-component-id]"))
          .filter(Boolean)
        : [event.target.closest?.("[data-component-id]")].filter(Boolean);
      const uniqueGroups = [...new Map(groupsAtPoint.map((group) => [group.dataset.componentId, group])).values()]
        .filter((group) => group.dataset.componentId && componentIds.has(group.dataset.componentId));
      if (!uniqueGroups.length) return;

      const group = uniqueGroups
        .map((candidate) => {
          const hitbox = candidate.querySelector(".component-hitbox") || candidate;
          const rect = hitbox.getBoundingClientRect();
          return {
            group: candidate,
            area: Math.max(rect.width, 1) * Math.max(rect.height, 1),
          };
        })
        .sort((a, b) => a.area - b.area)[0]?.group;
      if (!group) return;

      const componentId = group.dataset.componentId;
      if (fixedComponentIds.includes(componentId)) return;

      setSelectedComponentIds((current) =>
        toggleLinkedComponentSelection(kitchenSlug, current, componentId, fixedComponentIds),
      );
    };

    host.addEventListener("click", onClick, true);
    return () => {
      host.removeEventListener("click", onClick, true);
    };
  }, [
    kitchenConfig,
    kitchenSlug,
    fixedComponentIds,
    planLockedComponentIds,
    hasImageView,
    hasPdfView,
    activeView,
    componentIds,
    planViewport,
    resolvedSvgMarkup,
    selectedComponentIds,
    setSelectedComponentIds,
  ]);

  useEffect(() => {
    if (activeView !== "2d" || hasImageView || hasPdfView) {
      return;
    }

    refreshKitchenPlanSelection({
      host: svgHostRef.current,
      selectedComponentIds,
      lockedComponentIds: planLockedComponentIds,
      kitchenSlug,
    });
  }, [activeView, fixedComponentIdsKey, planLockedComponentIdsKey, selectedComponentIds, fixedComponentIds, planLockedComponentIds, kitchenSlug, hasImageView, hasPdfView]);

  const stageNode = (
    <div className={styles.stage}>
      <div className={styles.stageHeader}>
        <div>
          <p className={styles.eyebrow}>{translate("configurator.stageEyebrow", "Plan")}</p>
          <h2>{translate("configurator.stageTitle", "Plan your kitchen")}</h2>
        </div>
        <div className={styles.stageHeaderActions}>
          {has3dModel ? (
            <div className={styles.viewToggle} role="tablist" aria-label="Kitchen preview view">
              <button
                type="button"
                role="tab"
                aria-selected={activeView === "2d"}
                className={activeView === "2d" ? styles.viewToggleButtonActive : styles.viewToggleButton}
                onClick={() => setActiveView("2d")}
              >
                2D View
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeView === "3d"}
                className={activeView === "3d" ? styles.viewToggleButtonActive : styles.viewToggleButton}
                onClick={() => setActiveView("3d")}
              >
                3D View
              </button>
            </div>
          ) : null}
          <button type="button" className={styles.ghostButton} onClick={onResetSelection}>
            {translate("configurator.resetSelection", "Reset selection")}
          </button>
        </div>
      </div>
      <div className={styles.stageBody}>
        {has3dModel && activeView === "3d" ? (
          <Kitchen3DViewer
            components={kitchenConfig.components}
            componentIds={componentIds}
            fixedComponentIds={fixedComponentIds}
            planLockedComponentIds={planLockedComponentIds}
            selectedComponentIds={selectedComponentIds}
            onToggleComponent={(componentId) => {
              setSelectedComponentIds((current) =>
                toggleLinkedComponentSelection(kitchenSlug, current, componentId, fixedComponentIds),
              );
            }}
          />
        ) : hasImageView ? (
            <div className={styles.pdfCard}>
              {hasImageHotspots ? (
                <div
                  className={styles.planImageWrap}
                  style={{ aspectRatio: croppedPlanAspectRatio }}
                >
                  <img
                    src={imageViewHref}
                    alt={`${kitchenConfig.kitchen.name || "Kitchen"} plan`}
                    className={styles.planImageInteractive}
                    style={{
                      left: `${-(planDisplayCrop.left / planDisplayCrop.width) * 100}%`,
                      top: `${-(planDisplayCrop.top / planDisplayCrop.height) * 100}%`,
                      width: `${(100 / planDisplayCrop.width) * 100}%`,
                      height: `${(100 / planDisplayCrop.height) * 100}%`,
                    }}
                  />
                  <div className={styles.planHotspotLayer}>
                    {croppedImageHotspots.map((hotspot) => {
                      const isFixed = fixedComponentIds.includes(hotspot.componentId);
                      const isDefaultLocked = planLockedComponentIds.includes(hotspot.componentId);
                      // Linked parts (e.g. the hood cabinet + its pull-out hood) toggle together,
                      // but the hidden partner isn't persisted on its own. Mirror the group's
                      // selection so both stay highlighted after a refresh.
                      const linkedIds = getLinkedComponentIds(kitchenSlug, hotspot.componentId);
                      const isSelected =
                        isDefaultLocked || linkedIds.some((linkedId) => selectedComponentIds.includes(linkedId));
                      const isGroupHovered = hoveredLinkedGroup.includes(hotspot.componentId);
                      const hotspotStyle = {
                        left: `${hotspot.left}%`,
                        top: `${hotspot.top}%`,
                        width: `${hotspot.width}%`,
                        height: `${hotspot.height}%`,
                        zIndex:
                          hotspot.componentKey === "sink-faucet"
                            ? 10
                            : hotspot.componentKey === "worktop"
                              ? 4
                              : 1,
                      };
                      if (hotspot.clipPath) {
                        hotspotStyle.clipPath = hotspot.clipPath;
                        hotspotStyle.WebkitClipPath = hotspot.clipPath;
                        hotspotStyle.borderRadius = 0;
                      }
                      const isPolygonHotspot = Boolean(hotspot.clipPath);
                      return (
                        <button
                          key={`${hotspot.componentId}-${hotspot.left}-${hotspot.top}-${hotspot.width}-${hotspot.height}`}
                          type="button"
                          className={[
                            styles.planHotspot,
                            isPolygonHotspot ? styles.planHotspotPolygon : "",
                            isGroupHovered ? styles.planHotspotHover : "",
                            isSelected ? styles.planHotspotSelected : "",
                            isDefaultLocked ? styles.planHotspotLocked : "",
                            isCalibrating ? styles.planHotspotCalibrate : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          style={hotspotStyle}
                          aria-pressed={isSelected}
                          aria-label={hotspot.label}
                          title={
                            isCalibrating
                              ? `${hotspot.componentKey} — left:${hotspot.left} top:${hotspot.top} width:${hotspot.width} height:${hotspot.height}`
                              : hotspot.label
                          }
                          disabled={isFixed}
                          onMouseEnter={() => setHoveredComponentId(hotspot.componentId)}
                          onMouseLeave={() =>
                            setHoveredComponentId((current) =>
                              current === hotspot.componentId ? null : current,
                            )
                          }
                          onFocus={() => setHoveredComponentId(hotspot.componentId)}
                          onBlur={() =>
                            setHoveredComponentId((current) =>
                              current === hotspot.componentId ? null : current,
                            )
                          }
                          onClick={() => {
                            if (fixedComponentIds.includes(hotspot.componentId)) return;
                            setSelectedComponentIds((current) =>
                              toggleLinkedComponentSelection(
                                kitchenSlug,
                                current,
                                hotspot.componentId,
                                fixedComponentIds,
                              ),
                            );
                          }}
                        >
                          {isCalibrating ? (
                            <span className={styles.planHotspotTag}>{hotspot.componentKey}</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                  {splitKitchenSideLabels.length ? (
                    <div className={styles.planSideLabelLayer} aria-hidden="true">
                      {splitKitchenSideLabels.map((sideLabel) => (
                        <div
                          key={sideLabel.label}
                          className={styles.planSideLabel}
                          style={{
                            left: `${sideLabel.left}%`,
                            top: `${sideLabel.top}%`,
                            width: `${sideLabel.width}%`,
                          }}
                        >
                          <strong>{sideLabel.label}</strong>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {isCalibrating ? (
                    <div className={styles.planCalibrationGrid} aria-hidden="true">
                      {CALIBRATION_TICKS.map((tick) => (
                        <div
                          key={`v-${tick}`}
                          className={styles.planCalibrationLineV}
                          style={{ left: `${tick}%` }}
                        >
                          <span className={styles.planCalibrationLabel}>{tick}</span>
                        </div>
                      ))}
                      {CALIBRATION_TICKS.map((tick) => (
                        <div
                          key={`h-${tick}`}
                          className={styles.planCalibrationLineH}
                          style={{ top: `${tick}%` }}
                        >
                          <span className={styles.planCalibrationLabelH}>{tick}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <img
                  src={imageViewHref}
                  alt={`${kitchenConfig.kitchen.name || "Kitchen"} plan`}
                  className={styles.planImage}
                />
              )}
            </div>
        ) : hasPdfView ? (
            <div className={styles.pdfCard}>
              <iframe
                src={pdfViewHref}
                title={`${kitchenConfig.kitchen.name || "Kitchen"} PDF view`}
                className={styles.pdfFrame}
              />
            </div>
        ) : (
            <div className={styles.svgCard}>
              <div
                ref={svgHostRef}
                className={[
                  styles.svgCanvas,
                  planViewport?.canvasClassName === "wide" ? styles.svgCanvasWide : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
            </div>
        )}
      </div>
    </div>
  );

  const legendNode = (
    <div className={styles.stageLegend}>
      <span className={styles.legendChip}>
        <span className={styles.legendSwatch} />
        {legendPrimaryText}
      </span>
      <span className={styles.legendChip}>
        <span className={styles.legendDot} />
        {legendFixedText}
      </span>
    </div>
  );

  return { stage: stageNode, legend: legendNode };
}
