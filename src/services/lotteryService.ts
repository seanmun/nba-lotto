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

// Create a new lottery session
export const createLotterySession = async (
  name: string,
  adminId: string,
  teamCount: number,
  requiredVerifierCount: number
): Promise<string> => {
  try {
    // Create a new document reference with an auto-generated ID
    const lotteryRef = doc(collection(db, 'lotteries'));
    
    // Initialize teams with default values
    const teams: Team[] = Array.from({ length: teamCount }, (_, i) => ({
      id: `team-${i + 1}`,
      name: `Team ${i + 1}`,
      email: '',
      rank: i + 1,
      oddsPercentage: 0,
      combinations: []
    }));
    
    // Assign NBA odds to teams
    assignOddsToTeams(teams);
    
    // Create the lottery session
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
    
    // Save to Firestore
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

// Update a team in a lottery session
export const updateTeam = async (
  lotteryId: string,
  teamId: string,
  teamData: Partial<Team>
): Promise<void> => {
  try {
    const lotteryRef = doc(db, 'lotteries', lotteryId);
    const lotterySnap = await getDoc(lotteryRef);
    
    if (lotterySnap.exists()) {
      const lottery = lotterySnap.data() as LotterySession;
      const updatedTeams = lottery.teams.map(team => 
        team.id === teamId ? { ...team, ...teamData } : team
      );
      
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
      
      // Check if this user is already a verifier
      if (lottery.verifiers.some(v => v.userId === verifier.userId)) {
        return false;
      }
      
      // Check if we already have enough verifiers
      if (lottery.verifiers.length >= lottery.requiredVerifierCount) {
        return false;
      }
      
      // Add the verifier
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
    
    // Generate all possible 4-ball combinations (order doesn't matter)
    for (let a = 1; a <= TOTAL_BALLS - 3; a++) {
      for (let b = a + 1; b <= TOTAL_BALLS - 2; b++) {
        for (let c = b + 1; c <= TOTAL_BALLS - 1; c++) {
          for (let d = c + 1; d <= TOTAL_BALLS; d++) {
            // Skip the one combination that's not used (typically 11-12-13-14)
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
    
    // Assign combinations to teams based on their odds
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
    
    // Update the lottery with the generated combinations
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
    
    // Add the new drawn combination
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
    const combinations = lottery.combinations || [];
    
    const draftOrder: DraftPick[] = [];
    
    // Add the first 4 picks from the lottery
    for (let i = 0; i < drawnCombinations.length; i++) {
      const combo = drawnCombinations[i];
      const team = teams.find(t => t.id === combo.teamId);
      
      if (team) {
        draftOrder.push({
          pick: i + 1,
          teamId: team.id,
          teamName: team.name,
          combination: combo
        });
      }
    }
    
    // Determine the remaining picks based on team rankings
    const teamsInRankOrder = [...teams].sort((a, b) => a.rank - b.rank);
    const drawnTeamIds = drawnCombinations.map(combo => combo.teamId);
    const remainingTeams = teamsInRankOrder.filter(team => !drawnTeamIds.includes(team.id));
    
    let pickNumber = drawnCombinations.length + 1;
    remainingTeams.forEach(team => {
      draftOrder.push({
        pick: pickNumber,
        teamId: team.id,
        teamName: team.name,
        combination: null
      });
      pickNumber++;
    });
    
    // Update the lottery with the draft order
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
  // NBA odds distribution (percentages for 14 teams)
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