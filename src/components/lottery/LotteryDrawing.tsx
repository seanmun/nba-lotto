// src/components/lottery/LotteryDrawing.tsx - Clean Version with Live Sync
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  getLotterySession, 
  recordDrawnCombination, 
  generateDraftOrder,
  updateDrawingStatus
} from '../../services/lotteryService';
import { LotterySession, LotteryCombination } from '../../types';
import { Download, Crown } from 'lucide-react';
import Layout from '../common/Layout';

const LotteryDrawing: React.FC = () => {
  const [lottery, setLottery] = useState<LotterySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Drawing state
  const [selectedBalls, setSelectedBalls] = useState<number[]>([]);
  const [pickNumber, setPickNumber] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnCombinations, setDrawnCombinations] = useState<LotteryCombination[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  
  const { lotteryId = "" } = useParams<{ lotteryId?: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Constants
  const TOTAL_BALLS = 14;
  const BALLS_PER_DRAW = 4;
  
  useEffect(() => {
    const fetchLottery = async () => {
      if (!lotteryId) return;
      
      try {
        if (!currentUser) {
          setError('Please sign in to access the lottery drawing');
          setLoading(false);
          return;
        }
        
        const lotteryData = await getLotterySession(lotteryId);
        
        if (!lotteryData) {
          setError('Lottery not found');
          return;
        }
        
        setLottery(lotteryData);
        setIsAdmin(lotteryData.adminId === currentUser.uid);
        
        if (!lotteryData.combinations || lotteryData.combinations.length === 0) {
          setError('Lottery combinations have not been generated yet');
          return;
        }
        
        if (lotteryData.drawnCombinations && lotteryData.drawnCombinations.length > 0) {
          setDrawnCombinations(lotteryData.drawnCombinations);
          setPickNumber(lotteryData.drawnCombinations.length + 1);
        }
        
        // Sync drawing state for non-admin users
        if (lotteryData.isDrawing && !isAdmin) {
          setIsDrawing(true);
          setSelectedBalls(lotteryData.currentDrawingBalls || []);
          setStatusMessage(lotteryData.drawingStatusMessage || 'Admin is drawing balls...');
        } else if (!lotteryData.isDrawing && isDrawing && !isAdmin) {
          // Drawing just finished
          setIsDrawing(false);
          if (lotteryData.drawingStatusMessage) {
            setStatusMessage(lotteryData.drawingStatusMessage);
            setTimeout(() => setStatusMessage(''), 3000);
          }
        } else if (!isAdmin && lotteryData.drawingStatusMessage && !isDrawing) {
          // Sync status messages even when not drawing
          setStatusMessage(lotteryData.drawingStatusMessage);
        }
        
        if (lotteryData.status === 'reveal') {
          navigate(`/lottery/${lotteryId}/reveal`);
        }
        
      } catch (error: any) {
        setError(error.message || 'Failed to load lottery');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLottery();
    
    // Poll more frequently for better real-time sync
    const interval = window.setInterval(fetchLottery, 1500);
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [lotteryId, currentUser, navigate, isDrawing, pickNumber, isAdmin]);
  
  // Draw all 4 balls at once with real-time sync
  const drawAllBalls = async () => {
    if (!lottery || !isAdmin || isDrawing || selectedBalls.length > 0) return;
    
    setIsDrawing(true);
    setStatusMessage('Drawing balls...');
    
    // Notify all users that drawing has started
    await updateDrawingStatus(lotteryId, true, [], 'Drawing balls...');
    
    const newBalls: number[] = [];
    const availableBalls = Array.from({ length: TOTAL_BALLS }, (_, i) => i + 1);
    
    // Draw 4 balls one by one with animation
    for (let i = 0; i < BALLS_PER_DRAW; i++) {
      await new Promise(resolve => {
        setTimeout(async () => {
          const remainingBalls = availableBalls.filter(ball => !newBalls.includes(ball));
          const randomIndex = Math.floor(Math.random() * remainingBalls.length);
          const drawnBall = remainingBalls[randomIndex];
          
          newBalls.push(drawnBall);
          newBalls.sort((a, b) => a - b);
          setSelectedBalls([...newBalls]);
          
          // Update drawing state for all users to see
          await updateDrawingStatus(lotteryId, true, [...newBalls], 'Drawing balls...');
          
          resolve(undefined);
        }, 1000);
      });
    }
    
    // Drawing complete, clear drawing state
    await updateDrawingStatus(lotteryId, false, newBalls, '');
    setIsDrawing(false);
    
    // Now process the combination
    processDrawnCombination(newBalls);
  };
  
  // Process the drawn combination
  const processDrawnCombination = async (balls: number[]) => {
    if (!lottery || !lottery.combinations) return;
    
    // Find matching combination
    const matchingCombo = lottery.combinations.find(combo => 
      combo.balls.length === balls.length &&
      combo.balls.every(ball => balls.includes(ball)) && 
      balls.every(ball => combo.balls.includes(ball))
    );
    
    if (!matchingCombo) {
      const message = 'No valid combination found. Drawing again...';
      setStatusMessage(message);
      // Update status for all users to see
      await updateDrawingStatus(lotteryId, false, balls, message);
      
      setTimeout(() => {
        setSelectedBalls([]);
        setStatusMessage('');
        // Clear message for all users
        updateDrawingStatus(lotteryId, false, [], '');
      }, 2000);
      return;
    }
    
    // Check if team already selected
    const teamAlreadySelected = drawnCombinations.some(combo => combo.teamId === matchingCombo.teamId);
    
    if (teamAlreadySelected) {
      const team = lottery.teams.find(t => t.id === matchingCombo.teamId);
      const message = `${team?.name || 'Team'} already selected. Drawing again...`;
      setStatusMessage(message);
      // Update status for all users to see
      await updateDrawingStatus(lotteryId, false, balls, message);
      
      setTimeout(() => {
        setSelectedBalls([]);
        setStatusMessage('');
        // Clear message for all users
        updateDrawingStatus(lotteryId, false, [], '');
      }, 2000);
      return;
    }
    
    // Valid combination - record it
    try {
      await recordDrawnCombination(lotteryId, matchingCombo);
      
      const newDrawnCombinations = [...drawnCombinations, matchingCombo];
      setDrawnCombinations(newDrawnCombinations);
      const successMessage = `Pick #${pickNumber} successfully recorded!`;
      setStatusMessage(successMessage);
      
      // Update status for all users to see success
      await updateDrawingStatus(lotteryId, false, balls, successMessage);
      
      // Check if we're done (4 picks maximum for NBA-style lottery)
      if (pickNumber >= 4) {
        setTimeout(() => {
          handleFinishDrawing();
        }, 3000);
      } else {
        setTimeout(() => {
          setPickNumber(pickNumber + 1);
          setSelectedBalls([]);
          setStatusMessage('');
          // Clear status for next pick
          updateDrawingStatus(lotteryId, false, [], '');
        }, 3000);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to record combination');
    }
  };
  
  // Finish drawing and move to reveal
  const handleFinishDrawing = async () => {
    if (!lottery || !lotteryId || !isAdmin) return;
    
    try {
      await generateDraftOrder(lotteryId);
      navigate(`/lottery/${lotteryId}/reveal`);
    } catch (error: any) {
      setError(error.message || 'Failed to generate draft order');
    }
  };
  
  // Generate and download CSV
  const downloadCSV = () => {
    if (!lottery || !lottery.combinations) return;
    
    let csvContent = "Combination ID,Ball 1,Ball 2,Ball 3,Ball 4,Team ID,Team Name\n";
    
    lottery.combinations.forEach(combo => {
      const team = lottery.teams.find(t => t.id === combo.teamId);
      csvContent += `${combo.id},${combo.balls[0]},${combo.balls[1]},${combo.balls[2]},${combo.balls[3]},${combo.teamId},${team ? team.name : ''}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${lottery.name.replace(/\s+/g, '_')}_combinations.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">Loading...</div>
      </Layout>
    );
  }
  
  if (!currentUser) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto my-10 p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-6 text-center">Lottery Drawing</h2>
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
            You need to sign in to access the lottery drawing.
          </div>
          <div className="flex justify-center">
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={() => {
                localStorage.setItem('redirectAfterLogin', window.location.pathname);
                navigate('/login');
              }}
            >
              Sign In
            </button>
          </div>
        </div>
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
  
  return (
    <Layout>
      <div className="max-w-4xl mx-auto my-10 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-2 text-center">{lottery.name}</h2>
        <p className="text-center text-gray-600 mb-6">Lottery Drawing</p>
        
        {isAdmin ? (
          <div className="mb-3 bg-yellow-50 border border-yellow-200 p-2 rounded flex items-center justify-center text-yellow-700">
            <Crown size={16} className="mr-1" /> You are the admin for this lottery
          </div>
        ) : (
          <div className="mb-3 bg-blue-50 border border-blue-200 p-2 rounded text-center text-blue-700">
            Watching the drawing - Only the admin can draw balls
          </div>
        )}
        
        {isAdmin && (
          <div className="mb-6 flex justify-center">
            <button
              className="bg-green-600 text-white py-2 px-4 rounded flex items-center hover:bg-green-700 transition"
              onClick={downloadCSV}
            >
              <Download size={18} className="mr-2" />
              Download Combinations CSV
            </button>
          </div>
        )}
        
        <div className="mb-6 text-center">
          <div className="text-2xl font-bold mb-2">
            Drawing for Pick #{pickNumber}
          </div>
          
          {/* Ball Animation Area - VISIBLE TO ALL USERS */}
          <div className="flex justify-center items-center h-40 bg-gray-100 rounded-lg mb-4">
            <div className="flex space-x-4">
              {selectedBalls.map((ball, index) => (
                <div key={index} className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold animate-bounce">
                  {ball}
                </div>
              ))}
              {Array.from({ length: BALLS_PER_DRAW - selectedBalls.length }, (_, i) => (
                <div key={i} className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  isDrawing ? 'bg-yellow-300 animate-pulse' : 'bg-gray-300'
                }`}>
                  ?
                </div>
              ))}
            </div>
          </div>
          
          {/* Status Message - VISIBLE TO ALL USERS */}
          {statusMessage && (
            <div className="mb-4 text-lg font-medium text-blue-700">
              {statusMessage}
            </div>
          )}
          
          {/* Drawing Button / Status */}
          {selectedBalls.length < BALLS_PER_DRAW && !isDrawing && (
            <div className="text-center">
              {isAdmin ? (
                <button
                  className="bg-blue-600 text-white py-3 px-8 rounded-lg font-medium hover:bg-blue-700 transition"
                  onClick={drawAllBalls}
                >
                  Draw All Balls for Pick #{pickNumber}
                </button>
              ) : (
                <div className="text-gray-600">
                  Waiting for admin to draw balls
                </div>
              )}
            </div>
          )}
          
          {/* Drawing in Progress */}
          {isDrawing && (
            <div className="text-lg font-medium text-blue-600 animate-pulse">
              {isAdmin ? 'Drawing balls...' : 'Admin is drawing balls...'}
            </div>
          )}
        </div>
        
        {/* Completed Picks */}
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2">Completed Picks</h3>
          <div className="space-y-2">
            {drawnCombinations.map((combo, index) => {
              return (
                <div key={index} className="flex items-center p-2 bg-gray-50 rounded">
                  <div className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-full mr-3">
                    {index + 1}
                  </div>
                  <div className="font-medium">Pick #{index + 1} - Team will be revealed later</div>
                  <div className="ml-auto text-sm">
                    Combo: {combo.balls.join('-')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Finish Button - Show when 4 picks are complete */}
        {drawnCombinations.length >= 4 && isAdmin && (
          <button
            className="mt-4 w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition"
            onClick={handleFinishDrawing}
          >
            Continue to Draft Order Reveal
          </button>
        )}
        
        {drawnCombinations.length >= 4 && !isAdmin && (
          <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded text-center">
            All picks have been drawn. Waiting for the admin to reveal the draft order.
          </div>
        )}
      </div>
    </Layout>
  );
};

export default LotteryDrawing;