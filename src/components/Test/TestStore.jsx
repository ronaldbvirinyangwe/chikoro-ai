// --- Start Zustand Store Definition (put this BEFORE the Test component function) ---
import { create } from 'zustand';
import { generateTestQuestions, gradeStudentResponses } from '../../config/image_understand'; // Assuming these are correctly imported

const useTestStore = create((set, get) => ({
    // State
    test: null,
    answers: [],
    results: null,
    isLoading: false,
    error: '',
    subject: '',
    gradeLevel: localStorage.getItem('studentGrade') || '5', // Get grade from localStorage
    currentQuestionIndex: 0,
    timerSeconds: 0,
    isTimerRunning: false,
    userFeedback: '', // For general test feedback mechanism
    showReview: false, // State to show review screen

    // Actions
    setSubject: (subject) => set({ subject }),
    setGradeLevel: (gradeLevel) => set({ gradeLevel }), // Although we read it initially, allow setting if needed later
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
        if (savedState) {
            try {
                const parsedState = JSON.parse(savedState);
                // Basic validation
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
    },

    // Save current test state to localStorage
    saveCurrentTest: () => {
         const state = get();
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
    },

    // Generate New Test
    generateNewTest: async () => {
        set({ isLoading: true, error: '', test: null, results: null, answers: [], currentQuestionIndex: 0, timerSeconds: 0, isTimerRunning: false, showReview: false });
        get().saveCurrentTest(); // Save initial state before generating (clears previous)

        try {
            const { subject, gradeLevel } = get();
            if (!subject) {
                throw new Error('Please select a subject first.');
            }

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

            set({ test: newTest, answers: new Array(newTest.questions.length).fill(''), isLoading: false });
            get().startTimer(); // Start timer when test is generated
            get().saveCurrentTest(); // Save the new test state

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
             // Auto-save answer change
            //  const updatedState = { ...state, answers: newAnswers };
            //  localStorage.setItem('currentTestState', JSON.stringify(updatedState)); // Avoid setting state here directly, update answers in store
            return { answers: newAnswers };
        });
        // Need to save after the state update microtask
        // A simple setTimeout or saving after the action call in the component works
        // Let's add a save call after this action completes in the component useEffect or useCallback
    },

     // Navigation Actions
     nextQuestion: () => {
        set(state => {
            if (state.currentQuestionIndex < state.test.questions.length - 1) {
                 // Also save state when navigating
                 const nextIndex = state.currentQuestionIndex + 1;
                 const updatedState = { ...state, currentQuestionIndex: nextIndex };
                 // localStorage.setItem('currentTestState', JSON.stringify(updatedState)); // Avoid setting state here, update index in store
                 return { currentQuestionIndex: nextIndex };
            } else {
                // Automatically go to review if it's the last question
                get().toggleReview();
                return {}; // No state change if going to review
            }
        });
        // Save state after navigation
     },

     prevQuestion: () => {
         set(state => {
             if (state.currentQuestionIndex > 0) {
                 const prevIndex = state.currentQuestionIndex - 1;
                  const updatedState = { ...state, currentQuestionIndex: prevIndex };
                 //  localStorage.setItem('currentTestState', JSON.stringify(updatedState)); // Avoid setting state here, update index in store
                 return { currentQuestionIndex: prevIndex };
             }
             return {}; // No state change if at the first question
         });
         // Save state after navigation
     },

     // Submit Test
    submitTest: async () => {
        const state = get();
        if (state.answers.some(answer => answer.toString().trim() === '')) { // Use toString() for potential non-string answers
            set({ error: 'Please answer all questions before submitting' });
            return;
        }

        set({ isLoading: true, error: '', showReview: false });
        get().stopTimer(); // Stop timer on submission

        try {
            const gradingResults = await gradeStudentResponses(state.test, state.answers);

            // Enhance results structure if needed, but current structure is okay for now
            set({ results: gradingResults, isLoading: false });

            // Get student ID from localStorage (still using localStorage per original)
            const studentId = localStorage.getItem('studentId');
            if (!studentId) {
              console.warn('Student ID not found in localStorage. Cannot save results to server.');
              // Don't throw error if student ID is missing, just log and continue to show results
            } else {
                 // Save results to server
                 const serverUrl = 'https://chikoro-ai.com'; // Using the original hardcoded URL
                 const testData = {
                   subject: state.subject,
                   score: gradingResults.summary.overallScore,
                   totalQuestions: state.test.questions.length,
                   date: new Date().toISOString(),
                   details: gradingResults
                 };

                 console.log('Saving test results:', testData);

                 const saveResponse = await fetch(`${serverUrl}/students/${studentId}/tests`, {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify(testData),
                 });

                 if (!saveResponse.ok) {
                   const errorText = await saveResponse.text();
                   console.error('Failed to save test results:', saveResponse.status, saveResponse.statusText, errorText);
                   // Set a non-blocking error about saving, but don't prevent results display
                   set({ error: `Results calculated, but failed to save to server: ${saveResponse.status} ${saveResponse.statusText}` });
                 } else {
                    console.log('Test results saved successfully.');
                    set({ error: '' }); // Clear previous errors
                 }
            }

            // Clear saved state only AFTER successful grading and attempt to save
            localStorage.removeItem('currentTestState');

        } catch (err) {
            console.error('Error in test submission:', err);
            set({ error: 'Error grading test. Please try again.', isLoading: false, results: null }); // Clear results on grading error
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
        set({ isLoading: true, error: '' }); // Use a separate loading state if needed, or reuse main one

        try {
            // Example: Send feedback to a server endpoint
            // await fetch('/api/feedback', { method: 'POST', body: JSON.stringify({ feedback, testId: state.test?.id, userId: localStorage.getItem('studentId') }) });
            console.log('Feedback submitted successfully (simulated).');
            set({ userFeedback: '', isLoading: false, error: 'Feedback submitted successfully!' }); // Clear feedback on success
        } catch (err) {
            console.error("Feedback submission failed:", err);
            set({ isLoading: false, error: 'Failed to submit feedback. Please try again.' });
        }
    }

}));
// --- End Zustand Store Definition ---