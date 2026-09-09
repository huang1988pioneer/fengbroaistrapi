import type { ImgHTMLAttributes } from 'react';
type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { src: string | { src: string }; fill?: boolean; priority?: boolean; unoptimized?: boolean; quality?: number };
export default function Image({ src, fill, priority, unoptimized: _unoptimized, quality: _quality, style, ...props }: Props) {
  return <img {...props} src={typeof src === 'string' ? src : src.src} loading={priority ? 'eager' : 'lazy'} style={fill ? { position: 'absolute', inset: 0, width: '100%', height: '100%', ...style } : style} />;
}
