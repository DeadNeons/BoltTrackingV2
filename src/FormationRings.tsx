import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { RingSprite } from './HandTracking'; // Assuming RingSprite is exported from HandTracking.tsx
import { HandConnectionLine } from './HandTracking'; // Assuming HandConnectionLine is exported from HandTracking.tsx
import FormationNumber from './FormationNumber';

interface RingSpriteProps {
  position: THREE.Vector3;
  color: string;
  scale: number;
  ringThickness?: number;
  opacity?: number;
}

function RingSprite2({ position, color, scale, ringThickness = 2, opacity = 1 }: RingSpriteProps) {
  const materialRef = useRef<THREE.SpriteMaterial>(null);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.opacity = opacity;
      materialRef.current.needsUpdate = true;
    }
  }, [opacity]);
  
  const texture = useMemo(() => {
    const size = 64; // Texture size
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) return null;

    context.clearRect(0, 0, size, size);
    context.beginPath();
    context.arc(size / 2, size / 2, size / 2 - ringThickness, 0, Math.PI * 2, false);
    context.lineWidth = ringThickness;
    context.strokeStyle = color;
    context.stroke();

    const canvasTexture = new THREE.CanvasTexture(canvas);
    canvasTexture.needsUpdate = true;
    return canvasTexture;
  }, [color, ringThickness]);

  if (!texture) return null;

  return (
    <sprite position={position} scale={scale}>
     <spriteMaterial attach="material" map={texture} transparent={true} ref={materialRef} />
    </sprite>
  );
}

interface HandConnectionLineProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
}

function HandConnectionLine2({ start, end }: HandConnectionLineProps) {
  const geometryRef = useRef<THREE.BufferGeometry>(new THREE.BufferGeometry());

  useFrame(() => {
    const points = [start, end];
    if (geometryRef.current) {
      geometryRef.current.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(points.flatMap(p => [p.x, p.y, p.z])), 3)
      );
      geometryRef.current.computeBoundingSphere();
    }
  });

  return (
    <line geometry={geometryRef.current}>
      <lineBasicMaterial color="#7302e0" linewidth={1} />
    </line>
  );
}
const FORMATIONS = [
  [
    new THREE.Vector3(0.0, 0.4, 0.0),
    new THREE.Vector3(0.38, 0.12, 0.0),
    new THREE.Vector3(0.24, -0.32, 0.0),
    new THREE.Vector3(-0.24, -0.32, 0.0),
    new THREE.Vector3(-0.38, 0.12, 0.0),
  ],
  [
     new THREE.Vector3(0.0, 0.4, 0.0),
     new THREE.Vector3(0.0, -0.4, 0.0),
     new THREE.Vector3(0.4, 0.0, 0.0),
     new THREE.Vector3(-0.4, 0.0, 0.0),
     new THREE.Vector3(0.0, 0.0, 0.0), // Center point
  ],
  [
    new THREE.Vector3(0.4, 0.0, 0.0),
    new THREE.Vector3(0.0, 0.4, 0.1),
    new THREE.Vector3(-0.4, 0.0, 0.2),
    new THREE.Vector3(0.0, -0.4, 0.3),
    new THREE.Vector3(0.0, 0.0, 0.4),
  ],
  [
   new THREE.Vector3(0.0, 0.4, 0.0),
    new THREE.Vector3(0.3, 0.1, 0.0),
    new THREE.Vector3(-0.3, 0.1, 0.0),
    new THREE.Vector3(0.2, -0.3, 0.0),
    new THREE.Vector3(-0.2, -0.3, 0.0),
  ],
];

const FORMATION_CHANGE_INTERVAL = 1000; // 5 seconds to hold a formation
const TRANSITION_DURATION = 750; // 1 second for transition

const FormationRings: React.FC = () => {
  const [currentFormationIndex, setCurrentFormationIndex] = useState(0);
  const startRingPositions = useRef<THREE.Vector3[]>(FORMATIONS[0]);
  const targetRingPositions = useRef<THREE.Vector3[]>(FORMATIONS[0]);
  const ringDisplayPositions = useRef<THREE.Vector3[]>(FORMATIONS[0]);
  const lastFormationChangeTime = useRef(Date.now());
  const [isHoldingFormation, setIsHoldingFormation] = useState(true);

  useEffect(() => {
    // Set the starting positions for the transition
    startRingPositions.current = [...ringDisplayPositions.current];
    // Set the target positions for the new formation
    targetRingPositions.current = FORMATIONS[currentFormationIndex];
    // Reset the timer for the new transition
    lastFormationChangeTime.current = Date.now();
    setIsHoldingFormation(false); // Start transition
  }, [currentFormationIndex]);

  useFrame(() => {
    const now = Date.now();
    const elapsedSinceChange = now - lastFormationChangeTime.current;

    // Handle transition
    if (elapsedSinceChange < TRANSITION_DURATION) {
      const t = elapsedSinceChange / TRANSITION_DURATION;
      ringDisplayPositions.current = startRingPositions.current.map((startPos, i) => {
        const targetPos = targetRingPositions.current[i];
        return new THREE.Vector3().lerpVectors(startPos, targetPos, t);
      });
      setIsHoldingFormation(false); // Still transitioning
    } else {
      // Ensure positions are exactly the target positions after transition
      ringDisplayPositions.current = [...targetRingPositions.current];
      setIsHoldingFormation(true); // Holding formation

      // Handle hold duration and switch to next formation
      if (elapsedSinceChange >= FORMATION_CHANGE_INTERVAL) {
        setCurrentFormationIndex((prevIndex) => (prevIndex + 1) % FORMATIONS.length);
      }
    }
  });

  const numberOpacity = isHoldingFormation ? 1 : 0; // Opacity based on holding state

  return (
    <group position={[3.6, -1, 0]}> {/* Adjust position as needed to place it below the code streamer */}
      {ringDisplayPositions.current.map((pos, index) => (
        <React.Fragment key={`formation-item-${index}`}>
          <RingSprite2
            position={pos}
            color="#02ffcc" // Color for the formation rings
            scale={0.1} // Adjust scale as needed
            ringThickness={2}
          />
          <FormationNumber
            position={pos}
            digit={index} // Display the index of the point
            opacity={numberOpacity}
            scale={0.15} // Adjust scale for numbers
          />
        </React.Fragment>
      ))}
      {/* Dynamic connections for all rings */}
     {ringDisplayPositions.current.map((pos, index) => {
        const nextIndex = (index + 1) % ringDisplayPositions.current.length;
        return (
          <HandConnectionLine2 key={`formation-line-${index}`} start={pos} end={ringDisplayPositions.current[nextIndex]} />
        );
      })}
    </group>
  );
};

export default FormationRings;