/**
 * Service to manage downloading and local storage caching of app assets.
 */
export const assetService = {
  /**
   * Fetches an image, converts it to base64, and saves it to localStorage.
   * Returns the local data URL if available, otherwise the original URL.
   */
  getStoredAsset: async (key: string, url: string): Promise<string> => {
    const cached = localStorage.getItem(`asset_v2_${key}`);
    if (cached) return cached;

    try {
      // Attempt to fetch with CORS. If it fails, the component will just use the remote URL.
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) throw new Error('Network response was not ok');
      
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          try {
            localStorage.setItem(`asset_v2_${key}`, base64data);
          } catch (e) {
            console.warn("Storage full or unavailable for assets");
          }
          resolve(base64data);
        };
        reader.onerror = () => resolve(url);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn(`Failed to fetch asset for cache: ${key}. Falling back to remote URL.`, error);
      return url;
    }
  },

  // Keys for specific assets
  KEYS: {
    LOGO_GREEN: 'logo_green',
    LOGO_WHITE: 'logo_white'
  },

  // Swapped IDs: 1vYOe... is the Green logo, 1rlpd... is the White logo
  URLS: {
    LOGO_GREEN: 'https://lh3.googleusercontent.com/d/1vYOe4SzIrE7kb6DSFkOp9UYz3tHWPnHw',
    LOGO_WHITE: 'https://lh3.googleusercontent.com/d/1rlpdJZVVY-aFonII5g-HgNNn7P9KYprl'
  }
};
