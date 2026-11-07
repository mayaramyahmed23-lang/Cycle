import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  updatePassword as fbUpdatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, OrganizationProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | any | null;
  userProfile: UserProfile | OrganizationProfile | null;
  userRole: UserRole | null;
  loading: boolean;
  isAdmin: boolean;
  isIndividual: boolean;
  isOrganization: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: (preferredRole?: UserRole) => Promise<void>;
  registerIndividual: (data: {
    email: string;
    password: string;
    name: string;
    phone: string;
    location: string;
    photoURL?: string;
  }) => Promise<void>;
  registerOrganization: (data: {
    email: string;
    password: string;
    name: string;
    orgType: any;
    phone: string;
    location: string;
    description: string;
    logoURL?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile | OrganizationProfile>) => Promise<void>;
  changePassword: (newPassword: string, oldPassword?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_SESSION_KEY = 'cycle_simulated_user';

export const isSystemAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  return (
    lower === 'contact.cycle.eg@gmail.com' ||
    lower === 'mayaramyahmed23@gmail.com'
  );
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | OrganizationProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync auth state with Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
        setCurrentUser(fbUser);
        try {
          // Check users collection first (Individuals & Admins)
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            const data = userSnap.data() as UserProfile;
            // Elevate admin if email matches admin list
            if (isSystemAdminEmail(fbUser.email) && data.role !== 'admin') {
              const updatedData: UserProfile = { ...data, role: 'admin' };
              await updateDoc(userDocRef, { role: 'admin' });
              setUserProfile(updatedData);
            } else {
              setUserProfile(data);
            }
          } else {
            // Check organizations collection
            const orgDocRef = doc(db, 'organizations', fbUser.uid);
            const orgSnap = await getDoc(orgDocRef);

            if (orgSnap.exists()) {
              setUserProfile(orgSnap.data() as OrganizationProfile);
            } else {
              console.log('Profile document not found yet in onAuthStateChanged; waiting for profile creation.');
            }
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
        setCurrentUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (preferredRole: UserRole = 'individual') => {
    localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
    if (auth.currentUser) {
      try {
        await signOut(auth);
      } catch (e) {
        console.warn('Signout prior to Google login error:', e);
      }
      setCurrentUser(null);
      setUserProfile(null);
    }
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    const fbUser = cred.user;

    // Check users collection first
    const userDocRef = doc(db, 'users', fbUser.uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      const data = userSnap.data() as UserProfile;
      if (isSystemAdminEmail(fbUser.email) && data.role !== 'admin') {
        const updated = { ...data, role: 'admin' as const };
        await updateDoc(userDocRef, { role: 'admin' });
        setUserProfile(updated);
      } else {
        setUserProfile(data);
      }
      return;
    }

    // Check organizations collection
    const orgDocRef = doc(db, 'organizations', fbUser.uid);
    const orgSnap = await getDoc(orgDocRef);

    if (orgSnap.exists()) {
      setUserProfile(orgSnap.data() as OrganizationProfile);
      return;
    }

    // New profile creation
    const isAdminEmail = isSystemAdminEmail(fbUser.email);
    const assignedRole: UserRole = isAdminEmail ? 'admin' : (preferredRole === 'organization' ? 'organization' : 'individual');

    if (assignedRole === 'organization') {
      const orgProfile: OrganizationProfile = {
        uid: fbUser.uid,
        email: fbUser.email || '',
        name: fbUser.displayName || 'Eco Partner Org',
        role: 'organization',
        orgType: 'Recycler',
        phone: fbUser.phoneNumber || '',
        location: 'Local',
        description: 'Joined via Google Sign-In',
        logoURL: fbUser.photoURL || '',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await setDoc(orgDocRef, orgProfile);
      setUserProfile(orgProfile);
    } else {
      const userProfile: UserProfile = {
        uid: fbUser.uid,
        email: fbUser.email || '',
        name: fbUser.displayName || (isAdminEmail ? 'System Administrator' : 'User'),
        role: assignedRole,
        phone: fbUser.phoneNumber || '',
        location: 'Local',
        photoURL: fbUser.photoURL || '',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await setDoc(userDocRef, userProfile);
      setUserProfile(userProfile);
    }
  };

  const login = async (email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();
    localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);

    // Terminate any existing session before attempting new login to prevent session reuse
    if (auth.currentUser) {
      try {
        await signOut(auth);
      } catch (e) {
        console.warn('Signout prior to login error:', e);
      }
      setCurrentUser(null);
      setUserProfile(null);
    }

    // Strictly authenticate with Firebase Auth. Never catch and bypass failed credentials.
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    const fbUser = cred.user;
    
    // Fetch profile
    const userDocRef = doc(db, 'users', fbUser.uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      const data = userSnap.data() as UserProfile;
      if (isSystemAdminEmail(fbUser.email) && data.role !== 'admin') {
        const updated = { ...data, role: 'admin' as const };
        await updateDoc(userDocRef, { role: 'admin' });
        setUserProfile(updated);
      } else {
        setUserProfile(data);
      }
      return;
    }

    const orgDocRef = doc(db, 'organizations', fbUser.uid);
    const orgSnap = await getDoc(orgDocRef);

    if (orgSnap.exists()) {
      setUserProfile(orgSnap.data() as OrganizationProfile);
      return;
    }

    // Auto provision admin if authenticated admin email
    const isAdminEmail = isSystemAdminEmail(fbUser.email);
    const fallbackProfile: UserProfile = {
      uid: fbUser.uid,
      email: fbUser.email || cleanEmail,
      name: fbUser.displayName || (isAdminEmail ? 'System Admin' : cleanEmail.split('@')[0]),
      role: isAdminEmail ? 'admin' : 'individual',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(userDocRef, fallbackProfile);
    setUserProfile(fallbackProfile);
  };

  const registerIndividual = async (data: {
    email: string;
    password: string;
    name: string;
    phone: string;
    location: string;
    photoURL?: string;
  }) => {
    const cleanEmail = data.email.trim().toLowerCase();
    localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
    if (auth.currentUser) {
      try {
        await signOut(auth);
      } catch (e) {
        console.warn('Signout prior to registration error:', e);
      }
      setCurrentUser(null);
      setUserProfile(null);
    }
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, data.password);
    const uid = cred.user.uid;

    if (data.name || data.photoURL) {
      await updateProfile(cred.user, {
        displayName: data.name,
        photoURL: data.photoURL || ''
      });
    }

    const isAdminEmail = isSystemAdminEmail(cleanEmail);
    const profile: UserProfile = {
      uid,
      email: cleanEmail,
      name: data.name,
      role: isAdminEmail ? 'admin' : 'individual',
      phone: data.phone,
      location: data.location,
      photoURL: data.photoURL || '',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'users', uid), profile);
    setUserProfile(profile);
  };

  const registerOrganization = async (data: {
    email: string;
    password: string;
    name: string;
    orgType: any;
    phone: string;
    location: string;
    description: string;
    logoURL?: string;
  }) => {
    const cleanEmail = data.email.trim().toLowerCase();
    localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
    if (auth.currentUser) {
      try {
        await signOut(auth);
      } catch (e) {
        console.warn('Signout prior to org registration error:', e);
      }
      setCurrentUser(null);
      setUserProfile(null);
    }
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, data.password);
    const uid = cred.user.uid;

    if (data.name || data.logoURL) {
      await updateProfile(cred.user, {
        displayName: data.name,
        photoURL: data.logoURL || ''
      });
    }

    const profile: OrganizationProfile = {
      uid,
      email: cleanEmail,
      name: data.name,
      role: 'organization',
      orgType: data.orgType,
      phone: data.phone,
      location: data.location,
      description: data.description,
      logoURL: data.logoURL || '',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'organizations', uid), profile);
    setUserProfile(profile);
  };

  const logout = async () => {
    localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    setCurrentUser(null);
    setUserProfile(null);
  };

  const updateUserProfile = async (data: Partial<UserProfile | OrganizationProfile>) => {
    if (!currentUser || !userProfile) return;
    const isOrg = userProfile.role === 'organization';
    const collectionName = isOrg ? 'organizations' : 'users';
    
    const updated = {
      ...data,
      updatedAt: new Date().toISOString()
    };

    await updateDoc(doc(db, collectionName, currentUser.uid), updated);
    const merged = { ...userProfile, ...updated };
    setUserProfile(merged as any);

    if (data.name && currentUser) {
      try {
        await updateProfile(currentUser, { displayName: data.name });
      } catch (e) {
        console.warn('Could not update Firebase display name:', e);
      }
    }
  };

  const changePassword = async (newPassword: string, oldPassword?: string) => {
    if (!currentUser) throw new Error('No user authenticated');

    if (oldPassword && currentUser.email) {
      const cred = EmailAuthProvider.credential(currentUser.email, oldPassword);
      await reauthenticateWithCredential(currentUser, cred);
    }
    
    await fbUpdatePassword(currentUser, newPassword);
  };

  const userRole: UserRole | null = userProfile?.role || null;
  const isAdmin = Boolean(
    currentUser &&
    currentUser.email &&
    isSystemAdminEmail(currentUser.email) &&
    userRole === 'admin'
  );
  const isIndividual = userRole === 'individual';
  const isOrganization = userRole === 'organization';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        userRole,
        loading,
        isAdmin,
        isIndividual,
        isOrganization,
        login,
        loginWithGoogle,
        registerIndividual,
        registerOrganization,
        logout,
        updateUserProfile,
        changePassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


