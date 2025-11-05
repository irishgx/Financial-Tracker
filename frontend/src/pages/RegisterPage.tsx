import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { toast } from 'react-hot-toast'
import { Eye, EyeOff, Loader2, ArrowRight, Shield, Zap, TrendingUp, CheckCircle } from 'lucide-react'

export function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()
  
  // Refs for autofill detection
  const firstNameInputRef = useRef<HTMLInputElement>(null)
  const lastNameInputRef = useRef<HTMLInputElement>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null)

  // Detect autofill and mark inputs with .filled class (same as LoginPage)
  useEffect(() => {
    const inputs = [
      firstNameInputRef.current,
      lastNameInputRef.current,
      emailInputRef.current,
      passwordInputRef.current,
      confirmPasswordInputRef.current
    ].filter(Boolean) as HTMLInputElement[]
    
    if (inputs.length === 0) return

    const checkInput = (input: HTMLInputElement) => {
      const hasValue = input.value.length > 0
      let isAutofilled = false
      try {
        isAutofilled = input.matches ? input.matches(':-webkit-autofill') : false
      } catch (e) {
        isAutofilled = false
      }
      
      if (hasValue || isAutofilled) {
        input.classList.add('filled')
      } else {
        input.classList.remove('filled')
      }
    }

    const checkAll = () => {
      inputs.forEach(checkInput)
    }

    // Initial check
    checkAll()

    // Listen for input changes
    const handleInput = (e: Event) => {
      checkInput(e.target as HTMLInputElement)
    }
    inputs.forEach(input => {
      input.addEventListener('input', handleInput)
    })

    // Detect autofill via animationstart (most reliable)
    const handleAnimationStart = (e: AnimationEvent) => {
      if (e.animationName === 'onAutoFillStart') {
        setTimeout(checkAll, 10)
      }
    }
    document.addEventListener('animationstart', handleAnimationStart as EventListener)

    // Check on focus/blur
    const handleFocus = (e: FocusEvent) => {
      setTimeout(() => checkInput(e.target as HTMLInputElement), 50)
    }
    const handleBlur = (e: FocusEvent) => {
      checkInput(e.target as HTMLInputElement)
    }
    inputs.forEach(input => {
      input.addEventListener('focus', handleFocus)
      input.addEventListener('blur', handleBlur)
    })

    // Periodic check for delayed autofill
    let checkInterval: NodeJS.Timeout | null = null
    const startPeriodicCheck = () => {
      if (checkInterval) return
      checkInterval = setInterval(() => {
        checkAll()
        if (inputs.every(input => input.value)) {
          if (checkInterval) {
            clearInterval(checkInterval)
            checkInterval = null
          }
        }
      }, 100)
      setTimeout(() => {
        if (checkInterval) {
          clearInterval(checkInterval)
          checkInterval = null
        }
      }, 3000)
    }

    startPeriodicCheck()
    window.addEventListener('focus', () => {
      checkAll()
      startPeriodicCheck()
    })

    return () => {
      inputs.forEach(input => {
        input.removeEventListener('input', handleInput)
        input.removeEventListener('focus', handleFocus)
        input.removeEventListener('blur', handleBlur)
      })
      document.removeEventListener('animationstart', handleAnimationStart as EventListener)
      window.removeEventListener('focus', startPeriodicCheck)
      if (checkInterval) {
        clearInterval(checkInterval)
      }
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    // Update filled class for autofill detection
    if (e.target.value.length > 0) {
      e.target.classList.add('filled')
    } else {
      e.target.classList.remove('filled')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    if (!agreedToTerms) {
      toast.error('Please agree to the terms and conditions')
      return
    }

    setLoading(true)

    try {
      const result = await register(formData.email, formData.password, formData.firstName, formData.lastName)
      
      if (result?.requiresVerification) {
        toast.success('Account created! Please check your email to verify your account.', { duration: 5000 })
        navigate('/verify-email', { state: { email: formData.email } })
      } else {
        toast.success('Account created successfully!')
        navigate('/')
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const getPasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 6) strength++
    if (password.length >= 8) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    return strength
  }

  const passwordStrength = getPasswordStrength(formData.password)
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500']

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 sm:px-6 lg:px-8 register-page">
      {/* Background with Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-blue-50">
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: `
            linear-gradient(rgba(99, 102, 241, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 102, 241, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}></div>
        
        {/* Abstract Circles */}
        <div className="absolute top-16 left-16 w-36 h-36 bg-indigo-200 rounded-full opacity-20 blur-xl"></div>
        <div className="absolute top-32 right-24 w-44 h-44 bg-purple-200 rounded-full opacity-15 blur-xl"></div>
        <div className="absolute bottom-28 left-32 w-48 h-48 bg-blue-200 rounded-full opacity-25 blur-xl"></div>
        <div className="absolute bottom-16 right-16 w-32 h-32 bg-indigo-300 rounded-full opacity-20 blur-xl"></div>
        
        {/* Trend Lines */}
        <div className="absolute top-1/4 left-8 w-80 h-px bg-gradient-to-r from-transparent via-indigo-300 to-transparent opacity-30"></div>
        <div className="absolute top-1/3 right-8 w-96 h-px bg-gradient-to-r from-transparent via-purple-300 to-transparent opacity-25"></div>
        <div className="absolute bottom-1/4 left-16 w-72 h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent opacity-35"></div>
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/80 via-white/90 to-blue-50/80"></div>
      </div>
      <div className="w-full max-w-6xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left Side - Branding & Features */}
          <div className="hidden lg:block">
            <div className="max-w-md mx-auto">
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-7 w-7 text-white" />
                </div>
                <span className="ml-3 text-2xl font-bold text-gray-900">FinanceTracker</span>
              </div>
              
              <h1 className="text-4xl font-bold text-gray-900 mb-6">
                Start your financial
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600"> journey</span>
              </h1>
              
              <p className="text-lg text-gray-600 mb-8">
                Join thousands of users who are taking control of their finances and building wealth.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-4">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-gray-700">Free to get started</span>
                </div>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <Shield className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-gray-700">Your data is secure</span>
                </div>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                    <Zap className="h-4 w-4 text-purple-600" />
                  </div>
                  <span className="text-gray-700">Set up in minutes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Register Form */}
          <div className="w-full max-w-md mx-auto">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <span className="ml-2 text-xl font-bold text-gray-900">FinanceTracker</span>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Create your account
              </h2>
              <p className="text-gray-600">
                Get started with your free account today
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="floating-input-wrapper relative">
                  <input
                    ref={firstNameInputRef}
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
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
                    className="floating-input w-full px-4 pt-6 pb-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/50 backdrop-blur-sm placeholder:opacity-0"
                    placeholder=" "
                  />
                  <label 
                    htmlFor="firstName" 
                    className="floating-label absolute left-4 pointer-events-none origin-left"
                  >
                    First name
                  </label>
                </div>
                <div className="floating-input-wrapper relative">
                  <input
                    ref={lastNameInputRef}
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
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
                    className="floating-input w-full px-4 pt-6 pb-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/50 backdrop-blur-sm placeholder:opacity-0"
                    placeholder=" "
                  />
                  <label 
                    htmlFor="lastName" 
                    className="floating-label absolute left-4 pointer-events-none origin-left"
                  >
                    Last name
                  </label>
                </div>
              </div>

              <div className="floating-input-wrapper relative">
                <input
                  ref={emailInputRef}
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
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
                  className="floating-input w-full px-4 pt-6 pb-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/50 backdrop-blur-sm placeholder:opacity-0"
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
                <div className="relative">
                  <input
                    ref={passwordInputRef}
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
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
                    className="floating-input w-full px-4 pt-6 pb-2 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/50 backdrop-blur-sm placeholder:opacity-0"
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
                    className="absolute right-3 text-gray-400 hover:text-gray-600 transition-colors z-10 flex items-center justify-center"
                    style={{ 
                      top: '27px',
                      transform: 'translateY(-50%)'
                    }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">Password strength</span>
                      <span className={`text-xs font-medium ${
                        passwordStrength <= 2 ? 'text-red-600' : 
                        passwordStrength <= 3 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {strengthLabels[passwordStrength - 1] || 'Very Weak'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${strengthColors[passwordStrength - 1] || 'bg-red-500'}`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="floating-input-wrapper relative">
                <input
                  ref={confirmPasswordInputRef}
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
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
                  className="floating-input w-full px-4 pt-6 pb-2 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/50 backdrop-blur-sm placeholder:opacity-0"
                  placeholder=" "
                />
                <label 
                  htmlFor="confirmPassword" 
                  className="floating-label absolute left-4 pointer-events-none origin-left"
                >
                  Confirm password
                </label>
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  id="agreedToTerms"
                  name="agreedToTerms"
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="agreedToTerms" className="ml-2 block text-sm text-gray-700">
                  I agree to the{' '}
                  <a href="#" className="text-indigo-600 hover:text-indigo-500">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-indigo-600 hover:text-indigo-500">
                    Privacy Policy
                  </a>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center px-4 py-3 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create account
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
                  <span className="px-2 bg-white text-gray-500">Already have an account?</span>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  to="/login"
                  className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-xl shadow-sm text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
                >
                  Sign in to your account
                </Link>
              </div>
            </div>
          </div>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500">
                Secure registration with bank-level encryption
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}