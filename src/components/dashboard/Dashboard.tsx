// src/components/dashboard/Dashboard.tsx - Debug Version with Layout
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAdminLotterySessions, getUserParticipatingLotteries } from '../../services/lotteryService';
import { LotterySession } from '../../types';
import { PlusCircle, Calendar, Users, Award, Trash, User } from 'lucide-react';
import Layout from '../common/Layout';

// Define the extended type for participating lotteries
interface ParticipatingLottery extends LotterySession {
  userTeams: {
    id: string;
    name: string;
    rank: number;
  }[];
}

const Dashboard: React.FC = () => {
  const [adminLotteries, setAdminLotteries] = useState<LotterySession[]>([]);
  const [participatingLotteries, setParticipatingLotteries] = useState<ParticipatingLottery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchLotteries = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        
        // DEBUG: Log user information
        console.log('=== DEBUG USER INFO ===');
        console.log('Current User UID:', currentUser.uid);
        console.log('Current User Email:', currentUser.email);
        console.log('Current User Object:', currentUser);
        
        // Fetch lotteries where user is admin
        try {
          console.log('Fetching admin lotteries for UID:', currentUser.uid);
          const adminLotteryData = await getAdminLotterySessions(currentUser.uid);
          console.log('Admin lotteries found:', adminLotteryData.length);
          adminLotteryData.forEach((lottery, index) => {
            console.log(`Admin Lottery ${index + 1}:`, {
              id: lottery.id,
              name: lottery.name,
              adminId: lottery.adminId,
              isCurrentUserAdmin: lottery.adminId === currentUser.uid
            });
          });
          setAdminLotteries(adminLotteryData);
        } catch (adminError) {
          console.error('Error fetching admin lotteries:', adminError);
          // Continue execution even if admin lotteries fail
        }
        
        // Fetch lotteries where user is participating
        // FIXED: Now passing the user's email from Firebase Auth
        try {
          const userEmail = currentUser.email || '';
          console.log('Fetching participating lotteries for email:', userEmail);
          console.log('User email details:', {
            email: userEmail,
            emailLength: userEmail.length,
            emailTrimmed: userEmail.trim(),
            emailLowerCase: userEmail.toLowerCase()
          });
          
          const participatingLotteryData = await getUserParticipatingLotteries(currentUser.uid);
          console.log('Participating lotteries found:', participatingLotteryData.length);
          
          // Let's also manually check what emails are in the teams for debugging
          console.log('=== MANUAL EMAIL CHECK ===');
          // Get all lotteries to see what team emails exist
          const allAdminLotteries = await getAdminLotterySessions(currentUser.uid);
          allAdminLotteries.forEach((lottery, lotteryIndex) => {
            console.log(`Lottery ${lotteryIndex + 1} (${lottery.name}) teams:`);
            lottery.teams.forEach((team, teamIndex) => {
              console.log(`  Team ${teamIndex + 1} (${team.name}):`);
              console.log(`    Primary email: "${team.email}" (length: ${team.email?.length || 0})`);
              console.log(`    Emails array: [${team.emails?.map(e => `"${e}"`).join(', ') || 'empty'}]`);
              console.log(`    Email matches user: primary=${team.email === userEmail}, in array=${team.emails?.includes(userEmail)}`);
            });
          });
          console.log('=== END MANUAL EMAIL CHECK ===');
          
          participatingLotteryData.forEach((lottery, index) => {
            console.log(`Participating Lottery ${index + 1}:`, {
              id: lottery.id,
              name: lottery.name,
              adminId: lottery.adminId,
              isCurrentUserAdmin: lottery.adminId === currentUser.uid,
              userTeams: lottery.userTeams
            });
          });
          setParticipatingLotteries(participatingLotteryData);
        } catch (participatingError) {
          console.error('Error fetching participating lotteries:', participatingError);
          // Continue execution even if participating lotteries fail
        }
        
        console.log('=== END DEBUG INFO ===');
      } catch (error: any) {
        setError(error.message || 'Failed to load lotteries');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLotteries();
  }, [currentUser]);
  
  const handleCreateLottery = () => {
    navigate('/lottery/create');
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error: any) {
      setError(error.message || 'Failed to log out');
    }
  };
  
  const getStatusInfo = (status: LotterySession['status']) => {
    switch (status) {
      case 'setup':
        return {
          label: 'Setup',
          color: 'bg-yellow-100 text-yellow-800',
          icon: <Calendar size={16} className="mr-1" />
        };
      case 'verification':
        return {
          label: 'Verification',
          color: 'bg-blue-100 text-blue-800',
          icon: <Users size={16} className="mr-1" />
        };
      case 'drawing':
        return {
          label: 'Drawing',
          color: 'bg-purple-100 text-purple-800',
          icon: <Award size={16} className="mr-1" />
        };
      case 'reveal':
      case 'complete':
        return {
          label: 'Complete',
          color: 'bg-green-100 text-green-800',
          icon: <Award size={16} className="mr-1" />
        };
      default:
        return {
          label: 'Unknown',
          color: 'bg-gray-100 text-gray-800',
          icon: null
        };
    }
  };
  
  const handleLotteryClick = (lottery: LotterySession) => {
    switch (lottery.status) {
      case 'setup':
        navigate(`/lottery/${lottery.id}/setup`);
        break;
      case 'verification':
        navigate(`/lottery/${lottery.id}/verification`);
        break;
      case 'drawing':
        navigate(`/lottery/${lottery.id}/drawing`);
        break;
      case 'reveal':
      case 'complete':
        navigate(`/lottery/${lottery.id}/reveal`);
        break;
      default:
        navigate(`/lottery/${lottery.id}/setup`);
    }
  };
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">Loading...</div>
      </Layout>
    );
  }
  
  // For display purposes, we only need to know if there are any lotteries
  const hasAnyLotteries = adminLotteries.length > 0 || participatingLotteries.length > 0;
  
  return (
    <Layout>
      <div className="max-w-4xl mx-auto my-10 p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">My Lotteries</h2>
          <p className="text-sm text-gray-600 mt-1">Logged in as: {currentUser?.email}</p>
          <p className="text-xs text-gray-500 mt-1">User ID: {currentUser?.uid}</p>
        </div>
        <div className="flex gap-2">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center"
            onClick={handleCreateLottery}
          >
            <PlusCircle size={18} className="mr-2" />
            Create Lottery
          </button>
          <button
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>
      
      {/* DEBUG SECTION */}
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-bold text-yellow-800 mb-2">DEBUG INFO</h3>
        <p className="text-sm text-yellow-700">Admin Lotteries: {adminLotteries.length}</p>
        <p className="text-sm text-yellow-700">Participating Lotteries: {participatingLotteries.length}</p>
        <p className="text-sm text-yellow-700">Check browser console for detailed logs</p>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {!hasAnyLotteries ? (
        <div className="text-center p-10 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">You're not part of any lotteries yet.</p>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-flex items-center"
            onClick={handleCreateLottery}
          >
            <PlusCircle size={18} className="mr-2" />
            Create Your First Lottery
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {adminLotteries.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Lotteries You Admin</h3>
              <div className="space-y-3">
                {adminLotteries.map((lottery) => {
                  const statusInfo = getStatusInfo(lottery.status);
                  
                  return (
                    <div
                      key={lottery.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition"
                      onClick={() => handleLotteryClick(lottery)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold">{lottery.name}</h3>
                          <p className="text-sm text-gray-600">
                            Created on {formatDate(lottery.createdAt)}
                          </p>
                          {/* DEBUG: Show admin ID */}
                          <p className="text-xs text-gray-500">
                            Admin ID: {lottery.adminId} {lottery.adminId === currentUser?.uid ? '(YOU)' : '(NOT YOU)'}
                          </p>
                          <div className="mt-2 flex items-center">
                            <span className={`text-xs px-2 py-1 rounded-full flex items-center ${statusInfo.color}`}>
                              {statusInfo.icon}
                              {statusInfo.label}
                            </span>
                            <span className="mx-2 text-gray-400">•</span>
                            <span className="text-sm text-gray-600">
                              {lottery.teamCount} Teams
                            </span>
                            <span className="mx-2 text-gray-400">•</span>
                            <span className="text-sm text-gray-600">
                              {lottery.requiredVerifierCount} Verifiers
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {lottery.status === 'complete' && (
                            <button
                              className="text-gray-400 hover:text-red-500"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Delete functionality would go here
                              }}
                            >
                              <Trash size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {participatingLotteries.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Lotteries You're Participating In</h3>
              <div className="space-y-3">
                {participatingLotteries.map((lottery) => {
                  const statusInfo = getStatusInfo(lottery.status);
                  
                  return (
                    <div
                      key={lottery.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition"
                      onClick={() => handleLotteryClick(lottery)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold">{lottery.name}</h3>
                          <p className="text-sm text-gray-600">
                            Created on {formatDate(lottery.createdAt)}
                          </p>
                          
                          {/* DEBUG: Show admin ID for participating lotteries too */}
                          <p className="text-xs text-gray-500">
                            Admin ID: {lottery.adminId} {lottery.adminId === currentUser?.uid ? '(YOU - SHOULD NOT SEE THIS HERE!)' : '(NOT YOU)'}
                          </p>
                          
                          {/* User's Teams Section */}
                          <div className="mt-2 mb-2">
                            <span className="text-sm font-medium text-gray-700 flex items-center">
                              <User size={15} className="mr-1" /> Your Team{lottery.userTeams.length > 1 ? 's' : ''}:
                            </span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {lottery.userTeams.map(team => (
                                <span key={team.id} className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                                  {team.name} (#{team.rank})
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          <div className="mt-2 flex items-center">
                            <span className={`text-xs px-2 py-1 rounded-full flex items-center ${statusInfo.color}`}>
                              {statusInfo.icon}
                              {statusInfo.label}
                            </span>
                            <span className="mx-2 text-gray-400">•</span>
                            <span className="text-sm text-gray-600">
                              {lottery.teamCount} Teams
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </Layout>
  );
};

export default Dashboard;