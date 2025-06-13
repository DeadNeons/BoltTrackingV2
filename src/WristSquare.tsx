import React from 'react';
import * as THREE from 'three';

interface WristSquareProps {
  position: THREE.Vector3;
  size: number; // Assuming a square, so size is both width and height
  color?: string;
  opacity?: number;
}

function WristSquare({ position, size, color = '#7302e0', opacity = 0.75 }: WristSquareProps) {
  return (
    <lineSegments position={position}>
      <edgesGeometry args={[new THREE.PlaneGeometry(size, size)]} /> {/* Use edgesGeometry for outline */}
      <lineBasicMaterial color={color} transparent opacity={opacity} /> {/* Use lineBasicMaterial */}
    </lineSegments>
  );
}

export default WristSquare;