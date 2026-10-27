import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'default'
  children: ReactNode
}

export function Button({ variant = 'default', children, className = '', ...props }: Props) {
  return (
    <button className={`btn ${variant} ${className}`.trim()} type="button" {...props}>
      {children}
    </button>
  )
}
