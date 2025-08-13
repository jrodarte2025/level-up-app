export const validateImageFile = (file) => {
  const errors = [];
  
  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    errors.push('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
  }
  
  // Check file size (5MB max)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    errors.push(`Image is too large (${sizeMB}MB). Please upload an image smaller than 5MB`);
  }
  
  // Check file name for special characters that might cause issues
  const fileName = file.name;
  if (!/^[\w\-. ]+$/.test(fileName)) {
    errors.push('File name contains special characters. Please rename the file and try again');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const getImageDimensions = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          aspectRatio: img.width / img.height
        });
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image dimensions'));
      };
      
      img.src = e.target.result;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
};

export const isLikelyMobileDevice = () => {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  
  // Check for mobile devices
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    userAgent.toLowerCase()
  );
  
  // Check for touch support
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Check screen size
  const isSmallScreen = window.innerWidth <= 768;
  
  return isMobile || (hasTouch && isSmallScreen);
};

export const getOptimalImageSize = () => {
  // Return smaller dimensions for mobile devices to prevent memory issues
  if (isLikelyMobileDevice()) {
    return {
      maxWidth: 800,
      maxHeight: 800,
      quality: 0.8
    };
  }
  
  return {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.9
  };
};