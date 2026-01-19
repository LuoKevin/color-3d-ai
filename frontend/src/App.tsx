import React, { useCallback, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";
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

type Rotation = {
  x: number;
  y: number;
  z: number;
};

function Scene({
  model,
  rotation
}: {
  model: ModelPayload | null;
  rotation: [number, number, number];
}) {
  return (
    <Canvas camera={{ position: [2.5, 2.5, 2.5], fov: 50 }}>
      <color attach="background" args={["#0f1115"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[6, 8, 4]} intensity={0.9} />
      <OrbitControls makeDefault />
      {model ? (
        <Bounds fit clip observe margin={1.2}>
          <group rotation={rotation}>
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
      ) : null}
    </Canvas>
  );
}

export default function App() {
  const [model, setModel] = useState<ModelPayload | null>(null);
  const [rotation, setRotation] = useState<Rotation>({ x: 0, y: 0, z: 0 });
  const [status, setStatus] = useState<string>(
    "Drop an OBJ or STL here, or use the picker."
  );

  const rotationRadians = useMemo<[number, number, number]>(
    () => [
      (rotation.x * Math.PI) / 180,
      (rotation.y * Math.PI) / 180,
      (rotation.z * Math.PI) / 180
    ],
    [rotation]
  );

  const updateRotation = useCallback((axis: keyof Rotation, value: number) => {
    setRotation((current) => ({ ...current, [axis]: value }));
  }, []);

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
          <p>Basic OBJ/STL viewer with orbit controls.</p>
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
          <button
            className="viewer__button"
            type="button"
            onClick={() => setRotation({ x: 0, y: 0, z: 0 })}
          >
            Reset rotation
          </button>
        </div>
      </header>

      <section className="viewer__controls">
        {(["x", "y", "z"] as const).map((axis) => (
          <label key={axis} className="viewer__control">
            <span>{axis.toUpperCase()}</span>
            <input
              type="range"
              min={-180}
              max={180}
              value={rotation[axis]}
              onChange={(event) =>
                updateRotation(axis, Number(event.target.value))
              }
            />
            <span className="viewer__value">{rotation[axis]}°</span>
          </label>
        ))}
      </section>

      <section className="viewer__stage" {...dropHandlers}>
        <div className="viewer__status">{status}</div>
        <Scene model={model} rotation={rotationRadians} />
      </section>
    </div>
  );
}
