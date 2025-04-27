// src/components/lottery/LotteryReveal.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getLotterySession, updateLotteryStatus } from '../../services/lotteryService';
import { LotterySession, LotteryCombination } from '../../types';
import { Download } from 'lucide-react';

const LotteryReveal: React.FC = () => {
  const [lottery, setLottery] = useState<LotterySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Reveal state
  const [revealing, setRevealing] = useState(false);
  const [currentReveal, setCurrentReveal] = useState<number | null>(null);
  
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
    
    // Start from the last pick
    revealNextPick(lottery.draftOrder.length);
  };
  
  // Reveal the next pick in the sequence
  const revealNextPick = (pick: number) => {
    setCurrentReveal(pick);
    
    if (pick > 1) {
      setTimeout(() => {
        revealNextPick(pick - 1);
      }, 3000); // 3 seconds between reveals
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
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }
  
  if (error) {
    return (
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
    );
  }
  
  if (!lottery || !lottery.draftOrder) {
    return <div>No lottery data available</div>;
  }
  
  return (
    <div className="max-w-4xl mx-auto my-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-2 text-center">{lottery.name}</h2>
      <p className="text-center text-gray-600 mb-6">Draft Order Reveal</p>
      
      {!revealing && (
        <div className="mb-6 text-center">
          <p className="mb-4">
            Ready to reveal the final draft order! The reveal will start from pick #{lottery.draftOrder.length} and work up to the #1 pick.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              className="bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700 transition"
              onClick={startReveal}
            >
              Start the Reveal
            </button>
            
            <button
              className="bg-green-600 text-white py-2 px-4 rounded flex items-center hover:bg-green-700 transition"
              onClick={downloadCSV}
            >
              <Download size={18} className="mr-2" />
              Download Results CSV
            </button>
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        {lottery.draftOrder.map((pick) => {
          const revealed = revealing ? currentReveal && currentReveal >= pick.pick : false;
          const isCurrentReveal = currentReveal === pick.pick;
          
          return (
            <div 
              key={pick.pick} 
              className={`flex items-center p-3 rounded transition-all duration-500 ${
                revealed ? 'bg-blue-50' : 'bg-gray-100'
              } ${isCurrentReveal ? 'ring-2 ring-blue-500 scale-105' : ''}`}
            >
              <div className={`w-10 h-10 flex items-center justify-center rounded-full mr-4 font-bold ${
                pick.pick <= 4 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'
              }`}>
                {pick.pick}
              </div>
              
              <div className="flex-grow">
                <div className={`font-medium text-lg transition-all duration-300 ${revealed ? (isCurrentReveal ? 'animate-pulse' : '') : 'filter blur-sm'}`}>
                  {pick.teamName}
                </div>
              </div>
              
              {pick.pick <= 4 && pick.combination && (
                <div className={`text-sm text-gray-600 transition-all duration-300 ${revealed ? '' : 'filter blur-sm'}`}>
                  Combo: {formatCombination(pick.combination)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {!revealing && (
        <div className="mt-8 flex flex-col gap-4">
          <button
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition"
            onClick={downloadCSV}
          >
            <Download size={18} className="inline-block mr-2" />
            Download Results CSV
          </button>
          
          <div className="flex gap-4">
            <button
              className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 transition"
              onClick={goToDashboard}
            >
              Back to Dashboard
            </button>
            
            <button
              className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition"
              onClick={createNewLottery}
            >
              Create a New Lottery
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LotteryReveal;