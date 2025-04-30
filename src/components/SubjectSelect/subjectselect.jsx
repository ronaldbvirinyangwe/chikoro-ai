import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import './subjectselect.css';
import CardSection from './Cards';
import { Context } from '../../context/Context';
import { useNavigate } from "react-router-dom";

const SubjectSelect = () => {
  const [studentId, setStudentId] = useState(localStorage.getItem('studentId'));
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [studentGrade, setStudentGrade] = useState(localStorage.getItem('studentGrade')); 
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const {newChat}  =  useContext(Context);

  const { setInput } = useContext(Context);
  const navigate = useNavigate();
  const BASE_API_URL = 'http://chikoro-ai.com';

  useEffect(() => {
    newChat(); // Reset chat state whenever ChatPage is loaded or subject changes
  }, [selectedSubject, newChat]);

  // Fetch chat history
  useEffect(() => {
    const fetchChatHistory = async () => {
      if (!studentId || !selectedSubject) {
        return; // Don't fetch data if either is missing
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await axios.get(
          `${BASE_API_URL}/chat-history/${selectedSubject}`
        );
        setChatHistory(response.data || []);
      } catch (error) {
        setError('Failed to load chat history');
        setChatHistory([]);
      } finally {
        setIsLoading(false);
      }
    };
    

    fetchChatHistory();
  }, [studentId, selectedSubject]);

  const OpenMainWindow = () => {
    navigate("/");
  };

  const handleCardClick = (subject) => {
    localStorage.setItem('selectedSubject', subject);
    setSelectedSubject(subject);
    OpenMainWindow();
    localStorage.setItem('studentGrade', studentGrade);
    newChat();
  };

  const handleChatInputChange = (e) => {
    setChatMessage(e.target.value);
  };

  // Send chat message
  const handleSendChatMessage = async () => {
    if (chatMessage.trim() === '' || !selectedSubject || !studentId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${BASE_API_URL}/students/${studentId}/chat/${selectedSubject}`,
        { 
          message: chatMessage,
          subject: selectedSubject 
        }
      );

      // Add new message to chat history
      setChatHistory(prevHistory => [...prevHistory, {
        message: chatMessage,
        timestamp: new Date(),
        type: 'user'
      }]);
      
      setChatMessage('');
    } catch (error) {
      setError('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search
  const handleSearch = async () => {
    if (!query.trim() || !selectedSubject || !studentId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post('${BASE_API_URL}/search', {
        query,
        studentId,
        subject: selectedSubject
      });

      // Process and format search results
      const formattedResults = response.data.items?.map(item => ({
        title: item.title,
        snippet: item.snippet,
        link: item.link
      })) || [];

      setSearchResults(formattedResults);

      // Add search results to chat history
      if (formattedResults.length > 0) {
        setChatHistory(prevHistory => [...prevHistory, {
          type: 'search',
          message: `Search results for: ${query}`,
          timestamp: new Date(),
          results: formattedResults
        }]);
      }

      setQuery(''); // Clear search input
    } catch (error) {
      setError('Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle enter key press
  const handleKeyPress = (e, type) => {
    if (e.key === 'Enter') {
      if (type === 'chat') {
        handleSendChatMessage();
      } else if (type === 'search') {
        handleSearch();
      }
    }
  };

  return (
    <div className="mainwindow-container">
        <CardSection handleCardClick={handleCardClick} />
      <div className="chat-section">
        {selectedSubject && (
          <div className="subject-header">
            <h2>{selectedSubject}</h2>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubjectSelect;