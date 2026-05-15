import { useState, useRef, useEffect } from 'react';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';

interface LazyImageProps {
  src: string | null | undefined;
  alt: string;
  height?: number | string;
  width?: string;
}

export function LazyImage({ src, alt, height = 280, width = '100%' }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const fallback = 'https://via.placeholder.com/300x450?text=No+Image';

  return (
    <Box ref={ref} sx={{ width, height, position: 'relative', bgcolor: 'grey.100' }}>
      {!loaded && <Skeleton variant="rectangular" width="100%" height={height} />}
      {inView && (
        <Box
          component="img"
          src={src || fallback}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={(e) => { (e.target as HTMLImageElement).src = fallback; setLoaded(true); }}
          sx={{ width: '100%', height, objectFit: 'cover', display: loaded ? 'block' : 'none' }}
        />
      )}
    </Box>
  );
}
