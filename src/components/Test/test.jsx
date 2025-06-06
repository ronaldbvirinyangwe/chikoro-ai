// --- Start Zustand Store Definition (MUST be before the Test component function) ---
import { create } from 'zustand';
// Assuming these are correctly imported from your project structure
import { generateTestQuestions, gradeStudentResponses } from '../../config/image_understand';

const useTestStore = create((set, get) => ({
    // --- State ---
    test: null,
    answers: [],
    results: null,
    isLoading: false,
    error: '',
    subject: '',
    gradeLevel: localStorage.getItem('studentGrade') || '5',
    currentQuestionIndex: 0,
    timerSeconds: 0,
    isTimerRunning: false,
    userFeedback: '', // For general test feedback mechanism
    showReview: false, // State to show review screen
    // New state for frontend rate limiting on generation
    lastTestGenerationTime: localStorage.getItem('lastTestGenerationTime') ? new Date(localStorage.getItem('lastTestGenerationTime')) : null,


    // --- Actions ---
    setSubject: (subject) => set({ subject }),
    setGradeLevel: (gradeLevel) => set({ gradeLevel }),
    setError: (error) => set({ error }),
    setUserFeedback: (feedback) => set({ userFeedback: feedback }),
    toggleReview: () => set(state => ({ showReview: !state.showReview })),

    // Timer Actions
    startTimer: () => set({ isTimerRunning: true }),
    stopTimer: () => set({ isTimerRunning: false }),
    resetTimer: () => set({ timerSeconds: 0, isTimerRunning: false }),
    incrementTimer: () => set(state => ({ timerSeconds: state.timerSeconds + 1 })),

    // Load saved test from localStorage
    loadSavedTest: () => {
        const savedState = localStorage.getItem('currentTestState');
        const savedGenerationTime = localStorage.getItem('lastTestGenerationTime');
        const studentId = localStorage.getItem('studentId'); 

        set({ studentId });

        if (savedState) {
            try {
                const parsedState = JSON.parse(savedState);
                // Basic validation for saved state structure
                if (parsedState.test?.questions?.length >= 0 && Array.isArray(parsedState.answers)) {
                     // Check if timer state exists and is valid
                     const timerState = parsedState.timerState || { seconds: 0, isRunning: false };
                     set({
                        ...parsedState,
                        timerSeconds: timerState.seconds,
                        isTimerRunning: timerState.isRunning,
                        currentQuestionIndex: parsedState.currentQuestionIndex || 0 // Default to 0 if missing
                     });
                     console.log("Loaded saved test state.");
                } else {
                    console.warn("Invalid saved state structure, clearing localStorage.");
                    localStorage.removeItem('currentTestState');
                }
            } catch (error) {
                console.error("Failed to parse saved state:", error);
                localStorage.removeItem('currentTestState');
            }
        }

        // Load last generation time separately if it exists
        if (savedGenerationTime) {
             try {
                 set({ lastTestGenerationTime: new Date(savedGenerationTime) });
                 console.log("Loaded last test generation time.");
             } catch (error) {
                 console.error("Failed to parse last test generation time:", error);
                 localStorage.removeItem('lastTestGenerationTime'); // Clear if invalid
             }
        }
    },

    // Save current test state to localStorage
    saveCurrentTest: () => {
         const state = get();
         // Only save if a test exists
         if (!state.test) return;

         const stateToSave = {
             test: state.test,
             answers: state.answers,
             subject: state.subject,
             gradeLevel: state.gradeLevel,
             currentQuestionIndex: state.currentQuestionIndex,
             timerState: {
                seconds: state.timerSeconds,
                isRunning: state.isTimerRunning
             }
         };
         localStorage.setItem('currentTestState', JSON.stringify(stateToSave));
         console.log("Saved current test state.");
         // Also save the last generation time if it exists
         if (state.lastTestGenerationTime) {
             localStorage.setItem('lastTestGenerationTime', state.lastTestGenerationTime.toISOString());
         } else {
             localStorage.removeItem('lastTestGenerationTime'); // Ensure it's cleared if null
         }
    },

    // Generate New Test
    generateNewTest: async () => {
        // --- Frontend Rate Limit Check ---
        const state = get();
        const fiveHoursInMillis = 1 * 60 * 60 * 1000; // 1 hour in milliseconds
        const now = new Date();

        if (state.lastTestGenerationTime) {
            const timeSinceLastGeneration = now.getTime() - state.lastTestGenerationTime.getTime();
            if (timeSinceLastGeneration < fiveHoursInMillis) {
                // Calculate remaining time for the error message
                const remainingTimeMillis = fiveHoursInMillis - timeSinceLastGeneration;
                const remainingHours = Math.floor(remainingTimeMillis / (1000 * 60 * 60));
                const remainingMinutes = Math.ceil((remainingTimeMillis % (1000 * 60 * 60)) / (1000 * 60));
                set({
                    error: `You can only generate one test every 5 hours. Please wait ${remainingHours} hours and ${remainingMinutes} minutes before generating another test.`,
                    isLoading: false // Ensure loading is false if blocked by frontend
                });
                return; // Stop the generation process
            }
        }
        // --- End Frontend Rate Limit Check ---


        // Reset state and indicate loading
        set({
            isLoading: true,
            error: '',
            test: null,
            results: null,
            answers: [],
            currentQuestionIndex: 0,
            timerSeconds: 0,
            isTimerRunning: false,
            showReview: false,
            userFeedback: '' // Clear previous feedback
        });
        localStorage.removeItem('currentTestState'); // Clear previous saved state immediately

        try {
            const { subject, gradeLevel } = get();
            if (!subject) {
                throw new Error('Please select a subject first.');
            }

            // Call the API to generate questions
            const newTest = await generateTestQuestions({
                subject,
                gradeLevel, // Use grade from store/localStorage
                questionTypes: ["multiple-choice", "short-answer"], // Limited types as requested
                numQuestions: 15 // Fixed number for now
            });

            // Basic structure validation (kept from original)
            if (!newTest?.questions?.length) throw new Error('Invalid test structure received.');
            newTest.questions.forEach(question => {
              if (!question.type || !question.question) throw new Error('Missing question fields in test structure.');
              if (question.type === 'multiple-choice' && !question.options?.length) {
                throw new Error('Missing options for multiple-choice question in test structure.');
              }
            });

            // Update state with the new test, start timer, and set generation time
            const now = new Date(); // Get current time *after* successful generation
            set({
                test: newTest,
                answers: new Array(newTest.questions.length).fill(''),
                isLoading: false,
                lastTestGenerationTime: now // Set the timestamp of successful generation
            });
            get().startTimer(); // Start timer when test is generated
            get().saveCurrentTest(); // Save the new test state (including generation time)

        } catch (err) {
            console.error("Generate test error:", err);
            set({ error: err.message || 'Failed to generate test. Please try again.', isLoading: false });
        }
    },

    // Handle Answer Change
    handleAnswerChange: (index, value) => {
        set(state => {
            const newAnswers = [...state.answers];
            newAnswers[index] = value;
            return { answers: newAnswers };
        });
        // Saving is handled by the useEffect in the component
    },

     // Navigation Actions
     nextQuestion: () => {
        set(state => {
            // Check if we are on the last question before navigating
            if (state.test && state.currentQuestionIndex < state.test.questions.length - 1) {
                 const nextIndex = state.currentQuestionIndex + 1;
                 return { currentQuestionIndex: nextIndex };
            } else if (state.test && state.currentQuestionIndex === state.test.questions.length - 1) {
                // If on the last question, toggle to review mode
                get().toggleReview();
                return {}; // No index change
            }
            return {}; // No change if no test or already beyond last question
        });
        // Saving is handled by the useEffect in the component
     },

     prevQuestion: () => {
         set(state => {
             if (state.currentQuestionIndex > 0) {
                 const prevIndex = state.currentQuestionIndex - 1;
                 return { currentQuestionIndex: prevIndex };
             }
             return {}; // No change if at the first question
         });
         // Saving is handled by the useEffect in the component
     },

     // Submit Test
     submitTest: async () => {
      const state = get();
       // Prevent submission if already submitting or results are already shown
      if (state.isLoading || state.results) {
           console.warn("Attempted to submit test while loading or results are already present.");
          return;
      }

      // Check if all questions are answered (basic check - empty string is not answered)
      const allAnswered = state.answers.every(answer =>
           answer !== null && answer !== undefined && answer.toString().trim() !== ''
       );

      if (!allAnswered) {
          set({ error: 'Please answer all questions before submitting' });
          return;
      }

      set({ isLoading: true, error: '', showReview: false }); // Indicate loading and hide review
      get().stopTimer(); // Stop timer on submission

      try {
           const { test, answers, subject, studentId } = state; // Get studentId for saving

          // Call the API to grade responses (assuming this might call a backend)
          // The implementation of gradeStudentResponses needs to handle its own potential API calls and errors
          const gradingResults = await gradeStudentResponses(test, answers);

          // Update state with results
          set({ results: gradingResults, isLoading: false });

          // Get student ID from localStorage (still using localStorage per original request)
           // const studentId = localStorage.getItem('studentId'); // Already in state

          if (!studentId) {
            console.warn('Student ID not found in state. Cannot save results to server.');
            // Set a non-blocking error about saving, but don't prevent results display
            set({ error: 'Results calculated, but student ID not found. Cannot save to server.' });
          } else {
               // Save results to server
               const serverUrl = 'https://7jqrkt245l0tuq-4173.proxy.runpod.net'; // Using the original hardcoded URL
                // Retrieve the access token for saving results (API is protected)
               const token = localStorage.getItem('accessToken');

               if (!token) {
                    console.warn('Access token not found in localStorage. Cannot save results to server.');
                     set({ error: 'Results calculated, but authentication token missing. Cannot save to server.' });
               } else {
                    const testData = {
                      subject: state.subject,
                      // Ensure score is a number (percentage) and totalQuestions is correct
                      score: gradingResults.summary?.overallScore, // Use score from grading results summary
                      totalQuestions: state.test.questions.length,
                      date: new Date().toISOString(),
                      details: gradingResults // Save full details
                    };

                    console.log('Attempting to save test results:', testData);

                    try {
                        const saveResponse = await fetch(`${serverUrl}/students/${studentId}/tests`, {
                          method: 'POST',
                           headers: {
                               'Content-Type': 'application/json',
                               'Authorization': `Bearer ${token}` // Include the access token
                           },
                          body: JSON.stringify(testData),
                        });

                        if (!saveResponse.ok) {
                          // --- Improved Error Handling for Backend Errors (like 401, 403, 429) ---
                          // Attempt to read JSON first, but fallback to text if JSON parsing fails
                          let errorData = null;
                          try {
                              errorData = await saveResponse.json();
                          } catch (jsonError) {
                              // If JSON parsing fails, read as text
                              const textError = await saveResponse.text();
                              console.error('Failed to parse JSON error response, response body:', textError);
                              errorData = { message: textError || `Server responded with status ${saveResponse.status} ${saveResponse.statusText}` };
                          }

                          console.error('Failed to save test results:', saveResponse.status, saveResponse.statusText, errorData);

                          if (saveResponse.status === 401 || saveResponse.status === 403) {
                               // Handle auth errors specifically during save
                                set({ error: errorData.message || 'Authentication failed while saving results. Please log in again.', isLoading: false });
                                // Clear tokens if auth fails - prompts re-login on next page load
                                 localStorage.removeItem("accessToken");
                                 localStorage.removeItem("refreshToken");
                                 localStorage.removeItem("studentId");
                                 set({ studentId: null }); // Clear studentId in state
                                // Optionally redirect to login
                                // navigate("/login");
                          } else if (saveResponse.status === 429) {
                               // Handle backend rate limit specifically if API returns 429
                                set({
                                    error: errorData.error || errorData.message || 'Test saving is rate limited. Please try again later.', // Display the backend's message
                                    isLoading: false // Ensure loading is false
                                });
                          }
                           else {
                              // Handle other server errors (e.g., 400, 404, 500)
                               set({ error: errorData.message || `Results calculated, but failed to save to server: ${saveResponse.status} ${saveResponse.statusText}`, isLoading: false });
                          }
                          // --- End Improved Error Handling ---
                        } else {
                           console.log('Test results saved successfully.');
                           // Clear previous errors related to saving if successful
                           if (state.error.includes('save to server') || state.error.includes('rate limited')) {
                                set({ error: '' });
                           }
                           // Ensure the save state is cleared from localStorage after successful save
                           localStorage.removeItem('currentTestState');
                        }
                    } catch (fetchError) {
                         console.error('Network error while saving test results:', fetchError);
                          set({ error: `Results calculated, but network error occurred while saving: ${fetchError.message}`, isLoading: false });
                           // Network errors might mean the server is down, no need to clear auth tokens immediately
                    }
               } // end if token
          } // end if studentId

          // Note: localStorage.removeItem('currentTestState'); is now handled inside the successful save branch

      } catch (err) {
          console.error('Error in test submission or grading:', err);
          let errorMessage = err.message || 'Error grading test. Please try again.';
           // Check if the error suggests an auth issue during grading (less likely if grading is local/internal)
           if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                errorMessage = 'Authentication failed during grading. Please log in again.';
                // Clear tokens if auth fails
                 localStorage.removeItem("accessToken");
                 localStorage.removeItem("refreshToken");
                 localStorage.removeItem("studentId");
                 set({ studentId: null }); // Clear studentId in state
                 // Optionally redirect to login
                 // navigate("/login");
           }
          set({ error: errorMessage, isLoading: false, results: null }); // Clear results on grading error
          // If grading failed, the state might be inconsistent, clear saved state?
          // localStorage.removeItem('currentTestState'); // Consider adding this here too if grading errors are severe
      }
  },

    // Handle general test feedback submission
    submitGeneralFeedback: async () => {
        const state = get();
        const feedback = state.userFeedback.trim();
        if (!feedback) {
            set({ error: 'Please type some feedback before submitting.' });
            return;
        }
        // Here you would implement the logic to send the feedback
        console.log("Submitting general feedback:", feedback);
        // Use a separate loading state if needed, or reuse main one
        set({ isLoading: true, error: '' });

        try {
            // --- Placeholder: Replace with actual API call to save feedback ---
            // Example: await fetch('/api/feedback', { method: 'POST', body: JSON.stringify({ feedback, testId: state.test?.id, userId: localStorage.getItem('studentId') }) });
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call delay
            console.log('Feedback submitted successfully (simulated).');
            // --- End Placeholder ---

            set({ userFeedback: '', isLoading: false, error: 'Feedback submitted successfully!' }); // Clear feedback on success
        } catch (err) {
            console.error("Feedback submission failed:", err);
            set({ isLoading: false, error: 'Failed to submit feedback. Please try again.' });
        }
    },

    // Helper to calculate remaining time for generation (for display)
    getRemainingGenerationTime: () => {
        const state = get();
        const fiveHoursInMillis = 5 * 60 * 60 * 1000;
        const now = new Date();

        if (!state.lastTestGenerationTime) {
            return 0; // No previous generation, no wait time
        }

        const timeSinceLastGeneration = now.getTime() - state.lastTestGenerationTime.getTime();
        const remainingTimeMillis = fiveHoursInMillis - timeSinceLastGeneration;

        return Math.max(0, remainingTimeMillis); // Return 0 if time is already passed
    }

}));
// --- End Zustand Store Definition ---


import React, { useEffect, useCallback, useState } from 'react'; // Import useCallback and useState
// No longer need useState for test, answers, results, isLoading, error, subject, currentQuestionIndex
// import { useState, useEffect } from 'react'; // Remove these if no longer needed
// import { generateTestQuestions, gradeStudentResponses } from '../../config/image_understand'; // Remove these, now in store
import './test.css'; // Keep CSS import
import { useNavigate, Link } from 'react-router-dom'; // Keep routing
import Greeting from '../Enrol/Greeting'; // Keep Greeting
import { useTheme } from '../../context/ThemeContext'; // Keep theming context


const Test = () => {
  // --- Connect to Zustand store (MUST be inside the functional component) ---
  const {
    test,
    answers,
    results,
    isLoading,
    error,
    subject,
    setSubject,
    gradeLevel, // Use gradeLevel from store
    currentQuestionIndex,
    timerSeconds,
    isTimerRunning,
    userFeedback,
    showReview,
    lastTestGenerationTime, // Get the last generation time from the store

    loadSavedTest,
    saveCurrentTest, // Add save action
    generateNewTest,
    handleAnswerChange,
    submitTest,
    nextQuestion,
    prevQuestion,
    setUserFeedback,
    submitGeneralFeedback,
    toggleReview,
    incrementTimer, // Use incrementTimer action
    stopTimer, // Use stopTimer action
    setError, // Use setError action from store
    getRemainingGenerationTime // Get the helper function
  } = useTestStore(); // <-- This hook must be called here

  // Local UI state (kept outside Zustand for simple UI states like menu visibility)
  const [menuVisible, setMenuVisible] = React.useState(false); // Use React.useState explicitly
  // State to track remaining time for display (updates every second)
  const [displayRemainingTime, setDisplayRemainingTime] = useState(getRemainingGenerationTime());

  const navigate = useNavigate();
  const { darkMode } = useTheme(); // Keep theme context

  const toggleMenu = useCallback(() => setMenuVisible(prev => !prev), []);
  const closeMenu = useCallback(() => setMenuVisible(false), []);


  // Loading spinner component (can keep here or move)
  const LoadingSpinner = () => (
    <div className="loading-spinner" role="status" aria-label="Loading">
      <div className="spinner"></div>
    </div>
  );

  // --- Effects ---

  // Load saved test on mount
  useEffect(() => {
    loadSavedTest();
  }, [loadSavedTest]); // Dependency array includes loadSavedTest from store


  // Effect to save state whenever critical state changes (answers, index, subject, timer, generation time)
  // This is an alternative to saving inside every action, can be more efficient
   useEffect(() => {
       // Only save if a test exists and we are not currently loading/submitting results
       if (test && !isLoading && !results) {
            // Debounce or throttle this save if performance becomes an issue on rapid changes
            // For simplicity now, we save directly, but consider a debounce
            const handler = setTimeout(() => {
                 saveCurrentTest();
            }, 500); // Save after 500ms of inactivity

            return () => clearTimeout(handler); // Cleanup timeout on state change or unmount
       }
       // Also save generation time immediately when it changes
       if (lastTestGenerationTime) {
           localStorage.setItem('lastTestGenerationTime', lastTestGenerationTime.toISOString());
       } else {
           localStorage.removeItem('lastTestGenerationTime');
       }

   }, [answers, currentQuestionIndex, subject, timerSeconds, isTimerRunning, test, isLoading, results, saveCurrentTest, lastTestGenerationTime]);


  // Timer Effect for test duration
  useEffect(() => {
      let timerInterval = null;
      if (isTimerRunning) {
          timerInterval = setInterval(() => {
              incrementTimer();
          }, 1000);
      } else {
          clearInterval(timerInterval);
      }

      // Cleanup function to clear interval on unmount or when isTimerRunning becomes false
      return () => clearInterval(timerInterval);
  }, [isTimerRunning, incrementTimer]); // Dependencies

   // Timer Effect for generation rate limit countdown display
   useEffect(() => {
       let countdownInterval = null;
       const remaining = getRemainingGenerationTime();

       if (remaining > 0) {
           setDisplayRemainingTime(remaining); // Set initial display time
           countdownInterval = setInterval(() => {
               setDisplayRemainingTime(prevTime => {
                   const newTime = prevTime - 1000;
                   if (newTime <= 0) {
                       clearInterval(countdownInterval);
                       // Optionally clear any rate limit error message here
                       if (error && error.includes('generate another test')) {
                           setError('');
                       }
                       return 0;
                   }
                   return newTime;
               });
           }, 1000);
       } else {
           setDisplayRemainingTime(0); // Ensure display is 0 if no wait time
           // Clear any lingering rate limit error message if time has passed
           if (error && error.includes('generate another test')) {
               setError('');
           }
       }

       // Cleanup function
       return () => clearInterval(countdownInterval);
   }, [lastTestGenerationTime, getRemainingGenerationTime, error, setError]); // Dependencies include generation time and the helper


   // Stop timer if results are shown
   useEffect(() => {
       if (results && isTimerRunning) {
           stopTimer();
       }
   }, [results, isTimerRunning, stopTimer]);


  // --- Handlers (using useCallback for performance benefit) ---

  // Update answer in store (action handles the state change)
  const handleAnswerInputChange = useCallback((index, value) => {
    handleAnswerChange(index, value);
    // Auto-save is handled by the useEffect above
  }, [handleAnswerChange]);

  // Call generate action from store
  const handleGenerateClick = useCallback(() => {
      if (!subject) {
          setError('Please select a subject first.');
          return;
      }
      // The rate limit check is now inside the generateNewTest action itself
      generateNewTest();
  }, [generateNewTest, subject, setError]);

   // Call submit action from store
  const handleSubmitClick = useCallback(() => {
     submitTest();
  }, [submitTest]);

   // Call next question action from store
   const handleNextClick = useCallback(() => {
       nextQuestion();
   }, [nextQuestion]);

   // Call previous question action from store
    const handlePrevClick = useCallback(() => {
       prevQuestion();
   }, [prevQuestion]);

    // Call toggle review action from store
    const handleToggleReviewClick = useCallback(() => {
        toggleReview();
    }, [toggleReview]);

    // Call submit feedback action from store
     const handleSubmitFeedbackClick = useCallback(() => {
         submitGeneralFeedback();
     }, [submitGeneralFeedback]);

   // Calculate progress string
   const progressText = test ? `Question ${currentQuestionIndex + 1} of ${test.questions.length}` : '';

    // Format timer (for test duration)
    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const paddedSeconds = remainingSeconds < 10 ? `0${remainingSeconds}` : remainingSeconds;
        return `${minutes}:${paddedSeconds}`;
    };

    // Format remaining time (for generation cooldown)
    const formatRemainingTime = (milliseconds) => {
        const totalSeconds = Math.ceil(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        let timeString = '';
        if (hours > 0) timeString += `${hours}h `;
        if (minutes > 0 || hours > 0) timeString += `${minutes}m `; // Show minutes if hours > 0 or minutes > 0
        timeString += `${seconds}s`; // Always show seconds

        return timeString.trim();
    };

    // Determine if the generate button should be disabled by the frontend rate limit
    const isGenerateDisabledByRateLimit = displayRemainingTime > 0;


  // --- Render Logic (complex due to single file) ---

  // Function to render a single question or all questions in review/results
  const renderQuestion = (question, index) => {
      // Determine if this question should be visible
      const isVisible = showReview || results || index === currentQuestionIndex;

      // Add the 'is-visible' class if the question should be shown
      const visibilityClass = isVisible ? 'is-visible' : '';

      return (
         <div
            key={index}
            // Combine base class, show-all-questions class (if applicable), and visibility class
            className={`test-question ${showReview || results ? 'show-all-questions' : ''} ${visibilityClass}`}
            // Add ARIA attributes for navigation context if needed
            // role="group" aria-labelledby={`question-title-${index}`}
         >
             {/* Show question number if not reviewing/results */}
             {!showReview && !results && <h3 className="question-number">Question {index + 1}</h3>}
             {/* Add an ID for potential ARIA linking */}
             <h3 id={`question-title-${index}`}>{question.question}</h3>

             {question.type === 'multiple-choice' ? (
               <div className="test-options flex flex-col space-y-3" role="radiogroup"> {/* Added ARIA role */}
                 {question.options.map((option, optionIndex) => (
                   <label
                      key={optionIndex}
                      className={`flex items-center space-x-2 p-3 border rounded-md cursor-pointer transition duration-200 ${answers[index] === option ? 'border-green-500 bg-green-50 dark:bg-green-900 dark:border-green-700' : 'border-gray-300 hover:border-green-500 dark:border-gray-600 dark:hover:border-green-500'}`} // Added dynamic styling + dark mode
                   >
                     <input
                       type="radio"
                       name={`question-${index}`}
                       value={option}
                       checked={answers[index] === option}
                       onChange={(e) => handleAnswerInputChange(index, e.target.value)}
                       className="form-radio text-green-600 dark:text-green-400" // Added Tailwind-like class for color + dark mode
                       disabled={isLoading || !!results} // Disable if loading or results are shown
                       aria-labelledby={`question-title-${index}`} // Link radio button to question title
                     />
                     <span>{option}</span>
                   </label>
                 ))}
               </div>
             ) : ( // Assume 'short-answer' or other text types
               <textarea
                 className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 transition duration-200 ${isLoading || !!results ? 'bg-gray-100 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400' : 'border-gray-300 focus:border-green-500 focus:ring-green-200 dark:border-gray-600 dark:focus:border-green-500 dark:focus:ring-green-700'}`} // Added dynamic styling + dark mode
                 value={answers[index]}
                 onChange={(e) => handleAnswerInputChange(index, e.target.value)}
                 placeholder="Type your answer here..."
                 rows={4}
                 disabled={isLoading || !!results} // Disable if loading or results are shown
                 aria-labelledby={`question-title-${index}`} // Link textarea to question title
               />
             )}

              {/* Display feedback if results are shown */}
              {results && results.results[index] && (
                   <div className="question-feedback-detail mt-4 p-3 bg-gray-100 rounded-md dark:bg-gray-800"> {/* Added dark mode */}
                       <h5 className="font-semibold text-gray-700 dark:text-gray-300">Feedback:</h5> {/* Added dark mode */}
                       <p className="text-gray-600 dark:text-gray-400">{results.results[index].feedback}</p> {/* Added dark mode */}

                       {/* Render strengths/improvements if available */}
                       {results.results[index].strengths && results.results[index].strengths.length > 0 && (
                           <div className="strengths mt-2">
                               <strong>Strengths:</strong>
                               <ul className="list-disc list-inside text-green-700 dark:text-green-500"> {/* Added dark mode */}
                                   {results.results[index].strengths.map((s, i) => <li key={i}>{s}</li>)}
                               </ul>
                           </div>
                       )}
                        {results.results[index].improvements && results.results[index].improvements.length > 0 && (
                           <div className="improvements mt-2">
                               <strong>Areas for Improvement:</strong>
                               <ul className="list-disc list-inside text-red-700 dark:text-red-500"> {/* Added dark mode */}
                                   {results.results[index].improvements.map((s, i) => <li key={i}>{s}</li>)}
                               </ul>
                           </div>
                       )}
                       {results.results[index].correctAnswer && (
                             <div className="correct-answer mt-2 text-gray-700 dark:text-gray-300"> {/* Added dark mode */}
                                 <strong>Correct Answer:</strong> {results.results[index].correctAnswer}
                             </div>
                         )}
                   </div>
              )}
         </div>
      );
  };


  return (
    // Apply dark mode class based on context
    <div className={`home ${darkMode ? 'dark' : ''}`}>
        <header className={`l-header ${darkMode ? 'dark' : ''}`}>
          <nav className="nav bd-grid">
          <Link to="/subjectselect" className="nav__logo">
            <Greeting />
          </Link>

               {/* Navigation Menu */}
               {/* Use onClick with navigate for internal links and close menu */}
               <div className={`nav__menu ${menuVisible ? 'show' : ''}`} id="nav-menu">
            <ul className="nav__list">
              {/* <li className="nav__item"><a className="nav__link" onClick={() => { navigate('/discover'); closeMenu(); }}>Discover</a></li> */}
              <li className="nav__item"><a className="nav__link" onClick={() => { navigate('/test'); closeMenu(); }}>Test</a></li>
              <li className="nav__item"><a className="nav__link" onClick={() => { navigate('/papers'); closeMenu(); }}>Exam Papers</a></li>
              <li className="nav__item"><a className="nav__link" onClick={() => { navigate('/reports'); closeMenu(); }}>Reports</a></li>
            </ul>
          </div>
            {/* Boxicons for menu toggle */}
            <link href='https://cdn.jsdelivr.net/npm/boxicons@2.0.5/css/boxicons.min.css' rel='stylesheet' />
            {/* Menu toggle button */}
            <div className="nav__toggle" id="nav-toggle" onClick={toggleMenu} role="button" aria-label="Toggle navigation menu" aria-expanded={menuVisible}>
              <i className='bx bx-menu'></i>
            </div>
          </nav>
        </header>

      <main className="test-container">
        <div className="test-controls">
             {/* Subject Select */}
             <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="test-select"
              // Disable subject select if test is loading or exists OR if rate limited
              disabled={isLoading || !!test || isGenerateDisabledByRateLimit}
              aria-label="Select test subject" // Accessibility label
            >
              <option value="">Select a subject...</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Science">Science</option>
              <option value="English">English</option>
              <option value="African History">African History</option>
              <option value="European History">European History</option>
              <option value="Geography">Geography</option>
              <option value="Heritage">Heritage</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Physics">Physics</option>
              <option value="Biology">Biology</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Commerce">Commerce</option>
              <option value="Accounting">Accounting</option>
              <option value="Art">Art</option>
              <option value="Music">Music</option>
              <option value="Woodwork">Woodwork</option>
              <option value="Fashion and Fabrics">Fashion and Fabrics</option>
              <option value="Food and Nutrition">Food and Nutrition</option>
              <option value="Family and Religious Studies">Family and Religious Studies</option>
              <option value="Home Economics">Home Economics</option>
              <option value="Agriculture">Agriculture</option>
              <option value="Economics">Economics</option>
              <option value="Business Studies">Business Studies</option>
              <option value="Metal Work">Metal Work</option>
              <option value="Technical Graphics">Technical Graphics</option>
              <option value="Physical Education">Physical Education</option>
            </select>

             {/* Generate Button */}
              <button
                onClick={handleGenerateClick}
                className="test-button"
                // Disable if loading, test exists, no subject selected, OR if rate limited
                disabled={isLoading || !!test || !subject || isGenerateDisabledByRateLimit}
                aria-label="Generate new test"
              >
                {isLoading && !test ? <LoadingSpinner /> : 'Generate New Test'}
              </button>

              {/* Display remaining time if rate limited */}
              {isGenerateDisabledByRateLimit && (
                  <div className="text-red-600 dark:text-red-400 mt-2 text-center">
                      Next test available in: {formatRemainingTime(displayRemainingTime)}
                  </div>
              )}


              {/* Reset Button (Visible only if test exists and not loading/submitting) */}
              {test && !isLoading && !results && (
                  <button
                    onClick={() => {
                         // Implement reset logic: confirm, clear state, clear localStorage
                         if (window.confirm('Are you sure you want to reset the current test? Your progress will be lost.')) {
                            // Clear test-related state, but keep lastTestGenerationTime
                            useTestStore.setState({ test: null, answers: [], results: null, isLoading: false, error: '', currentQuestionIndex: 0, timerSeconds: 0, isTimerRunning: false, showReview: false, userFeedback: '' });
                            localStorage.removeItem('currentTestState'); // Only clear current test state
                         }
                    }}
                    className="test-button reset-button" // Add a class for specific styling
                    disabled={isLoading}
                    aria-label="Reset current test"
                  >
                    Reset Test
                  </button>
              )}

        </div>

        {/* Error Display */}
        {error && <div className="test-error" role="alert" aria-live="polite">{error}</div>}

        {/* Loading Indicator */}
        {isLoading && !test && ( // Show initial loading only when test is null
             <div className="flex justify-center items-center p-8 text-gray-700 dark:text-gray-300"> {/* Added dark mode */}
                <LoadingSpinner />
                <span className="ml-2 text-lg">Generating test...</span>
             </div>
        )}

        {/* Test Card (Visible when test exists and results are not shown) */}
        {test && !results && (
          <div className="test-card slide-in-bottom"> {/* Added animation class */}
            <div className="test-card-header">
               {/* Added Timer and Progress to Header */}
              <h2 className="test-card-title">
                {test.subject} Test - {gradeLevel}
              </h2>
              <div className="test-info mt-2 text-gray-200">
                   <span className="mr-4">🕰️ Time: {formatTime(timerSeconds)}</span>
                   <span>📊 {progressText}</span>
              </div>
            </div>
            <div className="test-card-content">
              {/* Render Questions (renders only current one unless reviewing) */}
               {test.questions.map((q, index) => renderQuestion(q, index))}


              {/* Navigation Buttons (Visible only during the test, not review or results) */}
               {!showReview && !results && (
                 <div className="test-navigation flex justify-between gap-4 p-6"> {/* Added flex/justify/gap/padding */}
                     {/* Previous Button */}
                     <button
                        onClick={handlePrevClick}
                        className="test-button secondary-button flex-1" // Added secondary class
                        disabled={isLoading || currentQuestionIndex === 0} // Disable if loading or at first question
                        aria-label="Previous question"
                     >
                         Previous
                     </button>
                      {/* Next or Review Button */}
                      {currentQuestionIndex < test.questions.length - 1 ? (
                         <button
                            onClick={handleNextClick}
                            className="test-button primary-button flex-1" // Added primary class
                            disabled={isLoading} // Disable if loading
                            aria-label="Next question"
                         >
                             Next
                         </button>
                      ) : (
                         <button
                           onClick={handleToggleReviewClick}
                           className="test-button primary-button flex-1"
                           disabled={isLoading || answers.some(answer => answer === null || answer === undefined || answer.toString().trim() === '')} // Disable if loading or not all answered before review
                           aria-label="Review answers"
                         >
                            Review Answers
                         </button>
                      )}
                 </div>
               )}


              {/* Submit Button (Visible only when reviewing) */}
              {showReview && (
                <button
                  className="submit-button w-full px-6 py-3 mt-4" // Added padding/margin
                  onClick={handleSubmitClick}
                  // Disable if loading or not all questions have a non-empty answer
                  disabled={isLoading || answers.some(answer => answer === null || answer === undefined || answer.toString().trim() === '')}
                  aria-label="Submit final answers"
                >
                  {isLoading ? <LoadingSpinner /> : 'Submit Final Answers'}
                </button>
              )}

               {/* Back to Test Button (from review) */}
              {showReview && (
                 <button
                   className="test-button secondary-button w-full px-6 py-3 mt-3"
                   onClick={handleToggleReviewClick}
                   disabled={isLoading} // Disable if loading
                   aria-label="Back to test"
                 >
                    Back to Test
                 </button>
              )}

            </div>
          </div>
        )}

        {/* Results Display (Visible when results exist) */}
        {results && (
          <div className="test-results slide-in-bottom"> {/* Added animation class */}
            <div className="results-header">
              <h2 className="results-title">Test Results</h2>
            </div>
            <div className="results-content p-6"> {/* Added padding */}
               {/* Results Summary */}
               <div className="results-summary mb-6 p-4 bg-blue-50 rounded-md border border-blue-200 dark:bg-blue-900 dark:border-blue-700"> {/* Added styling + dark mode */}
                    {/* Score Visualization (simple text/color) */}
                     <div className={`text-center text-2xl font-bold mb-2 ${results.summary.overallScore >= 70 ? 'text-green-600 dark:text-green-400' : results.summary.overallScore >= 50 ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400'}`}> {/* Added dark mode */}
                         Overall Score: {results.summary.overallScore}%
                     </div>
                     {/* Time Taken */}
                     <div className="text-center text-gray-600 dark:text-gray-400 mb-4"> {/* Added dark mode */}
                        Time Taken: {formatTime(timerSeconds)}
                     </div>
                     <p className="text-gray-700 dark:text-gray-300 italic">{results.summary.feedback}</p> {/* Added dark mode */}
                </div>

              {/* Results Details (using the renderQuestion function with results mode) */}
               <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-gray-800 dark:text-gray-200">Question Breakdown</h3> {/* Added dark mode */}
                <div className="results-details space-y-6"> {/* Added spacing */}
                    {/* Render all questions with feedback */}
                    {test.questions.map((q, index) => renderQuestion(q, index))}
                </div>

                {/* General Feedback Mechanism */}
                <div className="general-feedback mt-8 p-4 bg-gray-50 rounded-md border border-gray-200 dark:bg-gray-800 dark:border-gray-700"> {/* Added dark mode */}
                     <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">Have Feedback about this Test?</h3> {/* Added dark mode */}
                     <textarea
                        value={userFeedback}
                        onChange={(e) => setUserFeedback(e.target.value)}
                        placeholder="Share your thoughts here..."
                        rows={4}
                        className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:focus:border-blue-500 dark:focus:ring-blue-700" // Added dark mode
                        aria-label="Provide general feedback about the test"
                     />
                     <button
                       onClick={handleSubmitFeedbackClick}
                       className="test-button submit-button small-button mt-3" // Added small button class
                       disabled={isLoading} // Disable if loading
                       aria-label="Submit feedback"
                     >
                         {isLoading ? <LoadingSpinner /> : 'Submit Feedback'}
                     </button>
                </div>

                 {/* Link to Resources (Placeholder) */}
                 <div className="resource-links mt-8 p-4 bg-yellow-50 rounded-md border border-yellow-200 text-center dark:bg-yellow-900 dark:border-yellow-700"> {/* Added dark mode */}
                      <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Want to learn more?</h3> {/* Added dark mode */}
                       {/* Replace with actual logic to suggest resources based on results */}
                       <p className="text-gray-700 dark:text-gray-300">Based on your performance, you might want to review topics on {subject}.</p> {/* Added dark mode */}
                      {/* <Link to="/discover" className="text-blue-600 hover:underline mt-2 inline-block dark:text-blue-400">Explore Learning Resources &rarr;</Link> Added dark mode */}
                 </div>


            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Test;
