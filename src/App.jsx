import { useRef } from "react";
import { useHandGesture } from "./useHandGesture";
import "./App.css";

const GESTURE_THEME = {
  thumbs_up: "#22c55e",
  peace: "#3b82f6",
  fist: "#ef4444",
  open_palm: "#eab308",
  pointing: "#a855f7",
  rock: "#ec4899",
  call_me: "#06b6d4",
  ok: "#84cc16",
  unknown: "#6b7280",
};

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const { loading, running, error, currentGesture, history, fps, startCamera } =
    useHandGesture(videoRef, canvasRef);

  const themeColor = currentGesture ? GESTURE_THEME[currentGesture.gesture] : "#333";

  return (
    <div className="app" style={{ "--theme": themeColor }}>
      <h1>Hand Gesture Detector</h1>

      {loading && <p className="status">Loading model...</p>}
      {error && <p className="status error">Error: {error}</p>}
      {!loading && !error && !running && (
        <button className="start-btn" onClick={startCamera}>
          Start Camera
        </button>
      )}
      {running && <p className="status">Detecting... · {fps} FPS</p>}

      <div className="main-layout">
        <div className="video-wrapper">
          <video ref={videoRef} autoPlay playsInline muted className="mirrored" />
          <canvas ref={canvasRef} className="mirrored overlay-canvas" />

          {currentGesture && (
            <div className="gesture-badge" style={{ borderColor: themeColor }}>
              <span className="gesture-emoji">{currentGesture.emoji}</span>
              <span className="gesture-label">{currentGesture.label}</span>
            </div>
          )}
        </div>

        <div className="sidebar">
          <h3>Riwayat Gesture</h3>
          <ul className="history-list">
            {history.map((h, i) => (
              <li key={i}>
                <span>{h.emoji}</span> {h.label} <small>{h.time}</small>
              </li>
            ))}
            {history.length === 0 && <li className="empty">Belum ada gesture terdeteksi</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;