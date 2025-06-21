import React, { useContext, useState, useRef, useEffect } from "react";
import "./mainwindow.css";
import { assets } from "../../assets/assets";
import { Context } from "../../context/Context";
import { useNavigate, useLocation } from "react-router-dom";
import { fetchDynamicCards } from "../../config/image_understand";
import { FiUpload, FiSend, FiX } from "react-icons/fi";
// Make sure AnimatePresence is imported from framer-motion
import { motion, AnimatePresence } from "framer-motion";
import MathWhiteboard from "../MathWhiteboard/MathWhiteboard";
import PomodoroTimer from "./PomodoroTimer";

// ✅ 1. The data for the loading messages, placed at the top of the file.
const loadingMessages = {
  Mathematics: [
    "Solving this step by step...",
    "Crunching the numbers...",
    "Running the calculations...",
    "Plotting the variables...",
    "Checking my formulas...",
  ],
  History: [
    "Flipping through the pages of time...",
    "Consulting the historical archives...",
    "Uncovering the past...",
    "Connecting the dots in time...",
    "Checking my sources...",
  ],
  CombinedScience: [
    "Running a quick experiment...",
    "Analyzing the data...",
    "Formulating a hypothesis...",
    "Observing the results...",
    "Consulting the laws of nature...",
  ],
  Literature: [
    "Reading between the lines...",
    "Analyzing the prose...",
    "Consulting the classics...",
    "Exploring the character's motives...",
    "Unpacking the symbolism...",
  ],
  Geography: [
    "Charting the course...",
    "Exploring the continents...",
    "Pinpointing the location...",
    "Analyzing the topography...",
    "Reading the weather map...",
  ],
  Heritage: [
    "Exploring our cultural roots...",
    "Piecing together the past...",
    "Listening to the ancestors...",
    "Understanding our traditions...",
    "Revisiting our great monuments...",
  ],
  Shona: [
    "Ndiri kubatanidza mazwi...",
    "Ndiri kutarisa magwaro...",
    "Kuwana zvinoreva...",
    "Kuronga mutauro...",
    "Kududzira pfungwa...",
  ],
  English: [
    "Checking the grammar rules...",
    "Expanding the vocabulary...",
    "Perfecting the syntax...",
    "Analyzing the text...",
    "Dotting the i's and crossing the t's...",
  ],
  Isindebele: [
    "Ngihlanganisa amagama...",
    "Ngikhangela izaga...",
    "Ukuthola incazelo...",
    "Ngilungisa ulimi...",
    "Ukuhumusha umqondo...",
  ],
  FAREME: [
    "Reflecting on moral questions...",
    "Consulting sacred texts...",
    "Exploring different belief systems...",
    "Understanding family dynamics...",
    "Pondering the big questions...",
  ],
  HomeEconomics: [
    "Planning the household budget...",
    "Mastering home skills...",
    "Organizing the home...",
    "Perfecting the practicals...",
    "Balancing home life...",
  ],
  Agriculture: [
    "Analyzing the soil...",
    "Planning the planting season...",
    "Checking on the livestock...",
    "Forecasting the harvest...",
    "Studying crop cycles...",
  ],
  ComputerScience: [
    "Compiling the code...",
    "Running the algorithm...",
    "Processing the data...",
    "Debugging the logic...",
    "Querying the database...",
  ],
  Music: [
    "Composing the melody...",
    "Finding the right harmony...",
    "Setting the tempo...",
    "Reading the score...",
    "Tuning the instruments...",
  ],
  Art: [
    "Mixing the colors...",
    "Sketching the design...",
    "Finding the right perspective...",
    "Shaping the medium...",
    "Preparing the canvas...",
  ],
  PhysicalEducation: [
    "Analyzing the play...",
    "Studying human anatomy...",
    "Planning the workout...",
    "Focusing on the technique...",
    "Reviewing the rulebook...",
  ],
  BusinessStudies: [
    "Analyzing market trends...",
    "Developing the business plan...",
    "Assessing the competition...",
    "Crafting the strategy...",
    "Evaluating the enterprise...",
  ],
  Accounting: [
    "Balancing the ledgers...",
    "Calculating profit and loss...",
    "Reviewing the financial statements...",
    "Tracking the assets...",
    "Running the audit...",
  ],
  Commerce: [
    "Tracing the supply chain...",
    "Analyzing trade patterns...",
    "Understanding market forces...",
    "Evaluating consumer needs...",
    "Connecting producers and consumers...",
  ],
  Physics: [
    "Calculating the forces...",
    "Applying Newton's laws...",
    "Measuring the energy...",
    "Exploring quantum states...",
    "Solving for 'x' variables...",
  ],
  Biology: [
    "Examining the cell structure...",
    "Sequencing the DNA...",
    "Analyzing the ecosystem...",
    "Tracing the evolutionary path...",
    "Classifying the species...",
  ],
  Chemistry: [
    "Balancing the chemical equation...",
    "Analyzing the molecular bonds...",
    "Observing the reaction...",
    "Consulting the periodic table...",
    "Measuring the pH levels...",
  ],
  Woodwork: [
    "Measuring twice, cutting once...",
    "Selecting the right timber...",
    "Perfecting the joinery...",
    "Applying the finish...",
    "Drafting the design...",
  ],
  MetalWork: [
    "Calibrating the tools...",
    "Forging the metal...",
    "Welding the joints...",
    "Checking the tensile strength...",
    "Designing the components...",
  ],
  FoodAndNutrition: [
    "Analyzing nutritional content...",
    "Perfecting the recipe...",
    "Understanding food chemistry...",
    "Planning a balanced meal...",
    "Preheating the oven...",
  ],
  FashionAndFabrics: [
    "Designing the pattern...",
    "Selecting the right fabric...",
    "Threading the needle...",
    "Tailoring the final piece...",
    "Sketching the new collection...",
  ],
  TechnicalGraphics: [
    "Drafting the schematics...",
    "Checking the dimensions...",
    "Creating the 3D model...",
    "Projecting the isometric views...",
    "Finalizing the blueprints...",
  ],
  default: [
    "Thinking...",
    "Just a moment...",
    "Processing your request...",
    "Gathering information...",
    "One second...",
  ],
};

const AnimatedLoader = ({ subject }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const messages = loadingMessages[subject] || loadingMessages.default;

    useEffect(() => {
        const intervalId = setInterval(() => {
            setCurrentIndex(prevIndex => (prevIndex + 1) % messages.length);
        }, 2000); // Change message every 2 seconds

        return () => clearInterval(intervalId); // Cleanup timer
    }, [subject, messages.length]);

    return (
        <AnimatePresence mode="wait">
            <motion.p
                key={currentIndex}
                className="loading-text"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.5 }}
            >
                {messages[currentIndex]}
            </motion.p>
        </AnimatePresence>
    );
};

// ✅ 3. Your main window component.
const MainWindow = () => {
  const {
    onSent,
    showResult,
    loading,
    setInput,
    input,
    newChat,
    chatContainerRef,
    setShowWhiteboard,
    showWhiteboard,
    file,
    setFile,
    filePreview,
    setFilePreview,
    whiteboardDrawing,
    setWhiteboardDrawing,
    chatHistory,
    selectedSubject,
  } = useContext(Context);

  const navigate = useNavigate();
  const [dynamicCards, setDynamicCards] = useState([]);
  const textareaRef = useRef(null);
  const location = useLocation();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (location.state?.paperFile && !initialized) {
      const { paperFile } = location.state;
      setFile(paperFile);
      if (paperFile.type.startsWith("image/")) {
        setFilePreview(URL.createObjectURL(paperFile));
      } else if (paperFile.type === "application/pdf") {
        setFilePreview(assets.pdf);
      }
      setInitialized(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, initialized, setFile, setFilePreview]);

  useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [chatHistory]);

  useEffect(() => {
    if (selectedSubject && !showResult) {
      fetchDynamicCards(selectedSubject)
        .then(setDynamicCards)
        .catch((err) => console.error("Error fetching dynamic cards:", err));
    } else {
      setDynamicCards([]);
    }
  }, [selectedSubject, showResult]);

  // ✅ REMOVED: The old, broken getLoadingMessage function is gone.

  const handleWhiteboardSubmit = async (imageDataUrl) => {
    setWhiteboardDrawing(imageDataUrl);
    setShowWhiteboard(false);
    setFile(null);
    setFilePreview(imageDataUrl);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const handlePreviewClick = () => {
    if (filePreview && file?.type?.startsWith("image/")) {
      URL.revokeObjectURL(filePreview);
    }
    setFilePreview(null);
    setFile(null);
    setWhiteboardDrawing(null);
    const fileInput = document.getElementById("file-upload");
    if (fileInput) fileInput.value = "";
  };

  const renderFilePreview = () => {
    if (filePreview) {
      return (
        <div className="file-preview">
          <div className="image-preview-container">
            <img src={filePreview} alt="Preview" />
            <FiX className="remove-icon" onClick={handlePreviewClick} />
          </div>
        </div>
      );
    }
    return null;
  };

  const handleSend = () => {
    if (input.trim() || file || whiteboardDrawing) {
      onSent(input, file, whiteboardDrawing);
      setInput("");
      setFile(null);
      setFilePreview(null);
      setWhiteboardDrawing(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleInput = (event) => {
    setInput(event.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setWhiteboardDrawing(null);
      if (selectedFile.type.startsWith("image/")) {
        setFilePreview(URL.createObjectURL(selectedFile));
      } else if (selectedFile.type === "application/pdf") {
        setFilePreview(assets.pdf);
      }
      event.target.value = "";
    }
  };

   const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

  return (
        <div className="mainwindow">
            <div className="mains-container">
                {showWhiteboard ? <MathWhiteboard onSubmitDrawing={handleWhiteboardSubmit} /> : (
                    <>
                        {!showResult ? (
                           <div className="greet">
                                <p className="subtitle">Sarudza card rimwe utange kudzidza {selectedSubject}:</p>
                                <motion.div
                    className="cards-grid"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <AnimatePresence>
                      {dynamicCards.map((suggestion, index) => (
                        <motion.div
                          key={index}
                          className="card"
                          variants={cardVariants}
                          initial="hidden"
                          animate="visible"
                          exit="hidden"
                          transition={{ delay: index * 0.1 }}
                          onClick={() => setInput(suggestion)}
                          whileHover={{ scale: 1.02 }}
                        >
                          <p>{suggestion}</p>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                           </div>
                        ) : (
                            <div className="result">
                                <div className="chat-container" ref={chatContainerRef}>
                                    {chatHistory.map((message) => (
                                        <div key={message.id} className={`message ${message.type}-message`}>
                                            {message.type === 'bot' && <img src={assets.logo} alt="avatar" className="bot-avatar" />}
                                            <div className="message-content">
                                                {message.type === 'user' && (
                                                    <>
                                                        {message.attachment && (
                                                            <img src={message.attachment.url} alt={message.attachment.fileName || 'attachment'} className="image-attachment-preview"/>
                                                        )}
                                                        {/* Only render the p tag if there is text */}
                                                        {message.rawText && <p>{message.rawText}</p>}
                                                    </>
                                                )}
                                                {message.type === 'bot' && (
                                                    <>
                                                        {/* ✅ FIXED: Show loader ONLY when typing and there's no text yet */}
                                                        {message.isTyping && !message.htmlText && (
                                                            <div className="loader">
                                                                <AnimatedLoader subject={selectedSubject} />
                                                                <div className="typing-dots">
                                                                    <span></span><span></span><span></span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {/* Always render the content div, it will be populated by the stream */}
                                                        <div
                                                            className="response-content"
                                                            dangerouslySetInnerHTML={{ __html: message.htmlText || '' }}
                                                        />
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

      {!showWhiteboard && (
        <div className="input-section">
          <div className="search-container">
            {renderFilePreview()}

            <div className="input-wrapper">
              <textarea
                ref={textareaRef}
                className="chat-input"
                placeholder={
                  whiteboardDrawing
                    ? "Ask a question about your drawing..."
                    : file
                    ? `Ask about ${file.name}...`
                    : "Nyora mubvunzo wako pano..."
                }
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                rows="1"
              />
              <div className="input-controls">
                <label className="icon-button upload-button">
                  <FiUpload />
                  <input
                    type="file"
                    id="file-upload"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    hidden
                  />
                </label>
                {(input.trim() || file || whiteboardDrawing) && (
                  <motion.button
                    className="send-button"
                    onClick={handleSend}
                    disabled={loading}
                  >
                    <FiSend />
                  </motion.button>
                )}
              </div>
            </div>
          </div>
          <p className="disclaimer">
            Chikoro AI inogona kuratidza ruzivo rusina chokwadi...
          </p>
        </div>
      )}
    </div>
  );
};

export default MainWindow;
