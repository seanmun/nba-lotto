// src/components/lottery/LotterySetup.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getLotterySession, updateTeam, updateLotteryStatus } from '../../services/lotteryService';
import { LotterySession, Team } from '../../types';

const LotterySetup: React.FC = () => {
  const [lottery, setLottery] = useState<LotterySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { lotteryId } = useParams<{ lotteryId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
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
        
        // Check if the current user is the admin
        if (lotteryData.adminId !== currentUser?.uid) {
          setError('You do not have permission to edit this lottery');
          return;
        }
        
        setLottery(lotteryData);
      } catch (error: any) {
        setError(error.message || 'Failed to load lottery');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLottery();
  }, [lotteryId, currentUser]);
  
  const handleTeamNameChange = async (teamId: string, name: string) => {
    if (!lottery || !lotteryId) return;
    
    try {
      await updateTeam(lotteryId, teamId, { name });
      
      // Update local state
      setLottery(prev => {
        if (!prev) return prev;
        
        const updatedTeams = prev.teams.map(team => 
          team.id === teamId ? { ...team, name } : team
        );
        
        return { ...prev, teams: updatedTeams };
      });
    } catch (error: any) {
      setError(error.message || 'Failed to update team name');
    }
  };
  
  const handleTeamEmailChange = async (teamId: string, email: string) => {
    if (!lottery || !lotteryId) return;
    
    try {
      await updateTeam(lotteryId, teamId, { email });
      
      // Update local state
      setLottery(prev => {
        if (!prev) return prev;
        
        const updatedTeams = prev.teams.map(team => 
          team.id === teamId ? { ...team, email } : team
        );
        
        return { ...prev, teams: updatedTeams };
      });
    } catch (error: any) {
      setError(error.message || 'Failed to update team email');
    }
  };
  
  const handleContinue = async () => {
    if (!lottery || !lotteryId) return;
    
    try {
      // Mark the lottery as ready for verification
      await updateLotteryStatus(lotteryId, 'verification');
      
      // Navigate to the verification page
      navigate(`/lottery/${lotteryId}/verification`);
    } catch (error: any) {
      setError(error.message || 'Failed to update lottery status');
    }
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
      <p className="text-center text-gray-600 mb-6">Setup your lottery teams</p>
      
      <h3 className="text-lg font-medium mt-6 mb-3">Enter Team Information</h3>
      <p className="text-sm text-gray-600 mb-4">
        Teams are listed from worst record (highest odds) to best record (lowest odds)
      </p>
      
      <div className="space-y-4">
        {lottery.teams.map((team, index) => (
          <div key={team.id} className="flex flex-wrap items-center p-3 bg-gray-50 rounded">
            <div className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-full mr-3">
              {team.rank}
            </div>
            <div className="flex-grow flex flex-wrap">
              <div className="w-full md:w-1/2 pr-2 mb-2 md:mb-0">
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  value={team.name}
                  onChange={(e) => handleTeamNameChange(team.id, e.target.value)}
                  placeholder="Team Name"
                />
              </div>
              <div className="w-full md:w-1/2 pl-0 md:pl-2">
                <input
                  type="email"
                  className="w-full p-2 border rounded"
                  value={team.email}
                  onChange={(e) => handleTeamEmailChange(team.id, e.target.value)}
                  placeholder="Email (optional)"
                />
              </div>
            </div>
            <div className="ml-auto w-16 text-right font-medium text-blue-700">
              {team.oddsPercentage}%
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 flex justify-center">
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg"
          onClick={handleContinue}
        >
          Continue to Verification
        </button>
      </div>
    </div>
  );
};

export default LotterySetup;