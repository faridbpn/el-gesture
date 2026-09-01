import { useEffect, useRef, useState, useCallback } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { classifyGesture } from "./gestureClassifier";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

const STABLE_THRESHOLD = 5; // gesture harus konsisten N frame sebelum "dipercaya"
const HISTORY_LIMIT = 5;

const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // index
  [5, 9], [9, 10], [10, 11], [11, 12], // middle
  [9, 13], [13, 14], [14, 15], [15, 16], // ring
  [13, 17], [17, 18], [18, 19], [19, 20], // pinky
  [0, 17],
];

export function useHandGesture(videoRef, canvasRef) {
  const handLandmarkerRef = useRef(null);
  const animationRef = useRef(null);

  const lastGestureRef = useRef("unknown");
  const stableCountRef = useRef(0);
  const frameTimesRef = useRef([]);

  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [currentGesture, setCurrentGesture] = useState(null);
  const [history, setHistory] = useState([]);
  const [fps, setFps] = useState(0);

  // 1. Load model sekali saat mount
  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL, // pakai URL Google, bukan file lokal
          },
          runningMode: "VIDEO",
          numHands: 2,
        });

        if (cancelled) return;
        handLandmarkerRef.current = landmarker;
        setLoading(false);
      } catch (err) {
        console.error("Gagal load model:", err);
        if (!cancelled) {
          setError(err.message || "Gagal load model");
          setLoading(false);
        }
      }
    }

    setup();

    return () => {
      cancelled = true;
      handLandmarkerRef.current?.close();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateFps() {
    const now = performance.now();
    frameTimesRef.current.push(now);
    frameTimesRef.current = frameTimesRef.current.filter((t) => now - t < 1000);
    setFps(frameTimesRef.current.length);
  }

  function drawSkeleton(ctx, landmarks, width, height) {
    ctx.strokeStyle = "#00ff88";
    ctx.lineWidth = 3;
    CONNECTIONS.forEach(([a, b]) => {
      ctx.beginPath();
      ctx.moveTo(landmarks[a].x * width, landmarks[a].y * height);
      ctx.lineTo(landmarks[b].x * width, landmarks[b].y * height);
      ctx.stroke();
    });

    ctx.fillStyle = "#ff0044";
    landmarks.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x * width, point.y * height, 5, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  const predictLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const detect = () => {
      if (!handLandmarkerRef.current || video.paused || video.ended) {
        animationRef.current = requestAnimationFrame(detect);
        return;
      }

      const startTimeMs = performance.now();
      const results = handLandmarkerRef.current.detectForVideo(video, startTimeMs);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      updateFps();

      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        const handedness = results.handedness?.[0]?.[0]?.categoryName || "Right";

        drawSkeleton(ctx, landmarks, canvas.width, canvas.height);

        const detected = classifyGesture(landmarks, handedness);

        // --- smoothing: baru dianggap valid kalau konsisten N frame ---
        if (detected.gesture === lastGestureRef.current) {
          stableCountRef.current += 1;
        } else {
          lastGestureRef.current = detected.gesture;
          stableCountRef.current = 0;
        }

        if (stableCountRef.current === STABLE_THRESHOLD) {
          setCurrentGesture(detected);
          setHistory((prev) => [
            { ...detected, time: new Date().toLocaleTimeString() },
            ...prev.slice(0, HISTORY_LIMIT - 1),
          ]);
        }
      } else {
        lastGestureRef.current = "unknown";
        stableCountRef.current = 0;
      }

      animationRef.current = requestAnimationFrame(detect);
    };

    detect();
  }, [videoRef, canvasRef]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      videoRef.current.srcObject = stream;

      videoRef.current.addEventListener("loadeddata", () => {
        setRunning(true);
        predictLoop();
      });
    } catch (err) {
      console.error("Gagal akses webcam:", err);
      setError(err.message || "Gagal akses webcam");
    }
  }, [videoRef, predictLoop]);

  return { loading, running, error, currentGesture, history, fps, startCamera };
}