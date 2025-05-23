// src/components/lottery/LotteryVerification.tsx - Focused Changes
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  getLotterySession, 
  addVerifier, 
  updateLotteryStatus, 
  generateCombinations 
} from '../../services/lotteryService';
import { LotterySession, Verifier } from '../../types';
import { User, Key, Lock, CheckCircle, Share } from 'lucide-react';
import Layout from '../common/Layout';

const LotteryVerification: React.FC = () => {
  // Keep your existing state variables
  const [lottery, setLottery] = useState<LotterySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const [generatingCombinations, setGeneratingCombinations] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  
  const { lotteryId } = useParams<{ lotteryId: string }>();
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  
  // Poll for updates to keep verification status current
  useEffect(() => {
    const fetchLottery = async () => {
      if (!lotteryId) return;
      
      try {
        setLoading(true);
        const lotteryData = await getLotterySession(lotteryId);
        
        if (!lotteryData) {
          setError('Lottery not found');
          return;
        }
        
        setLottery(lotteryData);
        
        // Only set these if user is authenticated
        if (currentUser) {
          setIsAdmin(lotteryData.adminId === currentUser.uid);
          
          // Check if current user has already verified
          const hasVerified = lotteryData.verifiers.some(v => v.userId === currentUser.uid);
          setAlreadyVerified(hasVerified);
          
          // If in drawing status, redirect to drawing page
          if (lotteryData.status === 'drawing') {
            navigate(`/lottery/${lotteryId}/drawing`);
          }
        }
        
        // Generate the verification URL
        setShareUrl(`${window.location.origin}/lottery/${lotteryId}/verification`);
      } catch (error: any) {
        setError(error.message || 'Failed to load lottery');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLottery();
    
    // Poll for updates every 5 seconds if user is authenticated
    let interval: number | undefined;
    if (currentUser) {
      interval = window.setInterval(fetchLottery, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [lotteryId, currentUser, navigate]);
  
  // Keep your existing verification handling function 
  const handleVerify = async () => {
    if (!lottery || !lotteryId || !currentUser || !userProfile) return;
    
    try {
      // Create verifier object
      const verifier: Verifier = {
        userId: currentUser.uid,
        name: userProfile.displayName || currentUser.email || 'Unknown User',
        email: userProfile.email || currentUser.email || '',
        timestamp: Date.now()
      };
      
      // Add verifier to lottery
      const success = await addVerifier(lotteryId, verifier);
      
      if (success) {
        // Update local state
        setLottery(prev => {
          if (!prev) return prev;
          
          const updatedVerifiers = [...prev.verifiers, verifier];
          return { ...prev, verifiers: updatedVerifiers };
        });
        
        setAlreadyVerified(true);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to verify lottery');
    }
  };
  
  // Keep your existing start lottery function
  const handleStartLottery = async () => {
    if (!lottery || !lotteryId) return;
    
    try {
      setGeneratingCombinations(true);
      
      // Generate lottery combinations
      await generateCombinations(lotteryId);
      
      // Update lottery status to drawing
      await updateLotteryStatus(lotteryId, 'drawing');
      
      // Navigate to drawing page
      navigate(`/lottery/${lotteryId}/drawing`);
    } catch (error: any) {
      setError(error.message || 'Failed to start lottery');
    } finally {
      setGeneratingCombinations(false);
    }
  };
  
  // Improved clipboard function with better error handling
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard. Try manually selecting and copying the URL.');
    }
  };
  
  // New function to handle login redirect with return URL
  const handleLoginClick = () => {
    // Store current path in localStorage to return after login
    localStorage.setItem('redirectAfterLogin', window.location.pathname);
    navigate('/login');
  };
  
  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">Loading...</div>
      </Layout>
    );
  }
  
  if (error) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto my-10 p-6 bg-white rounded-lg shadow-md">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </button>
        </div>
      </Layout>
    );
  }
  
  if (!lottery) {
    return (
      <Layout>
        <div>No lottery data available</div>
      </Layout>
    );
  }
  
  // Public view for non-authenticated users
  if (!currentUser) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto my-10 p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-2 text-center">{lottery.name}</h2>
          <p className="text-center text-gray-600 mb-6">
            Verification Status: {lottery.verifiers.length} of {lottery.requiredVerifierCount} Required Verifiers
          </p>
          
          <div className="mb-6 bg-blue-50 p-4 rounded-lg">
            <h3 className="font-bold text-lg mb-2">Sign In to Verify</h3>
            <p className="mb-3">
              This lottery requires verification from {lottery.requiredVerifierCount} participants before drawing can begin.
              Please sign in to participate in the verification process.
            </p>
            <div className="flex justify-center">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                onClick={handleLoginClick}
              >
                Sign In to Verify
              </button>
            </div>
          </div>
          
          <div className="mb-8">
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="bg-blue-600 h-4 rounded-full transition-all duration-500 ease-in-out"
                style={{ width: `${Math.min(100, (lottery.verifiers.length / lottery.requiredVerifierCount) * 100)}%` }}
              ></div>
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-3">Teams in this Lottery</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lottery.teams.map((team) => (
                <div key={team.id} className="flex items-center p-3 bg-gray-50 rounded">
                  <div className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-full mr-3">
                    {team.rank}
                  </div>
                  <div>
                    <div className="font-medium">{team.name}</div>
                    <div className="text-sm text-gray-600">{team.oddsPercentage}% chance</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }
  
  // Rest of your existing component for authenticated users
  const verifierCount = lottery.verifiers.length;
  const requiredCount = lottery.requiredVerifierCount;
  const hasEnoughVerifiers = verifierCount >= requiredCount;
  
  return (
    <Layout>
      <div className="max-w-4xl mx-auto my-10 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-2 text-center">{lottery.name}</h2>
        <p className="text-center text-gray-600 mb-6">
          Verification Status: {verifierCount} of {requiredCount} Required Verifiers
        </p>
        
        <div className="mb-6 bg-blue-50 p-4 rounded-lg">
          <h3 className="font-bold text-lg mb-2">Share Verification Link</h3>
          <p className="mb-3">
            Share this link with league members to verify the lottery. You'll need {lottery.requiredVerifierCount} people (including you) to verify before the lottery can begin.
          </p>
          
          <div className="flex items-center">
            <input
              type="text"
              className="shadow appearance-none border rounded-l py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline flex-grow"
              value={shareUrl}
              readOnly
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              className={`flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-r ${
                copySuccess ? 'bg-green-600' : ''
              }`}
              onClick={copyToClipboard}
            >
              <Share size={18} className="mr-2" />
              {copySuccess ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        
        <div className="mb-8">
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className="bg-blue-600 h-4 rounded-full transition-all duration-500 ease-in-out"
              style={{ width: `${Math.min(100, (verifierCount / requiredCount) * 100)}%` }}
            ></div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {Array.from({ length: requiredCount }).map((_, index) => {
            const verifier = lottery.verifiers[index];
            return (
              <div
                key={index}
                className={`p-4 rounded-lg shadow transition-all ${
                  verifier ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                    verifier ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'
                  }`}>
                    {verifier ? (
                      <CheckCircle size={20} />
                    ) : (
                      <Key size={20} />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">
                      {verifier ? verifier.name : `Verifier ${index + 1}`}
                    </div>
                    {verifier && (
                      <div className="text-sm text-gray-600">
                        {new Date(verifier.timestamp).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h3 className="font-bold text-lg mb-2 flex items-center">
            <User size={20} className="mr-2" />
            {isAdmin ? 'You are the Admin' : 'Join Verification'}
          </h3>
          
          {!isAdmin && (
            <div>
              {alreadyVerified ? (
                <div className="bg-green-100 text-green-800 p-3 rounded mb-3">
                  <CheckCircle size={18} className="inline-block mr-2" />
                  You have verified this lottery
                </div>
              ) : (
                <>
                  <p className="mb-3">
                    By verifying this lottery, you help ensure the fairness of the draft order selection.
                  </p>
                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                    onClick={handleVerify}
                  >
                    Verify Lottery
                  </button>
                </>
              )}
            </div>
          )}
          
          {isAdmin && (
            <div>
              <p className="mb-3">
                {hasEnoughVerifiers
                  ? 'You have enough verifiers and can start the lottery!'
                  : `Waiting for ${requiredCount - verifierCount} more verifiers before you can start the lottery.`}
              </p>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                disabled={!hasEnoughVerifiers || generatingCombinations}
                onClick={handleStartLottery}
              >
                {generatingCombinations ? (
                  'Generating Combinations...'
                ) : (
                  <>
                    <Lock size={18} className="inline-block mr-2" />
                    Start Lottery
                  </>
                )}
              </button>
            </div>
          )}
        </div>
        
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-3">Teams in this Lottery</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lottery.teams.map((team) => (
              <div key={team.id} className="flex items-center p-3 bg-gray-50 rounded">
                <div className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-full mr-3">
                  {team.rank}
                </div>
                <div>
                  <div className="font-medium">{team.name}</div>
                  <div className="text-sm text-gray-600">{team.oddsPercentage}% chance</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LotteryVerification;