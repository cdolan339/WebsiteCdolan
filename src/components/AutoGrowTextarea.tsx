import { useEffect, useRef, useState, forwardRef } from 'react'

type Props = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows'> & {
  minHeight?: number
  focusMinHeight?: number
}

export const AutoGrowTextarea = forwardRef<HTMLTextAreaElement, Props>(function AutoGrowTextarea(
  { minHeight = 80, focusMinHeight = 200, className = '', style, onFocus, onBlur, value, ...rest },
  forwardedRef,
) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null)
  const setRef = (el: HTMLTextAreaElement | null) => {
    innerRef.current = el
    if (typeof forwardedRef === 'function') forwardedRef(el)
    else if (forwardedRef) forwardedRef.current = el
  }
  const [focused, setFocused] = useState(false)

  const resize = () => {
    const el = innerRef.current
    if (!el) return
    el.style.height = 'auto'
    const floor = focused ? focusMinHeight : minHeight
    el.style.height = Math.max(el.scrollHeight, floor) + 'px'
  }

  useEffect(() => { resize() })

  return (
    <textarea
      ref={setRef}
      value={value}
      className={className + ' resize-none'}
      style={{ ...style, overflow: 'hidden', minHeight: focused ? focusMinHeight : minHeight }}
      onFocus={(e) => { setFocused(true); onFocus?.(e) }}
      onBlur={(e) => { setFocused(false); onBlur?.(e) }}
      onInput={resize}
      {...rest}
    />
  )
})
