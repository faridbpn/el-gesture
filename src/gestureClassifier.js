// Index reference landmark MediaPipe HandLandmarker
const FINGER_TIPS = { thumb: 4, index: 8, middle: 12, ring: 16, pinky: 20 };
const FINGER_PIPS = { index: 6, middle: 10, ring: 14, pinky: 18 };

// Jari (selain jempol) dianggap "naik" kalau ujungnya (tip) lebih tinggi
// (nilai y lebih kecil) dibanding sendi di bawahnya (pip)
function isFingerUp(landmarks, tipIdx, pipIdx) {
  return landmarks[tipIdx].y < landmarks[pipIdx].y;
}

// Jempol gerak menyamping, jadi dicek pakai sumbu x, bukan y
function isThumbUp(landmarks, handedness) {
  const tip = landmarks[4];
  const ip = landmarks[3];
  const mcp = landmarks[2];

  const isRight = handedness === "Right";
  if (isRight) {
    return tip.x < ip.x && ip.x < mcp.x;
  }
  return tip.x > ip.x && ip.x > mcp.x;
}

export function classifyGesture(landmarks, handedness = "Right") {
  const index = isFingerUp(landmarks, FINGER_TIPS.index, FINGER_PIPS.index);
  const middle = isFingerUp(landmarks, FINGER_TIPS.middle, FINGER_PIPS.middle);
  const ring = isFingerUp(landmarks, FINGER_TIPS.ring, FINGER_PIPS.ring);
  const pinky = isFingerUp(landmarks, FINGER_TIPS.pinky, FINGER_PIPS.pinky);
  const thumb = isThumbUp(landmarks, handedness);

  const fingers = { thumb, index, middle, ring, pinky };

  if (thumb && !index && !middle && !ring && !pinky) {
    return { gesture: "thumbs_up", emoji: "👍", label: "Thumbs Up", fingers };
  }

  if (index && middle && !ring && !pinky && !thumb) {
    return { gesture: "peace", emoji: "✌️", label: "Peace", fingers };
  }

  if (!index && !middle && !ring && !pinky && !thumb) {
    return { gesture: "fist", emoji: "✊", label: "Fist", fingers };
  }

  if (index && middle && ring && pinky && thumb) {
    return { gesture: "open_palm", emoji: "🖐️", label: "Open Palm", fingers };
  }

  if (index && !middle && !ring && !pinky) {
    return { gesture: "pointing", emoji: "👆", label: "Pointing", fingers };
  }

  if (index && pinky && !middle && !ring) {
    return { gesture: "rock", emoji: "🤟", label: "Rock On", fingers };
  }

  if (thumb && pinky && !index && !middle && !ring) {
    return { gesture: "call_me", emoji: "🤙", label: "Call Me", fingers };
  }

  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const dist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
  if (dist < 0.05 && middle && ring && pinky) {
    return { gesture: "ok", emoji: "👌", label: "OK", fingers };
  }

  return { gesture: "unknown", emoji: "🤷", label: "...", fingers };
}