import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Hands } from '@mediapipe/hands';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { XR, Controllers, Hands as XRHands } from '@react-three/xr';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { AlertCircle, Camera } from 'lucide-react';
import * as THREE from 'three';
import NumberSphere from './NumberSphere';
import CodeScroller from './CodeScroller';
import FormationRings from './FormationRings';
import FormationNumber from './FormationNumber';
import WristSquare from './WristSquare';

interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // index finger
  [0, 9], [9, 10], [10, 11], [11, 12], // middle finger
  [0, 13], [13, 14], [14, 15], [15, 16], // ring finger
  [0, 17], [17, 18], [18, 19], [19, 20], // pinky
  [0, 5], [5, 9], [9, 13], [13, 17], // palm
];

const GLB_MODEL_URL = 'https://wzvsahstfvqmpzktohoj.supabase.co/storage/v1/object/public/game-assets/3d/LightBlueEye.glb';


const getTransformedPoint = (point: HandLandmark) => {
const aspectRatio = window.innerWidth / window.innerHeight;
const scaleX = 5 * aspectRatio;
const scaleY = 5;

  return new THREE.Vector3(
    (point.x - 0.5) * scaleX,
    -(point.y - 0.5) * scaleY,
    -point.z * 2
  );
};

// New component for the pinch circle
interface PinchCircleProps {
  position: THREE.Vector3;
  radius: number;
}

function PinchCircle({ position, radius, opacity = 1 }: PinchCircleProps) {
  const innerRadius = radius * 0.99; // Make it a thin ring
  const outerRadius = radius;

  return (
    <mesh position={position}>
      <ringGeometry args={[innerRadius, outerRadius, 64]} /> {/* innerRadius, outerRadius, segments */}
      <meshBasicMaterial color="#02ffcc" side={THREE.DoubleSide} transparent={true} opacity={opacity} />
    </mesh>
  );
}

const asciiVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
      vUv = uv;
      vNormal = normalMatrix * normal; // Transform normal to view space
      vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz; // Position in view space
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Define the ASCII fragment shader (updated)
const asciiFragmentShader = `
  uniform float u_pixelSize;
  uniform sampler2D u_baseTexture;
  uniform vec3 u_baseColor;
  uniform bool u_hasTexture;
  uniform vec3 u_darkAsciiColor; // NEW: Uniform for the 'off' color
  uniform vec3 u_overlayColor; // NEW: Uniform for the overlay color

  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
      vec3 originalPixelColor;
      vec3 originalPixelColorFromTexture;
      if (u_hasTexture) {
          originalPixelColor = texture2D(u_baseTexture, vUv).rgb;
          originalPixelColorFromTexture = texture2D(u_baseTexture, vUv).rgb;
      } else {
          originalPixelColor = u_baseColor;
          originalPixelColorFromTexture = u_baseColor;
      }

      // Invert the original pixel color
         originalPixelColor = vec3(1.0) - originalPixelColor; //

         // Invert the original pixel color for the ASCII effect
      vec3 invertedPixelColor = vec3(1.0) - originalPixelColorFromTexture;

      // Calculate brightness based on luminance of the original pixel color
     float brightness = dot(invertedPixelColor, vec3(0.299, 0.587, 0.114));
 

      // Generate a dither threshold using a pseudo-random function
      vec2 pixelatedCoords = floor(gl_FragCoord.xy / u_pixelSize);
      float ditherThreshold = fract(sin(dot(pixelatedCoords.xy, vec2(12.9898, 78.233))) * 43758.5453);

      vec3 finalColor;
      // If the pixel's brightness is above the dither threshold, use the original color.
      // Otherwise, use a predefined dark color to create the "off" part of the ASCII effect.
      if (brightness > ditherThreshold) {
          finalColor = originalPixelColor;
          finalColor = min(originalPixelColor, u_overlayColor); // Apply darken effect only to light pixels
           finalColor = 1.0 - (1.0 - invertedPixelColor) * (1.0 - u_overlayColor); // Apply screen blend
      } else {
          finalColor = u_darkAsciiColor; // Use the new uniform for the 'off' color
      }

      finalColor *= u_overlayColor; // Apply the color multiply effect

      gl_FragColor = vec4(finalColor, 1.0);
  }
`;

function EyeModel({ targetPosition }: { targetPosition: THREE.Vector3 }) {
  const gltf = useLoader(GLTFLoader, GLB_MODEL_URL);
  const eyeRef = useRef<THREE.Object3D>(null);

  // Apply the custom material to all meshes in the GLB scene once it's loaded
  React.useLayoutEffect(() => {
    if (gltf.scene) {
      gltf.scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const originalMaterial = child.material as THREE.MeshStandardMaterial; // Cast to MeshStandardMaterial to access map/color

          const asciiMaterial = new THREE.ShaderMaterial({
            uniforms: {
              u_pixelSize: { value: 1.0 },
              u_baseTexture: { value: originalMaterial.map || null }, // Pass original texture
              u_baseColor: { value: originalMaterial.color || new THREE.Color(0xffffff) }, // Pass original color
              u_hasTexture: { value: originalMaterial.map !== null }, // Indicate if texture is present
              u_darkAsciiColor: { value: new THREE.Color(0xb315f1) }, // <--- Add this line
              u_overlayColor: { value: new THREE.Color(0xffffff) }, // Set the overlay color
         
            },
            vertexShader: asciiVertexShader,
            fragmentShader: asciiFragmentShader,
          });
          child.material = asciiMaterial;
          
        }
      });
    }
  }, [gltf]); // Dependencies ensure it re-runs if gltf or material changes
  
 useFrame(() => {
    if (eyeRef.current) {
      // Define the fixed position of the eye model (e.g., center of the screen)
      const fixedEyePosition = new THREE.Vector3(0, 0, 0); // Assuming the eye model is at the origin

      // Calculate the direction vector from the eye's fixed position to the target hand position
      const direction = new THREE.Vector3().subVectors(targetPosition, fixedEyePosition).normalize();

      // Calculate the target rotation (yaw and pitch)
      const targetYaw = Math.atan2(direction.x, direction.z);
      const targetPitch = Math.asin(-direction.y);

      // Define rotation limits (e.g., +/- 30 degrees)
      const yawLimit = Math.PI / 6; // 30 degrees
      const pitchLimit = Math.PI / 6; // 30 degrees

      // Clamp the rotation angles
      const clampedYaw = Math.max(-yawLimit, Math.min(yawLimit, targetYaw));
      const clampedPitch = Math.max(-pitchLimit, Math.min(pitchLimit, targetPitch));

      // Apply the clamped rotation to the eye model
      // Ensure the rotation order is appropriate, 'YXZ' is common for head/eye rotations
      eyeRef.current.rotation.set(clampedPitch, clampedYaw, 0, 'YXZ');
    }
  });
  
 return <primitive object={gltf.scene} ref={eyeRef} scale={0.5} />;
}

// New RingSprite component
interface RingSpriteProps {
  position: THREE.Vector3;
  color: string;
  scale: number;
  ringThickness?: number;
  opacity?: number;
}

function RingSprite({ position, color, scale, ringThickness = 2, opacity = 1 }: RingSpriteProps) {

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

function HandLandmarks({ landmarks }: { landmarks: HandLandmark[] }) {
  const transformPoint = (point: HandLandmark) => {
    const aspectRatio = window.innerWidth / window.innerHeight;
    const scaleX = 5 * aspectRatio;
    const scaleY = 5;

    return {
      x: (point.x - 0.5) * scaleX,
      y: -(point.y - 0.5) * scaleY,
      z: -point.z * 2
    };
  };

  return (
    <group>
      {HAND_CONNECTIONS.map(([i, j], index) => {
        const start = transformPoint(landmarks[i]);
        const end = transformPoint(landmarks[j]);

        return (
          <HandConnectionLine key={`line-${index}`} start={new THREE.Vector3(start.x, start.y, start.z)} end={new THREE.Vector3(end.x, end.y, end.z)} />
        );
      })}
      {landmarks.map((point, index) => {
        //const transformed = transformPoint(point);
      const transformed = getTransformedPoint(point);
        return (
        //   <RingSprite // Changed from mesh
        //    key={`point-${index}`}
        //    position={new THREE.Vector3(transformed.x, transformed.y, transformed.z)}
        //    color="#b315f1" //
        //    scale={0.15} // Adjust scale as needed for visibility
         //   ringThickness={2} // Default thickness
         // />
          //<mesh
          //  key={`point-${index}`}
        //    position={[transformed.x, transformed.y, transformed.z]}
        //    scale={0.03}
       //   >
       //     <sphereGeometry />
      //      <meshStandardMaterial color={index === 0 ? "#b714f7" : "#b714f7"} />
      //    </mesh>

           <React.Fragment key={`hand-landmark-${index}`}>
            <RingSprite
              position={new THREE.Vector3(transformed.x, transformed.y, transformed.z)}
              color="#b315f1"
              scale={0.15}
              ringThickness={2}
            />
            <FormationNumber
              position={new THREE.Vector3(transformed.x, transformed.y, transformed.z)}
              digit={index}
              opacity={0}
              scale={0.15}
              color="#03e7f5"
            />
          </React.Fragment>
    
        );
      })}

  
    </group>
  );
}

function HandConnectionLine({ start, end }: { start: THREE.Vector3; end: THREE.Vector3 }) {
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
      <lineBasicMaterial color="#02ffcc" linewidth={2} />
    </line>
  );
}

interface SpawnedRingsProps {
  rings: { position: THREE.Vector3; createdAt: number; opacity: number; scale: number }[];
}

function SpawnedRings({ rings }: SpawnedRingsProps) {
  const [currentRings, setCurrentRings] = useState<
    { position: THREE.Vector3; createdAt: number; opacity: number; scale: number }[]
  >([]);
  const fadeDuration = 2000; // Same as cubes fade duration

  useEffect(() => {
    setCurrentRings(prev => {
      const newRings = rings.filter(
        (ring) => !prev.some(r => r.createdAt === ring.createdAt && r.position.equals(ring.position))
      );
      return [...prev, ...newRings];
    });
  }, [rings]);

  useFrame(() => {
    setCurrentRings((prevRings) => {
      const now = Date.now();
      return prevRings
        .map((ring) => {
          const age = now - ring.createdAt;
          const opacity = Math.max(0, 1 - age / fadeDuration);
          return { ...ring, opacity };
        })
        .filter((ring) => ring.opacity > 0.01);
    });
  });

  return (
    <>
      {currentRings.map((ring, index) => (
        <RingSprite
          key={`spawned-ring-${index}`}
          position={ring.position}
          color="#02ffcc" // Color for spawned rings
          scale={ring.scale}
          opacity={ring.opacity}
          ringThickness={2}
        />
      ))}
    </>
  );
}

interface SpawnedSphereProps {
  spheres: { position: THREE.Vector3; createdAt: number; opacity: number }[];
}

function SpawnedSpheres({ spheres }: SpawnedSphereProps) {
  const emissiveIntensity = 0.5;
  const [currentSpheres, setCurrentSpheres] = useState<
    { position: THREE.Vector3; createdAt: number; opacity: number }[]
  >([]);
  const fadeDuration = 2500;

  useEffect(() => {
    setCurrentSpheres(prev => {
      const newSpheres = spheres.filter(
        (sphere) => !prev.some(s => s.createdAt === sphere.createdAt && s.position.equals(sphere.position))
      );
      return [...prev, ...newSpheres];
    });
  }, [spheres]);

  useFrame(() => {
    setCurrentSpheres((prevSpheres) => {
      const now = Date.now();
      return prevSpheres
        .map((sphere) => {
          const age = now - sphere.createdAt;
          const opacity = Math.max(0, 1 - age / fadeDuration);
          return { ...sphere, opacity };
        })
        .filter((sphere) => sphere.opacity > 0.01);
    });
  });

  return (
    <>
      {currentSpheres.map((sphere, index) => (
        <mesh key={`spawned-sphere-${index}`} position={sphere.position} scale={0.2}>
          <sphereGeometry />
          <meshStandardMaterial color="blue" transparent opacity={sphere.opacity} emissive="blue" emissiveIntensity={emissiveIntensity} />
        </mesh>
      ))}
    </>
  );
}

const HandTracking: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isWebXRSupported, setIsWebXRSupported] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingQuality, setTrackingQuality] = useState(0);
  const [handLandmarks, setHandLandmarks] = useState<HandLandmark[][]>([]);
  const [isPinching, setIsPinching] = useState(false);
  const [pinchHistory, setPinchHistory] = useState<THREE.Vector3[]>([]);
  const [isCrossDetected, setIsCrossDetected] = useState(false);
  const [spawnedSpheres, setSpawnedSpheres] = useState<
    { position: THREE.Vector3; createdAt: number; opacity: number }[]
  >([]);
const [spawnedNumbers, setSpawnedNumbers] = useState<
    { position: THREE.Vector3; createdAt: number; opacity: number; scale: number; digit: number }[]
  >([]);
  
  const hasSpawnedForCurrentGesture = useRef(false);
  const [eyeModelPosition, setEyeModelPosition] = useState(new THREE.Vector3(0, 0, 0));
  const [wristSquareData, setWristSquareData] = useState<{ position: THREE.Vector3; size: number } | null>(null);


  const getTransformedPoint = (point: HandLandmark) => {
  const aspectRatio = window.innerWidth / window.innerHeight;
  const scaleX = 5 * aspectRatio;
  const scaleY = 5;

    return new THREE.Vector3(
      (point.x - 0.5) * scaleX,
      -(point.y - 0.5) * scaleY,
      -point.z * 2
    );
  };

   const [spawnedRings, setSpawnedRings] = useState<
  { position: THREE.Vector3; createdAt: number; opacity: number; scale: number }[]
>([]);

  const [pinchCircleData, setPinchCircleData] = useState<{ position: THREE.Vector3; radius: number } | null>(null);

  useEffect(() => {
    if (!navigator.xr) {
      setIsWebXRSupported(false);
      return;
    }

    const setupHandTracking = async () => {
      const hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
      });

      hands.onResults((results) => {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          setIsTracking(true);
          setTrackingQuality(results.multiHandedness[0]?.score || 0);
          setHandLandmarks(results.multiHandLandmarks);

          const landmarks = results.multiHandLandmarks[0];
          if (landmarks) {
            detectPinch(landmarks);

            if (landmarks[0]) {
              setEyeModelPosition(getTransformedPoint(landmarks[8]));
            }

            // Calculate wrist square data
            const wristLandmark = getTransformedPoint(landmarks[0]);
            const fingerTips = [
              getTransformedPoint(landmarks[4]),
              getTransformedPoint(landmarks[8]),
              getTransformedPoint(landmarks[12]),
              getTransformedPoint(landmarks[16]),
            ];

            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;

            fingerTips.forEach(p => {
              minX = Math.min(minX, p.x);
              maxX = Math.max(maxX, p.x);
              minY = Math.min(minY, p.y);
              maxY = Math.max(maxY, p.y);
            });

            const width = maxX - minX;
            const height = maxY - minY;
            const squareSize = Math.max(width, height) * 1; // Add a small buffer

            setWristSquareData({ position: wristLandmark, size: squareSize });
             
            
          }
          
        } else {
          setIsTracking(false);
          setHandLandmarks([]);
          setIsPinching(false);
          setPinchCircleData(null); // Clear the circle when no hands are detected
          setWristSquareData(null); // Clear square data when no hands
          setEyeModelPosition(new THREE.Vector3(0, 0, 0));
        }
      });

      if (videoRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: { ideal: window.innerWidth },
              height: { ideal: window.innerHeight },
              facingMode: 'user'
            } 
          });
          
          videoRef.current.srcObject = stream;
          
          await new Promise((resolve) => {
            if (!videoRef.current) return;
            videoRef.current.onloadedmetadata = () => {
              resolve(true);
            };
          });

          await videoRef.current.play();

          const processFrame = async () => {
            if (videoRef.current) {
              await hands.send({ image: videoRef.current });
            }
            requestAnimationFrame(processFrame);
          };
          
          processFrame();
        } catch (error) {
          console.error('Error accessing camera:', error);
        }
      }
    };

    setupHandTracking().catch(console.error);

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);
  
  const detectPinch = (landmarks: HandLandmark[]) => {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];

    const distance = Math.sqrt(
      Math.pow(indexTip.x - thumbTip.x, 2) +
      Math.pow(indexTip.y - thumbTip.y, 2) +
      Math.pow(indexTip.z - thumbTip.z, 2)
    );

    const pinchThreshold = 0.05;
    setIsPinching(distance < pinchThreshold);

// Calculate circle data if pinching
  // if (distance < pinchThreshold) 
      const transformedThumbTip = getTransformedPoint(thumbTip);
      const transformedIndexTip = getTransformedPoint(indexTip);
      const center = new THREE.Vector3().addVectors(transformedThumbTip, transformedIndexTip).multiplyScalar(0.5);
      const radius = transformedThumbTip.distanceTo(transformedIndexTip) / 2;
      setPinchCircleData({ position: center, radius: radius });
    //} else {
    //  setPinchCircleData(null);
    //}
    
  };

  useEffect(() => {
    if (isPinching && handLandmarks.length > 0) {
      const landmarks = handLandmarks[0];
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];

      const pinchX = (thumbTip.x + indexTip.x) / 2;
      const pinchY = (thumbTip.y + indexTip.y) / 2;
      const pinchZ = (thumbTip.z + indexTip.z) / 2;

      const aspectRatio = window.innerWidth / window.innerHeight;
      const scaleX = 5 * aspectRatio;
      const scaleY = 5;

      const transformedPinchX = (pinchX - 0.5) * scaleX;
      const transformedPinchY = -(pinchY - 0.5) * scaleY;
      const transformedPinchZ = -pinchZ * 2;
      
      setPinchHistory(prev => {
        const newPoint = new THREE.Vector3(transformedPinchX, transformedPinchY, transformedPinchZ);
        return [...prev, newPoint].slice(-200);
      });

      setSpawnedRings(prevRings => [...prevRings, {
  position: new THREE.Vector3(transformedPinchX, transformedPinchY, transformedPinchZ),
  createdAt: Date.now(),
  opacity: 1,
  scale: 0.15, // Adjust initial scale as needed
}]);
      
setSpawnedNumbers(prevNumbers => [...prevNumbers, {
        position: new THREE.Vector3(transformedPinchX, transformedPinchY, transformedPinchZ),
        createdAt: Date.now(),
        opacity: 1,
        scale: 0.15, // Adjust initial scale as needed
        digit: Math.floor(Math.random() * 10), // Random digit from 0-9
      }]); 
   
    } else {
      setPinchHistory([]);
      setIsCrossDetected(false);
      setSpawnedRings([]); // Clear spawned rings when pinch ends
      setSpawnedNumbers([]); // Clear spawned numbers when pinch ends
      hasSpawnedForCurrentGesture.current = false; 
    }
  }, [isPinching, handLandmarks]);
  
  const detectCrossGesture = (history: THREE.Vector3[]): boolean => {
    if (history.length < 50) {
      console.log("Cross detection: Not enough history points.");
      return false;
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const point of history) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }

    const width = maxX - minX;
    const height = maxY - minY;

    const minDimension = 0.1;
    const aspectRatioTolerance = 2;
    const centralRegionFactor = 0.1;

    if (width < minDimension || height < minDimension) {
      console.log(`Cross detection: Insufficient size. Width: ${width.toFixed(2)}, Height: ${height.toFixed(2)} (Min: ${minDimension})`);
      return false;
    }

    const aspectRatio = width / height;
    if (aspectRatio < (1 - aspectRatioTolerance) || aspectRatio > (1 + aspectRatioTolerance)) {
      console.log(`Cross detection: Aspect ratio out of tolerance. Ratio: ${aspectRatio.toFixed(2)} (Tolerance: ${1 - aspectRatioTolerance} to ${1 + aspectRatioTolerance})`);
      return false;
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const xDeviationThreshold = width * centralRegionFactor;
    const yDeviationThreshold = height * centralRegionFactor;

    let hasPositiveX = false;
    let hasNegativeX = false;
    let hasPositiveY = false;
    let hasNegativeY = false;

    for (const point of history) {
      if (point.x > centerX + xDeviationThreshold) hasPositiveX = true;
      if (point.x < centerX - xDeviationThreshold) hasNegativeX = true;
      if (point.y > centerY + yDeviationThreshold) hasPositiveY = true;
      if (point.y < centerY - yDeviationThreshold) hasNegativeY = true;
    }

    const coversAllQuadrants = hasPositiveX && hasNegativeX && hasPositiveY && hasNegativeY;
    console.log(`Cross detection: Quadrant coverage - PX: ${hasPositiveX}, NX: ${hasNegativeX}, PY: ${hasPositiveY}, NY: ${hasNegativeY}. All: ${coversAllQuadrants}`);
    return coversAllQuadrants;
  };

  useEffect(() => {
    const detected = detectCrossGesture(pinchHistory);
    setIsCrossDetected(detected);
    
    if (detected && !hasSpawnedForCurrentGesture.current) {
      console.log("Cross gesture detected and spawning sphere!");
      hasSpawnedForCurrentGesture.current = true;

      if (pinchHistory.length > 0) {
        const avgPosition = new THREE.Vector3();
        for (const point of pinchHistory) {
          avgPosition.add(point);
        }
        avgPosition.divideScalar(pinchHistory.length);

        setSpawnedSpheres(prevSpheres => [...prevSpheres, {
          position: avgPosition,
          createdAt: Date.now(),
          opacity: 1,
        }]);
      }
    }
  }, [pinchHistory]);



 

  if (!isWebXRSupported) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-xl">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">WebXR Not Supported</h2>
          <p className="text-gray-600">
            Your browser doesn't support WebXR. Please try using a compatible browser.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ width: '100%', height: '100%' , transform: 'scaleX(-1)' }}
        playsInline
        muted
        autoPlay
      />
      
       <div className="absolute inset-0 bg-black opacity-80" />
      
      <Canvas 
        style={{ width: '100vw', height: '100vh' }}
        className="absolute inset-0"
        camera={{
          position: [0, 0, 4],
          fov: 60,
          near: 0.1,
          far: 1000,
          aspect: window.innerWidth / window.innerHeight
        }}
      >
        <XR>
          <group scale={[-1, 1, 1]}> 
          <Controllers />
          <XRHands />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          
          {handLandmarks.map((landmarks, index) => (
            <HandLandmarks key={index} landmarks={landmarks} />
          ))}

          {pinchCircleData && (
             <PinchCircle position={pinchCircleData.position} radius={pinchCircleData.radius} opacity={0.25}/>
           )}
          
          <NumberSphere radius={1} count={500} targetPosition={eyeModelPosition} /> 
          <SpawnedSpheres spheres={spawnedSpheres} />

          <SpawnedNumbers numbers={spawnedNumbers} />

          {wristSquareData && (
            <WristSquare position={wristSquareData.position} size={wristSquareData.size} />
          )}
          <EyeModel targetPosition={eyeModelPosition} />
          <FormationRings />
            
          </group> {/* Close the group */}
        </XR>
      </Canvas>

      <div className="absolute top-4 right-4 bg-black/0 p-4 rounded-lg shadow-lg">
        <div className="flex items-center gap-2 mb-2">
       <Camera className="w-5 h-5 text-[#03e7f5]" />
          <span className="font-medium text-[#03e7f5]">
            Tracking Status
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className={`w-1 h-1 rounded-full ${isTracking ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-[#03e7f5]">
              {isTracking ? 'Tracking Active' : 'No Hands Detected'}
            </span>
          </div>
           <div className="text-sm text-[#03e7f5]">
            Quality: {Math.round(trackingQuality * 100)}%
          </div>
            <div className="text-sm text-[#03e7f5]">
            Pinch: {isPinching ? 'Yes' : 'No'}
          </div>
            <div className="text-sm text-[#03e7f5]">
            Circle Detected: {isCrossDetected ? 'Yes' : 'No'}
          </div>
        </div>
      </div>
   <div className="absolute top-48 right-4 w-48 bg-black/0 p-4 rounded-lg shadow-lg">
        <div className="flex items-center gap-2 mb-2">
       
          <span className="font-medium text-[#03e7f5]">
             Terminal Stream
          </span>
        </div>
        <CodeScroller className="h-48" />
      </div>
      
    </div>
  );
};

interface SpawnedNumberProps {
  numbers: { position: THREE.Vector3; createdAt: number; opacity: number; scale: number; digit: number }[];
}

function SpawnedNumbers({ numbers }: SpawnedNumberProps) {
  const [currentNumbers, setCurrentNumbers] = useState<
    { position: THREE.Vector3; createdAt: number; opacity: number; scale: number; digit: number }[]
  >([]);
  const fadeDuration = 2000; // Duration in milliseconds for numbers to fade

  useEffect(() => {
    setCurrentNumbers(prev => {
      const newNumbers = numbers.filter(
        (num) => !prev.some(p => p.createdAt === num.createdAt && p.position.equals(num.position))
      );
      return [...prev, ...newNumbers];
    });
  }, [numbers]);

  useFrame(() => {
    setCurrentNumbers((prevNumbers) => {
      const now = Date.now();
      return prevNumbers
        .map((num) => {
          const age = now - num.createdAt;
          const opacity = Math.max(0, 1 - age / fadeDuration);
          return { ...num, opacity };
        })
        .filter((num) => num.opacity > 0.01); // Remove numbers that are almost completely faded
    });
  });

  return (
    <>
      {currentNumbers.map((num, index) => (
        <FormationNumber
          key={`spawned-number-${index}`}
          position={num.position}
          digit={num.digit}
          opacity={num.opacity}
          scale={num.scale}
          color="#02ffcc" // Color for the spawned numbers
        />
      ))}
    </>
  );
}

export default HandTracking;