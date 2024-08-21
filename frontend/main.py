import cv2
import numpy as np
import time
import io
import base64
import logging
import gc
import re
import easyocr
import paddleocr
from flask import Flask, request, jsonify, render_template
from ultralytics import YOLO
from datetime import datetime
import requests
import threading

# Initialize Flask app
app = Flask(__name__)

# Backend service URL
BACKEND_URL = 'http://localhost:3002/check_plate'

# Initialize YOLO models and OCR
model_vehicle = YOLO('yolov8x.pt')
model_plate = YOLO('best.pt')
reader = easyocr.Reader(['en'], gpu=False)
ocr_paddle = paddleocr.PaddleOCR(use_angle_cls=True, lang='en', use_gpu=True)

EUROPEAN_PATTERNS = {
    'FR': r'^(?:[A-Z]{2}-\d{3}-[A-Z]{2}|\d{2,4}\s?[A-Z]{2,3}\s?\d{2,4})$',  # France
    'DE': r'^[A-Z]{1,3}-[A-Z]{1,2}\s?\d{1,4}[EH]?$',  # Germany
    'ES': r'^(\d{4}[A-Z]{3}|[A-Z]{1,2}\d{4}[A-Z]{2,3})$',  # Spain
    'IT': r'^[A-Z]{2}\s?\d{3}\s?[A-Z]{2}$',  # Italy
    'NL': r'^[A-Z]{2}-\d{3}-[A-Z]$',  # Netherlands
    'BE': r'^(1-[A-Z]{3}-\d{3}|\d-[A-Z]{3}-\d{3})$',  # Belgium
    'PL': r'^[A-Z]{2,3}\s?\d{4,5}$',  # Poland
    'SE': r'^[A-Z]{3}\s?\d{3}$',  # Sweden
    'NO': r'^[A-Z]{2}\s?\d{5}$',  # Norway
    'FI': r'^[A-Z]{3}-\d{3}$',  # Finland
    'DK': r'^[A-Z]{2}\s?\d{2}\s?\d{3}$',  # Denmark
    'CH': r'^[A-Z]{2}\s?\d{1,6}$',  # Switzerland
    'AT': r'^[A-Z]{1,2}\s?\d{1,5}[A-Z]$',  # Austria
    'PT': r'^[A-Z]{2}-\d{2}-[A-Z]{2}$',  # Portugal
#    'EU': r'^[A-Z0-9]{2,4}[-\s]?[A-Z0-9]{1,4}[-\s]?[A-Z0-9]{1,4}$',  # Generic European plate
    'RO': r'^(B\s*\d{2}\s*[A-Z]{3}|B\s*\d{3}\s*[A-Z]{3}|[A-Z]{2}\s*\d{2}\s*[A-Z]{3})$' #Romania
}


@app.route("/")
def root():
    return render_template('index.html')

@app.route("/detect", methods=["POST"])
def detect():
    file = request.files["image_file"]
    image = np.asarray(bytearray(file.read()), dtype=np.uint8)
    image = cv2.imdecode(image, -1)
    
    result = detect_and_recognize(image)
    
    return jsonify(result)

def detect_and_recognize(image):
    try:
        # Perform vehicle detection
        results_vehicle = model_vehicle.predict(image, imgsz=640, conf=0.5)
        
        for result in results_vehicle:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    class_id = int(box.cls[0].item())

                    if class_id == 2:  # Class ID 2 represents cars
                        cropped_vehicle = image[y1:y2, x1:x2]

                        # Perform license plate detection within the vehicle region
                        results_plate = model_plate(cropped_vehicle)

                        for plate_result in results_plate:
                            plate_boxes = plate_result.boxes
                            if plate_boxes is not None:
                                for plate_box in plate_boxes:
                                    px1, py1, px2, py2 = map(int, plate_box.xyxy[0])
                                    cropped_plate = cropped_vehicle[py1:py2, px1:px2]

                                    # Adjusting only the bottom and left sides
                                    width, height = px2 - px1, py2 - py1
                                    left_crop_factor = 0.1   # Adjust the percentage to crop from the left side
                                    bottom_crop_factor = 0.1 # Adjust the percentage to crop from the bottom

                                    px1_new = max(px1 + int(width * left_crop_factor), 0) # Crop from the left side
                                    py2_new = min(py2 - int(height * bottom_crop_factor), cropped_vehicle.shape[0]) # Crop from the bottom

                                    # Crop the image more tightly from left and bottom sides
                                    tighter_cropped_plate = cropped_vehicle[py1:py2_new, px1_new:px2]
                                    # Perform OCR on the tighter cropped plate
                                    detections = perform_ocr(tighter_cropped_plate)
                                    if len(detections) >0:
                                      for bbox, text, conf in detections:
                                          processed_text, country = post_process_ocr(text)
                                          cv2.putText(image, f"{processed_text} ({country})", (int(x1 + px1), int(y1 + py1) - 10),cv2.FONT_HERSHEY_SIMPLEX, 0.9, (36, 255, 12), 2)
                                          cv2.rectangle(image, (int(x1 + px1), int(y1 + py1)),(int(x1 + px2), int(y1 + py2)), (0, 255, 0), 2)
                                          print("plate", processed_text)
                                    #result_ocr = reader.readtext(tighter_cropped_plate, allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
                                    #if result_ocr:
                                        #plate_text = "".join([text[1] for text in result_ocr])
                                        # Draw bounding box and text on the image
                                        #cv2.rectangle(image, (x1+px1_new, y1+py1), (x1+px2, y1+py2_new), (0, 255, 0), 2)
                                        #cv2.putText(image, plate_text, (x1+px1_new, y1+py1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (36, 255, 12), 2)

        # Encode image to return it via HTTP response
        is_success, buffer = cv2.imencode(".jpg", image)
        io_buffer = io.BytesIO(buffer)
        data = io_buffer.read()
        data = base64.b64encode(data).decode()
        log_detection(processed_text)

        return {'msg': 'success', 'size': [image.shape[1], image.shape[0]], 'format': "jpg", 'img': data, 'plate': processed_text}
    
    except Exception as e:
        return {'msg': 'error', 'error': str(e)}


def log_detection(plate):
    """Log the detection in the database and send it to the backend for authorization."""
    detection_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    # Prepare the data for logging and backend check
    log_data = {
        'plate': plate,
        'timestamp': detection_time,
    }

    # Insert log into the database (e.g., MongoDB)
    # Here, you'd add code to insert `log_data` into your 'log' collection

    # Send the request to the backend service for authorization check
    response = requests.post(BACKEND_URL, json=log_data)

    # Process the backend response
    if response.status_code == 200:
        result = response.json()
        if result['status'] == 'allowed':
            print(f"Plate {plate} is authorized. Opening gate.")
            # Code to open the gate would be here
        else:
            print(f"Plate {plate} is not authorized.")
    else:
        print(f"Failed to reach backend. Status code: {response.status_code}")

def video_stream_detection():
    """Detect license plates from a video stream (webcam or TCPIP cam)."""
    cap = cv2.VideoCapture(0)  # For USB webcam

    # Uncomment the line below for a TCP/IP camera stream
    # cap = cv2.VideoCapture('tcp://camera_ip:port')

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Perform detection on each frame
        detect_frame(frame)

        # Show the frame (optional)
        cv2.imshow("Video Stream", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

def detect_frame(frame):
    """Process a single frame for license plate detection and authorization."""
    detections = detect_and_recognize(frame)
    for detection in detections:
        plate = detection['plate']
        log_detection(plate, detection, frame)

def post_process_ocr(text):
    cleaned_text = re.sub(r'[^A-Z0-9\-\s]', '', text.upper())
    for country, pattern in EUROPEAN_PATTERNS.items():
        if re.match(pattern, cleaned_text.replace(" ", "")):
            return cleaned_text, country
    return cleaned_text, "Unknown"

def perform_ocr(plate):
    detections = []
    #detections = reader.readtext(plate)
    result = ocr_paddle.ocr(plate)
    if result and isinstance(result, list) and len(result) > 0 and isinstance(result[0], list) and len(result[0]) > 0:
           detections = [(None, result[0][0][1][0], result[0][0][1][1] if len(result[0][0][1]) > 1 else 0.0)]
    return detections

if __name__ == "__main__":
    mode = "web"  # Set the mode to "web" for file upload or "video" for webcam

    if mode == "web":
        app.run(host="0.0.0.0", port=5000, debug=True)
    elif mode == "video":
        # Start video detection in a separate thread
        video_thread = threading.Thread(target=video_stream_detection)
        video_thread.start()
