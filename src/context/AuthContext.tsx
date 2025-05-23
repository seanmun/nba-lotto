// src/context/AuthContext.tsx - Improved version of your existing code
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { User } from '../types';

interface AuthContextProps {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  login: (email: string) => Promise<{ success: boolean, message: string }>;
  register: (email: string, displayName: string) => Promise<{ success: boolean, message: string }>;
  logout: () => Promise<void>;
  completeSignIn: (email: string, url: string) => Promise<FirebaseUser>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Handle sign-in email links
  const completeSignIn = async (email: string, url: string): Promise<FirebaseUser> => {
    try {
      const result = await signInWithEmailLink(auth, email, url);
      
      // IMPROVED: Handle user profile creation after successful sign-in
      if (result.user) {
        const displayName = window.localStorage.getItem('displayNameForSignIn');
        const isRegistration = window.localStorage.getItem('isRegistration') === 'true';
        
        if (isRegistration && displayName) {
          // This is a new registration, create profile with display name
          await createUserProfile(result.user.uid, email, displayName);
        } else {
          // This is a login, just fetch existing profile or create basic one
          await fetchUserProfile(result.user.uid);
        }
      }
      
      return result.user;
    } catch (error) {
      console.error('Error completing sign in:', error);
      throw error;
    }
  };

  // Register new user with email link
  const register = async (email: string, displayName: string): Promise<{ success: boolean, message: string }> => {
    try {
      const actionCodeSettings = {
        url: window.location.origin + '/email-handler',
        handleCodeInApp: true
      };
      
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      
      // Save the email and display name locally for when the user clicks the link
      window.localStorage.setItem('emailForSignIn', email);
      window.localStorage.setItem('displayNameForSignIn', displayName);
      window.localStorage.setItem('isRegistration', 'true');
      
      return { 
        success: true, 
        message: 'Check your email for the sign-in link. Be sure to check your spam folder if you don\'t see it.' 
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  // Login existing user with email link
  const login = async (email: string): Promise<{ success: boolean, message: string }> => {
    try {
      const actionCodeSettings = {
        url: window.location.origin + '/email-handler',
        handleCodeInApp: true
      };
      
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      
      // Save the email locally
      window.localStorage.setItem('emailForSignIn', email);
      window.localStorage.setItem('isRegistration', 'false');
      
      return { 
        success: true, 
        message: 'Check your email for the sign-in link. Be sure to check your spam folder if you don\'t see it.' 
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await signOut(auth);
      // Clear any localStorage items related to authentication
      window.localStorage.removeItem('emailForSignIn');
      window.localStorage.removeItem('displayNameForSignIn');
      window.localStorage.removeItem('isRegistration');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Update user profile
  const updateUserProfile = async (data: Partial<User>) => {
    if (!currentUser) throw new Error('No user logged in');
    
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      // IMPROVED: Add timestamp to updates
      await updateDoc(userRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      if (userProfile) {
        setUserProfile({ ...userProfile, ...data });
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  // Load user profile from Firestore
  const fetchUserProfile = async (userId: string) => {
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const profileData = docSnap.data() as User;
        console.log('Loaded user profile:', profileData); // DEBUG
        setUserProfile(profileData);
      } else {
        console.log('No existing profile, creating new one');
        // Create a basic profile if none exists
        if (currentUser && currentUser.email) {
          const newProfile: User = {
            id: userId,
            email: currentUser.email,
            displayName: currentUser.displayName || currentUser.email.split('@')[0] || 'User'
          };
          
          // IMPROVED: Add timestamps when creating profile
          await setDoc(docRef, {
            ...newProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          
          console.log('Created new user profile:', newProfile); // DEBUG
          setUserProfile(newProfile);
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUserProfile(null);
    }
  };

  // Create a user profile after successful email sign-in
  const createUserProfile = async (userId: string, email: string, displayName: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      
      // Check if user profile already exists
      const docSnap = await getDoc(userRef);
      
      if (!docSnap.exists()) {
        // Create new user profile
        const userProfile: User = {
          id: userId,
          email: email,
          displayName: displayName
        };
        
        // IMPROVED: Add timestamps when creating profile
        await setDoc(userRef, {
          ...userProfile,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        console.log('Created user profile during registration:', userProfile); // DEBUG
        setUserProfile(userProfile);
      } else {
        // Profile exists, just load it
        const existingProfile = docSnap.data() as User;
        console.log('Found existing user profile:', existingProfile); // DEBUG
        setUserProfile(existingProfile);
      }
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user ? `User ${user.email} (${user.uid})` : 'No user'); // DEBUG
      setCurrentUser(user);
      
      if (user) {
        await fetchUserProfile(user.uid);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
    login,
    register,
    logout,
    completeSignIn,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};