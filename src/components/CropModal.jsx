import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import Slider from "@mui/material/Slider";
import { getCroppedImg } from "../utils/cropImage";

export default function CropModal({ imageSrc, onCancel, onCropComplete, aspect = 1 }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const handleCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleConfirm = async () => {
    try {
      if (!croppedAreaPixels) {
        alert("Please adjust the crop area before confirming.");
        return;
      }
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedImage);
    } catch (error) {
      console.error("Crop failed:", error);
      alert(error.message || "Failed to crop image. Please try again.");
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0,0,0,0.75)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2000
    }}>
      <div style={{
        backgroundColor: "#fff",
        borderRadius: "12px",
        padding: "1rem",
        width: "90%",
        maxWidth: "400px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        textAlign: "center"
      }}>
        <div style={{ position: "relative", width: "100%", height: 300, backgroundColor: "#f0f0f0" }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
            cropShape="rect"
            showGrid={true}
            style={{
              containerStyle: {
                backgroundColor: "#f0f0f0"
              }
            }}
          />
        </div>
        <Slider
          value={zoom}
          min={1}
          max={3}
          step={0.1}
          onChange={(e, zoom) => setZoom(zoom)}
          style={{ marginTop: "1rem" }}
        />
        <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between" }}>
          <button className="button-link" onClick={onCancel}>Cancel</button>
          <button className="button-primary" onClick={handleConfirm}>Crop</button>
        </div>
      </div>
    </div>
  );
}
