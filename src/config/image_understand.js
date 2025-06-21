// =================================================================================
// Chikoro AI - Frontend API Service
// Purpose: This file acts as a clean interface between the React frontend and
// the backend server. All functions here make authenticated API calls to YOUR
// backend endpoints. It has no knowledge of Ollama, Google, or any other service.
// =================================================================================

// All API calls will be prefixed with this path and handled by the Vite proxy.
const API_BASE_URL = '/api/v1';

/**
 * Encodes an image file to a base64 string for sending to the backend.
 * @param {File} file The image file to encode.
 * @returns {Promise<string>} The base64-encoded image data with data URL prefix.
 */
const encodeImage = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// --- Helper for making authenticated fetch calls ---
const authenticatedFetch = async (url, options = {}) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        throw new Error("Authentication error: No token found.");
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
        // Try to parse error json, but have a fallback
        let errorMessage = `API Error: ${response.status} ${response.statusText}`;
        try {
            const errData = await response.json();
            errorMessage = errData.error || errorMessage;
        } catch (e) {
            // The response was not JSON, do nothing.
        }
        throw new Error(errorMessage);
    }

    return response.json();
};

/**
 * Main chat function. Sends prompt, history, and any files to the backend.
 * @param {string} prompt - The user's text prompt.
 * @param {File} [file=null] - An optional file (image).
 * @param {Array} [currentChatHistory=[]] - The current conversation history.
 * @returns {Promise<string>} The AI's text response.
//  */
// export async function runMulti(prompt, file = null, analysisData = null, currentChatHistory = []) {
//     try {
//         const payload = { prompt, history: currentChatHistory };
//         if (file) {
//             payload.file = {
//                 base64: await encodeImage(file),
//                 type: file.type,
//             };
//         }
        
//         const data = await authenticatedFetch(`${API_BASE_URL}/chat/conversation`, {
//             method: 'POST',
//             body: JSON.stringify(payload)
//         });
        
//         return data.text;

//     } catch (error) {
//         console.error("Error in runMulti:", error);
//         return `Sorry, an error occurred: ${error.message}`;
//     }
// }

/**
 * Fetches the chat history for a subject from the backend.
 * @param {string} subject - The subject to fetch history for.
 * @returns {Promise<Array>} The array of history items.
 */
export async function fetchHistory(subject) {
    const studentId = localStorage.getItem('profileId');
    if (!subject || !studentId) return [];

    try {
        // Note: Assumes your backend has a route like GET /api/v1/students/:id/history/:subject
        return await authenticatedFetch(`${API_BASE_URL}/students/${studentId}/history/${subject}`);
    } catch (error) {
        console.error("Error fetching history:", error);
        return []; // Return empty array on error
    }
}

/**
 * Sends a new conversation turn to the backend to be saved.
 * @param {string} subject - The subject of the conversation.
 * @param {object} userMessageObject - The user's message object.
 * @param {string} modelResponse - The AI's response text.
 */
export async function updateConversationHistory(subject, userMessageObject, modelResponse) {
    try {
        const payload = {
            subject,
            userMessage: userMessageObject.rawText,
            modelResponse,
            attachment: userMessageObject.attachment || null
        };
        // Note: Assumes your backend has a POST route to handle this.
        await authenticatedFetch(`${API_BASE_URL}/students/history/update`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        console.log("Conversation history update sent successfully.");
    } catch (error) {
        console.error("Exception caught while updating conversation history:", error);
    }
}

/**
 * Fetches dynamic learning topic cards from the backend.
 * @param {string} subject - The subject for which to generate cards.
 * @returns {Promise<Array<string>>}
 */
export async function fetchDynamicCards(subject) {
    try {
        return await authenticatedFetch(`${API_BASE_URL}/chat/dynamic-cards?subject=${subject}`);
    } catch (error) {
        console.error('Error fetching dynamic cards:', error);
        return [
            "What is a variable?",
            "How do plants make food?",
            "Can you explain fractions?",
            "Tell me about the Great Zimbabwe."
        ];
    }
}

/**
 * Generates a test by asking the backend.
 * @param {object} options - Options including subject, gradeLevel, numQuestions.
 * @returns {Promise<object>} The generated test object.
 */
export async function generateTestQuestions(options) {
    return authenticatedFetch(`${API_BASE_URL}/tests/generate`, {
        method: 'POST',
        body: JSON.stringify(options)
    });
}

/**
 * Sends a test and student answers to the backend for grading.
 * @param {object} test - The test object.
 * @param {Array<string>} studentAnswers - The student's answers.
 * @returns {Promise<object>} The grading results.
 */
export async function gradeStudentResponses(test, answers) {
    const bodyPayload = {
        test: test,
        answers: answers
    };

    try {
        const finalResults = await authenticatedFetch('/api/v1/tests/grade', {
            method: 'POST',
            body: JSON.stringify(bodyPayload)
        });
        return finalResults;
    } catch (error) {
        console.error("Error submitting test for grading:", error);
        throw error;
    }
}

/**
 * Submits drawing data to the backend to be saved.
 * @param {string} imageData - The base64 data URL of the drawing.
 * @param {string} studentId - The ID of the student.
 * @param {string} subject - The subject related to the drawing.
 * @returns {Promise<object>} The result from the backend.
 */
export async function submitDrawing(imageData, studentId, subject) {
    try {
        console.log("Submitting drawing for subject:", subject);
        const payload = {
            imageData,
            studentId, // Kept for backend validation if needed
            subject,
            timestamp: new Date().toISOString(),
        };
        // Using authenticatedFetch to call our secure backend endpoint
        return await authenticatedFetch(`${API_BASE_URL}/drawings`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.error('Error submitting drawing:', error);
        return { success: false, message: 'Failed to submit drawing' };
    }
}

/**
 * A wrapper function for analyzing math drawings. It prepares the file
 * and calls the main runMulti function with a specific prompt.
 * @param {string} imageData - The base64 image data URL of the drawing.
 * @returns {Promise<string>} The AI's analysis.
 */
// export async function analyzeMathDrawing(imageData) {
//     try {
//         const fetchResponse = await fetch(imageData);
//         const blob = await fetchResponse.blob();
//         const file = new File([blob], "math-drawing.png", { type: 'image/png' });
        
//         const prompt = "Please analyze this mathematical drawing or handwritten equation. Provide the solution if it's a problem, explain the concepts involved, and offer feedback or suggestions for improvement.";
        
//         // This correctly uses the existing runMulti function
//         return await runMulti(prompt, file, []); 

//     } catch (error) {
//         console.error('Error analyzing math drawing:', error);
//         return "Sorry, I couldn't analyze the drawing. Please try again.";
//     }
// }

  const generateStudentSummary = async (student) => {
     const studentId = localStorage.getItem('profileId');
    try {
      if (!student) {
        throw new Error('No student provided');
      }
  
      let studentDataString = '';
      const { name, age, academicLevel, chatHistory } = student;
  
      // Format the student data
      studentDataString += `Student Name: ${name}\nAge: ${age}\nAcademic Level: ${academicLevel}\n\n`;
  
      if (chatHistory) {
        Object.entries(chatHistory).forEach(([subject, chats]) => {
          studentDataString += `Subject: ${subject}\n`;
          studentDataString += `Chat History:\n`;
  
          chats.forEach(chat => {
            const timestamp = new Date(chat.timestamp).toLocaleString();
            studentDataString += `- ${chat.message} (${timestamp})\n`;
          });
          studentDataString += '\n';
        });
      }
  
      const prompt = `Generate a detailed academic report for this student based on their chat history:\n\n${studentDataString}\n\nInclude:\n1. Strengths\n2. Areas for improvement\n3. Recommended study topics\n4. Overall progress assessment`;
  
      const result = await model.generateContent([prompt]);
      return result.response.text();
    } catch (error) {
      console.error("Error generating student summary:", error);
      return "Error generating summary report.";
    }
  };

  export { generateStudentSummary };

// export default runMulti;
