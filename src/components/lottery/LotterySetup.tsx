// src/components/lottery/LotterySetup.tsx - Fixed lotteryId TypeScript error
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getLotterySession, updateTeam, updateLotteryStatus, generateCombinations } from '../../services/lotteryService';
import { LotterySession, Team } from '../../types';
import { Plus, X, UserPlus, Mail } from 'lucide-react';

const LotterySetup: React.FC = () => {
  const [lottery, setLottery] = useState<LotterySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Fix: Provide default empty string for lotteryId
  const { lotteryId = "" } = useParams<{ lotteryId?: string }>();
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

        // Ensure each team has proper initialization of all fields
        const updatedTeams = lotteryData.teams.map(team => ({
          ...team,
          name: team.name || "",
          email: team.email || "",
          emails: team.emails || [],
          combinations: team.combinations || []
        }));

        setLottery({
          ...lotteryData,
          teams: updatedTeams
        });
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
      // Make sure we have a valid name
      const validName = name || '';
      
      await updateTeam(lotteryId, teamId, { name: validName });
      
      // Update local state
      setLottery(prev => {
        if (!prev) return prev;
        
        const updatedTeams = prev.teams.map(team => 
          team.id === teamId ? { ...team, name: validName } : team
        );
        
        return { ...prev, teams: updatedTeams };
      });
    } catch (error: any) {
      setError(error.message || 'Failed to update team name');
    }
  };
  
  // Update primary email (first in the array)
  const handlePrimaryEmailChange = async (teamId: string, email: string) => {
    if (!lottery || !lotteryId) return;
    
    const team = lottery.teams.find(t => t.id === teamId);
    if (!team) return;
    
    try {
      // Ensure email is never undefined
      const validEmail = email || '';
      
      // Create updated emails array
      const updatedEmails = [...(team.emails || [])];
      if (updatedEmails.length === 0) {
        updatedEmails.push(validEmail);
      } else {
        updatedEmails[0] = validEmail;
      }
      
      // Update team
      await updateTeam(lotteryId, teamId, { 
        email: validEmail, 
        emails: updatedEmails 
      });
      
      // Update local state
      setLottery(prev => {
        if (!prev) return prev;
        
        const updatedTeams = prev.teams.map(t => {
          if (t.id === teamId) {
            const newEmails = [...(t.emails || [])];
            if (newEmails.length === 0) {
              newEmails.push(validEmail);
            } else {
              newEmails[0] = validEmail;
            }
            
            return { 
              ...t, 
              email: validEmail,
              emails: newEmails
            };
          }
          return t;
        });
        
        return { ...prev, teams: updatedTeams };
      });
    } catch (error: any) {
      setError(error.message || 'Failed to update team email');
    }
  };

  // Add a co-owner email to a team
  const addCoOwnerEmail = (teamId: string) => {
    if (!lottery) return;
    
    setLottery(prev => {
      if (!prev) return prev;
      
      const updatedTeams = prev.teams.map(team => {
        if (team.id === teamId) {
          const updatedEmails = [...(team.emails || [])];
          updatedEmails.push(''); // Add empty email for user to fill
          return {
            ...team,
            emails: updatedEmails
          };
        }
        return team;
      });
      
      return { ...prev, teams: updatedTeams };
    });
  };

  // Update a co-owner email
  const updateCoOwnerEmail = async (teamId: string, index: number, email: string) => {
    if (!lottery || !lotteryId) return;
    
    // Make sure we're not updating the primary email (index 0)
    if (index === 0) return;
    
    const team = lottery.teams.find(t => t.id === teamId);
    if (!team || !team.emails || team.emails.length <= index) return;
    
    // Ensure email is never undefined
    const validEmail = email || '';
    
    // Update local state first
    setLottery(prev => {
      if (!prev) return prev;
      
      const updatedTeams = prev.teams.map(t => {
        if (t.id === teamId && t.emails) {
          const updatedEmails = [...t.emails];
          updatedEmails[index] = validEmail;
          return {
            ...t,
            emails: updatedEmails
          };
        }
        return t;
      });
      
      return { ...prev, teams: updatedTeams };
    });
    
    // Don't save empty emails immediately
    if (validEmail.trim() === '') return;
    
    // Save to Firestore
    try {
      const updatedEmails = [...team.emails];
      updatedEmails[index] = validEmail;
      
      await updateTeam(lotteryId, teamId, { 
        emails: updatedEmails 
      });
    } catch (error: any) {
      setError(error.message || 'Failed to update co-owner email');
    }
  };

  // Remove a co-owner email
  const removeCoOwnerEmail = async (teamId: string, index: number) => {
    if (!lottery || !lotteryId) return;
    
    // Make sure we're not removing the primary email (index 0)
    if (index === 0) return;
    
    const team = lottery.teams.find(t => t.id === teamId);
    if (!team || !team.emails || team.emails.length <= index) return;
    
    // Update in local state and Firestore
    try {
      const updatedEmails = [...team.emails];
      updatedEmails.splice(index, 1);
      
      // Update Firestore
      await updateTeam(lotteryId, teamId, { emails: updatedEmails });
      
      // Update local state
      setLottery(prev => {
        if (!prev) return prev;
        
        const updatedTeams = prev.teams.map(t => {
          if (t.id === teamId && t.emails) {
            const newEmails = [...t.emails];
            newEmails.splice(index, 1);
            return {
              ...t,
              emails: newEmails
            };
          }
          return t;
        });
        
        return { ...prev, teams: updatedTeams };
      });
    } catch (error: any) {
      setError(error.message || 'Failed to remove co-owner email');
    }
  };
  
  const handleContinue = async () => {
    if (!lottery || !lotteryId) return;
    
    try {
      // Save any pending email changes and filter out empty emails
      for (const team of lottery.teams) {
        if (team.emails) {
          const validEmails = team.emails.filter(email => email && email.trim() !== '');
          
          // Always keep at least the primary email if it exists
          if (validEmails.length === 0 && team.email) {
            validEmails.push(team.email);
          }
          
          // Use a default empty string if no valid emails
          const primaryEmail = validEmails.length > 0 ? validEmails[0] : '';
          
          await updateTeam(lotteryId, team.id, {
            emails: validEmails,
            email: primaryEmail
          });
        }
      }

      // Check if verification is required
      if (lottery.requiredVerifierCount === 0) {
        setLoading(true);
        // Generate combinations
        await generateCombinations(lotteryId);
        
        // Skip verification and go directly to drawing
        await updateLotteryStatus(lotteryId, 'drawing');
        
        // Navigate to drawing page
        navigate(`/lottery/${lotteryId}/drawing`);
      } else {
        // Mark the lottery as ready for verification
        await updateLotteryStatus(lotteryId, 'verification');
        
        // Navigate to the verification page
        navigate(`/lottery/${lotteryId}/verification`);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to update lottery status');
    } finally {
      setLoading(false);
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
  
  // Split teams into chunks for grid layout
  const teamChunks = [];
  const chunksCount = lottery.teams.length <= 6 ? 2 : 3; // 2 or 3 columns based on team count
  
  for (let i = 0; i < lottery.teams.length; i += chunksCount) {
    teamChunks.push(lottery.teams.slice(i, i + chunksCount));
  }
  
  return (
    <div className="max-w-6xl mx-auto my-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-2 text-center">{lottery.name || ''}</h2>
      <p className="text-center text-gray-600 mb-6">Setup your lottery teams</p>
      
      <h3 className="text-lg font-medium mb-2">Enter Team Information</h3>
      <p className="text-sm text-gray-600 mb-4">
        Teams are listed from worst record (highest odds) to best record (lowest odds)
      </p>
      
      {/* Teams grid layout */}
      {teamChunks.map((chunk, chunkIndex) => (
        <div key={chunkIndex} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {chunk.map((team) => (
            <div key={team.id} className="p-3 bg-gray-50 rounded shadow-sm border border-gray-200">
              <div className="flex items-center mb-3">
                <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-blue-600 text-white rounded-full mr-2 text-sm font-bold">
                  {team.rank}
                </div>
                <div className="flex-grow mr-2">
                  <input
                    type="text"
                    className="w-full p-1.5 text-sm border rounded"
                    value={team.name || ''}
                    onChange={(e) => handleTeamNameChange(team.id, e.target.value)}
                    placeholder="Team Name"
                  />
                </div>
                <div className="flex-shrink-0 text-right font-medium text-blue-700 text-sm">
                  {team.oddsPercentage}%
                </div>
              </div>
              
              {/* Primary email field */}
              <div className="mb-2 flex items-center">
                <Mail size={14} className="text-gray-400 mr-2 flex-shrink-0" />
                <input
                  type="email"
                  className="w-full p-1.5 text-sm border rounded"
                  value={(team.email || '') || ((team.emails && team.emails.length > 0) ? team.emails[0] || '' : '')}
                  onChange={(e) => handlePrimaryEmailChange(team.id, e.target.value)}
                  placeholder="Primary Owner Email"
                />
              </div>
              
              {/* Co-owner emails */}
              {team.emails && team.emails.slice(1).map((email, emailIndex) => (
                <div key={emailIndex} className="flex items-center mb-2">
                  <div className="w-4 mr-2"></div> {/* Spacer for alignment */}
                  <input
                    type="email"
                    className="flex-grow p-1.5 text-sm border rounded"
                    value={email || ''}
                    onChange={(e) => updateCoOwnerEmail(team.id, emailIndex + 1, e.target.value)}
                    placeholder={`Co-owner Email`}
                  />
                  <button
                    className="ml-1 p-1 text-red-500 hover:bg-red-50 rounded"
                    onClick={() => removeCoOwnerEmail(team.id, emailIndex + 1)}
                    aria-label="Remove co-owner email"
                    type="button"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              
              {/* Add co-owner button */}
              <div className="mt-2">
                <button
                  className="text-blue-600 hover:text-blue-800 text-xs flex items-center"
                  onClick={() => addCoOwnerEmail(team.id)}
                  type="button"
                >
                  <UserPlus size={14} className="mr-1" />
                  Add Co-Owner
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
      
      <div className="mt-6 flex justify-center">
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg"
          onClick={handleContinue}
          type="button"
        >
          Continue to Verification
        </button>
      </div>
    </div>
  );
};

export default LotterySetup;