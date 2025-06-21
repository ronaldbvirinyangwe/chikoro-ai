import React, { createContext, useState, useContext, useCallback, useEffect, useMemo } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { parseISO, isValid } from 'date-fns'; // Import functions from the library

// --- CONFIGURATION & UTILITIES ---
const AUTH_API_BASE_URL = import.meta.env.REACT_APP_API_URL || 'https://lsdl9qdylhle6t-8080.proxy.runpod.net';
const AuthContext = createContext(null);

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  GRACE_PERIOD: 'grace_period',
  NONE: 'none'
};

/**
 * Reliably determines the subscription status from an ISO date string.
 * @param {string | null} expiryDateString - The date string from the backend.
 * @returns {string} - The subscription status.
 */
const getSubscriptionStatus = (expiryDateString) => {
  if (!expiryDateString) return SUBSCRIPTION_STATUS.NONE;

  console.log("Raw expiration date string from API:", expiryDateString);

  // Use parseISO to reliably convert the string from the backend
  const expirationDate = parseISO(expiryDateString);

 console.log("Parsed date object:", expirationDate);
 
  // Also check if the resulting date is valid before comparing
  if (!isValid(expirationDate)) {
    console.error("Failed to parse expiration date:", expiryDateString);
    return SUBSCRIPTION_STATUS.NONE;
  }

  const currentDate = new Date();
  return expirationDate > currentDate ? SUBSCRIPTION_STATUS.ACTIVE : SUBSCRIPTION_STATUS.EXPIRED;
};


// --- THE MAIN PROVIDER COMPONENT ---
export const AuthProvider = ({ children }) => {
  const [state, setState] = useState({
    user: null,
    student: null,
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken'),
    loading: true, // Start as true
    error: null,
    subscriptionDetails: null,
    hasActiveSubscription: false,
    isAuthenticated: false,
  });

  const axiosInstance = useMemo(() => axios.create({ baseURL: AUTH_API_BASE_URL }), []);

  const logout = useCallback(() => {
    console.log("AuthContext: Logging out.");
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('studentId');
    // Reset state to its initial, clean values, ensuring loading is false
    setState({
      user: null, student: null, accessToken: null, refreshToken: null,
      loading: false, error: null, subscriptionDetails: null,
      hasActiveSubscription: false, isAuthenticated: false,
    });
  }, []);

  const fetchAuthenticatedUser = useCallback(async (tokenToUse) => {
    if (!tokenToUse) {
      return { success: false };
    }
    try {
      const response = await axiosInstance.get(`/api/me`, { headers: { Authorization: `Bearer ${tokenToUse}` } });
      const user = response.data.user;
      if (!user) throw new Error("No user returned from /api/me.");

      let studentProfile = null;
      let finalSubDetails = null;
      let finalHasActiveSub = false;

      if (user.email) {
        try {
          const studentResponse = await axiosInstance.get(`/api/v1/students/by-email/${user.email}`, { headers: { Authorization: `Bearer ${tokenToUse}` } });
          studentProfile = studentResponse.data;

          if (studentProfile && studentProfile.subscription) {
            finalSubDetails = studentProfile.subscription;
            const derivedSubStatus = getSubscriptionStatus(finalSubDetails.expirationDate);
            finalHasActiveSub = [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.GRACE_PERIOD].includes(derivedSubStatus);
          }
          if (studentProfile) {
            localStorage.setItem('studentId', studentProfile._id);
          }
        } catch (studentError) {
          if (studentError.response && studentError.response.status === 404) {
            console.warn("AuthContext: User is authenticated but no student profile was found.");
          } else {
            console.error("AuthContext: Error fetching student profile:", studentError);
          }
        }
      }
      
      // Return the complete new state to be set by the caller
      return {
        success: true,
        user,
        student: studentProfile,
        accessToken: tokenToUse,
        isAuthenticated: true,
        subscriptionDetails: finalSubDetails,
        hasActiveSubscription: finalHasActiveSub,
      };

    } catch (error) {
      console.error("AuthContext: Critical error fetching user data.", error);
      return { success: false };
    }
  }, [axiosInstance]);

  const login = useCallback(async (email, password) => {
    try {
      // Use the memoized axiosInstance for consistency
      const response = await axiosInstance.post(`/api/auth`, { email, password });
      const { accessToken, refreshToken } = response.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      const result = await fetchAuthenticatedUser(accessToken);

      if (result.success) {
        // Set the state with the returned data from the successful fetch
        setState(prevState => ({ ...prevState, ...result, loading: false }));
        return { success: true };
      } else {
        logout(); // If fetching user data fails even after getting tokens, logout to be safe
        return { success: false, error: 'Login successful, but failed to fetch user profile.' };
      }

    } catch (error) {
      console.error('AuthContext: Login failed:', error);
      return { success: false, error: error.response?.data?.message || 'Login failed.' };
    }
  }, [axiosInstance, fetchAuthenticatedUser, logout]);


  // --- Initialization Effect ---
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        const result = await fetchAuthenticatedUser(token);
        if (result.success) {
          // Set state once with all data and set loading to false
          setState(prevState => ({ ...prevState, ...result, loading: false }));
        } else {
          logout(); // This will clear tokens and set loading to false
        }
      } else {
        // If there's no token, just stop loading
        setState(prevState => ({ ...prevState, loading: false }));
      }
    };
    initializeAuth();
  }, [fetchAuthenticatedUser, logout]); // The dependency array is correct

const updateSubscriptionStatus = useCallback(async () => {
    const result = await fetchAuthenticatedUser(state.accessToken);
    if (result.success) {
        const hasActive = result.subscriptionDetails &&
            [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.GRACE_PERIOD].includes(
                getSubscriptionStatus(result.subscriptionDetails.expirationDate)
            );
        
        setState(prevState => ({
            ...prevState,
            ...result,
            hasActiveSubscription: hasActive,  // explicitly update
        }));
    }
}, [state.accessToken, fetchAuthenticatedUser]);

  const value = {
    ...state,
    token: state.accessToken,
    login,
    logout,
    updateSubscriptionStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {state.loading ? <div>Loading...</div> : children}
    </AuthContext.Provider>
  );
};

// --- The custom hook used by components to access the context ---
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
