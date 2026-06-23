// src/components/auth/EmailHandler.tsx - Modified with Redirect Support
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isSignInWithEmailLink } from 'firebase/auth';
import { auth } from '../../firebase/config';

const EmailHandler: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { completeSignIn } = useAuth();
  const navigate = useNavigate();

  // Run the sign-in exactly once. The auth state change mid-sign-in re-renders
  // AuthProvider (new completeSignIn reference), so without this guard the
  // effect would re-fire, find the link already consumed + the stored email
  // cleared, and re-prompt for the email in a loop.
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const handleEmailLink = async () => {
      try {
        if (!isSignInWithEmailLink(auth, window.location.href)) {
          navigate('/login', { replace: true });
          return;
        }

        // Email is normally in localStorage from when the link was requested.
        // If the link is opened on a different device/browser it won't be, so
        // we prompt once as a fallback.
        let storedEmail = window.localStorage.getItem('emailForSignIn');
        if (!storedEmail) {
          const promptedEmail = window.prompt('Please confirm the email address this lottery invite was sent to');
          if (!promptedEmail) {
            throw new Error('Email is required to complete sign-in');
          }
          storedEmail = promptedEmail;
        }

        await completeSignIn(storedEmail, window.location.href);

        const redirectPath = window.localStorage.getItem('redirectAfterLogin');

        // Clean up so the consumed link can't re-trigger this flow.
        window.localStorage.removeItem('emailForSignIn');
        window.localStorage.removeItem('displayNameForSignIn');
        window.localStorage.removeItem('isRegistration');
        window.localStorage.removeItem('redirectAfterLogin');

        // replace: true drops the sign-in link from history so a back/refresh
        // doesn't reopen the (now invalid) link.
        navigate(redirectPath || '/dashboard', { replace: true });
      } catch (err: any) {
        console.error('Error handling email link:', err);
        setError(err.message || 'Failed to sign in with email link');
      } finally {
        setLoading(false);
      }
    };

    handleEmailLink();
    // Intentionally run once on mount; deps are accessed via stable closures.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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