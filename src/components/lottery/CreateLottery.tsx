// src/components/lottery/CreateLottery.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createLotterySession } from '../../services/lotteryService';

const CreateLottery: React.FC = () => {
  const [lotteryName, setLotteryName] = useState('');
  const [teamCount, setTeamCount] = useState(14);
  const [verifierCount, setVerifierCount] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      setError('You must be logged in to create a lottery');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const lotteryId = await createLotterySession(
        lotteryName,
        currentUser.uid,
        teamCount,
        verifierCount
      );
      
      // Navigate to the setup page for this lottery
      navigate(`/lottery/${lotteryId}/setup`);
    } catch (error: any) {
      setError(error.message || 'Failed to create lottery');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-lg mx-auto my-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Create NBA Draft Lottery</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="lotteryName">
            Lottery Name
          </label>
          <input
            id="lotteryName"
            type="text"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={lotteryName}
            onChange={(e) => setLotteryName(e.target.value)}
            placeholder="2025 Fantasy Basketball Draft Lottery"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="teamCount">
            Number of Teams
          </label>
          <select
            id="teamCount"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={teamCount}
            onChange={(e) => setTeamCount(parseInt(e.target.value))}
          >
            {Array.from({ length: 14 }, (_, i) => i + 1).map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
          <p className="text-sm text-gray-600 mt-1">
            This will determine how many teams are in the lottery. The NBA uses 14 teams.
          </p>
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="verifierCount">
            Required Verifier Count
          </label>
          <select
            id="verifierCount"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={verifierCount}
            onChange={(e) => setVerifierCount(parseInt(e.target.value))}
          >
            {Array.from({ length: 14 }, (_, i) => i + 1).map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
          <p className="text-sm text-gray-600 mt-1">
            Number of people who must verify the lottery before it can begin. 
            You (the admin) count as one verifier.
          </p>
        </div>
        
        <div className="flex items-center justify-center">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg focus:outline-none focus:shadow-outline"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Lottery'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateLottery;