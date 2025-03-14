import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);
const API_BASE_URL = 'https://chikoro-ai.com';

// Subscription status constants
const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  GRACE_PERIOD: 'grace_period',
  NONE: 'none'
};

// Free trial constants
const FREE_TRIAL_LIMIT = 5;

// Utility functions for subscription management
const isDateValid = (date) => {
  return date && new Date(date) > new Date();
};

const getSubscriptionStatus = (expiryDate) => {
  if (!expiryDate) return SUBSCRIPTION_STATUS.NONE;
  
  const currentDate = new Date();
  const expirationDate = new Date(expiryDate);
  
  if (expirationDate.getMonth() === 4 && expirationDate.getDate() === 12) {
    const nextMay12 = getNextMay12Expiration();
    return currentDate.getTime() > nextMay12 
      ? SUBSCRIPTION_STATUS.EXPIRED
      : currentDate.getTime() > expirationDate.getTime() 
        ? SUBSCRIPTION_STATUS.GRACE_PERIOD
        : SUBSCRIPTION_STATUS.ACTIVE;
  }
  return isDateValid(expiryDate) 
    ? SUBSCRIPTION_STATUS.ACTIVE
    : SUBSCRIPTION_STATUS.EXPIRED;
};


// Helper function to get next May 12th expiration date
const getNextMay12Expiration = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const may12 = new Date(currentYear, 4, 12);
  return now > may12 ? may12.setFullYear(currentYear + 1) : may12.getTime();
};

export const AuthProvider = ({ children }) => {
  const [state, setState] = useState({
    user: null,
    loading: true,
    error: null,
    paymentStatus: '',
    subscriptionDetails: null,
    hasActiveSubscription: false
  });

  // Enhanced subscription verification
  const verifySubscription = useCallback(async (token, userId) => {
    if (!token || !userId) return false;

    try {
      const response = await axios.get(`${API_BASE_URL}/verify-subscription`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const { subscriptionDetails } = response.data;
      
      if (subscriptionDetails) {
        const subscriptionStatus = getSubscriptionStatus(subscriptionDetails.expiryDate);
        const isActive = [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.GRACE_PERIOD].includes(subscriptionStatus);

        setState(prev => ({
          ...prev,
          subscriptionDetails: {
            ...subscriptionDetails,
            status: subscriptionStatus
          },
          hasActiveSubscription: isActive
        }));

        // Update local storage with verified subscription details
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({
          ...user,
          subscriptionDetails: {
            ...subscriptionDetails,
            lastVerified: new Date().toISOString()
          }
        }));

        return isActive;
      }
      return false;
    } catch (error) {
      console.error('Subscription verification failed:', error);
      return false;
    }
  }, []);

  // Initialize auth state with enhanced subscription checking
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (token && storedUser) {
        try {
          const user = JSON.parse(storedUser);
          const { subscriptionDetails } = user;
          
          // Check if we need to verify subscription with server
          const needsVerification = !subscriptionDetails?.lastVerified || 
            new Date(subscriptionDetails.lastVerified).getTime() + (12 * 60 * 60 * 1000) < Date.now();

          if (needsVerification) {
            await verifySubscription(token, user.id);
          } else {
            const subscriptionStatus = getSubscriptionStatus(subscriptionDetails?.expiryDate);
            setState(prev => ({
              ...prev,
              user,
              subscriptionDetails: {
                ...subscriptionDetails,
                status: subscriptionStatus
              },
              hasActiveSubscription: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.GRACE_PERIOD].includes(subscriptionStatus)
            }));
          }
        } catch (e) {
          console.error('Error initializing auth state:', e);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setState(prev => ({ ...prev, loading: false }));
    };

    initializeAuth();
  }, [verifySubscription]);

  const updateSubscriptionStatus = useCallback(async (expirationDate) => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    const subscriptionDetails = {
      expiryDate: expirationDate,
      startDate: new Date().toISOString(),
      lastVerified: new Date().toISOString(),
      status: getSubscriptionStatus(expirationDate)
    };

    // Update local storage
    localStorage.setItem('user', JSON.stringify({
      ...user,
      subscriptionDetails
    }));

    // Update state
    setState(prev => ({
      ...prev,
      hasActiveSubscription: true,
      subscriptionDetails,
      user: {
        ...prev.user,
        subscriptionDetails
      }
    }));

    // Verify with server
    if (token && user.id) {
      await verifySubscription(token, user.id);
    }
  }, [verifySubscription]);

  const login = useCallback(async (user, token) => {
    const subscriptionStatus = getSubscriptionStatus(user.subscriptionDetails?.expiryDate);
    
    setState(prev => ({ 
      ...prev, 
      user,
      subscriptionDetails: user.subscriptionDetails,
      hasActiveSubscription: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.GRACE_PERIOD].includes(subscriptionStatus)
    }));
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    // Verify subscription after login
    await verifySubscription(token, user.id);
  }, [verifySubscription]);

  const logout = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      user: null,
      hasActiveSubscription: false,
      subscriptionDetails: null
    }));
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  const setPaymentStatus = useCallback((status) => {
    setState(prev => ({ ...prev, paymentStatus: status }));
  }, []);

  const [freeTrialMessages, setFreeTrialMessages] = useState(() => {
    const saved = localStorage.getItem('freeTrialMessages');
    return saved ? parseInt(saved) : 0;
  });

  const incrementTrialMessage = useCallback(() => {
  // Add subscription check
  if (state.hasActiveSubscription) return;

  setFreeTrialMessages(prev => {
    const newCount = prev + 1;
    localStorage.setItem('freeTrialMessages', newCount.toString());
    return newCount;
  });
}, [state.hasActiveSubscription]); // Add dependency

  const resetTrialMessages = useCallback(() => {
    setFreeTrialMessages(0);
    localStorage.removeItem('freeTrialMessages');
  }, []);

  // New function to check if user can send messages
  const canSendMessage = useCallback(() => {
    // Subscribed users can always send messages
    if (state.hasActiveSubscription) {
      return true;
    }
    // Non-subscribed users are limited by free trial count
    return freeTrialMessages < FREE_TRIAL_LIMIT;
  }, [state.hasActiveSubscription, freeTrialMessages]);

  const value = {
    ...state,
    login,
    logout,
    updateSubscriptionStatus,
    setPaymentStatus,
    isAuthenticated: Boolean(state.user),
    token: localStorage.getItem('token'),
    subscriptionStatus: state.subscriptionDetails?.status || SUBSCRIPTION_STATUS.NONE,
    SUBSCRIPTION_STATUS,
    freeTrialMessages,
    incrementTrialMessage,
    resetTrialMessages,
    canSendMessage,
    FREE_TRIAL_LIMIT,
shouldShowPaymentPrompt: () => {
    return state.user && 
           !state.hasActiveSubscription && 
           freeTrialMessages >= 5;
  }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
