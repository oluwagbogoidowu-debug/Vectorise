import React, { useState, useEffect } from 'react';
import { assetService } from '../services/assetService';

interface LocalLogoProps {
  type: 'green' | 'white';
  className?: string;
  alt?: string;
}

const LocalLogo: React.FC<LocalLogoProps> = ({ type, className = "", alt = "Vectorise" }) => {
  // Start with the remote URL immediately to ensure visibility while caching happens
  const initialUrl = type === 'green' ? assetService.URLS.LOGO_GREEN : assetService.URLS.LOGO_WHITE;
  const [src, setSrc] = useState<string>(initialUrl);

  useEffect(() => {
    const load = async () => {
      const key = type === 'green' ? assetService.KEYS.LOGO_GREEN : assetService.KEYS.LOGO_WHITE;
      const url = type === 'green' ? assetService.URLS.LOGO_GREEN : assetService.URLS.LOGO_WHITE;
      
      // Check if we have a cached version (v2 to force refresh)
      const cached = localStorage.getItem(`asset_v2_${key}`);
      if (cached) {
        setSrc(cached);
      } else {
        // If not cached, try to fetch and store it for next time
        const localUrl = await assetService.getStoredAsset(key, url);
        setSrc(localUrl);
      }
    };
    load();
  }, [type]);

  return (
    <img 
      src={src} 
      alt={alt} 
      className={className} 
      onError={(e) => {
        // If the current src (e.g. cached base64) fails, fallback to remote URL
        const target = e.target as HTMLImageElement;
        const remoteUrl = type === 'green' ? assetService.URLS.LOGO_GREEN : assetService.URLS.LOGO_WHITE;
        if (target.src !== remoteUrl) {
          target.src = remoteUrl;
        }
      }}
    />
  );
};

export default LocalLogo;
