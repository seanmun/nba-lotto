// src/components/auth/Login.tsx - Modified with Redirect Support
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../common/Layout';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirectPath, setRedirectPath] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  // Check for redirect path in localStorage
  useEffect(() => {
    const savedPath = localStorage.getItem('redirectAfterLogin');
    if (savedPath) {
      setRedirectPath(savedPath);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError('');
      setLoading(true);
      
      // If we have a redirect path, store it in localStorage
      if (redirectPath) {
        localStorage.setItem('redirectAfterLogin', redirectPath);
      }
      
      const result = await login(email);
      setEmailSent(true);
      setMessage(result.message);
    } catch (error: any) {
      setError(error.message || 'Failed to send login email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto my-10 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {redirectPath && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
            <p>Sign in to continue to the lottery verification.</p>
          </div>
        )}
        
        {emailSent ? (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            <p className="font-medium">Email sent!</p>
            <p>{message}</p>
            <button
              className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
              onClick={() => setEmailSent(false)}
            >
              Send another link
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-gray-600 text-xs italic mt-2">
                We'll send you an email with a link to sign in.
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Login Link'}
              </button>
              
              <a
                className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800"
                href="/register"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/register');
                }}
              >
                Create an account
              </a>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
};

export default Login;