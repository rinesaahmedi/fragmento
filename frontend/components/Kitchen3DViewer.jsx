"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, Center, Html, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import styles from "./kitchen-configurator.module.css";

const MODEL_PATH = "/models/TEST.glb";
const DEFAULT_CAMERA_POLAR_ANGLE = 1.23;
const DEFAULT_CAMERA_AZIMUTH_ANGLE = 0.82;
const HORIZONTAL_ROTATION_LIMIT = 0.48;
const BASE_MODULE_WIDTH = 58;
const BASE_MODULE_DEPTH = 58;
const MAIN_RUN_LEFT_EDGE = -203;
const MAIN_RUN_BACK_EDGE = -29;
const RETURN_RUN_X = MAIN_RUN_LEFT_EDGE + BASE_MODULE_WIDTH / 2;
const RETURN_RUN_Z_START = MAIN_RUN_BACK_EDGE - BASE_MODULE_DEPTH / 2;
const RETURN_MODULES = [
  { key: "t3d-corner", label: "Corner", zOffset: 0, face: "corner", handles: ["corner"] },
  { key: "t3d-base", label: "Base", zOffset: 1, face: "return", handles: ["return"] },
  { key: "t3d-drawers", label: "Drawers", zOffset: 2, face: "return", handles: ["returnDrawers"] },
];

const KITCHEN_PARTS = [
  { componentKey: "t3d-wall-1", label: "Wall 1", position: [-180, 182, -78], size: [58, 72, 36], face: "front", handles: ["right"] },
  { componentKey: "t3d-wall-2", label: "Wall 2", position: [-120, 182, -78], size: [58, 72, 36], face: "front", handles: ["right"] },
  { componentKey: "t3d-wall-3", label: "Wall 3", position: [-60, 182, -78], size: [58, 72, 36], face: "front", handles: ["right"] },
  { componentKey: "t3d-wall-4", label: "Wall 4", position: [0, 182, -78], size: [58, 72, 36], face: "front", handles: ["right"] },
  { componentKey: "t3d-wall-5", label: "Wall 5", position: [60, 182, -78], size: [58, 72, 36], face: "front", handles: ["right"] },
  { componentKey: "t3d-light", label: "Lights", position: [-60, 138, -55], size: [250, 7, 10], face: "top", handles: [] },

  { componentKey: "t3d-washer", label: "Washer", position: [-174, 43, 0], size: [58, 86, 58], face: "front", handles: ["top"] },
  { componentKey: "t3d-sink-base", label: "Sink base", position: [-114, 43, 0], size: [58, 86, 58], face: "front", handles: ["top"] },
  { componentKey: "t3d-dishwasher", label: "Dishwasher", position: [-54, 43, 0], size: [58, 86, 58], face: "front", handles: ["top"] },
  { componentKey: "t3d-oven", label: "Oven", position: [6, 43, 0], size: [58, 86, 58], face: "front", handles: ["oven"] },
  { componentKey: "t3d-storage", label: "Storage", position: [66, 43, 0], size: [58, 86, 58], face: "front", handles: ["drawers"] },
  { componentKey: "t3d-worktop-main", label: "Worktop", position: [-54, 90, -1], size: [300, 7, 62], face: "top", handles: [] },
  { componentKey: "t3d-sink", label: "Sink", position: [-114, 96, -6], size: [36, 3, 26], face: "top", handles: ["sink"] },
  { componentKey: "t3d-hood", label: "Hood", position: [6, 126, -56], size: [48, 18, 28], face: "front", handles: [] },

  ...RETURN_MODULES.map((part) => ({
    componentKey: part.key,
    label: part.label,
    position: [RETURN_RUN_X, 43, RETURN_RUN_Z_START - part.zOffset * BASE_MODULE_DEPTH],
    size: [BASE_MODULE_WIDTH, 86, BASE_MODULE_DEPTH],
    face: part.face,
    handles: part.handles,
    runType: "return",
  })),
  { componentKey: "t3d-worktop-return", label: "Worktop", position: [RETURN_RUN_X + 1, 90, RETURN_RUN_Z_START - BASE_MODULE_DEPTH], size: [62, 7, 178], face: "top", handles: [], runType: "return" },
];

function componentIdForKey(componentKey) {
  return `component-${String(componentKey || "")
    .replace(/[^a-z0-9#-]/gi, "")
    .toLowerCase()}`;
}

function getSelectableComponentKey(part) {
  return part.componentKey;
}

function EdgeBox({ size, color = "#eef4f5", opacity = 0.94 }) {
  const geometry = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(...size)), [size]);

  return (
    <lineSegments geometry={geometry} renderOrder={4}>
      <lineBasicMaterial color={color} transparent opacity={opacity} depthTest depthWrite={false} />
    </lineSegments>
  );
}

function DetailBar({ position, size }) {
  return (
    <mesh position={position} renderOrder={5}>
      <boxGeometry args={size} />
      <meshBasicMaterial color="#f4f8f8" transparent opacity={0.9} depthWrite={false} />
    </mesh>
  );
}

function FaceDetails({ face, handles, size }) {
  const [w, h, d] = size;
  const zFront = d / 2 + 0.45;
  const xSide = w / 2 + 0.45;
  const topY = h / 2 + 0.45;
  const details = [];

  if (face === "front" || face === "corner" || face === "return") {
    details.push(<DetailBar key="v-split" position={[0, 0, zFront]} size={[1.2, h * 0.92, 1]} />);
    details.push(<DetailBar key="top-rail" position={[0, h * 0.31, zFront]} size={[w * 0.9, 1.2, 1]} />);
  }

  if (face === "side" || face === "corner" || face === "return") {
    details.push(<DetailBar key="side-v" position={[xSide, 0, 0]} size={[1, h * 0.92, 1.2]} />);
    details.push(<DetailBar key="side-top" position={[xSide, h * 0.31, 0]} size={[1, 1.2, d * 0.88]} />);
  }

  if (handles.includes("right")) {
    details.push(<DetailBar key="handle-r" position={[w * 0.28, -h * 0.08, zFront + 0.5]} size={[2, h * 0.32, 1.2]} />);
  }
  if (handles.includes("top")) {
    details.push(<DetailBar key="handle-top" position={[0, h * 0.22, zFront + 0.5]} size={[w * 0.36, 2, 1.2]} />);
  }
  if (handles.includes("oven")) {
    details.push(<DetailBar key="oven-window" position={[0, -h * 0.05, zFront + 0.5]} size={[w * 0.45, h * 0.32, 1.2]} />);
    details.push(<DetailBar key="oven-handle" position={[0, h * 0.22, zFront + 0.8]} size={[w * 0.45, 2, 1.2]} />);
    details.push(<DetailBar key="oven-controls" position={[0, h * 0.36, zFront + 0.8]} size={[w * 0.55, 1.6, 1.2]} />);
  }
  if (handles.includes("drawers")) {
    [-0.24, 0.02, 0.28].forEach((offset, index) => {
      details.push(<DetailBar key={`drawer-line-${index}`} position={[0, h * offset, zFront + 0.5]} size={[w * 0.8, 1.2, 1.2]} />);
      details.push(<DetailBar key={`drawer-handle-${index}`} position={[0, h * (offset + 0.08), zFront + 0.8]} size={[w * 0.36, 1.8, 1.2]} />);
    });
  }
  if (handles.includes("side")) {
    details.push(<DetailBar key="side-handle" position={[xSide + 0.5, h * 0.18, 0]} size={[1.2, 2, d * 0.38]} />);
  }
  if (handles.includes("corner")) {
    details.push(<DetailBar key="corner-front-handle" position={[w * 0.24, h * 0.16, zFront + 0.5]} size={[2, h * 0.28, 1.2]} />);
    details.push(<DetailBar key="corner-side-handle" position={[xSide + 0.5, h * 0.16, -d * 0.2]} size={[1.2, 2, d * 0.28]} />);
  }
  if (handles.includes("return")) {
    details.push(<DetailBar key="return-front-handle" position={[w * 0.24, h * 0.16, zFront + 0.5]} size={[2, h * 0.28, 1.2]} />);
    details.push(<DetailBar key="return-side-handle" position={[xSide + 0.5, h * 0.16, -d * 0.2]} size={[1.2, 2, d * 0.28]} />);
  }
  if (handles.includes("sideDrawers")) {
    [-0.24, 0.02, 0.28].forEach((offset, index) => {
      details.push(<DetailBar key={`side-drawer-${index}`} position={[xSide + 0.5, h * offset, 0]} size={[1.2, 1.4, d * 0.82]} />);
      details.push(<DetailBar key={`side-drawer-handle-${index}`} position={[xSide + 0.8, h * (offset + 0.08), 0]} size={[1.2, 1.8, d * 0.36]} />);
    });
  }
  if (handles.includes("returnDrawers")) {
    [-0.24, 0.02, 0.28].forEach((offset, index) => {
      details.push(<DetailBar key={`return-front-drawer-${index}`} position={[0, h * offset, zFront + 0.5]} size={[w * 0.8, 1.2, 1.2]} />);
      details.push(<DetailBar key={`return-front-drawer-handle-${index}`} position={[0, h * (offset + 0.08), zFront + 0.8]} size={[w * 0.36, 1.8, 1.2]} />);
      details.push(<DetailBar key={`return-side-drawer-${index}`} position={[xSide + 0.5, h * offset, 0]} size={[1.2, 1.4, d * 0.82]} />);
      details.push(<DetailBar key={`return-side-drawer-handle-${index}`} position={[xSide + 0.8, h * (offset + 0.08), 0]} size={[1.2, 1.8, d * 0.36]} />);
    });
  }
  if (handles.includes("fridge")) {
    details.push(<DetailBar key="fridge-split" position={[xSide + 0.5, h * 0.2, 0]} size={[1.2, 1.4, d * 0.88]} />);
    details.push(<DetailBar key="fridge-handle-top" position={[xSide + 0.8, h * 0.32, -d * 0.24]} size={[1.2, h * 0.18, 2]} />);
    details.push(<DetailBar key="fridge-handle-bottom" position={[xSide + 0.8, -h * 0.1, -d * 0.24]} size={[1.2, h * 0.22, 2]} />);
  }
  if (handles.includes("sink")) {
    details.push(<DetailBar key="sink-bowl-x" position={[0, topY + 0.5, 0]} size={[w * 0.75, 1, 1.2]} />);
    details.push(<DetailBar key="sink-bowl-z" position={[0, topY + 0.5, 0]} size={[1.2, 1, d * 0.75]} />);
    details.push(<DetailBar key="faucet-a" position={[w * 0.28, topY + 5, -d * 0.24]} size={[2, 10, 2]} />);
    details.push(<DetailBar key="faucet-b" position={[w * 0.2, topY + 10, -d * 0.24]} size={[12, 2, 2]} />);
  }

  return details;
}

function KitchenPart({
  part,
  isActive,
  isFixed,
  onToggle,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const active = isActive && !isFixed;
  const highlight = active || isHovered;

  return (
    <group position={part.position}>
      <mesh
        renderOrder={1}
        onClick={(event) => {
          event.stopPropagation();
          if (!isFixed) {
            onToggle();
          }
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setIsHovered(true);
          document.body.style.cursor = isFixed ? "default" : "pointer";
        }}
        onPointerOut={() => {
          setIsHovered(false);
          document.body.style.cursor = "";
        }}
      >
        <boxGeometry args={part.size} />
      <meshStandardMaterial color={highlight ? "#879d92" : "#8f9493"} roughness={0.72} metalness={0.02} />
      </mesh>
      <EdgeBox size={part.size} color={highlight ? "#8cf4b9" : "#f1f5f5"} opacity={highlight ? 1 : 0.92} />
      <FaceDetails face={part.face} handles={part.handles} size={part.size} />
      {isHovered ? (
        <Html center className={styles.viewer3dLabel} pointerEvents="none">
          {part.label}
        </Html>
      ) : null}
    </group>
  );
}

function KitchenCadModel({
  componentIds,
  fixedComponentIds,
  selectedComponentIds,
  onToggleComponent,
}) {
  useGLTF(MODEL_PATH);

  const parts = useMemo(
    () => KITCHEN_PARTS
      .map((part) => ({
        ...part,
        selectableComponentKey: getSelectableComponentKey(part),
        componentId: componentIdForKey(getSelectableComponentKey(part)),
      }))
      .filter((part) => componentIds.has(part.componentId)),
    [componentIds],
  );

  useEffect(() => {
    if (process.env.NODE_ENV === "production" || typeof window === "undefined") return;
    if (window.__TEST_3D_KITCHEN_LAYOUT_LOGGED__) return;

    window.__TEST_3D_KITCHEN_LAYOUT_LOGGED__ = true;
    console.table(
      parts.map((part) => {
        const [x, , z] = part.position;
        const [width, , depth] = part.size;

        return {
          id: part.componentKey,
          type: part.runType || "main",
          x,
          z,
          minX: Number((x - width / 2).toFixed(1)),
          maxX: Number((x + width / 2).toFixed(1)),
          minZ: Number((z - depth / 2).toFixed(1)),
          maxZ: Number((z + depth / 2).toFixed(1)),
          rotationY: 0,
        };
      }),
    );
  }, [parts]);

  return (
    <Bounds fit clip observe margin={1.12}>
      <Center>
        <group rotation={[0, -0.08, 0]}>
          {parts.map((part) => (
            <KitchenPart
              key={`${part.componentKey}-${part.label}`}
              part={part}
              isActive={selectedComponentIds.includes(part.componentId)}
              isFixed={fixedComponentIds.includes(part.componentId)}
              onToggle={() => onToggleComponent(part.componentId)}
            />
          ))}
        </group>
      </Center>
    </Bounds>
  );
}

function LoadingFallback() {
  return (
    <Html center>
      <div className={styles.viewer3dFallback}>Loading 3D model...</div>
    </Html>
  );
}

export default function Kitchen3DViewer({
  components,
  componentIds,
  fixedComponentIds,
  selectedComponentIds,
  onToggleComponent,
}) {
  const componentById = useMemo(
    () => new Map((components || []).map((item) => [componentIdForKey(item.componentKey), item])),
    [components],
  );
  const selectorTitles = useMemo(
    () => KITCHEN_PARTS
      .map((part) => {
        const componentId = componentIdForKey(getSelectableComponentKey(part));
        return {
          label: componentById.get(componentId)?.name || part.label,
          componentId,
        };
      })
      .filter((selector, index, all) =>
        componentIds.has(selector.componentId)
        && all.findIndex((candidate) => candidate.componentId === selector.componentId) === index,
      ),
    [componentById, componentIds],
  );

  return (
    <div className={styles.viewer3dCard}>
      <Canvas
        orthographic
        camera={{
          position: [300, 230, 300],
          zoom: 2.45,
          near: -2000,
          far: 2000,
        }}
        dpr={[1, 2]}
      >
        <color attach="background" args={["#182229"]} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[220, 420, 260]} intensity={1.05} />
        <directionalLight position={[-260, 180, -240]} intensity={0.36} />
        <Suspense fallback={<LoadingFallback />}>
          <KitchenCadModel
            componentIds={componentIds}
            fixedComponentIds={fixedComponentIds}
            selectedComponentIds={selectedComponentIds}
            onToggleComponent={onToggleComponent}
          />
        </Suspense>
        <OrbitControls
          makeDefault
          enableDamping
          enablePan
          enableRotate
          enableZoom
          target={[0, 82, 20]}
          minPolarAngle={DEFAULT_CAMERA_POLAR_ANGLE}
          maxPolarAngle={DEFAULT_CAMERA_POLAR_ANGLE}
          minAzimuthAngle={DEFAULT_CAMERA_AZIMUTH_ANGLE - HORIZONTAL_ROTATION_LIMIT}
          maxAzimuthAngle={DEFAULT_CAMERA_AZIMUTH_ANGLE + HORIZONTAL_ROTATION_LIMIT}
          minZoom={1.4}
          maxZoom={4.8}
        />
      </Canvas>
      <div className={styles.viewer3dAxis} aria-hidden="true">
        <span className={styles.viewer3dAxisX} />
        <span className={styles.viewer3dAxisY} />
        <span className={styles.viewer3dAxisZ} />
      </div>
      <div className={styles.viewer3dAccessibleList} aria-label="Selectable 3D kitchen parts">
        {selectorTitles.map((selector) => (
          <button
            key={selector.componentId}
            type="button"
            onClick={() => {
              if (!fixedComponentIds.includes(selector.componentId)) {
                onToggleComponent(selector.componentId);
              }
            }}
          >
            {selector.label}
          </button>
        ))}
      </div>
    </div>
  );
}

useGLTF.preload(MODEL_PATH);
