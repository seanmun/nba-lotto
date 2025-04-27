// src/components/lottery/LotteryDrawing.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  getLotterySession, 
  recordDrawnCombination, 
  generateDraftOrder 
} from '../../services/lotteryService';
import { LotterySession, LotteryCombination } from '../../types';
import { Download } from 'lucide-react';

const LotteryDrawing: React.FC = () => {
  const [lottery, setLottery] = useState<LotterySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Drawing state
  const [ballsInLottery, setBallsInLottery] = useState<number[]>([]);
  const [selectedBalls, setSelectedBalls] = useState<number[]>([]);
  const [pickNumber, setPickNumber] = useState(1);
  const [drawingAnimation, setDrawingAnimation] = useState(false);
  const [drawnCombinations, setDrawnCombinations] = useState<LotteryCombination[]>([]);
  const [showDownloadCsv, setShowDownloadCsv] = useState(false);
  
  const { lotteryId } = useParams<{ lotteryId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Constants
  const TOTAL_BALLS = 14;
  const BALLS_PER_DRAW = 4;
  
  useEffect(() => {
    const fetchLottery = async () => {
      if (!lotteryId || !currentUser) return;
      
      try {
        const lotteryData = await getLotterySession(lotteryId);
        
        if (!lotteryData) {
          setError('Lottery not found');
          return;
        }
        
        setLottery(lotteryData);
        setIsAdmin(lotteryData.adminId === currentUser.uid);
        
        // If no combinations yet, show error
        if (!lotteryData.combinations || lotteryData.combinations.length === 0) {
          setError('Lottery combinations have not been generated yet');
          return;
        }
        
        // If already has drawn combinations, load them
        if (lotteryData.drawnCombinations && lotteryData.drawnCombinations.length > 0) {
          setDrawnCombinations(lotteryData.drawnCombinations);
          setPickNumber(lotteryData.drawnCombinations.length + 1);
        }
        
        // Initialize lottery balls if not already done
        if (ballsInLottery.length === 0) {
          const balls = Array.from({ length: TOTAL_BALLS }, (_, i) => i + 1);
          setBallsInLottery(balls);
        }
        
        // If in reveal status, navigate to reveal page
        if (lotteryData.status === 'reveal') {
          navigate(`/lottery/${lotteryId}/reveal`);
        }
        
        // Enable CSV download option
        setShowDownloadCsv(true);
      } catch (error: any) {
        setError(error.message || 'Failed to load lottery');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLottery();
    
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchLottery, 5000);
    
    return () => clearInterval(interval);
  }, [lotteryId, currentUser, navigate, ballsInLottery.length]);
  
  // Draw a ball
  const drawBall = () => {
    if (!lottery || selectedBalls.length >= BALLS_PER_DRAW) return;
    
    setDrawingAnimation(true);
    
    // Simulate the ball selection with animation
    setTimeout(() => {
      const remainingBalls = ballsInLottery.filter(ball => !selectedBalls.includes(ball));
      const randomIndex = Math.floor(Math.random() * remainingBalls.length);
      const drawnBall = remainingBalls[randomIndex];
      
      const newSelectedBalls = [...selectedBalls, drawnBall].sort((a, b) => a - b);
      setSelectedBalls(newSelectedBalls);
      
      setDrawingAnimation(false);
      
      // If we've drawn all 4 balls, find the matching combination
      if (newSelectedBalls.length === BALLS_PER_DRAW) {
        findMatchingCombination(newSelectedBalls);
      }
    }, 1000);
  };
  
  // Find the matching combination for the drawn balls
  const findMatchingCombination = (balls: number[]) => {
    if (!lottery || !lottery.combinations) return;
    
    // Find the combination that matches the selected balls
    const matchingCombo = lottery.combinations.find(combo => 
      combo.balls.every(ball => balls.includes(ball)) && 
      balls.every(ball => combo.balls.includes(ball))
    );
    
    if (matchingCombo) {
      // Check if this team has already been selected
      const teamId = matchingCombo.teamId;
      const teamAlreadySelected = drawnCombinations.some(combo => combo.teamId === teamId);
      
      if (teamAlreadySelected) {
        // Team already selected, need to draw again
        alert(`Team ${lottery.teams.find(t => t.id === teamId)?.name} has already been selected. Drawing again...`);
        setTimeout(() => {
          setSelectedBalls([]);
        }, 1500);
      } else {
        // Record the drawn combination
        handleRecordCombination(matchingCombo);
      }
    }
  };
  
  // Record the drawn combination
  const handleRecordCombination = async (combo: LotteryCombination) => {
    if (!lottery || !lotteryId) return;
    
    try {
      // Record in Firestore
      await recordDrawnCombination(lotteryId, combo);
      
      // Update local state
      const newDrawnCombinations = [...drawnCombinations, combo];
      setDrawnCombinations(newDrawnCombinations);
      
      // If we've drawn all 4 picks, generate the draft order
      if (newDrawnCombinations.length === 4) {
        setTimeout(() => {
          handleFinishDrawing();
        }, 2000);
      } else {
        // Reset for next pick
        setTimeout(() => {
          setPickNumber(pickNumber + 1);
          setSelectedBalls([]);
        }, 1500);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to record drawn combination');
    }
  };
  
  // Generate the draft order and move to reveal phase
  const handleFinishDrawing = async () => {
    if (!lottery || !lotteryId) return;
    
    try {
      // Generate final draft order
      await generateDraftOrder(lotteryId);
      
      // Navigate to reveal page
      navigate(`/lottery/${lotteryId}/reveal`);
    } catch (error: any) {
      setError(error.message || 'Failed to generate draft order');
    }
  };
  
  // Format the combination for display
  const formatCombination = (combo: LotteryCombination) => {
    return combo.balls.join('-');
  };
  
  // Generate CSV content
  const generateCSV = () => {
    if (!lottery || !lottery.combinations) return '';
    
    let csvContent = "Combination ID,Ball 1,Ball 2,Ball 3,Ball 4,Team ID,Team Name\n";
    
    lottery.combinations.forEach(combo => {
      const team = lottery.teams.find(t => t.id === combo.teamId);
      csvContent += `${combo.id},${combo.balls[0]},${combo.balls[1]},${combo.balls[2]},${combo.balls[3]},${combo.teamId},${team ? team.name : ''}\n`;
    });
    
    return csvContent;
  };
  
  // Download CSV
  const downloadCSV = () => {
    if (!lottery) return;
    
    const csvContent = generateCSV();
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
  
  if (!lottery) {
    return <div>No lottery data available</div>;
  }
  
  return (
    <div className="max-w-4xl mx-auto my-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-2 text-center">{lottery.name}</h2>
      <p className="text-center text-gray-600 mb-6">Lottery Drawing</p>
      
      {showDownloadCsv && (
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
        
        <div className="flex justify-center items-center h-40 bg-gray-100 rounded-lg mb-4">
          <div className="flex space-x-4">
            {selectedBalls.map((ball, index) => (
              <div key={index} className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold animate-bounce">
                {ball}
              </div>
            ))}
            {Array.from({ length: BALLS_PER_DRAW - selectedBalls.length }, (_, i) => (
              <div key={i} className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center">
                ?
              </div>
            ))}
          </div>
        </div>
        
        {selectedBalls.length === BALLS_PER_DRAW ? (
          <div className="mb-4">
            <div className="text-lg font-medium">Combination Drawn: {formatCombination({
              id: 0,
              balls: selectedBalls,
              teamId: ''
            })}</div>
            {drawnCombinations.length > 0 && drawnCombinations[drawnCombinations.length - 1] && (
              <div className="mt-2 text-xl font-bold text-blue-700">
                This Pick Goes To: {lottery.teams.find(t => t.id === drawnCombinations[drawnCombinations.length - 1].teamId)?.name}
              </div>
            )}
          </div>
        ) : (
          <button
            className="bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700 transition disabled:bg-gray-400"
            onClick={drawBall}
            disabled={drawingAnimation}
          >
            {drawingAnimation ? 'Drawing...' : 'Draw Next Ball'}
          </button>
        )}
      </div>
      
      <div className="mb-4">
        <h3 className="text-lg font-medium mb-2">Drawn Picks</h3>
        <div className="space-y-2">
          {drawnCombinations.map((combo, index) => {
            const team = lottery.teams.find(t => t.id === combo.teamId);
            return (
              <div key={index} className="flex items-center p-2 bg-gray-50 rounded">
                <div className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-full mr-3">
                  {index + 1}
                </div>
                <div className="font-medium">{team?.name}</div>
                <div className="ml-auto text-sm">
                  Combo: {formatCombination(combo)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {drawnCombinations.length === 4 && (
        <button
          className="mt-4 w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition"
          onClick={handleFinishDrawing}
        >
          Continue to Draft Order Reveal
        </button>
      )}
    </div>
  );
};

export default LotteryDrawing;