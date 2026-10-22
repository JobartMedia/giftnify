import React from 'react';

interface Icon3DProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  alt?: string;
  /** Accepted for parity with the app component; animation is CSS-free here. */
  motion?: string;
}

const SIZE_MAP = {
  xs: 'size-6',
  sm: 'size-9',
  md: 'size-12',
  lg: 'size-16',
  xl: 'size-24',
};

/** 3D artwork from /public/images/icons — same set and framing as the app's Icon3D. */
export const Icon3D: React.FC<Icon3DProps> = ({ name, size = 'md', className = '', alt = '' }) => (
  <img
    src={`/images/icons/${name}.webp`}
    alt={alt}
    aria-hidden={alt ? undefined : true}
    loading="lazy"
    decoding="async"
    draggable={false}
    onError={(e) => {
      const img = e.currentTarget;
      if (!img.src.endsWith('/gift.webp')) img.src = '/images/icons/gift.webp';
    }}
    className={`block shrink-0 select-none object-contain shadow-icon ${SIZE_MAP[size]} ${className}`}
  />
);
