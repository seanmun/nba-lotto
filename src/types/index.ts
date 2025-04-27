// src/types/index.ts

// User
export interface User {
    id: string;
    email: string;
    displayName: string;
  }
  
  // Team in the lottery
  export interface Team {
    id: string;
    name: string;
    email: string;
    rank: number;
    oddsPercentage: number;
    combinations: string[];
  }
  
  // Lottery combination
  export interface LotteryCombination {
    id: number;
    balls: number[];
    teamId: string;
  }
  
  // Draft pick in the final order
  export interface DraftPick {
    pick: number;
    teamId: string;
    teamName: string;
    combination: LotteryCombination | null;
  }
  
  // Verifier for the lottery
  export interface Verifier {
    userId: string;
    name: string;
    email: string;
    timestamp: number;
  }
  
  // Lottery session
  export interface LotterySession {
    id: string;
    name: string;
    adminId: string;
    teamCount: number;
    requiredVerifierCount: number;
    verifiers: Verifier[];
    status: 'setup' | 'verification' | 'drawing' | 'reveal' | 'complete';
    teams: Team[];
    combinations?: LotteryCombination[];
    drawnCombinations?: LotteryCombination[];
    draftOrder?: DraftPick[];
    createdAt: number;
    updatedAt: number;
  }