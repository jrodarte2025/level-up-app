


export const getCroppedImg = async (imageSrc, pixelCrop) => {
  try {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas context. Your browser may not support this feature.");
    }

    // Set canvas dimensions
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Improve image quality on high DPI displays
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error("Canvas is empty - failed to generate blob");
          reject(new Error("Failed to generate image. Please try a different image."));
          return;
        }
        const file = new File([blob], "cropped.jpg", { type: "image/jpeg" });
        resolve(file);
      }, "image/jpeg", 0.9); // Set quality to 0.9 for better compression
    });
  } catch (error) {
    console.error("Error in getCroppedImg:", error);
    throw error;
  }
};

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    
    const handleLoad = () => {
      // Clean up event listeners
      image.removeEventListener("load", handleLoad);
      image.removeEventListener("error", handleError);
      resolve(image);
    };
    
    const handleError = (error) => {
      // Clean up event listeners
      image.removeEventListener("load", handleLoad);
      image.removeEventListener("error", handleError);
      console.error("Image load error:", error);
      reject(new Error("Failed to load image. The image may be corrupted or in an unsupported format."));
    };
    
    image.addEventListener("load", handleLoad);
    image.addEventListener("error", handleError);
    
    // Only set crossOrigin for external URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
      image.setAttribute("crossOrigin", "anonymous");
    }
    
    image.src = url;
  });