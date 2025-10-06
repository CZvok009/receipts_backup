// src/app/login/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState('login');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    digit: false
  });
  
  const router = useRouter();

  useEffect(() => {
    // Check if user is already authenticated
    const token = localStorage.getItem('authToken');
    if (token) {
      verifyToken(token);
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const result = await response.json();
      if (result.success) {
        // Set cookie for middleware
        document.cookie = `authToken=${token}; path=/; max-age=86400; SameSite=Lax`;
        window.location.href = '/library';
      } else {
        localStorage.removeItem('authToken');
        document.cookie = 'authToken=; path=/; max-age=0; SameSite=Lax';
      }
    } catch (error) {
      localStorage.removeItem('authToken');
      document.cookie = 'authToken=; path=/; max-age=0; SameSite=Lax';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'password' && activeTab === 'signin') {
      validatePassword(value);
    }
  };

  const validatePassword = (password: string) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      digit: /[0-9]/.test(password)
    };
    setPasswordRequirements(requirements);
    return Object.values(requirements).every(req => req);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ text: 'Login successful! Redirecting...', type: 'success' });
        if (result.token) {
          localStorage.setItem('authToken', result.token);
          // Set cookie for middleware
          document.cookie = `authToken=${result.token}; path=/; max-age=86400; SameSite=Lax`;
        }
        setTimeout(() => {
          window.location.href = '/library';
        }, 1000);
      } else {
        setMessage({ text: result.error || 'Login failed', type: 'error' });
      }
    } catch (error: any) {
      setMessage({ text: 'Server error: ' + error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setMessage({ text: 'Passwords do not match', type: 'error' });
      return;
    }

    if (!validatePassword(formData.password)) {
      setMessage({ text: 'Password does not meet requirements', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ text: 'Account created successfully! Redirecting...', type: 'success' });
        if (result.token) {
          localStorage.setItem('authToken', result.token);
          // Set cookie for middleware
          document.cookie = `authToken=${result.token}; path=/; max-age=86400; SameSite=Lax`;
        }
        setTimeout(() => {
          window.location.href = '/library';
        }, 1000);
      } else {
        setMessage({ text: result.error || 'Signin failed', type: 'error' });
      }
    } catch (error: any) {
      setMessage({ text: 'Server error: ' + error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-black to-purple-900 flex flex-col items-center justify-center p-4">
      {/* Top Buttons */}
      <div className="flex gap-6 mb-10">
        <button
          onClick={() => setActiveTab('login')}
          className={`px-6 py-3 text-lg rounded-lg font-medium transition-all ${
            activeTab === 'login'
              ? 'bg-purple-600 text-white'
              : 'bg-white bg-opacity-10 text-white border-2 border-white border-opacity-30 hover:bg-opacity-20'
          }`}
        >
          Login
        </button>
             <button
               onClick={() => setActiveTab('signin')}
               className={`px-6 py-3 text-lg rounded-lg font-medium transition-all ${
                 activeTab === 'signin'
                   ? 'bg-purple-600 text-white'
                   : 'bg-white text-black border-2 border-white border-opacity-30 hover:bg-gray-100'
               }`}
             >
               Sign Up
             </button>
      </div>

            {/* Login Container */}
            <div className="bg-white rounded-2xl p-10 shadow-2xl w-full max-w-lg">
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-purple-600 mb-3">Aura OCR</h1>
                <p className="text-lg text-gray-600">Receipt Processing & Data Extraction</p>
              </div>

        {/* Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="mb-5">
              <label className="block text-gray-900 font-semibold mb-2 text-base">Username:</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Enter your username"
                className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none text-gray-900"
                required
              />
            </div>

            <div className="mb-5">
              <label className="block text-gray-900 font-semibold mb-2 text-base">Password:</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none text-gray-900"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-4 text-base rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>

            {message.text && (
              <div className={`mt-4 p-4 rounded-lg ${
                message.type === 'error' 
                  ? 'bg-red-100 text-red-800 border border-red-300' 
                  : 'bg-green-100 text-green-800 border border-green-300'
              }`}>
                {message.text}
              </div>
            )}

            <div className="mt-5 bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-800 font-semibold mb-2">Demo Credentials:</p>
              <p className="text-xs text-gray-800">Username: <code className="bg-gray-200 px-1 rounded text-gray-900">test</code></p>
              <p className="text-xs text-gray-800">Password: <code className="bg-gray-200 px-1 rounded text-gray-900">Admin123</code></p>
            </div>
          </form>
        )}

        {/* Signin Form */}
        {activeTab === 'signin' && (
          <form onSubmit={handleSignin}>
            <div className="mb-5">
              <label className="block text-gray-900 font-semibold mb-2 text-base">Username:</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Enter your username"
                className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none text-gray-900"
                required
              />
            </div>

            <div className="mb-5">
              <label className="block text-gray-900 font-semibold mb-2 text-base">Password:</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none text-gray-900"
                required
              />
              
              {/* Password Requirements */}
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-purple-600 mb-2">Password Requirements:</h4>
                <div className="space-y-1">
                  <div className={`flex items-center text-sm ${passwordRequirements.length ? 'text-green-600' : 'text-red-600'}`}>
                    <span className="mr-2">{passwordRequirements.length ? '✅' : '❌'}</span>
                    <span className="text-gray-900">At least 8 characters</span>
                  </div>
                  <div className={`flex items-center text-sm ${passwordRequirements.uppercase ? 'text-green-600' : 'text-red-600'}`}>
                    <span className="mr-2">{passwordRequirements.uppercase ? '✅' : '❌'}</span>
                    <span className="text-gray-900">At least 1 uppercase letter</span>
                  </div>
                  <div className={`flex items-center text-sm ${passwordRequirements.lowercase ? 'text-green-600' : 'text-red-600'}`}>
                    <span className="mr-2">{passwordRequirements.lowercase ? '✅' : '❌'}</span>
                    <span className="text-gray-900">At least 1 lowercase letter</span>
                  </div>
                  <div className={`flex items-center text-sm ${passwordRequirements.digit ? 'text-green-600' : 'text-red-600'}`}>
                    <span className="mr-2">{passwordRequirements.digit ? '✅' : '❌'}</span>
                    <span className="text-gray-900">At least 1 digit</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-gray-900 font-semibold mb-2 text-base">Confirm Password:</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your password"
                className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none text-gray-900"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-4 text-base rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>

            {message.text && (
              <div className={`mt-4 p-4 rounded-lg ${
                message.type === 'error' 
                  ? 'bg-red-100 text-red-800 border border-red-300' 
                  : 'bg-green-100 text-green-800 border border-green-300'
              }`}>
                {message.text}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}