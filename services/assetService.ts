/**
 * Service to manage app assets.
 * Note: Google Photos (lh3.googleusercontent.com) URLs usually don't support CORS fetch.
 */
export const assetService = {
  /**
   * Returns the asset URL. 
   * Local storage caching via fetch is disabled for lh3 assets to prevent CORS 'Failed to fetch' errors.
   */
  getStoredAsset: async (key: string, url: string): Promise<string> => {
    // If it's a Google Photos URL, we skip the fetch() attempt entirely 
    // because it will trigger a CORS error and browser "Failed to fetch" log.
    if (url.includes('lh3.googleusercontent.com')) {
        return url;
    }

    const cached = localStorage.getItem(`asset_v4_${key}`);
    if (cached) return cached;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          try {
            localStorage.setItem(`asset_v4_${key}`, base64data);
          } catch (e) {
            console.warn("Storage quota exceeded");
          }
          resolve(base64data);
        };
        reader.onerror = () => resolve(url);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      // Return original URL on any fetch failure (CORS, offline, etc.)
      return url;
    }
  },

  KEYS: {
    LOGO_GREEN: 'logo_green',
    LOGO_WHITE: 'logo_white',
    FAVICON: 'favicon'
  },

  URLS: {
    // Restored to original Vectorise brand logos
    LOGO_GREEN: 'https://lh3.googleusercontent.com/d/1vYOe4SzIrE7kb6DSFkOp9UYz3tHWPnHw',
    LOGO_WHITE: 'https://lh3.googleusercontent.com/d/1rlpdJZVVY-aFonII5g-HgNNn7P9KYprl',
    // Icon version for specific usage (Onboarding descriptions)
    FAVICON: 'https://lh3.googleusercontent.com/d/1jdtxp_51VdLMYNHsmyN-yNFTPN5GFjBd',
    // Global standard fallback for sprint covers
    DEFAULT_SPRINT_COVER: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1350&q=80'
  }
};