import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber'; // Import useFrame here

interface NumberItemProps {
  initialPhi: number;
  initialTheta: number;
  digit: number;
  radius: number;
  speed: number; // New prop for animation speed
}

function NumberItem({ initialPhi, initialTheta, digit, radius, speed }: NumberItemProps) {
  const spriteRef = useRef<THREE.Sprite>(null);
  const currentTheta = useRef(initialTheta); // Use ref to persist theta across renders

  // Create the texture and material once
  const material = useMemo(() => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return null;

    canvas.width = 64;
    canvas.height = 64;

    context.font = 'Bold 12px Arial'; // Make font larger for better visibility
    context.fillStyle = '#02ffcc'; // Text color
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(digit.toString(), canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.SpriteMaterial({ map: texture, transparent: true });
  }, [digit]);

  useFrame((state, delta) => {
    if (spriteRef.current && material) {
      // Update theta for continuous movement
      currentTheta.current += speed * delta; // delta is time since last frame
      if (currentTheta.current > Math.PI * 2) {
        currentTheta.current -= Math.PI * 2; // Wrap around
      }

      // Recalculate position based on updated theta
      spriteRef.current.position.set(
        radius * Math.sin(initialPhi) * Math.cos(currentTheta.current),
        radius * Math.sin(initialPhi) * Math.sin(currentTheta.current),
        radius * Math.cos(initialPhi)
      );
    }
  });

  if (!material) return null;

  return <sprite ref={spriteRef} material={material} scale={[0.2, 0.2, 0.2]} />; // Set initial scale
}

interface NumberSphereProps {
  radius?: number;
  count?: number;
  animationSpeed?: number; // New prop for overall animation speed
  rotation?: THREE.Euler; // New prop for overall sphere rotation
  targetPosition?: THREE.Vector3; // NEW: Prop for the target position to look at
}

function NumberSphere({ radius = 1, count = 100, animationSpeed = 0.5, rotation , targetPosition }: NumberSphereProps) {
  const groupRef = useRef<THREE.Group>(null); // NEW: Ref for the group to control its rotation
  const numberData = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const digit = Math.floor(Math.random() * 10); // Random digit from 0-9
      const phi = Math.acos(2 * Math.random() - 1); // Latitude
      const theta = Math.random() * Math.PI * 2; // Longitude
      temp.push({ phi, theta, digit });
    }
    return temp;
  }, [count]); // Only re-generate if count changes

  // NEW: useFrame to make the sphere look at the targetPosition
  useFrame(() => {
    if (groupRef.current && targetPosition) {
      // Define the fixed position of the sphere model (e.g., origin)
      const fixedSpherePosition = new THREE.Vector3(0, 0, 0); // Assuming the sphere is at the origin

      // Calculate the direction vector from the sphere's fixed position to the target hand position
      const direction = new THREE.Vector3().subVectors(targetPosition, fixedSpherePosition).normalize();

      // Calculate the target rotation (yaw and pitch)
      const targetYaw = Math.atan2(direction.x, direction.z);
      const targetPitch = Math.asin(-direction.y);

      // Define rotation limits (e.g., +/- 90 degrees) - adjust as needed
      const yawLimit = Math.PI / 2;
      const pitchLimit = Math.PI / 2;

      // Clamp the rotation angles
      const clampedYaw = Math.max(-yawLimit, Math.min(yawLimit, targetYaw));
      const clampedPitch = Math.max(-pitchLimit, Math.min(pitchLimit, targetPitch));

      // Apply the clamped rotation to the sphere group
      // Ensure the rotation order is appropriate, 'YXZ' is common for head/eye rotations
      groupRef.current.rotation.set(clampedPitch, clampedYaw, 0, 'YXZ');
    }
  });

  return (
     <group ref={groupRef} rotation={rotation}> {/* Attach ref to the group */}
      {numberData.map((data, index) => (
        <NumberItem
          key={index}
          initialPhi={data.phi}
          initialTheta={data.theta}
          digit={data.digit}
          radius={radius}
          speed={animationSpeed + (Math.random() - 0.5) * 0.2} // Slightly vary speed for each number
        />
      ))}
    </group>
  );
}

export default NumberSphere;