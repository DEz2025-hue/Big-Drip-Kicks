import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { ShoppingBag, Eye, EyeOff } from 'lucide-react'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    console.log('LoginForm: Attempting to sign in with email:', email)

    const { error } = await signIn(email, password)
    
    if (error) {
      console.error('LoginForm: Sign in failed:', error)
      setError(error.message)
    } else {
      console.log('LoginForm: Sign in successful, waiting for auth state change...')
    }
    
    setLoading(false)
  }

    return (
    <div className="h-screen flex overflow-hidden">
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img 
          src="/login-bg.jpg" 
          alt="Big Drip Kicks" 
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        {/* Clean image with no overlay */}
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Desktop Branding (only shown on desktop) */}
          <div className="text-center mb-8 hidden lg:block">
            <div className="flex justify-center mb-4">
              <img 
                src="/logo.png" 
                alt="Big Drip Logo" 
                className="h-24 w-auto"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="bg-blue-600 p-3 rounded-full hidden">
                <ShoppingBag className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Big Drip Kicks</h1>
            <p className="text-xl text-gray-600">Premium Streetwear Inventory Management</p>
          </div>
          
          {/* Mobile Logo (only shown on mobile) */}
          <div className="text-center lg:hidden mb-6">
            <div className="flex justify-center mb-3">
              <img 
                src="/logo.png" 
                alt="Big Drip Logo" 
                className="h-12 w-auto"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="bg-blue-600 p-3 rounded-full hidden">
                <ShoppingBag className="h-6 w-6 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Big Drip Kicks
            </h2>
            <p className="text-sm text-gray-600">
              Sign in to your account
            </p>
          </div>
          
          <form className="bg-white p-6 rounded-xl shadow-lg space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-3">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Enter your email"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}