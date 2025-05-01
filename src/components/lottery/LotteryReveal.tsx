// src/components/lottery/LotteryReveal.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getLotterySession, updateLotteryStatus } from '../../services/lotteryService';
import { LotterySession, LotteryCombination } from '../../types';
import { Download } from 'lucide-react';
import Layout from '../common/Layout';

const LotteryReveal: React.FC = () => {
  const [lottery, setLottery] = useState<LotterySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Reveal state
  const [revealing, setRevealing] = useState(false);
  const [revealedPicks, setRevealedPicks] = useState<number[]>([]);
  
  const { lotteryId } = useParams<{ lotteryId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchLottery = async () => {
      if (!lotteryId || !currentUser) return;
      
      try {
        const lotteryData = await getLotterySession(lotteryId);
        
        if (!lotteryData) {
          setError('Lottery not found');
          return;
        }
        
        // If no draft order yet, redirect to drawing page
        if (!lotteryData.draftOrder || lotteryData.draftOrder.length === 0) {
          setError('Draft order has not been generated yet');
          return;
        }
        
        setLottery(lotteryData);
        
        // If completed, mark as such
        if (lotteryData.status !== 'complete') {
          await updateLotteryStatus(lotteryId, 'complete');
        }
      } catch (error: any) {
        setError(error.message || 'Failed to load lottery');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLottery();
  }, [lotteryId, currentUser]);
  
  // Start the dramatic reveal of the draft order
  const startReveal = () => {
    if (revealing || !lottery || !lottery.draftOrder) return;
    
    setRevealing(true);
    setRevealedPicks([]);
    
    // Start from the last pick
    const totalPicks = lottery.draftOrder.length;
    revealNextPick(totalPicks);
  };
  
  // Reveal the next pick in the sequence
  const revealNextPick = (pickNumber: number) => {
    // Add this pick to revealed picks
    setRevealedPicks(prev => [...prev, pickNumber]);
    
    if (pickNumber > 1) {
      // Schedule next reveal after 3 seconds
      setTimeout(() => {
        revealNextPick(pickNumber - 1);
      }, 3000);
    } else {
      // All picks revealed
      setTimeout(() => {
        setRevealing(false);
      }, 2000);
    }
  };
  
  // Format the combination for display
  const formatCombination = (combo: LotteryCombination | null) => {
    if (!combo) return '';
    return combo.balls.join('-');
  };
  
  // Generate CSV content
  const generateCSV = () => {
    if (!lottery || !lottery.combinations || !lottery.draftOrder) return '';
    
    // First create combinationsCSV
    let combinationsCSV = "Combination ID,Ball 1,Ball 2,Ball 3,Ball 4,Team ID,Team Name\n";
    
    lottery.combinations.forEach(combo => {
      const team = lottery.teams.find(t => t.id === combo.teamId);
      combinationsCSV += `${combo.id},${combo.balls[0]},${combo.balls[1]},${combo.balls[2]},${combo.balls[3]},${combo.teamId},${team ? team.name : ''}\n`;
    });
    
    // Then create draft order CSV
    let draftOrderCSV = "Pick,Team Name,Combination\n";
    
    lottery.draftOrder.forEach(pick => {
      const comboString = pick.combination ? formatCombination(pick.combination) : 'N/A';
      draftOrderCSV += `${pick.pick},${pick.teamName},${comboString}\n`;
    });
    
    // Return the combination CSV (draft order is included in the download)
    return combinationsCSV;
  };
  
  // Download CSV
  const downloadCSV = () => {
    if (!lottery) return;
    
    const csvContent = generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${lottery.name.replace(/\s+/g, '_')}_lottery_results.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Create a new lottery
  const createNewLottery = () => {
    navigate('/lottery/create');
  };
  
  // Go to dashboard
  const goToDashboard = () => {
    navigate('/dashboard');
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
  
  if (!lottery || !lottery.draftOrder) {
    return (
      <Layout>
        <div>No lottery data available</div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="max-w-4xl mx-auto my-4 p-4 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-1 text-center">{lottery.name}</h2>
        <p className="text-center text-gray-600 text-sm mb-3">Draft Order Reveal</p>
        
        {!revealing && revealedPicks.length === 0 && (
          <div className="mb-4 text-center">
            <p className="mb-2 text-sm">
              Ready to reveal the final draft order! The reveal will start from pick #{lottery.draftOrder.length} and work up to the #1 pick.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                className="bg-blue-600 text-white py-1 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                onClick={startReveal}
              >
                Start the Reveal
              </button>
              
              <button
                className="bg-green-600 text-white py-1 px-3 rounded flex items-center text-sm hover:bg-green-700 transition"
                onClick={downloadCSV}
              >
                <Download size={14} className="mr-1" />
                Download CSV
              </button>
            </div>
          </div>
        )}
        
        <div className="space-y-1">
          {lottery.draftOrder.map((pick) => {
            const isRevealed = revealedPicks.includes(pick.pick);
            const isCurrentReveal = revealedPicks.length > 0 && 
                                   revealedPicks[revealedPicks.length - 1] === pick.pick;
            const isLotteryPick = pick.pick <= 4;
            
            return (
              <div 
                key={pick.pick} 
                className={`flex items-center p-2 rounded transition-all duration-500 ${
                  isRevealed ? 'bg-blue-50' : 'bg-gray-100'
                } ${isCurrentReveal ? 'ring-1 ring-blue-500 scale-102' : ''}`}
              >
                <div className={`w-6 h-6 flex items-center justify-center rounded-full mr-2 text-xs font-bold ${
                  isLotteryPick ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'
                }`}>
                  {pick.pick}
                </div>
                
                <div className="flex-grow">
                  {isRevealed ? (
                    <div className={`font-medium text-sm ${isCurrentReveal ? 'animate-pulse' : ''}`}>
                      {pick.teamName}
                    </div>
                  ) : (
                    <div className="h-4 bg-gray-300 rounded w-28"></div>
                  )}
                </div>
                
                {isLotteryPick && pick.combination && (
                  <div className="text-xs text-gray-600">
                    {formatCombination(pick.combination)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {(!revealing && revealedPicks.length > 0) && (
          <div className="mt-4 flex flex-col gap-2">
            <button
              className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              onClick={downloadCSV}
            >
              <Download size={14} className="inline-block mr-1" />
              Download Results CSV
            </button>
            
            <div className="flex gap-2">
              <button
                className="flex-1 bg-gray-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-700 transition"
                onClick={goToDashboard}
              >
                Back to Dashboard
              </button>
              
              <button
                className="flex-1 bg-green-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-green-700 transition"
                onClick={createNewLottery}
              >
                Create New Lottery
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default LotteryReveal;