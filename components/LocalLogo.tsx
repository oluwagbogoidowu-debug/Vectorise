import React, { useState, useEffect } from 'react';
import { assetService } from '../services/assetService';

interface LocalLogoProps {
  type: 'green' | 'white' | 'favicon';
  className?: string;
  alt?: string;
}

const LocalLogo: React.FC<LocalLogoProps> = ({ type, className = "", alt = "Vectorise" }) => {
  const getUrl = (t: typeof type) => {
    if (t === 'green') return assetService.URLS.LOGO_GREEN;
    if (t === 'white') return assetService.URLS.LOGO_WHITE;
    return assetService.URLS.FAVICON;
  };

  const getKey = (t: typeof type) => {
    if (t === 'green') return assetService.KEYS.LOGO_GREEN;
    if (t === 'white') return assetService.KEYS.LOGO_WHITE;
    return assetService.KEYS.FAVICON;
  };

  const initialUrl = getUrl(type);
  const [src, setSrc] = useState<string>(initialUrl);

  useEffect(() => {
    const load = async () => {
      const key = getKey(type);
      const url = getUrl(type);
      
      const cached = localStorage.getItem(`asset_v4_${key}`);
      if (cached) {
        setSrc(cached);
      } else {
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
        const target = e.target as HTMLImageElement;
        const remoteUrl = getUrl(type);
        if (target.src !== remoteUrl) {
          target.src = remoteUrl;
        }
      }}
    />
  );
};

export default LocalLogo;