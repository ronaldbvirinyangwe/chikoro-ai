import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const AUTH_API_BASE_URL = import.meta.env.REACT_APP_API_URL || 'https://atqtuew6syxese-8080.proxy.runpod.net';

const AuthContext = createContext(null);

const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  GRACE_PERIOD: 'grace_period',
  NONE: 'none'
};

const FREE_TRIAL_LIMIT = 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const WARNING_THRESHOLD_MS = 7 * ONE_DAY_MS;

// --- Utility Functions (defined outside component, no dependencies on component scope) ---
const isDateValid = (date) => {
  const expiry = new Date(date);
  return date && expiry > new Date();
};

const getNextMay12Expiration = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const may12 = new Date(currentYear, 4, 12);
  if (now > may12) {
    may12.setFullYear(currentYear + 1);
  }
  return may12.getTime();
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
  return isDateValid(expiryDate) ? SUBSCRIPTION_STATUS.ACTIVE : SUBSCRIPTION_STATUS.EXPIRED;
};


export const AuthProvider = ({ children }) => {
  const [state, setState] = useState({
    user: null,
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken'),
    loading: true,
    error: null,
    paymentStatus: '', // For PaymentPage UI flow (e.g., 'initiated')
    subscriptionDetails: null, // Canonical subscription info from /api/me
    hasActiveSubscription: false, // Derived from subscriptionDetails
    freeTrialMessages: 0,
    detailedPaymentCheck: { // For the specific /payment-status/:studentId check
      status: null, // e.g., 'active', 'expired', 'expiringSoon', 'notPaid', 'errorChecking', 'authMissing'
      message: '',
      daysLeft: null,
      plan: null,
      expirationDate: null,
      isLoading: false,
      lastChecked: null,
    },
    isAuthenticated: false, // Explicit isAuthenticated flag
  });

  const axiosInstance = React.useMemo(() => axios.create({ // Use useMemo for stable instance
    baseURL: AUTH_API_BASE_URL,
  }), []);


  // --- START: Callback Function Definitions ---
  // Moved all useCallback definitions before useEffect hooks that use them.

  const fetchAuthenticatedUser = useCallback(async (tokenToUse) => {
    if (!tokenToUse) {
      console.warn("AuthContext: fetchAuthenticatedUser called without a token.");
      setState(prevState => ({
        ...prevState,
        user: null,
        isAuthenticated: false,
        subscriptionDetails: null,
        hasActiveSubscription: false,
      }));
      return null;
    }
    try {
      const response = await axiosInstance.get(`/api/me`, {
        headers: { Authorization: `Bearer ${tokenToUse}` }
      });
      const user = response.data.user;
      const userSubscription = user?.subscription || null;
      const derivedSubStatus = getSubscriptionStatus(userSubscription?.expirationDate);

      setState(prevState => ({
        ...prevState,
        user: user,
        accessToken: tokenToUse, // Ensure accessToken in state is also updated if refreshed
        isAuthenticated: true,
        subscriptionDetails: userSubscription,
        hasActiveSubscription: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.GRACE_PERIOD].includes(derivedSubStatus),
        freeTrialMessages: user?.trial_messages_used || 0,
        error: null,
      }));
      console.log("AuthContext: Authenticated user data fetched:", user);
      return user;
    } catch (error) {
      console.error("AuthContext: Failed to fetch authenticated user data:", error);
      setState(prevState => ({
        ...prevState,
        user: null,
        // Do not nullify accessToken here if refresh might still be possible or if error is temporary
        // Let the interceptor or initialization logic handle full logout on critical auth errors
        isAuthenticated: false,
        subscriptionDetails: null,
        hasActiveSubscription: false,
        error: error.response?.data?.message || "Failed to fetch user data.",
      }));
      // If this error means the token is definitively invalid, then clear it:
      // localStorage.removeItem('accessToken');
      // localStorage.removeItem('refreshToken');
      return null;
    }
  }, [axiosInstance]); // Removed getSubscriptionStatus and SUBSCRIPTION_STATUS as they are stable module-level utilities

  const checkAndProcessGradeProgression = useCallback(async (token, studentIdForProgression) => {
    if (!token || !studentIdForProgression) {
      console.log("AuthContext.checkGradeProgression: Missing token or studentId.");
      return false;
    }
    const currentGradeStr = localStorage.getItem('studentGrade');
    const currentLevelStr = localStorage.getItem('studentAcademicLevel');
    const lastPromotionDateStr = localStorage.getItem('lastPromotionDate');

    if (!currentGradeStr || !currentLevelStr || !lastPromotionDateStr) {
      console.warn("AuthContext.checkGradeProgression: Missing data for progression check.");
      return false;
    }
    const lastPromotionDate = new Date(lastPromotionDateStr);
    const currentDate = new Date();
    const gradeOptions = {
      primary: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7'],
      secondary: ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6'],
    };
    const promotionYear = lastPromotionDate.getFullYear() + 1;
    const promotionEffectiveDate = new Date(promotionYear, 0, 1);

    if (currentDate < promotionEffectiveDate) {
      console.log(`AuthContext.checkGradeProgression: Not yet time for promotion. Next check after ${promotionEffectiveDate.toDateString()}`);
      return false;
    }
    console.log("AuthContext.checkGradeProgression: Checking for promotion...");
    let newGrade = currentGradeStr;
    let newLevel = currentLevelStr;
    let needsUpdate = false;
    const currentLevelGrades = gradeOptions[currentLevelStr.toLowerCase()];

    if (!currentLevelGrades) {
      console.error(`AuthContext.checkGradeProgression: Unknown academic level "${currentLevelStr}".`);
      return false;
    }
    const currentIndex = currentLevelGrades.indexOf(currentGradeStr);
    if (currentIndex === -1) {
      console.error(`AuthContext.checkGradeProgression: Grade "${currentGradeStr}" not found in level "${currentLevelStr}".`);
      return false;
    }
    if (currentIndex < currentLevelGrades.length - 1) {
      newGrade = currentLevelGrades[currentIndex + 1];
      needsUpdate = true;
    } else if (currentLevelStr === 'primary') {
      newLevel = 'secondary';
      if (gradeOptions.secondary?.length > 0) {
        newGrade = gradeOptions.secondary[0];
        needsUpdate = true;
      } else { needsUpdate = false; }
    } else if (currentLevelStr === 'secondary') {
      console.log("AuthContext.checkGradeProgression: Completed Secondary School.");
      needsUpdate = false;
    }

    if (needsUpdate) {
      try {
        console.log(`AuthContext.checkGradeProgression: Attempting to promote student ${studentIdForProgression} to ${newGrade} (${newLevel}).`);
        // Use axiosInstance for consistency if preferred, or global axios if it's fine
        const response = await axios.put( // Changed to global axios as per original, ensure it's intended
          `${AUTH_API_BASE_URL}/students/${studentIdForProgression}/grade-progression`,
          { grade: newGrade, academicLevel: newLevel, lastPromotionDate: currentDate.toISOString() },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.status === 200 || response.status === 204) {
          localStorage.setItem('studentGrade', newGrade);
          localStorage.setItem('studentAcademicLevel', newLevel);
          localStorage.setItem('lastPromotionDate', currentDate.toISOString());
          console.log(`AuthContext.checkGradeProgression: Student ${studentIdForProgression} successfully promoted to ${newGrade} (${newLevel}).`);
          alert(`Congratulations! You have been promoted to ${newLevel === currentLevelStr ? newGrade : `${newLevel}, ${newGrade}`}.`);
          if (newLevel !== currentLevelStr) window.location.reload();
          return true;
        } else {
          console.error("AuthContext.checkGradeProgression: Backend update failed:", response.data || response.status);
          return false;
        }
      } catch (error) {
        console.error("AuthContext.checkGradeProgression: API error:", error.response?.data || error.message);
        return false;
      }
    }
    return false;
  }, []); // Assuming AUTH_API_BASE_URL is stable. If axiosInstance is used, add it.

  const fetchDetailedPaymentStatus = useCallback(async (tokenToUse) => {
    const studentId = localStorage.getItem('studentId');
    if (!tokenToUse || !studentId) {
      console.warn('AuthContext.fetchDetailedPaymentStatus: Token or StudentID missing.');
      setState(prevState => ({
        ...prevState,
        detailedPaymentCheck: {
          ...prevState.detailedPaymentCheck,
          status: 'authMissing', message: 'Authentication details missing for payment check.',
          isLoading: false, lastChecked: new Date().toISOString(),
        }
      }));
      return;
    }
    setState(prevState => ({
      ...prevState,
      detailedPaymentCheck: { ...prevState.detailedPaymentCheck, isLoading: true, message: '', status: null }
    }));
    try {
      const response = await axiosInstance.get(`/payment-status/${studentId}`, {
        headers: { Authorization: `Bearer ${tokenToUse}` }, // Pass token explicitly
        timeout: 10000,
      });
      const newDetailedInfo = {
        isLoading: false, status: null, message: '', daysLeft: null,
        plan: null, expirationDate: null, lastChecked: new Date().toISOString(),
      };
      if (response.data && response.data.paymentToken) {
        const { status: paymentTokenStatus, expirationDate: ptExpirationDate, plan: ptPlan } = response.data.paymentToken;
        const currentDate = new Date().getTime();
        newDetailedInfo.plan = ptPlan;
        newDetailedInfo.expirationDate = ptExpirationDate;
        if (currentDate >= new Date(ptExpirationDate).getTime()) {
          newDetailedInfo.status = 'expired';
          newDetailedInfo.message = 'Subscription appears expired based on payment token.';
        } else if (currentDate > new Date(ptExpirationDate).getTime() - WARNING_THRESHOLD_MS) {
          newDetailedInfo.status = 'expiringSoon';
          newDetailedInfo.daysLeft = Math.ceil((new Date(ptExpirationDate).getTime() - currentDate) / ONE_DAY_MS);
          newDetailedInfo.message = `Subscription expiring in ${newDetailedInfo.daysLeft} days.`;
        } else {
          newDetailedInfo.status = paymentTokenStatus === 'paid' ? 'active' : paymentTokenStatus;
          newDetailedInfo.message = `Subscription is ${newDetailedInfo.status}.`;
        }
      } else {
        newDetailedInfo.status = 'notPaid';
        newDetailedInfo.message = 'No specific payment record found.';
      }
      setState(prevState => ({ ...prevState, detailedPaymentCheck: newDetailedInfo }));
    } catch (error) {
      console.error('AuthContext.fetchDetailedPaymentStatus: Error:', error);
      setState(prevState => ({
        ...prevState,
        detailedPaymentCheck: {
          isLoading: false, status: 'errorChecking', message: error.response?.data?.error || 'Error checking payment status.',
          daysLeft: null, plan: null, expirationDate: null, lastChecked: new Date().toISOString(),
        }
      }));
    }
  }, [axiosInstance]); // Dependencies: axiosInstance. ONE_DAY_MS, WARNING_THRESHOLD_MS are module constants.

  const login = useCallback(async (email, password) => {
    try {
      const response = await axios.post(`${AUTH_API_BASE_URL}/api/auth`, { email, password });
      const { accessToken, refreshToken, user: loginUserResponse } = response.data; // loginUserResponse might differ from full user object
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      // Fetch full user details to get canonical subscription status
      const fetchedUser = await fetchAuthenticatedUser(accessToken);
      if (fetchedUser) {
          // Optional: merge loginUserResponse specific details if needed, though fetchAuthenticatedUser is primary
          console.log("AuthContext: Login successful. Tokens and user data stored.");
          return { success: true, user: fetchedUser };
      } else {
          // This case means login was successful (tokens received) but fetching user details failed.
          // It's an intermediate state, tokens are stored but user context might be incomplete.
          // The initializeAuth on next load would try to resolve this.
          // For now, treat as login success with a potential follow-up issue.
          console.warn("AuthContext: Login token received, but failed to fetch full user details post-login.");
          setState(prevState => ({...prevState, accessToken, refreshToken, isAuthenticated: true, error: "Logged in, but failed to fetch full user profile."}));
          return { success: true, error: "Logged in, but failed to fetch full user profile." };
      }
    } catch (error) {
      console.error('AuthContext: Login failed:', error);
      const errorMessage = error.response?.data?.message || 'Login failed. Please check your credentials.';
      setState(prevState => ({
        ...prevState, user: null, accessToken: null, refreshToken: null, isAuthenticated: false, error: errorMessage,
        subscriptionDetails: null, hasActiveSubscription: false, freeTrialMessages: 0,
      }));
      return { success: false, error: errorMessage };
    }
  }, [fetchAuthenticatedUser]); // AUTH_API_BASE_URL is stable

  const logout = useCallback(() => {
    console.log("AuthContext: Logging out.");
    // Optional: Call backend logout endpoint to invalidate refresh token server-side
    // if (state.refreshToken) {
    //   axiosInstance.post(`/api/auth/logout`, { refreshToken: state.refreshToken }).catch(err => console.error("Logout API call failed", err));
    // }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('studentId');
    localStorage.removeItem('studentGrade');
    localStorage.removeItem('studentAcademicLevel');
    localStorage.removeItem('lastPromotionDate');
    localStorage.removeItem('studentName');

    setState({ // Reset to initial-like state
      user: null, accessToken: null, refreshToken: null, loading: false, error: null,
      paymentStatus: '', subscriptionDetails: null, hasActiveSubscription: false,
      freeTrialMessages: 0, isAuthenticated: false,
      detailedPaymentCheck: {
        status: null, message: '', daysLeft: null, plan: null,
        expirationDate: null, isLoading: false, lastChecked: null,
      },
    });
  }, [/* state.refreshToken, axiosInstance if backend logout is used */]);

  const updateSubscriptionStatus = useCallback(async () => {
    if (state.accessToken) {
      console.log("AuthContext: Triggering subscription status refresh...");
      await fetchAuthenticatedUser(state.accessToken);
      await fetchDetailedPaymentStatus(state.accessToken); // Also refresh detailed check
    } else {
      console.warn("AuthContext: Cannot update subscription, no access token.");
    }
  }, [fetchAuthenticatedUser, fetchDetailedPaymentStatus, state.accessToken]);

  const incrementTrialMessage = useCallback(async () => {
    if (!state.isAuthenticated || state.hasActiveSubscription) return;
    if (state.freeTrialMessages >= FREE_TRIAL_LIMIT) return;
    try {
      const response = await axiosInstance.post(`/user/increment-trial`);
      setState(prevState => ({ ...prevState, freeTrialMessages: response.data.newTrialCount }));
    } catch (error) { console.error("AuthContext: Failed to increment trial message count:", error); }
  }, [state.isAuthenticated, state.hasActiveSubscription, state.freeTrialMessages, axiosInstance]);

  const resetTrialMessages = useCallback(async () => {
    if (!state.isAuthenticated) return;
    try {
      await axiosInstance.post(`/user/reset-trial`);
      setState(prevState => ({ ...prevState, freeTrialMessages: 0 }));
    } catch (error) { console.error("AuthContext: Failed to reset trial message count:", error); }
  }, [state.isAuthenticated, axiosInstance]);

  const canSendMessage = useCallback(() => {
    if (state.hasActiveSubscription) return true;
    return state.freeTrialMessages < FREE_TRIAL_LIMIT;
  }, [state.hasActiveSubscription, state.freeTrialMessages]);

  // --- END: Callback Function Definitions ---


  // --- START: useEffect Hooks ---

  // Axios Request Interceptor Setup
  useEffect(() => {
    const reqInterceptor = axiosInstance.interceptors.request.use(
      async (config) => {
        // Use a fresh token from state for each request, not the one captured at interceptor setup time
        const currentToken = state.accessToken; // Get current token from state
        const currentRefreshToken = state.refreshToken;

        if (currentToken) {
          config.headers['Authorization'] = `Bearer ${currentToken}`;
          try {
            const decodedToken = jwtDecode(currentToken);
            const currentTime = Date.now() / 1000;
            if (decodedToken.exp < currentTime && currentRefreshToken) {
              console.log("AuthContext Interceptor: Access token expired. Attempting refresh...");
              try {
                const refreshResponse = await axios.post(`${AUTH_API_BASE_URL}/api/auth/refresh`, { refreshToken: currentRefreshToken });
                const newAccessToken = refreshResponse.data.accessToken;
                const newRefreshToken = refreshResponse.data.refreshToken;
                localStorage.setItem('accessToken', newAccessToken);
                localStorage.setItem('refreshToken', newRefreshToken);
                setState(prevState => ({ ...prevState, accessToken: newAccessToken, refreshToken: newRefreshToken }));
                config.headers['Authorization'] = `Bearer ${newAccessToken}`;
                console.log("AuthContext Interceptor: Token refreshed successfully.");
              } catch (refreshError) {
                console.error("AuthContext Interceptor: Failed to refresh token:", refreshError);
                logout(); // Perform a full logout if refresh fails
                return Promise.reject(refreshError);
              }
            }
          } catch (decodeError) {
            console.error("AuthContext Interceptor: Error decoding access token:", decodeError);
            logout(); // Perform a full logout if token is invalid
            return Promise.reject(decodeError);
          }
        }
        return config;
      }, (error) => Promise.reject(error)
    );
    // Cleanup function
    return () => {
      axiosInstance.interceptors.request.eject(reqInterceptor);
    };
  }, [state.accessToken, state.refreshToken, axiosInstance, logout]); // Added logout to dependencies for cleanup path

  // Main Initialization Effect
  useEffect(() => {
    const initializeAuth = async () => {
      setState(prevState => ({ ...prevState, loading: true }));
      let currentAccessToken = localStorage.getItem('accessToken');
      const currentRefreshToken = localStorage.getItem('refreshToken');

      if (currentAccessToken) {
        try {
          const decodedToken = jwtDecode(currentAccessToken);
          const currentTime = Date.now() / 1000;
          if (decodedToken.exp < currentTime) {
            console.log("AuthContext Initialize: Access token expired. Attempting refresh...");
            if (currentRefreshToken) {
              try {
                const refreshResponse = await axios.post(`${AUTH_API_BASE_URL}/api/auth/refresh`, { refreshToken: currentRefreshToken });
                currentAccessToken = refreshResponse.data.accessToken;
                const newRefreshToken = refreshResponse.data.refreshToken;
                localStorage.setItem('accessToken', currentAccessToken);
                localStorage.setItem('refreshToken', newRefreshToken);
                // Update state with new tokens BEFORE calling functions that might rely on up-to-date state.accessToken
                setState(prevState => ({ ...prevState, accessToken: currentAccessToken, refreshToken: newRefreshToken }));
                console.log("AuthContext Initialize: Token refreshed successfully.");
              } catch (refreshError) {
                console.error("AuthContext Initialize: Failed to refresh token:", refreshError);
                logout(); // Clears tokens and state
                currentAccessToken = null; // Ensure it's null for logic below
              }
            } else {
              console.log("AuthContext Initialize: No refresh token, clearing expired access token.");
              logout(); currentAccessToken = null;
            }
          }
        } catch (decodeError) {
          console.error("AuthContext Initialize: Error decoding token:", decodeError);
          logout(); currentAccessToken = null;
        }
      }

      if (currentAccessToken) {
        // If token was just refreshed, setState above updated it.
        // If it was already valid, it's currentAccessToken.
        // Ensure state.accessToken is current if fetchAuthenticatedUser relies on it,
        // or pass currentAccessToken directly.
        if (state.accessToken !== currentAccessToken) {
            // This ensures state.accessToken is the most current one if a refresh happened
             setState(prevState => ({ ...prevState, accessToken: currentAccessToken }));
        }

        await fetchAuthenticatedUser(currentAccessToken);
        await fetchDetailedPaymentStatus(currentAccessToken);
        const studentId = localStorage.getItem('studentId');
        if (studentId) {
          await checkAndProcessGradeProgression(currentAccessToken, studentId);
        }
         // Ensure isAuthenticated is true if we have a token and successfully fetched user
        setState(prevState => ({...prevState, isAuthenticated: !!prevState.user }));

      } else {
        // No valid token found or refresh failed
        setState(prevState => ({ ...prevState, isAuthenticated: false, loading: false }));
        // logout() might have already set loading to false if called, ensure consistency
      }
      // Ensure loading is set to false at the very end of all paths
      setState(prevState => ({ ...prevState, loading: false }));
    };
    initializeAuth();
  }, [fetchAuthenticatedUser, fetchDetailedPaymentStatus, checkAndProcessGradeProgression, logout, axiosInstance]); // Added logout and axiosInstance to deps

  // --- END: useEffect Hooks ---

  const value = {
    ...state, // Includes detailedPaymentCheck, isAuthenticated, etc.
    token: state.accessToken,
    login,
    logout,
    updateSubscriptionStatus,
    incrementTrialMessage,
    resetTrialMessages,
    canSendMessage,
    setPaymentStatus: (status) => setState(prevState => ({ ...prevState, paymentStatus: status })),
    SUBSCRIPTION_STATUS, // Constants
    FREE_TRIAL_LIMIT,
  };

  return (
    <AuthContext.Provider value={value}>
      {state.loading ? <div>Loading Authentication...</div> : children}
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