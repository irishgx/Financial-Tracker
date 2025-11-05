import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { toast } from 'react-hot-toast'
import { Eye, EyeOff, Loader2, ArrowRight, Shield, Zap, TrendingUp } from 'lucide-react'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const emailInputRef = useRef<HTMLInputElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  // Detect autofill and mark inputs with .filled class
  useEffect(() => {
    const emailInput = emailInputRef.current
    const passwordInput = passwordInputRef.current
    
    if (!emailInput || !passwordInput) return

    const checkInput = (input: HTMLInputElement) => {
      // Check if input has value (including autofill)
      const hasValue = input.value.length > 0
      
      // Try to detect webkit autofill (may not work in all browsers)
      let isAutofilled = false
      try {
        isAutofilled = input.matches ? input.matches(':-webkit-autofill') : false
      } catch (e) {
        // matches() may throw in some browsers
        isAutofilled = false
      }
      
      if (hasValue || isAutofilled) {
        input.classList.add('filled')
      } else {
        input.classList.remove('filled')
      }
    }

    const checkAll = () => {
      if (emailInput) checkInput(emailInput)
      if (passwordInput) checkInput(passwordInput)
    }

    // Initial check
    checkAll()

    // Listen for input changes
    const handleEmailInput = () => checkInput(emailInput)
    const handlePasswordInput = () => checkInput(passwordInput)
    emailInput.addEventListener('input', handleEmailInput)
    passwordInput.addEventListener('input', handlePasswordInput)

    // Detect autofill via animationstart (most reliable)
    const handleAnimationStart = (e: AnimationEvent) => {
      if (e.animationName === 'onAutoFillStart') {
        setTimeout(checkAll, 10)
      }
    }
    document.addEventListener('animationstart', handleAnimationStart as EventListener)

    // Check on focus/blur
    const handleEmailFocus = () => setTimeout(() => checkInput(emailInput), 50)
    const handleEmailBlur = () => checkInput(emailInput)
    const handlePasswordFocus = () => setTimeout(() => checkInput(passwordInput), 50)
    const handlePasswordBlur = () => checkInput(passwordInput)
    
    emailInput.addEventListener('focus', handleEmailFocus)
    emailInput.addEventListener('blur', handleEmailBlur)
    passwordInput.addEventListener('focus', handlePasswordFocus)
    passwordInput.addEventListener('blur', handlePasswordBlur)

    // Periodic check for delayed autofill (especially Chrome/Edge/Safari)
    let checkInterval: NodeJS.Timeout | null = null
    const startPeriodicCheck = () => {
      if (checkInterval) return
      checkInterval = setInterval(() => {
        checkAll()
        // Stop checking after autofill is typically complete
        if (emailInput.value && passwordInput.value) {
          if (checkInterval) {
            clearInterval(checkInterval)
            checkInterval = null
          }
        }
      }, 100)
      // Stop after 3 seconds max
      setTimeout(() => {
        if (checkInterval) {
          clearInterval(checkInterval)
          checkInterval = null
        }
      }, 3000)
    }

    // Start periodic check on page load and window focus
    startPeriodicCheck()
    window.addEventListener('focus', () => {
      checkAll()
      startPeriodicCheck()
    })

    return () => {
      emailInput.removeEventListener('input', handleEmailInput)
      passwordInput.removeEventListener('input', handlePasswordInput)
      document.removeEventListener('animationstart', handleAnimationStart as EventListener)
      emailInput.removeEventListener('focus', handleEmailFocus)
      emailInput.removeEventListener('blur', handleEmailBlur)
      passwordInput.removeEventListener('focus', handlePasswordFocus)
      passwordInput.removeEventListener('blur', handlePasswordBlur)
      window.removeEventListener('focus', startPeriodicCheck)
      if (checkInterval) {
        clearInterval(checkInterval)
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await login(email, password)
      toast.success('Welcome back!')
      navigate('/')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 sm:px-6 lg:px-8 login-page">
      {/* Background with Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}></div>
        
        {/* Abstract Circles */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-blue-200 rounded-full opacity-20 blur-xl"></div>
        <div className="absolute top-40 right-32 w-48 h-48 bg-indigo-200 rounded-full opacity-15 blur-xl"></div>
        <div className="absolute bottom-32 left-40 w-40 h-40 bg-purple-200 rounded-full opacity-25 blur-xl"></div>
        <div className="absolute bottom-20 right-20 w-36 h-36 bg-blue-300 rounded-full opacity-20 blur-xl"></div>
        
        {/* Trend Lines */}
        <div className="absolute top-1/3 left-10 w-96 h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent opacity-30"></div>
        <div className="absolute top-1/4 right-10 w-80 h-px bg-gradient-to-r from-transparent via-indigo-300 to-transparent opacity-25"></div>
        <div className="absolute bottom-1/3 left-20 w-72 h-px bg-gradient-to-r from-transparent via-purple-300 to-transparent opacity-35"></div>
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-white/90 to-indigo-50/80"></div>
      </div>
      <div className="w-full max-w-6xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left Side - Branding & Features */}
          <div className="hidden lg:block">
            <div className="max-w-md mx-auto">
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-7 w-7 text-white" />
                </div>
                <span className="ml-3 text-2xl font-bold text-gray-900">FinanceTracker</span>
              </div>
              
              <h1 className="text-4xl font-bold text-gray-900 mb-6">
                Take control of your
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600"> finances</span>
              </h1>
              
              <p className="text-lg text-gray-600 mb-8">
                Track expenses, manage budgets, and achieve your financial goals with our intuitive platform.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-4">
                    <Shield className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-gray-700">Bank-level security</span>
                </div>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <Zap className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-gray-700">Real-time insights</span>
                </div>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                  </div>
                  <span className="text-gray-700">Smart analytics</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full max-w-md mx-auto">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <span className="ml-2 text-xl font-bold text-gray-900">FinanceTracker</span>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome back
              </h2>
              <p className="text-gray-600">
                Sign in to your account to continue
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="floating-input-wrapper relative">
                <input
                  ref={emailInputRef}
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (e.target.value.length > 0) {
                      e.target.classList.add('filled')
                    } else {
                      e.target.classList.remove('filled')
                    }
                  }}
                  onFocus={(e) => {
                    e.target.classList.add('focused')
                  }}
                  onBlur={(e) => {
                    e.target.classList.remove('focused')
                    if (e.target.value.length > 0) {
                      e.target.classList.add('filled')
                    } else {
                      e.target.classList.remove('filled')
                    }
                  }}
                  className="floating-input w-full px-4 pt-6 pb-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm placeholder:opacity-0"
                  placeholder=" "
                />
                <label 
                  htmlFor="email" 
                  className="floating-label absolute left-4 pointer-events-none origin-left"
                >
                  Email address
                </label>
              </div>

              <div className="floating-input-wrapper relative">
                <input
                  ref={passwordInputRef}
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (e.target.value.length > 0) {
                      e.target.classList.add('filled')
                    } else {
                      e.target.classList.remove('filled')
                    }
                  }}
                  onFocus={(e) => {
                    e.target.classList.add('focused')
                  }}
                  onBlur={(e) => {
                    e.target.classList.remove('focused')
                    if (e.target.value.length > 0) {
                      e.target.classList.add('filled')
                    } else {
                      e.target.classList.remove('filled')
                    }
                  }}
                  className="floating-input w-full px-4 pt-6 pb-2 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm placeholder:opacity-0"
                  placeholder=" "
                />
                <label 
                  htmlFor="password" 
                  className="floating-label absolute left-4 pointer-events-none origin-left"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    Remember me
                  </label>
                </div>
                <div className="text-sm">
                  <a href="#" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                    Forgot password?
                  </a>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center px-4 py-3 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">New to FinanceTracker?</span>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  to="/register"
                  className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-xl shadow-sm text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                >
                  Create your account
                </Link>
              </div>
            </div>
          </div>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500">
                By signing in, you agree to our{' '}
                <a href="#" className="text-blue-600 hover:text-blue-500">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-blue-600 hover:text-blue-500">
                  Privacy Policy
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}