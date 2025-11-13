from flask import Flask, Response, request, jsonify, send_from_directory
from flask_cors import CORS
import cv2
import mediapipe as mp
import numpy as np
import os

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

CLOTHES_DIR = "clothes_images"
RESULT_DIR = "results"
os.makedirs(RESULT_DIR, exist_ok=True)

selected_cloth = None

mp_pose = mp.solutions.pose
pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)


def overlay_cloth(frame, cloth_img, shoulder_left, shoulder_right, waist_mid):
    """
    Overlay the clothing image perfectly from shoulder to waist.
    """
    try:
        frame_h, frame_w, _ = frame.shape

        # Distance between shoulders (width)
        shoulder_width = int(np.linalg.norm(np.array(shoulder_left) - np.array(shoulder_right)))

        # Vertical distance (shoulder → waist)
        cloth_height = int(abs(waist_mid[1] - shoulder_left[1]))

        # Slightly extend width and height for natural look
        cloth_width = int(shoulder_width * 2.0)
        cloth_height = int(cloth_height * 1.25)

        # Center between shoulders
        x_center = int((shoulder_left[0] + shoulder_right[0]) / 2)

        # Start exactly from shoulder line (y1)
        # 🔥 Raise the cloth higher (was 0.05 before, now 0.15 for perfect alignment)
        y1 = int((shoulder_left[1] + shoulder_right[1]) / 2) - int(cloth_height * 0.15)
        y2 = y1 + cloth_height

        # X boundaries
        x1 = max(0, x_center - cloth_width // 2)
        x2 = min(frame_w, x1 + cloth_width)

        # Fix for out-of-bounds
        y1 = max(0, y1)
        y2 = min(frame_h, y2)

        # Resize cloth to match region
        resized_cloth = cv2.resize(cloth_img, (x2 - x1, y2 - y1))

        # Overlay using alpha (transparency)
        if resized_cloth.shape[2] == 4:
            alpha = resized_cloth[:, :, 3] / 255.0
            for c in range(3):
                frame[y1:y2, x1:x2, c] = (
                    alpha * resized_cloth[:, :, c] +
                    (1 - alpha) * frame[y1:y2, x1:x2, c]
                )
        else:
            frame[y1:y2, x1:x2] = resized_cloth

    except Exception as e:
        print(f"[Overlay Error] {e}")

    return frame


def gen_frames():
    global selected_cloth
    cap = cv2.VideoCapture(0)
    cloth_img = None
    cloth_img_name = None

    while True:
        success, frame = cap.read()
        if not success:
            break

        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(rgb)

        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark

            # Get required key points
            shoulder_left = (
                int(landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER].x * frame.shape[1]),
                int(landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER].y * frame.shape[0]),
            )
            shoulder_right = (
                int(landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER].x * frame.shape[1]),
                int(landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER].y * frame.shape[0]),
            )
            waist_left = (
                int(landmarks[mp_pose.PoseLandmark.LEFT_HIP].x * frame.shape[1]),
                int(landmarks[mp_pose.PoseLandmark.LEFT_HIP].y * frame.shape[0]),
            )
            waist_right = (
                int(landmarks[mp_pose.PoseLandmark.RIGHT_HIP].x * frame.shape[1]),
                int(landmarks[mp_pose.PoseLandmark.RIGHT_HIP].y * frame.shape[0]),
            )

            # Midpoint between waists
            waist_mid = (
                (waist_left[0] + waist_right[0]) // 2,
                (waist_left[1] + waist_right[1]) // 2,
            )

            # Overlay cloth
            if selected_cloth:
                if cloth_img is None or cloth_img_name != selected_cloth:
                    cloth_path = os.path.join(CLOTHES_DIR, selected_cloth)
                    cloth_img = cv2.imread(cloth_path, cv2.IMREAD_UNCHANGED)
                    cloth_img_name = selected_cloth
                if cloth_img is not None:
                    frame = overlay_cloth(frame, cloth_img, shoulder_left, shoulder_right, waist_mid)

        ret, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

    cap.release()


@app.route("/video_feed")
def video_feed():
    return Response(gen_frames(), mimetype="multipart/x-mixed-replace; boundary=frame")


@app.route("/try_on", methods=["POST"])
def try_on():
    global selected_cloth
    data = request.get_json()
    cloth_filename = data.get("cloth_filename")
    if not cloth_filename:
        return jsonify({"error": "cloth_filename required"}), 400
    selected_cloth = cloth_filename
    print(f"✅ Selected cloth: {cloth_filename}")
    return jsonify({"message": f"Selected {cloth_filename} for try-on"})


@app.route("/clothes_images/<path:filename>")
def serve_cloth_image(filename):
    return send_from_directory(CLOTHES_DIR, filename)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
