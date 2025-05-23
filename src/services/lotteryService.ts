// src/services/lotteryService.ts
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  LotterySession, 
  Team, 
  LotteryCombination, 
  DraftPick, 
  Verifier 
} from '../types';

// Constants for the lottery
const TOTAL_BALLS = 14;
const BALLS_PER_DRAW = 4;
const TOTAL_COMBINATIONS = 1000; // NBA uses 1000 of 1001 possible combinations

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
    const allCombos: LotteryCombination[] = [];
    let comboId = 1;
    
    for (let a = 1; a <= TOTAL_BALLS - 3; a++) {
      for (let b = a + 1; b <= TOTAL_BALLS - 2; b++) {
        for (let c = b + 1; c <= TOTAL_BALLS - 1; c++) {
          for (let d = c + 1; d <= TOTAL_BALLS; d++) {
            if (!(a === 11 && b === 12 && c === 13 && d === 14)) {
              if (comboId <= TOTAL_COMBINATIONS) {
                allCombos.push({
                  id: comboId,
                  balls: [a, b, c, d],
                  teamId: ''
                });
                comboId++;
              }
            }
          }
        }
      }
    }
    
    let combinationIndex = 0;
    const updatedTeams = [...lottery.teams];
    
    updatedTeams.forEach(team => {
      const combinationsToAssign = Math.round(team.oddsPercentage * TOTAL_COMBINATIONS / 100);
      team.combinations = [];
      
      for (let i = 0; i < combinationsToAssign; i++) {
        if (combinationIndex < allCombos.length) {
          allCombos[combinationIndex].teamId = team.id;
          team.combinations.push(allCombos[combinationIndex].id.toString());
          combinationIndex++;
        }
      }
    });
    
    await updateDoc(lotteryRef, {
      combinations: allCombos,
      teams: updatedTeams,
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
    
    console.log('=== DRAFT ORDER DEBUG ===');
    console.log('Total drawn combinations:', drawnCombinations.length);
    console.log('Total teams:', teams.length);
    
    const draftOrder: DraftPick[] = [];
    
    // Only use combinations that have valid teams
    const validCombinations = drawnCombinations.filter(combo => {
      const team = teams.find(t => t.id === combo.teamId);
      return team !== undefined;
    });
    
    console.log('Valid combinations:');
    validCombinations.forEach((combo, index) => {
      const team = teams.find(t => t.id === combo.teamId);
      console.log(`  ${index}: ${combo.balls.join('-')} -> ${team?.name}`);
    });
    
    // Take the last 4 valid combinations
    const lastFourValidCombos = validCombinations.slice(-4);
    
    console.log('Using last 4 valid combinations:');
    lastFourValidCombos.forEach((combo, index) => {
      const team = teams.find(t => t.id === combo.teamId);
      console.log(`  Pick ${index + 1}: ${combo.balls.join('-')} -> ${team?.name}`);
    });
    
    // Create picks 1-4 from these combinations
    for (let i = 0; i < lastFourValidCombos.length; i++) {
      const combo = lastFourValidCombos[i];
      const team = teams.find(t => t.id === combo.teamId);
      
      if (team) {
        draftOrder.push({
          pick: i + 1,
          teamId: team.id,
          teamName: team.name,
          combination: combo
        });
        console.log(`Pick ${i + 1}: ${team.name}`);
      }
    }
    
    // Find remaining teams
    const lotteryTeamIds = lastFourValidCombos.map(combo => combo.teamId);
    const remainingTeams = teams.filter(team => !lotteryTeamIds.includes(team.id));
    
    // Add remaining teams in rank order
    remainingTeams.sort((a, b) => a.rank - b.rank);
    
    let pickNumber = lastFourValidCombos.length + 1;
    for (const team of remainingTeams) {
      draftOrder.push({
        pick: pickNumber,
        teamId: team.id,
        teamName: team.name,
        combination: null
      });
      console.log(`Pick ${pickNumber}: ${team.name} (remaining)`);
      pickNumber++;
    }
    
    console.log('=== FINAL DRAFT ORDER ===');
    draftOrder.forEach(pick => {
      console.log(`Pick ${pick.pick}: ${pick.teamName}`);
    });
    
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

// Get NBA odds distribution based on team count
const getOddsDistribution = (count: number): number[] => {
  const nbaOdds = [14.0, 14.0, 14.0, 12.5, 10.5, 9.0, 7.5, 6.0, 4.5, 3.0, 2.0, 1.5, 1.0, 0.5];
  return nbaOdds.slice(0, count);
};

// Assign odds to teams based on their rank
const assignOddsToTeams = (teams: Team[]): void => {
  const oddsDistribution = getOddsDistribution(teams.length);
  
  teams.forEach((team, index) => {
    team.oddsPercentage = oddsDistribution[index];
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