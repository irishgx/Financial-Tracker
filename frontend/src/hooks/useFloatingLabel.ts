import { useEffect, useRef, useState } from 'react'

/**
 * Hook to manage floating label state for inputs, including autofill detection.
 * Adds a 'filled' class to the input when it has a value (including browser autofill).
 */
export function useFloatingLabel() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isFilled, setIsFilled] = useState(false)

  useEffect(() => {
    const input = inputRef.current
    if (!input) return

    // Check initial value (including autofill)
    const checkValue = () => {
      const hasValue = input.value.length > 0
      setIsFilled(hasValue)
      
      if (hasValue) {
        input.classList.add('filled')
      } else {
        input.classList.remove('filled')
      }
    }

    // Initial check
    checkValue()

    // Listen for input changes
    const handleInput = () => checkValue()
    input.addEventListener('input', handleInput)

    // Detect autofill by checking for value changes that weren't triggered by user input
    // This handles delayed autofill (especially in Chrome/Edge)
    let autofillCheckInterval: NodeJS.Timeout | null = null

    // Check periodically for autofill (needed for some browsers)
    const startAutofillCheck = () => {
      if (autofillCheckInterval) return
      
      autofillCheckInterval = setInterval(() => {
        if (input.matches(':-webkit-autofill')) {
          checkValue()
        }
      }, 100)
    }

    // Stop checking after a delay (autofill usually happens quickly)
    const stopAutofillCheck = () => {
      setTimeout(() => {
        if (autofillCheckInterval) {
          clearInterval(autofillCheckInterval)
          autofillCheckInterval = null
        }
      }, 2000)
    }

    // Use animationstart event to detect autofill (most reliable method)
    const handleAnimationStart = (e: AnimationEvent) => {
      if (e.animationName === 'onAutoFillStart') {
        checkValue()
        startAutofillCheck()
        stopAutofillCheck()
      }
    }

    input.addEventListener('animationstart', handleAnimationStart as EventListener)

    // Also check on focus/blur (helps catch delayed autofill)
    const handleFocus = () => {
      setTimeout(checkValue, 50)
      startAutofillCheck()
    }
    const handleBlur = () => {
      checkValue()
      stopAutofillCheck()
    }

    input.addEventListener('focus', handleFocus)
    input.addEventListener('blur', handleBlur)

    // MutationObserver as fallback for autofill detection
    const observer = new MutationObserver(() => {
      checkValue()
    })

    observer.observe(input, {
      attributes: true,
      attributeFilter: ['class', 'style']
    })

    return () => {
      input.removeEventListener('input', handleInput)
      input.removeEventListener('animationstart', handleAnimationStart as EventListener)
      input.removeEventListener('focus', handleFocus)
      input.removeEventListener('blur', handleBlur)
      if (autofillCheckInterval) {
        clearInterval(autofillCheckInterval)
      }
      observer.disconnect()
    }
  }, [])

  return { inputRef, isFilled }
}

