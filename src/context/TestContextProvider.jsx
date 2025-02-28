import React, { createContext, useState, useContext, useCallback } from 'react';
import { generateTestQuestions, gradeStudentResponses } from './testUtils';

// Create the context
const TestContext = createContext(null);

// Custom hook for using the context
export const useTest = () => {
  const context = useContext(TestContext);
  if (!context) {
    throw new Error('useTest must be used within a TestProvider');
  }
  return context;
};

// Provider component
export const TestProvider = ({ children }) => {
  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const generateNewTest = useCallback(async ({ subject, gradeLevel }) => {
    setIsLoading(true);
    setError('');
    
    try {
      const newTest = await generateTestQuestions({
        subject,
        gradeLevel,
        questionTypes: ["multiple-choice", "short-answer"],
        numQuestions: 5
      });
      
      setTest(newTest);
      setAnswers(new Array(newTest.questions.length).fill(''));
      setResults(null);
      setCurrentQuestion(0);
    } catch (err) {
      setError('Failed to generate test. Please try again.');
      console.error('Test generation error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitAnswer = useCallback((questionIndex, answer) => {
    setAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answer;
      return newAnswers;
    });
  }, []);

  const submitTest = useCallback(async () => {
    if (!test || answers.some(answer => !answer)) {
      setError('Please answer all questions before submitting');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const gradingResults = await gradeStudentResponses(test, answers);
      setResults(gradingResults);
    } catch (err) {
      setError('Error grading test. Please try again.');
      console.error('Grading error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [test, answers]);

  const resetTest = useCallback(() => {
    setTest(null);
    setAnswers([]);
    setResults(null);
    setCurrentQuestion(0);
    setError('');
  }, []);

  const navigateQuestion = useCallback((direction) => {
    setCurrentQuestion(prev => {
      if (direction === 'next' && prev < (test?.questions.length || 0) - 1) {
        return prev + 1;
      }
      if (direction === 'prev' && prev > 0) {
        return prev - 1;
      }
      return prev;
    });
  }, [test]);

  const value = {
    // State
    test,
    answers,
    results,
    isLoading,
    error,
    currentQuestion,
    
    // Actions
    generateNewTest,
    submitAnswer,
    submitTest,
    resetTest,
    navigateQuestion,
    
    // Computed values
    progress: test ? (answers.filter(Boolean).length / test.questions.length) * 100 : 0,
    currentQuestionData: test?.questions[currentQuestion] || null,
    isTestComplete: test ? answers.every(Boolean) : false
  };

  return (
    <TestContext.Provider value={value}>
      {children}
    </TestContext.Provider>
  );
};

// Example usage in a component:
/*
import { useTest } from './TestContext';

const TestComponent = () => {
  const { 
    test,
    currentQuestionData,
    submitAnswer,
    navigateQuestion,
    progress 
  } = useTest();

  // Use the context values and functions...
};
*/
