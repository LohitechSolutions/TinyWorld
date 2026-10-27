import { useState } from 'react'

type Props = {
  src: string
  alt: string
  className?: string
  fallback?: string
}

export function SafeImage({ src, alt, className = '', fallback = ' verdant' }: Props) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return <div className={`img-fallback ${className}`.trim()} aria-hidden data-tone={fallback} />
  }
  return <img className={className} src={src} alt={alt} onError={() => setFailed(true)} />
}
