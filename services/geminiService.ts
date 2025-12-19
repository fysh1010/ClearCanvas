import { GoogleGenAI } from "@google/genai";
import { ProcessMode } from "../types";

// Ensure API Key is available
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY is missing in environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * Composites the AI result back onto the original image using the mask.
 * This ensures that pixels outside the masked area are 100% identical to the original.
 */
async function compositeImage(originalB64: string, maskB64: string, resultB64: string): Promise<string> {
  const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });

  try {
    const [original, mask, result] = await Promise.all([
      loadImage(originalB64),
      loadImage(maskB64),
      loadImage(resultB64)
    ]);

    const canvas = document.createElement('canvas');
    canvas.width = original.width;
    canvas.height = original.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not get canvas context");

    // 1. Draw Original Image Base (Background)
    ctx.drawImage(original, 0, 0);

    // 2. Prepare the masked replacement
    // We want to overlay the 'result' image ONLY where 'mask' is white.
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = original.width;
    maskCanvas.height = original.height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) throw new Error("Could not get mask context");

    // Draw the generated image (stretched to fit original dimensions if needed)
    maskCtx.drawImage(result, 0, 0, original.width, original.height);

    // 3. Create Alpha Mask from the B/W Mask Image
    // The maskB64 is black background (keep original), white selection (use new).
    const alphaMaskCanvas = document.createElement('canvas');
    alphaMaskCanvas.width = original.width;
    alphaMaskCanvas.height = original.height;
    const alphaCtx = alphaMaskCanvas.getContext('2d');
    if(!alphaCtx) throw new Error("No alpha context");
    
    alphaCtx.drawImage(mask, 0, 0, original.width, original.height);
    const imageData = alphaCtx.getImageData(0, 0, original.width, original.height);
    const data = imageData.data;
    for(let i=0; i < data.length; i+=4) {
       // Convert grayscale/B&W to Alpha. 
       // White (255) -> Opaque (255), Black (0) -> Transparent (0).
       // Use Green channel as proxy for brightness.
       const brightness = data[i+1]; 
       data[i+3] = brightness; 
    }
    alphaCtx.putImageData(imageData, 0, 0);

    // 4. Apply Alpha Mask to the Result Layer
    // 'destination-in' keeps the content (Result) only where the source (AlphaMask) is opaque.
    maskCtx.globalCompositeOperation = 'destination-in';
    maskCtx.drawImage(alphaMaskCanvas, 0, 0);

    // 5. Draw the masked result onto the main canvas
    ctx.drawImage(maskCanvas, 0, 0);

    return canvas.toDataURL('image/png');

  } catch (e) {
    console.error("Compositing error", e);
    // If compositing fails, return the raw result as fallback
    return resultB64; 
  }
}

/**
 * Removes watermark/text from an image using Gemini.
 * 
 * @param imageBase64 The original image in base64 format (without prefix)
 * @param maskBase64 Optional mask image in base64 format. White pixels = area to remove.
 * @param mode The processing mode selected by the user
 */
export const removeWatermark = async (
  imageBase64: string,
  maskBase64: string | null,
  mode: ProcessMode = 'auto'
): Promise<string> => {
  try {
    const cleanImageBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
    
    const parts: any[] = [
      {
        inlineData: {
          mimeType: 'image/png',
          data: cleanImageBase64,
        },
      }
    ];

    let prompt = "";

    if (mode === 'tiled') {
      // Specialized prompt for full-screen tiled watermarks
      prompt = "This image contains a repeating, tiled watermark pattern covering the entire image (e.g., text overlaid in a grid). Detect and remove ALL instances of this watermark text completely. Restore the underlying background seamlessly. Maintain the original image quality, colors, and non-watermark details. Output ONLY the clean image.";
    } else if (maskBase64) {
      // Manual Mode with Mask
      const cleanMaskBase64 = maskBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: cleanMaskBase64,
        },
      });
      prompt = "The second image is a mask (white area represents the selection). Remove the content located within the white area of the mask from the first image. Inpaint the area to match the surrounding background seamlessly. Output the result image. Do not change any part of the image outside the mask.";
    } else {
      // Auto Mode (General)
      prompt = "Detect and remove all watermarks, text overlays, and logos from this image. Output the clean image. STRICTLY preserve the quality, resolution, and details of the non-watermarked areas.";
    }

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', 
      contents: {
        parts: parts,
      },
      config: {
        temperature: 0.3, 
      }
    });

    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          const resultBase64 = `data:image/png;base64,${part.inlineData.data}`;
          
          // Only composite if we have a mask and we are NOT in tiled mode (tiled mode affects whole image usually)
          // However, if manual mode was used with a mask, we definitely want to composite.
          if (maskBase64 && mode === 'manual') {
             return await compositeImage(imageBase64, maskBase64, resultBase64);
          }
          
          return resultBase64;
        }
      }
    }

    throw new Error("No image data received from AI.");

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};