// src/services/lotteryService.ts
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  query,
  where
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  LotterySession,
  Team,
  LotteryCombination,
  DraftPick,
  Verifier
} from '../types';
import {
  allocateCombinationCounts,
  generateAllCombinations,
  assignCombinationsToTeams,
  getLotteryPickCount,
  generateSeed,
} from './lotteryMath';

// Enhanced type to include user's team information
interface ParticipatingLottery extends LotterySession {
  userTeams: {
    id: string;
    name: string;
    rank: number;
  }[];
}

// Create a new lottery session
export const createLotterySession = async (
  name: string,
  adminId: string,
  teamCount: number,
  requiredVerifierCount: number
): Promise<string> => {
  try {
    const lotteryRef = doc(collection(db, 'lotteries'));
    
    const teams: Team[] = Array.from({ length: teamCount }, (_, i) => ({
      id: `team-${i + 1}`,
      name: `Team ${i + 1}`,
      email: '',
      emails: [],
      rank: i + 1,
      oddsPercentage: 0,
      combinations: []
    }));
    
    assignOddsToTeams(teams);

    const lotterySession: LotterySession = {
      id: lotteryRef.id,
      name,
      adminId,
      teamCount,
      requiredVerifierCount,
      lotteryPickCount: getLotteryPickCount(teamCount),
      verifiers: [],
      status: 'setup',
      teams,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    await setDoc(lotteryRef, lotterySession);
    return lotteryRef.id;
  } catch (error) {
    console.error('Error creating lottery session:', error);
    throw error;
  }
};

// Get a lottery session by ID
export const getLotterySession = async (id: string): Promise<LotterySession | null> => {
  try {
    const docRef = doc(db, 'lotteries', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as LotterySession;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting lottery session:', error);
    throw error;
  }
};

// Subscribe to live updates for a single lottery (replaces polling).
// Returns an unsubscribe function.
export const subscribeLotterySession = (
  id: string,
  onChange: (lottery: LotterySession | null) => void,
  onError?: (error: Error) => void
): (() => void) => {
  const docRef = doc(db, 'lotteries', id);
  return onSnapshot(
    docRef,
    (snap) => onChange(snap.exists() ? (snap.data() as LotterySession) : null),
    (error) => {
      console.error('Error subscribing to lottery session:', error);
      onError?.(error);
    }
  );
};

// Get all lottery sessions for an admin
export const getAdminLotterySessions = async (adminId: string): Promise<LotterySession[]> => {
  try {
    const q = query(collection(db, 'lotteries'), where('adminId', '==', adminId));
    const querySnapshot = await getDocs(q);
    
    const sessions: LotterySession[] = [];
    querySnapshot.forEach((doc) => {
      sessions.push(doc.data() as LotterySession);
    });
    
    return sessions;
  } catch (error) {
    console.error('Error getting admin lottery sessions:', error);
    throw error;
  }
};

// Helper function to get the user's email from Firestore
const getUserEmail = async (userId: string): Promise<string | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (userDoc.exists()) {
      return userDoc.data().email || null;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user email:', error);
    return null;
  }
};

// Get lotteries where the user is a verifier or appears in teams
export const getUserParticipatingLotteries = async (userId: string): Promise<ParticipatingLottery[]> => {
  try {
    const publicQuery = query(
      collection(db, 'lotteries'),
      where('status', 'in', ['verification', 'reveal', 'complete'])
    );
    
    const publicSnapshot = await getDocs(publicQuery);
    const participatingLotteries: ParticipatingLottery[] = [];
    const userEmail = await getUserEmail(userId);
    
    publicSnapshot.forEach((doc) => {
      const lottery = doc.data() as LotterySession;
      
      if (lottery.adminId === userId) {
        return;
      }
      
      const isVerifier = lottery.verifiers && lottery.verifiers.some(v => v.userId === userId);
      
      const matchingTeams = [];
      if (userEmail && lottery.teams) {
        for (const team of lottery.teams) {
          if (team.email === userEmail) {
            matchingTeams.push({
              id: team.id,
              name: team.name,
              rank: team.rank
            });
          }
          else if (team.emails && team.emails.includes(userEmail)) {
            matchingTeams.push({
              id: team.id,
              name: team.name,
              rank: team.rank
            });
          }
        }
      }
      
      if (isVerifier || matchingTeams.length > 0) {
        participatingLotteries.push({
          ...lottery,
          userTeams: matchingTeams
        });
      }
    });
    
    return participatingLotteries;
  } catch (error) {
    console.error('Error getting user participating lotteries:', error);
    return [];
  }
};

// Update a team in a lottery session
export const updateTeam = async (
  lotteryId: string,
  teamId: string,
  updates: Partial<Team>
): Promise<void> => {
  try {
    const lotteryRef = doc(db, 'lotteries', lotteryId);
    const lotterySnap = await getDoc(lotteryRef);
    
    if (lotterySnap.exists()) {
      const lottery = lotterySnap.data() as LotterySession;
      
      const updatedTeams = lottery.teams.map(team => {
        if (team.id === teamId) {
          if (updates.emails) {
            return { 
              ...team, 
              ...updates,
              email: updates.emails.length > 0 ? updates.emails[0] : team.email 
            };
          }
          return { ...team, ...updates };
        }
        return team;
      });
      
      await updateDoc(lotteryRef, { 
        teams: updatedTeams,
        updatedAt: Date.now()
      });
    }
  } catch (error) {
    console.error('Error updating team:', error);
    throw error;
  }
};

// Add a verifier to the lottery session
export const addVerifier = async (
  lotteryId: string,
  verifier: Verifier
): Promise<boolean> => {
  try {
    const lotteryRef = doc(db, 'lotteries', lotteryId);
    const lotterySnap = await getDoc(lotteryRef);
    
    if (lotterySnap.exists()) {
      const lottery = lotterySnap.data() as LotterySession;
      
      if (lottery.verifiers.some(v => v.userId === verifier.userId)) {
        return false;
      }
      
      if (lottery.verifiers.length >= lottery.requiredVerifierCount) {
        return false;
      }
      
      const updatedVerifiers = [...lottery.verifiers, verifier];
      
      await updateDoc(lotteryRef, { 
        verifiers: updatedVerifiers,
        updatedAt: Date.now()
      });
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error adding verifier:', error);
    throw error;
  }
};

// Update lottery session status
export const updateLotteryStatus = async (
  lotteryId: string,
  status: LotterySession['status']
): Promise<void> => {
  try {
    const lotteryRef = doc(db, 'lotteries', lotteryId);
    
    await updateDoc(lotteryRef, { 
      status,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error('Error updating lottery status:', error);
    throw error;
  }
};

// Update drawing status for real-time sync
export const updateDrawingStatus = async (
  lotteryId: string, 
  isDrawing: boolean, 
  currentBalls: number[] = [],
  statusMessage: string = ''
): Promise<void> => {
  try {
    const lotteryRef = doc(db, 'lotteries', lotteryId);
    
    await updateDoc(lotteryRef, { 
      isDrawing,
      currentDrawingBalls: currentBalls,
      drawingStatusMessage: statusMessage,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error('Error updating drawing status:', error);
    // Don't throw - this is non-critical
  }
};

// Generate all possible lottery combinations
export const generateCombinations = async (lotteryId: string): Promise<LotteryCombination[]> => {
  try {
    const lotteryRef = doc(db, 'lotteries', lotteryId);
    const lotterySnap = await getDoc(lotteryRef);
    
    if (!lotterySnap.exists()) {
      throw new Error('Lottery not found');
    }
    
    const lottery = lotterySnap.data() as LotterySession;

    // Build all 1000 combinations and assign every one to a team (no orphans).
    const allCombos = generateAllCombinations();
    const updatedTeams = lottery.teams.map((team) => ({ ...team }));
    assignCombinationsToTeams(updatedTeams, allCombos);

    // Record a seed now. The whole draw is a deterministic function of this
    // seed + the combination assignment, so anyone can replay and verify it.
    const seed = generateSeed();

    await updateDoc(lotteryRef, {
      combinations: allCombos,
      teams: updatedTeams,
      seed,
      lotteryPickCount: getLotteryPickCount(lottery.teams.length),
      updatedAt: Date.now()
    });

    return allCombos;
  } catch (error) {
    console.error('Error generating combinations:', error);
    throw error;
  }
};

// Record a drawn combination
export const recordDrawnCombination = async (
  lotteryId: string,
  combination: LotteryCombination
): Promise<void> => {
  try {
    const lotteryRef = doc(db, 'lotteries', lotteryId);
    const lotterySnap = await getDoc(lotteryRef);
    
    if (!lotterySnap.exists()) {
      throw new Error('Lottery not found');
    }
    
    const lottery = lotterySnap.data() as LotterySession;
    const drawnCombinations = lottery.drawnCombinations || [];
    
    drawnCombinations.push(combination);
    
    await updateDoc(lotteryRef, {
      drawnCombinations,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error('Error recording drawn combination:', error);
    throw error;
  }
};

// Generate the final draft order
export const generateDraftOrder = async (lotteryId: string): Promise<DraftPick[]> => {
  try {
    const lotteryRef = doc(db, 'lotteries', lotteryId);
    const lotterySnap = await getDoc(lotteryRef);
    
    if (!lotterySnap.exists()) {
      throw new Error('Lottery not found');
    }
    
    const lottery = lotterySnap.data() as LotterySession;
    const drawnCombinations = lottery.drawnCombinations || [];
    const teams = lottery.teams;
    const pickCount = lottery.lotteryPickCount ?? getLotteryPickCount(teams.length);

    const draftOrder: DraftPick[] = [];

    // Only use combinations that map to a real team, and only as many as the
    // lottery was supposed to draw.
    const validCombinations = drawnCombinations.filter((combo) =>
      teams.some((t) => t.id === combo.teamId)
    );
    const lotteryCombos = validCombinations.slice(-pickCount);

    // Picks decided by the draw, in draw order.
    lotteryCombos.forEach((combo, i) => {
      const team = teams.find((t) => t.id === combo.teamId);
      if (team) {
        draftOrder.push({
          pick: i + 1,
          teamId: team.id,
          teamName: team.name,
          combination: combo
        });
      }
    });

    // Remaining picks: teams not drawn, in rank order (worst record first).
    const drawnTeamIds = lotteryCombos.map((combo) => combo.teamId);
    const remainingTeams = teams
      .filter((team) => !drawnTeamIds.includes(team.id))
      .sort((a, b) => a.rank - b.rank);

    let pickNumber = lotteryCombos.length + 1;
    for (const team of remainingTeams) {
      draftOrder.push({
        pick: pickNumber,
        teamId: team.id,
        teamName: team.name,
        combination: null
      });
      pickNumber++;
    }

    await updateDoc(lotteryRef, {
      draftOrder,
      status: 'reveal',
      updatedAt: Date.now()
    });
    
    return draftOrder;
  } catch (error) {
    console.error('Error generating draft order:', error);
    throw error;
  }
};

// Assign odds to teams based on their rank. The displayed percentage equals
// each team's exact share of the 1000 combinations, so it is always truthful —
// including for leagues with fewer than 14 teams (which are normalized).
const assignOddsToTeams = (teams: Team[]): void => {
  const counts = allocateCombinationCounts(teams.length);

  teams.forEach((team, index) => {
    team.oddsPercentage = counts[index] / (1000 / 100);
  });
};

// Skip verification if no verifiers are required
export const handleZeroVerifierLottery = async (lotteryId: string): Promise<void> => {
  try {
    const lotteryRef = doc(db, 'lotteries', lotteryId);
    const lotterySnap = await getDoc(lotteryRef);
    
    if (!lotterySnap.exists()) {
      throw new Error('Lottery not found');
    }
    
    const lottery = lotterySnap.data() as LotterySession;
    
    if (lottery.requiredVerifierCount === 0) {
      await generateCombinations(lotteryId);
      
      await updateDoc(lotteryRef, {
        status: 'drawing',
        updatedAt: Date.now()
      });
    }
  } catch (error) {
    console.error('Error handling zero verifier lottery:', error);
    throw error;
  }
};

// Migration function to add emails array to existing teams
export const migrateTeamsToMultipleEmails = async (): Promise<void> => {
  try {
    console.log("Starting team migration to support multiple emails...");
    
    const lotteriesRef = collection(db, 'lotteries');
    const lotteriesSnapshot = await getDocs(lotteriesRef);
    
    let totalLotteries = 0;
    let totalTeams = 0;
    
    for (const lotteryDoc of lotteriesSnapshot.docs) {
      const lottery = lotteryDoc.data() as LotterySession;
      const lotteryId = lotteryDoc.id;
      
      if (!lottery.teams || lottery.teams.length === 0) continue;
      
      const updatedTeams = lottery.teams.map(team => {
        if (team.emails) return team;
        
        return {
          ...team,
          emails: team.email ? [team.email] : []
        };
      });
      
      await updateDoc(doc(db, 'lotteries', lotteryId), {
        teams: updatedTeams,
        updatedAt: Date.now()
      });
      
      totalLotteries++;
      totalTeams += lottery.teams.length;
    }
    
    console.log(`Migration complete! Updated ${totalTeams} teams across ${totalLotteries} lotteries.`);
  } catch (error) {
    console.error('Error migrating teams to multiple emails:', error);
    throw error;
  }
};