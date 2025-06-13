import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';

interface FormationNumberProps {
  position: THREE.Vector3;
  digit: number;
  opacity: number;
  scale?: number;
  color?: string;
}

function FormationNumber({ position, digit, opacity, scale = 0.1, color = '#02ffcc' }: FormationNumberProps) {
  const spriteRef = useRef<THREE.Sprite>(null);

  const material = useMemo(() => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return null;

    canvas.width = 64;
    canvas.height = 64;

    context.font = '45px Arial'; // Larger font for clarity
    context.fillStyle = color;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(digit.toString(), canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.SpriteMaterial({ map: texture, transparent: true });
  }, [digit, color]); // Re-memoize if digit or color changes

  useEffect(() => {
    if (spriteRef.current && material) {
      material.opacity = opacity;
      material.needsUpdate = true;
    }
  }, [opacity, material]);

  if (!material) return null;

  return <sprite ref={spriteRef} material={material} position={position} scale={[scale, scale, scale]} />;
}

export default FormationNumber;