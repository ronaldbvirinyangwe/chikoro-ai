import { createContext, useState, useRef } from "react";

export const Context = createContext();

const ContextProvider = (props) => {
  const [chatHistory, setChatHistory] = useState([]);
  const [currentPosition, setCurrentPosition] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const contextValue = {
    chatHistory,
    setChatHistory,
    currentPosition,
    setCurrentPosition,
  };

  return (
    <Context.Provider value={contextValue}>
      {props.children}
    </Context.Provider>
  );
};