import { useState, useEffect } from 'react';

export interface ScreenSize {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
}

export function useMediaQuery(): ScreenSize {
  const [screenSize, setScreenSize] = useState<ScreenSize>(() => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 768;
    const height = typeof window !== 'undefined' ? window.innerHeight : 1024;

    return {
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024,
      width,
      height,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setScreenSize({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        width,
        height,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return screenSize;
}

export default useMediaQuery;
