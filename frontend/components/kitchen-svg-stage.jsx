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
const IMAGE_VIEW_BY_SLUG = {
  "ab-105806": "/plans/AB%20105806.svg",
  "ab-105807": "/plans/AB%20105807.svg",
  "ab-105808": "/plans/AB%20105808.svg",
  // JPG (not SVG) so the stage matches the PDF/hotspot render 1:1 — the PDF-derived SVG
  // can look different in some browsers when loaded as <img>.
  "ab-105805": "/jpg/AB%20105805_page-0001.jpg",
  "ab-105809": "/jpg/AB%20105809_page-0001.jpg",
  "ab-105834": "/jpg/AB%20105834_page-0001.jpg",
  "ab-105837": "/jpg/AB%20105837_page-0001.jpg",
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
  "ab-105822": "/plans/AB%20105822.svg",
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
const IMAGE_HOTSPOTS_BY_SLUG = {
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
      points: [[10.6, 29.8], [20.1, 28.4], [28.3, 30.15], [28.41, 85.81], [19.07, 86.73], [10.57, 84.68]],
    },
    {
      componentKey: "worktop",
      points: [[28.41, 58.0], [29.3, 58.55], [29.5, 85.5], [28.7, 85.77]],
      preserveManualSize: true,
    },
    {
      componentKey: "wall-cabinet-1",
      points: [[19.92, 18.27], [27.11, 17.25], [31.5, 18.3], [31.5, 42.3], [24.7, 43.3], [19.9, 28.43]],
    },
    {
      componentKey: "wall-cabinet-2",
      points: [[31.5, 18.3], [27.11, 17.25], [37.21, 15.8], [41.6, 16.85], [41.6, 40.85], [31.5, 42.3]],
    },
    {
      componentKey: "extractor-hood",
      points: [[31.5, 42.3], [41.6, 40.85], [41.6, 42.15], [31.5, 43.6]],
    },
    {
      componentKey: "wall-cabinet-3",
      points: [[41.6, 16.85], [37.21, 15.8], [45.66, 14.55], [50.05, 15.6], [50.05, 38.06], [41.6, 40.85]],
    },
    {
      componentKey: "wall-cabinet-4",
      points: [[50.05, 15.6], [45.66, 14.55], [56.61, 12.94], [62.24, 13.99], [62.24, 36.49], [50.05, 38.06]],
    },
    {
      componentKey: "worktop",
      points: [
        [28.7, 54.44], [35.45, 53.44], [45.57, 51.94], [55.57, 50.4], [64.05, 51.89], [72.55, 53.68],
        [76.8, 54.5], [87.17, 56.68], [87.17, 57.0], [76.8, 59.27], [72.55, 58.4], [64.05, 56.65],
        [55.57, 54.9], [45.57, 56.13], [35.45, 57.58], [28.7, 58.55],
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
      points: [[45.57, 56.13], [55.57, 54.9], [55.57, 82.16], [45.57, 83.35]],
    },
    {
      componentKey: "corner-base",
      points: [[55.57, 54.9], [64.05, 56.65], [64.05, 83.91], [55.57, 82.16]],
    },
    {
      componentKey: "base-module-3",
      points: [[64.05, 56.65], [72.55, 58.4], [72.55, 85.65], [64.05, 83.91]],
    },
    {
      componentKey: "sink-base",
      points: [[72.55, 58.4], [76.8, 59.27], [76.8, 86.53], [72.55, 85.65]],
    },
    {
      componentKey: "sink-base",
      points: [[76.8, 59.27], [87.17, 56.65], [87.17, 85.12], [76.8, 86.53]],
      preserveManualSize: true,
    },
    {
      componentKey: "sink-faucet",
      left: 64,
      top: 40,
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
    {
      componentKey: "refrigerator",
      points: [[6.36, 34.13], [17.05, 30.98], [24.03, 36.61], [24.03, 89.92], [13.34, 93.06], [6.36, 87.44]],
    },
    {
      componentKey: "wall-cabinet-1",
      points: [[20.88, 20.86], [30.5, 18.04], [34.33, 21.12], [34.33, 42.7], [24.73, 45.55], [20.88, 42.46]],
    },
    {
      componentKey: "wall-cabinet-2",
      points: [[30.5, 18.04], [42.03, 14.63], [45.85, 17.73], [45.85, 39.31], [34.33, 42.7], [34.33, 21.12]],
    },
    {
      componentKey: "extractor-hood",
      points: [[34.33, 42.7], [45.85, 39.31], [45.85, 40.69], [34.33, 44.07]],
    },
    {
      componentKey: "wall-cabinet-3",
      points: [[42.01, 14.65], [53.56, 11.24], [57.39, 14.35], [57.39, 35.93], [45.85, 39.31], [45.85, 17.73]],
    },
    {
      componentKey: "wall-cabinet-4",
      points: [[53.56, 11.24], [63.68, 8.26], [68.31, 11.0], [68.31, 32.72], [57.39, 35.93], [57.39, 14.35]],
    },
    {
      componentKey: "worktop",
      points: [[24.03, 55.39], [53.02, 46.74], [64.57, 43.35], [90.53, 64.22], [90.53, 65.43], [78.98, 68.82], [60.77, 54.16], [60.0, 52.34], [25.95, 62.39], [24.03, 60.77]],
    },
    {
      componentKey: "worktop",
      points: [[24.03, 60.77], [26.25, 63.48], [26.25, 89.69], [25.95, 89.79], [24.03, 88.24]],
    },
    {
      componentKey: "worktop",
      points: [[25.95, 62.39], [60.0, 52.34], [60.77, 54.16], [60.0, 53.55], [58.95, 53.86], [47.4, 57.26], [35.87, 60.65], [26.25, 63.48]],
    },
    {
      componentKey: "base-module-1",
      points: [[26.25, 63.48], [35.87, 60.65], [35.87, 86.87], [26.25, 89.69]],
    },
    {
      componentKey: "oven-module",
      points: [[35.87, 60.65], [47.4, 57.26], [47.4, 83.48], [35.87, 86.87]],
    },
    {
      componentKey: "drawer-module",
      points: [[47.4, 57.26], [58.95, 53.86], [60.0, 53.55], [60.0, 79.77], [58.95, 80.07], [47.4, 83.48]],
    },
    {
      componentKey: "base-module-2",
      points: [[60.0, 53.55], [60.77, 54.16], [65.42, 57.91], [65.42, 84.13], [60.77, 80.38], [60.0, 79.77]],
    },
    {
      componentKey: "corner-base",
      points: [[65.42, 57.91], [71.81, 63.05], [71.81, 89.27], [65.42, 84.13]],
    },
    {
      componentKey: "base-module-3",
      points: [[71.81, 63.05], [78.8, 68.68], [78.8, 94.9], [71.81, 89.27]],
    },
    {
      componentKey: "base-module-3",
      points: [[78.98, 68.82], [90.53, 65.43], [90.53, 91.73], [78.98, 95.04]],
    },
    {
      componentKey: "sink-faucet",
      points: [[65.7, 55.75], [73.35, 53.5], [84.9, 57.3], [84.9, 61.2], [73.0, 64.45], [65.7, 59.75]],
      preserveManualSize: true,
    },
    {
      componentKey: "sink-faucet",
      points: [[75.45, 49.85], [79.65, 49.85], [79.65, 58.45], [78.45, 58.45], [78.45, 52.75], [75.45, 52.75]],
      preserveManualSize: true,
    },
  ],
  "ab-105837": [
    {
      componentKey: "refrigerator",
      points: [[4.82, 34.48], [15.59, 31.25], [22.26, 36.53], [22.26, 88.42], [11.48, 91.65], [4.82, 86.38]],
    },
    {
      componentKey: "wall-cabinet-1",
      points: [[24.62, 20.72], [31.38, 18.72], [34.78, 21.35], [34.78, 41.85], [28.02, 43.85], [24.62, 40.42]],
    },
    {
      componentKey: "wall-cabinet-2",
      points: [[31.38, 18.72], [41.82, 15.58], [45.22, 18.22], [45.22, 38.72], [34.78, 41.85], [34.78, 21.35]],
    },
    {
      componentKey: "extractor-hood",
      points: [[34.78, 38.72], [45.22, 35.58], [45.22, 40.15], [34.78, 43.28]],
    },
    {
      componentKey: "wall-cabinet-3",
      points: [[41.82, 15.58], [51.05, 12.85], [54.45, 15.48], [54.45, 35.98], [45.22, 38.72], [45.22, 18.22]],
    },
    {
      componentKey: "worktop",
      points: [[22.26, 54.85], [45.15, 48.35], [57.75, 53.95], [86.85, 64.85], [86.85, 66.05], [75.95, 69.45], [57.75, 58.55], [56.95, 56.75], [23.15, 61.85], [22.26, 60.25]],
    },
    {
      componentKey: "worktop",
      points: [[22.26, 60.25], [24.45, 63.05], [24.45, 89.25], [23.15, 89.35], [22.26, 87.82]],
    },
    {
      componentKey: "worktop",
      points: [[23.15, 61.85], [56.95, 56.75], [57.75, 58.55], [56.95, 57.95], [55.92, 58.25], [44.55, 61.65], [33.18, 65.05], [24.45, 63.05]],
    },
    {
      componentKey: "base-module-1",
      points: [[24.45, 63.05], [33.18, 65.05], [33.18, 86.25], [24.45, 88.25]],
    },
    {
      componentKey: "oven-module",
      points: [[33.18, 65.05], [44.55, 61.65], [44.55, 82.85], [33.18, 86.25]],
    },
    {
      componentKey: "base-module-2",
      points: [[44.55, 61.65], [55.92, 58.25], [56.95, 57.95], [56.95, 79.15], [55.92, 79.45], [44.55, 82.85]],
    },
    {
      componentKey: "drawer-module",
      points: [[56.95, 57.95], [57.75, 58.55], [62.35, 61.85], [62.35, 83.05], [57.75, 79.75], [56.95, 79.15]],
    },
    {
      componentKey: "base-module-3",
      points: [[62.35, 61.85], [69.25, 66.15], [69.25, 87.35], [62.35, 83.05]],
    },
    {
      componentKey: "sink-base",
      points: [[69.25, 66.15], [86.85, 64.85], [86.85, 86.05], [75.95, 89.45], [69.25, 87.35]],
    },
    {
      componentKey: "sink-faucet",
      points: [[63.35, 55.65], [71.05, 53.45], [82.55, 57.25], [82.55, 61.15], [70.65, 64.35], [63.35, 59.65]],
      preserveManualSize: true,
    },
    {
      componentKey: "sink-faucet",
      points: [[73.15, 49.75], [77.35, 49.75], [77.35, 58.35], [76.15, 58.35], [76.15, 52.65], [73.15, 52.65]],
      preserveManualSize: true,
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
    { componentKey: "base-module-1", left: 17.65, top: 57.42, width: 7.07, height: 30.64 },
    { componentKey: "oven-module", left: 24.72, top: 57.42, width: 14.14, height: 30.64 },
    { componentKey: "base-module-2", left: 38.86, top: 57.42, width: 14.12, height: 30.64 },
    { componentKey: "base-module-3", left: 52.98, top: 57.42, width: 14.12, height: 30.64 },
    { componentKey: "sink-base", left: 67.1, top: 57.42, width: 14.13, height: 30.64 },
    { componentKey: "drawer-module", left: 81.23, top: 57.42, width: 15.07, height: 30.64 },
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
    { componentKey: "base-module-1", left: 18.12, top: 56.98, width: 10.51, height: 30.38 },
    { componentKey: "oven-module", left: 28.63, top: 56.98, width: 14.02, height: 30.38 },
    { componentKey: "base-module-2", left: 42.65, top: 56.98, width: 9.34, height: 30.38 },
    { componentKey: "base-module-3", left: 51.99, top: 56.98, width: 14.01, height: 30.38 },
    { componentKey: "sink-base", left: 66, top: 56.98, width: 14.01, height: 30.38 },
    { componentKey: "drawer-module", left: 80.01, top: 56.98, width: 14.85, height: 30.38 },
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
    { componentKey: "base-module-1", left: 17.07, top: 58.79, width: 7.11, height: 30.91 },
    { componentKey: "oven-module", left: 24.18, top: 58.79, width: 14.28, height: 30.91 },
    { componentKey: "base-module-2", left: 38.46, top: 58.79, width: 14.26, height: 30.91 },
    { componentKey: "base-module-3", left: 52.72, top: 58.79, width: 14.25, height: 30.91 },
    { componentKey: "sink-base", left: 66.97, top: 58.79, width: 14.26, height: 30.91 },
    { componentKey: "drawer-module", left: 81.23, top: 58.79, width: 15.17, height: 30.91 },
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
    { componentKey: "base-module-1", left: 17.17, top: 57.86, width: 7.12, height: 30.89 },
    { componentKey: "oven-module", left: 24.29, top: 57.86, width: 14.25, height: 30.89 },
    { componentKey: "base-module-2", left: 38.54, top: 57.86, width: 14.24, height: 30.89 },
    { componentKey: "base-module-3", left: 52.78, top: 57.86, width: 14.22, height: 30.89 },
    { componentKey: "sink-base", left: 67.0, top: 57.86, width: 14.23, height: 30.89 },
    { componentKey: "drawer-module", left: 81.23, top: 57.86, width: 15.21, height: 30.89 },
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
    { componentKey: "base-module-1", left: 3.0, top: 63.57, width: 16.51, height: 33.87 },
    { componentKey: "sink-base", left: 19.34, top: 63.57, width: 15.67, height: 33.87 },
    { componentKey: "base-module-3", left: 35.01, top: 63.57, width: 15.67, height: 33.87 },
    { componentKey: "oven-module", left: 50.68, top: 63.57, width: 15.68, height: 33.87 },
    { componentKey: "refrigerator", left: 69.75, top: 31.0, width: 14.52, height: 66.43 },
  ],
  "ab-105821": [
    { componentKey: "wall-cabinet-1", left: 9.89, top: 16.49, width: 13.54, height: 24.32 },
    { componentKey: "wall-cabinet-2", left: 23.43, top: 16.49, width: 14.26, height: 24.32 },
    { componentKey: "wall-cabinet-3", left: 37.69, top: 16.49, width: 14.25, height: 24.32 },
    { componentKey: "wall-cabinet-4", left: 51.94, top: 16.49, width: 14.26, height: 24.32 },
    { componentKey: "extractor-hood", left: 51.94, top: 40.81, width: 14.26, height: 7.05 },
    { componentKey: "wall-cabinet-5", left: 66.2, top: 16.49, width: 7.13, height: 24.32 },
    { componentKey: "worktop", left: 10.34, top: 58.47, width: 62.99, height: 1.35 },
    { componentKey: "worktop", left: 73.33, top: 58.49, width: 0.45, height: 25.66 },
    { componentKey: "sink-faucet", left: 30.35, top: 50.1, width: 6.25, height: 9.4, preserveManualSize: true },
    { componentKey: "base-module-1", left: 9.89, top: 58.49, width: 13.54, height: 25.66 },
    { componentKey: "sink-base", left: 23.43, top: 58.49, width: 14.26, height: 25.66 },
    { componentKey: "base-module-3", left: 37.69, top: 58.49, width: 14.25, height: 25.66 },
    { componentKey: "oven-module", left: 51.94, top: 58.49, width: 14.26, height: 25.66 },
    { componentKey: "drawer-module", left: 66.2, top: 58.49, width: 7.13, height: 25.66 },
    { componentKey: "refrigerator", left: 75.20, top: 29, width: 13.20, height: 60.5}
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
    { componentKey: "worktop", left: 82.59, top: 58.25, width: 0.45, height: 24.05 },
    { componentKey: "sink-faucet", left: 49.5, top: 51.5, width: 3.85, height: 8 },
    { componentKey: "base-module-1", left: 0.9, top: 59.48, width: 14.46, height: 22.82 },
    { componentKey: "oven-module", left: 15.36, top: 59.48, width: 13.38, height: 22.82 },
    { componentKey: "base-module-2", left: 28.74, top: 59.48, width: 13.38, height: 22.82 },
    { componentKey: "sink-base", left: 42.12, top: 59.48, width: 13.38, height: 22.82 },
    { componentKey: "base-module-3", left: 55.5, top: 59.48, width: 13.37, height: 22.82 },
    { componentKey: "drawer-module", left: 68.87, top: 59.48, width: 14.17, height: 22.82 },
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
    { componentKey: "base-module-1", left: 17.16, top: 59.44, width: 7.12, height: 30.86 },
    { componentKey: "oven-module", left: 24.28, top: 59.44, width: 14.24, height: 30.86 },
    { componentKey: "base-module-2", left: 38.52, top: 59.44, width: 14.26, height: 30.86 },
    { componentKey: "base-module-3", left: 52.78, top: 59.44, width: 14.23, height: 30.86 },
    { componentKey: "sink-base", left: 67.01, top: 59.44, width: 14.25, height: 30.86 },
    { componentKey: "drawer-module", left: 81.26, top: 59.44, width: 15.04, height: 30.86 },
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
    { componentKey: "base-module-1", left: 2.8, top: 63.57, width: 16.54, height: 33.87 },
    { componentKey: "sink-base", left: 19.34, top: 63.57, width: 15.67, height: 33.87 },
    { componentKey: "base-module-3", left: 35.01, top: 63.57, width: 15.67, height: 33.87 },
    { componentKey: "oven-module", left: 50.68, top: 63.57, width: 15.68, height: 33.87 },
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
    { componentKey: "worktop", left: 7.78, top: 61.35, width: 73.11, height: 1.4 },
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
IMAGE_HOTSPOTS_BY_SLUG["ab-105818"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105810"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105824"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105821"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105823"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105822"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105829"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105822"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105832"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105822"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105830"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105827"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105839"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105842"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105838"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105841"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105844"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105841"];


const PDF_VIEW_BY_SLUG = {};

const CALIBRATION_TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const PLAN_IMAGE_SOURCE_WIDTH = 842;
const PLAN_IMAGE_SOURCE_HEIGHT = 595;
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

function withHotspotSourceBounds(definition) {
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

function withCornerBlendeExtensions(definitions) {
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
function withBasePlinthExtension(definitions, slug) {
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

function getPlanDisplayCrop(hotspots, slug) {
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

function cropPlanHotspot(hotspot, crop) {
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

// The sink (faucet + waste) is always part of the default configuration and usually sits on
// the worktop directly above the sink base. Derive a consistent fallback box for those plans,
// while allowing manually calibrated hotspots when the visible bowl/faucet is offset.
function withDerivedSinkFaucet(definitions, components) {
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

export default function KitchenSvgStage({
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

  return (
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
          <>
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
            <div className={styles.stageLegend}>
              <span className={styles.legendChip}>
                <span className={styles.legendSwatch} />
                Click parts in the 3D preview or choose on the right
              </span>
              <span className={styles.legendChip}>
                <span className={styles.legendDot} />
                Fixed parts always remain active
              </span>
            </div>
          </>
        ) : hasImageView ? (
          <>
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
                        zIndex: hotspot.componentKey === "sink-faucet" ? 10 : 1,
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
                          title={`${hotspot.componentKey} — left:${hotspot.left} top:${hotspot.top} width:${hotspot.width} height:${hotspot.height}`}
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
            <div className={styles.stageLegend}>
              <span className={styles.legendChip}>
                <span className={styles.legendSwatch} />
                {hasImageHotspots
                  ? translate("configurator.stageLegendClick", "Click in the plan or choose on the right")
                  : translate("configurator.stageLegendChooseRight", "Choose elements on the right")}
              </span>
              <span className={styles.legendChip}>
                <span className={styles.legendDot} />
                {translate("configurator.stageLegendFixed", "Fixed parts always remain active")}
              </span>
            </div>
          </>
        ) : hasPdfView ? (
          <>
            <div className={styles.pdfCard}>
              <iframe
                src={pdfViewHref}
                title={`${kitchenConfig.kitchen.name || "Kitchen"} PDF view`}
                className={styles.pdfFrame}
              />
            </div>
            <div className={styles.stageLegend}>
              <span className={styles.legendChip}>
                <span className={styles.legendSwatch} />
                {translate("configurator.stageLegendChooseRight", "Choose elements on the right")}
              </span>
              <span className={styles.legendChip}>
                <span className={styles.legendDot} />
                {translate("configurator.stageLegendFixed", "Fixed parts always remain active")}
              </span>
            </div>
          </>
        ) : (
          <>
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
            <div className={styles.stageLegend}>
              <span className={styles.legendChip}>
                <span className={styles.legendSwatch} />
                {translate("configurator.stageLegendClick", "Click in the plan or choose on the right")}
              </span>
              <span className={styles.legendChip}>
                <span className={styles.legendDot} />
                {translate("configurator.stageLegendFixed", "Fixed parts always remain active")}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
