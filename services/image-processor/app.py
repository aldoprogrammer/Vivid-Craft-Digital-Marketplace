import os
import uuid
from datetime import datetime, timezone
from io import BytesIO

from flask import Flask, request, jsonify, send_from_directory
from PIL import Image, ImageDraw, ImageFont

app = Flask(__name__)

OUTPUT_DIR = os.environ.get("OUTPUT_DIR", "/app/output")
MAX_IMAGE_SIZE_BYTES = int(os.environ.get("MAX_IMAGE_SIZE_MB", "20")) * 1024 * 1024

os.makedirs(OUTPUT_DIR, exist_ok=True)


def apply_vividcraft_watermark(image: Image.Image) -> Image.Image:
    """Apply a diagonal 'VividCraft' text watermark across the image."""
    watermarked = image.convert("RGBA")
    overlay = Image.new("RGBA", watermarked.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    width, height = watermarked.size
    font_size = max(24, min(width, height) // 12)

    try:
        font = ImageFont.truetype("DejaVuSans-Bold.ttf", font_size)
    except OSError:
        font = ImageFont.load_default()

    watermark_text = "VividCraft"
    text_bbox = draw.textbbox((0, 0), watermark_text, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]

    spacing_x = text_width + 80
    spacing_y = text_height + 60

    for y in range(-height, height * 2, spacing_y):
        for x in range(-width, width * 2, spacing_x):
            draw.text(
                (x, y),
                watermark_text,
                font=font,
                fill=(255, 255, 255, 60),
            )

    rotated_overlay = overlay.rotate(30, expand=False, resample=Image.BICUBIC)
    result = Image.alpha_composite(watermarked, rotated_overlay)
    return result.convert("RGB")


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "image-processor",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


@app.route("/upload", methods=["POST"])
def upload():
  """Store a profile or banner image without watermark."""
  prefix = request.headers.get("X-Upload-Prefix", "profile")
  raw_data = request.get_data()

  if not raw_data:
    return jsonify({"error": "No image data provided"}), 400

  if len(raw_data) > MAX_IMAGE_SIZE_BYTES:
    return jsonify({"error": f"Image exceeds {MAX_IMAGE_SIZE_BYTES // (1024*1024)}MB limit"}), 413

  try:
    image = Image.open(BytesIO(raw_data))
    image = image.convert("RGB")
  except Exception:
    return jsonify({"error": "Invalid image format"}), 400

  filename = f"{prefix}_{uuid.uuid4().hex[:8]}.jpg"
  file_path = os.path.join(OUTPUT_DIR, filename)
  image.save(file_path, "JPEG", quality=88, optimize=True)

  return jsonify({
    "success": True,
    "filePath": file_path,
    "filename": filename,
    "publicUrl": f"/api/images/files/{filename}",
    "processedAt": datetime.now(timezone.utc).isoformat(),
  }), 200


@app.route("/watermark", methods=["POST"])
def watermark():
    product_id = request.headers.get("X-Product-Id", "unknown")
    raw_data = request.get_data()

    if not raw_data:
        return jsonify({"error": "No image data provided"}), 400

    if len(raw_data) > MAX_IMAGE_SIZE_BYTES:
        return jsonify({"error": f"Image exceeds {MAX_IMAGE_SIZE_BYTES // (1024*1024)}MB limit"}), 413

    try:
        image = Image.open(BytesIO(raw_data))
    except Exception:
        return jsonify({"error": "Invalid image format"}), 400

    watermarked = apply_vividcraft_watermark(image)

    filename = f"{product_id}_{uuid.uuid4().hex[:8]}.jpg"
    file_path = os.path.join(OUTPUT_DIR, filename)
    watermarked.save(file_path, "JPEG", quality=85, optimize=True)

    return jsonify({
        "success": True,
        "filePath": file_path,
        "filename": filename,
        "publicUrl": f"/api/images/files/{filename}",
        "productId": product_id,
        "processedAt": datetime.now(timezone.utc).isoformat(),
    }), 200


@app.route("/upload-asset", methods=["POST"])
def upload_asset():
    """Store a creator digital asset file (zip/pdf/image) without watermark."""
    product_id = request.headers.get("X-Product-Id", "asset")
    original_name = request.headers.get("X-Original-Filename", "file.bin")
    content_type = request.headers.get("Content-Type", "application/octet-stream")
    raw_data = request.get_data()

    if not raw_data:
        return jsonify({"error": "No file data provided"}), 400

    if len(raw_data) > MAX_IMAGE_SIZE_BYTES * 5:
        return jsonify({"error": "File exceeds size limit"}), 413

    ext = os.path.splitext(original_name)[1] or ".bin"
    safe_ext = "".join(c for c in ext if c.isalnum() or c == ".")[:12]
    filename = f"asset_{product_id}_{uuid.uuid4().hex[:8]}{safe_ext}"
    file_path = os.path.join(OUTPUT_DIR, filename)
    with open(file_path, "wb") as f:
        f.write(raw_data)

    return jsonify({
        "success": True,
        "filePath": file_path,
        "filename": filename,
        "originalName": original_name,
        "contentType": content_type,
        "publicUrl": f"/api/images/files/{filename}",
        "productId": product_id,
        "processedAt": datetime.now(timezone.utc).isoformat(),
    }), 200


@app.route("/files/<path:filename>", methods=["GET"])
def serve_file(filename: str):
    safe_name = os.path.basename(filename)
    file_path = os.path.join(OUTPUT_DIR, safe_name)
    if not os.path.isfile(file_path):
        return jsonify({"error": "File not found"}), 404
    mime = "application/octet-stream"
    lower = safe_name.lower()
    if lower.endswith((".jpg", ".jpeg")):
        mime = "image/jpeg"
    elif lower.endswith(".png"):
        mime = "image/png"
    elif lower.endswith(".webp"):
        mime = "image/webp"
    elif lower.endswith(".zip"):
        mime = "application/zip"
    elif lower.endswith(".pdf"):
        mime = "application/pdf"
    return send_from_directory(OUTPUT_DIR, safe_name, mimetype=mime)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
