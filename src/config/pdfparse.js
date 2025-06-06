import { GoogleGenerativeAI } from "@google/generative-ai";
import { PDFDocument } from 'pdf-lib';

const apiKey = "AIzaSyD4P_J74Atw1xJuAezcyne1K4b9_BYSpHM" || "AIzaSyDbcUbqLunVJXPPyMl7Y-GQAHOJZdyg460" || "AIzaSyDFtne0AocIQg0SSnXxKQa-HaPScej6HVI" || "AIzaSyDgjfLk1DJFm-rZtA5mkNWjRk4vsIyO_iI";  
const genAI = new GoogleGenerativeAI(apiKey);

export const handlePDFRequest = async (file, prompt, conversationHistory = []) => {
  try {
    // Encode PDF to base64
    const pdfBase64 = await encodeFile(file);
    
    // Extract text using pdf-lib
    const pdfText = await extractPDFText(file);

    // Initialize model with PDF-specific config
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: `
        You are a PDF analysis assistant for students. Focus on:
        1. Understanding and explaining PDF content
        2. Answering questions about the material
        3. Providing summaries and key points
        4. Maintaining academic context
      `,
    });

    // Construct the message parts
    const parts = [
      {
        inlineData: {
          data: pdfBase64,
          mimeType: 'application/pdf'
        }
      },
      { 
        text: `Student Query: ${prompt}\n\nPDF Content (partial):\n${pdfText.substring(0, 2000)}...` 
      }
    ];

    // Start chat session with conversation history
    const chatSession = model.startChat({
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
        responseMimeType: "text/plain"
      },
      history: conversationHistory
    });

    // Send message and get response
    const result = await chatSession.sendMessage(parts);
    const text = result.response.text();

    // Return updated history and response
    return {
      updatedHistory: [
        ...conversationHistory,
        { role: "user", parts },
        { role: "model", parts: [{ text }] }
      ],
      response: text
    };

  } catch (error) {
    console.error("PDF Handler Error:", error);
    return {
      updatedHistory: conversationHistory,
      response: "Sorry, I couldn't process that PDF. Please try again with a different file."
    };
  }
};

// Helper functions
async function encodeFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function extractPDFText(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    
    let fullText = '';
    const pageCount = pdfDoc.getPageCount();
    
    // Extract text from each page
    for (let i = 0; i < pageCount; i++) {
      const page = pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map(item => item.str).join(' ') + '\n';
    }
    
    return fullText || "No text content found in PDF";
  } catch (error) {
    console.error("PDF Extraction Error:", error);
    return "Could not extract text from PDF";
  }
}