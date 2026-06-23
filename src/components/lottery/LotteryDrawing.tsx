// src/components/lottery/LotteryDrawing.tsx — seeded, auditable draw + live sync
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeLotterySession,
  recordDrawnCombination,
  generateDraftOrder,
  updateDrawingStatus
} from '../../services/lotteryService';
import { computeDraw, getLotteryPickCount, BALLS_PER_DRAW } from '../../services/lotteryMath';
import { LotterySession } from '../../types';
import { Download, Crown } from 'lucide-react';
import Layout from '../common/Layout';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const LotteryDrawing: React.FC = () => {
  const [lottery, setLottery] = useState<LotterySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Local admin-only animation state.
  const [selectedBalls, setSelectedBalls] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [adminStatus, setAdminStatus] = useState('');
  const navigatedRef = useRef(false);

  const { lotteryId = '' } = useParams<{ lotteryId?: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Live subscription — replaces the old 1.5s polling loop.
  useEffect(() => {
    if (!lotteryId) return;

    if (!currentUser) {
      setError('Please sign in to access the lottery drawing');
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeLotterySession(
      lotteryId,
      (data) => {
        setLoading(false);
        if (!data) {
          setError('Lottery not found');
          return;
        }
        if (!data.combinations || data.combinations.length === 0) {
          setError('Lottery combinations have not been generated yet');
          return;
        }
        setLottery(data);

        if (data.status === 'reveal' && !navigatedRef.current) {
          navigatedRef.current = true;
          navigate(`/lottery/${lotteryId}/reveal`);
        }
      },
      (err) => {
        setLoading(false);
        setError(err.message || 'Failed to load lottery');
      }
    );

    return unsubscribe;
  }, [lotteryId, currentUser, navigate]);

  // Derived view state (no stale closures — computed straight from the snapshot).
  const isAdmin = !!(lottery && currentUser && lottery.adminId === currentUser.uid);
  const drawnCombinations = lottery?.drawnCombinations ?? [];
  const pickCount = lottery
    ? lottery.lotteryPickCount ?? getLotteryPickCount(lottery.teams.length)
    : 0;
  const pickNumber = drawnCombinations.length + 1;
  const isComplete = drawnCombinations.length >= pickCount;

  // What everyone sees: the admin sees their local animation; watchers see the
  // synced fields the admin writes to the doc as they draw.
  const displayBalls = isAdmin ? selectedBalls : lottery?.currentDrawingBalls ?? [];
  const displayDrawing = isAdmin ? isDrawing : !!lottery?.isDrawing;
  const displayStatus = isAdmin ? adminStatus : lottery?.drawingStatusMessage ?? '';

  // The full result is determined the moment the seed is recorded. We replay it
  // pick by pick; anyone can reproduce this with computeDraw(seed, combos).
  const draw = useMemo(() => {
    if (lottery?.seed == null || !lottery.combinations) return [];
    return computeDraw(lottery.seed, lottery.combinations, pickCount);
  }, [lottery?.seed, lottery?.combinations, pickCount]);

  const drawNextPick = async () => {
    if (!lottery || !isAdmin || isDrawing || isComplete) return;

    const index = drawnCombinations.length;
    const winning = draw[index];
    if (!winning) {
      setError('Unable to compute the draw (missing seed). Please regenerate combinations.');
      return;
    }

    setIsDrawing(true);
    setAdminStatus('Drawing balls...');
    await updateDrawingStatus(lotteryId, true, [], 'Drawing balls...');

    const shown: number[] = [];
    for (const ball of winning.balls) {
      await delay(1000);
      shown.push(ball);
      setSelectedBalls([...shown]);
      await updateDrawingStatus(lotteryId, true, [...shown], 'Drawing balls...');
    }

    try {
      await recordDrawnCombination(lotteryId, winning);
    } catch (err: any) {
      setIsDrawing(false);
      setError(err.message || 'Failed to record combination');
      return;
    }

    const newCount = index + 1;
    const successMessage = `Pick #${newCount} recorded!`;
    setAdminStatus(successMessage);
    await updateDrawingStatus(lotteryId, false, winning.balls, successMessage);
    setIsDrawing(false);

    await delay(2500);
    setSelectedBalls([]);
    setAdminStatus('');
    if (newCount >= pickCount) {
      await finishDrawing();
    } else {
      await updateDrawingStatus(lotteryId, false, [], '');
    }
  };

  const finishDrawing = async () => {
    if (!lotteryId || !isAdmin) return;
    try {
      await generateDraftOrder(lotteryId);
      if (!navigatedRef.current) {
        navigatedRef.current = true;
        navigate(`/lottery/${lotteryId}/reveal`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate draft order');
    }
  };

  const downloadCSV = () => {
    if (!lottery || !lottery.combinations) return;

    let csv = `Lottery,${lottery.name}\nSeed (for verification),${lottery.seed ?? ''}\n\n`;
    csv += 'Combination ID,Ball 1,Ball 2,Ball 3,Ball 4,Team ID,Team Name\n';
    lottery.combinations.forEach((combo) => {
      const team = lottery.teams.find((t) => t.id === combo.teamId);
      csv += `${combo.id},${combo.balls[0]},${combo.balls[1]},${combo.balls[2]},${combo.balls[3]},${combo.teamId},${team ? team.name : ''}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${lottery.name.replace(/\s+/g, '_')}_combinations.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
            Watching the drawing — only the admin can draw balls
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
          {!isComplete && (
            <div className="text-2xl font-bold mb-2">Drawing for Pick #{pickNumber}</div>
          )}

          {/* Ball animation — visible to all users */}
          <div className="flex justify-center items-center h-40 bg-gray-100 rounded-lg mb-4">
            <div className="flex space-x-4">
              {displayBalls.map((ball, index) => (
                <div
                  key={index}
                  className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold animate-bounce"
                >
                  {ball}
                </div>
              ))}
              {Array.from({ length: Math.max(0, BALLS_PER_DRAW - displayBalls.length) }, (_, i) => (
                <div
                  key={i}
                  className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    displayDrawing ? 'bg-yellow-300 animate-pulse' : 'bg-gray-300'
                  }`}
                >
                  ?
                </div>
              ))}
            </div>
          </div>

          {displayStatus && (
            <div className="mb-4 text-lg font-medium text-blue-700">{displayStatus}</div>
          )}

          {!isComplete && !displayDrawing && (
            <div className="text-center">
              {isAdmin ? (
                <button
                  className="bg-blue-600 text-white py-3 px-8 rounded-lg font-medium hover:bg-blue-700 transition"
                  onClick={drawNextPick}
                >
                  Draw Balls for Pick #{pickNumber}
                </button>
              ) : (
                <div className="text-gray-600">Waiting for admin to draw balls</div>
              )}
            </div>
          )}

          {displayDrawing && (
            <div className="text-lg font-medium text-blue-600 animate-pulse">
              {isAdmin ? 'Drawing balls...' : 'Admin is drawing balls...'}
            </div>
          )}
        </div>

        {/* Completed picks */}
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2">Completed Picks</h3>
          <div className="space-y-2">
            {drawnCombinations.map((combo, index) => (
              <div key={index} className="flex items-center p-2 bg-gray-50 rounded">
                <div className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-full mr-3">
                  {index + 1}
                </div>
                <div className="font-medium">Pick #{index + 1} — Team will be revealed later</div>
                <div className="ml-auto text-sm">Combo: {combo.balls.join('-')}</div>
              </div>
            ))}
          </div>
        </div>

        {isComplete && isAdmin && (
          <button
            className="mt-4 w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition"
            onClick={finishDrawing}
          >
            Continue to Draft Order Reveal
          </button>
        )}

        {isComplete && !isAdmin && (
          <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded text-center">
            All picks have been drawn. Waiting for the admin to reveal the draft order.
          </div>
        )}
      </div>
    </Layout>
  );
};

export default LotteryDrawing;
