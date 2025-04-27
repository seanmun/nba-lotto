// src/components/dashboard/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAdminLotterySessions, getLotterySession } from '../../services/lotteryService';
import { LotterySession } from '../../types';
import { PlusCircle, Calendar, Users, Award, Trash } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [lotteries, setLotteries] = useState<LotterySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchLotteries = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        const lotteryData = await getAdminLotterySessions(currentUser.uid);
        setLotteries(lotteryData);
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
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }
  
  return (
    <div className="max-w-4xl mx-auto my-10 p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">My Lotteries</h2>
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
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {lotteries.length === 0 ? (
        <div className="text-center p-10 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">You haven't created any lotteries yet.</p>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-flex items-center"
            onClick={handleCreateLottery}
          >
            <PlusCircle size={18} className="mr-2" />
            Create Your First Lottery
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {lotteries.map((lottery) => {
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
      )}
    </div>
  );
};

export default Dashboard;