// src/components/auth/EmailHandler.tsx - Modified with Redirect Support
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isSignInWithEmailLink } from 'firebase/auth';
import { auth } from '../../firebase/config';

const EmailHandler: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const { completeSignIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleEmailLink = async () => {
      try {
        // Check if the current URL is a sign-in link
        if (isSignInWithEmailLink(auth, window.location.href)) {
          // Get the email from localStorage
          let storedEmail = window.localStorage.getItem('emailForSignIn');
          
          if (!storedEmail) {
            // If no email found, prompt user to enter their email again
            const promptedEmail = window.prompt('Please provide your email for confirmation');
            if (promptedEmail) {
              storedEmail = promptedEmail;
            } else {
              throw new Error('Email is required to complete sign-in');
            }
          }
          
          setEmail(storedEmail);
          
          // Complete sign-in process
          const user = await completeSignIn(storedEmail, window.location.href);
          
          // Check if this is a registration (new user)
          const isRegistration = window.localStorage.getItem('isRegistration') === 'true';
          const displayName = window.localStorage.getItem('displayNameForSignIn');
          
          // Check for redirect path
          const redirectPath = window.localStorage.getItem('redirectAfterLogin');
          
          // Clean up localStorage
          window.localStorage.removeItem('emailForSignIn');
          window.localStorage.removeItem('displayNameForSignIn');
          window.localStorage.removeItem('isRegistration');
          
          // Redirect based on saved path or default to dashboard
          if (redirectPath) {
            window.localStorage.removeItem('redirectAfterLogin');
            navigate(redirectPath);
          } else {
            navigate('/dashboard');
          }
        } else {
          // Not a sign-in link, redirect to login
          navigate('/login');
        }
      } catch (error: any) {
        console.error('Error handling email link:', error);
        setError(error.message || 'Failed to sign in with email link');
      } finally {
        setLoading(false);
      }
    };
    
    handleEmailLink();
  }, [navigate, completeSignIn]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Signing you in...
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Please wait while we complete your sign-in process.
            </p>
            <div className="mt-5">
              <div className="w-16 h-16 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Sign-in failed
            </h2>
            <div className="mt-2 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
            <div className="mt-5">
              <button
                onClick={() => navigate('/login')}
                className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default EmailHandler;