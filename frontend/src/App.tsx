import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls, TransformControls } from "@react-three/drei";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";

type ModelPayload =
  | { kind: "geometry"; geometry: THREE.BufferGeometry }
  | { kind: "object"; object: THREE.Object3D };

const SUPPORTED_EXTENSIONS = ["obj", "stl"];

function centerObject(object: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  object.position.sub(center);
}

function prepareObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.material = new THREE.MeshStandardMaterial({
        color: "#c6c6c6",
        roughness: 0.65,
        metalness: 0.1
      });
    }
  });

  centerObject(object);
  return object;
}

function Scene({
  model,
  showGizmo
}: {
  model: ModelPayload | null;
  showGizmo: boolean;
}) {
  const modelRef = useRef<THREE.Group>(null);
  const orbitRef = useRef<{ enabled: boolean } | null>(null);
  const [transformTarget, setTransformTarget] =
    useState<THREE.Object3D | null>(null);

  useEffect(() => {
    setTransformTarget(modelRef.current);
  }, [model]);

  useEffect(() => {
    if (!showGizmo && orbitRef.current) {
      orbitRef.current.enabled = true;
    }
  }, [showGizmo]);

  return (
    <Canvas camera={{ position: [2.5, 2.5, 2.5], fov: 50 }}>
      <color attach="background" args={["#0f1115"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[6, 8, 4]} intensity={0.9} />
      <OrbitControls
        ref={orbitRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enableRotate={!showGizmo}
      />
      {model ? (
        <>
          <Bounds fit clip observe margin={1.2}>
            <group ref={modelRef}>
              {model.kind === "geometry" ? (
                <mesh geometry={model.geometry}>
                  <meshStandardMaterial
                    color="#c6c6c6"
                    roughness={0.65}
                    metalness={0.1}
                  />
                </mesh>
              ) : (
                <primitive object={model.object} />
              )}
            </group>
          </Bounds>
          {showGizmo && transformTarget ? (
            <TransformControls
              mode="rotate"
              object={transformTarget}
              onDraggingChanged={(event) => {
                if (orbitRef.current) {
                  orbitRef.current.enabled = !event.value;
                }
              }}
            />
          ) : null}
        </>
      ) : null}
    </Canvas>
  );
}

export default function App() {
  const [model, setModel] = useState<ModelPayload | null>(null);
  const [showGizmo, setShowGizmo] = useState(true);
  const [status, setStatus] = useState<string>(
    "Drop an OBJ or STL here, or use the picker."
  );

  const handleFile = useCallback(async (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (!extension || !SUPPORTED_EXTENSIONS.includes(extension)) {
      setStatus("Unsupported file type. Use .obj or .stl.");
      return;
    }

    setStatus(`Loading ${file.name}...`);

    try {
      if (extension === "stl") {
        const arrayBuffer = await file.arrayBuffer();
        const geometry = new STLLoader().parse(arrayBuffer);
        geometry.center();
        setModel({ kind: "geometry", geometry });
      } else {
        const text = await file.text();
        const object = new OBJLoader().parse(text);
        setModel({ kind: "object", object: prepareObject(object) });
      }
      setStatus(`Loaded ${file.name}`);
    } catch (error) {
      console.error(error);
      setStatus("Failed to load model. Check the console for details.");
    }
  }, []);

  const dropHandlers = useMemo(
    () => ({
      onDragOver: (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      },
      onDrop: (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const file = event.dataTransfer.files?.[0];
        if (file) {
          void handleFile(file);
        }
      }
    }),
    [handleFile]
  );

  return (
    <div className="viewer">
      <header className="viewer__header">
        <div>
          <h1>Color 3D AI</h1>
          <p>Switch between ring-handle rotation and orbit-only viewing.</p>
        </div>
        <div className="viewer__actions">
          <label className="viewer__input">
            <input
              type="file"
              accept=".obj,.stl"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleFile(file);
                }
              }}
            />
            Choose file
          </label>
          <label className="viewer__toggle">
            <span>{showGizmo ? "Ring handles" : "Orbit only"}</span>
            <input
              type="checkbox"
              checked={showGizmo}
              onChange={(event) => setShowGizmo(event.target.checked)}
            />
            <span aria-hidden="true" className="viewer__switch" />
          </label>
        </div>
      </header>

      <section className="viewer__stage" {...dropHandlers}>
        <div className="viewer__status">{status}</div>
        <Scene model={model} showGizmo={showGizmo} />
      </section>
    </div>
  );
}
