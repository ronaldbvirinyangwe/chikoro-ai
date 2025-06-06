// In SubjectSelect.jsx
import React, { useContext } from 'react'; // Only need these
import CardSection from './Cards';
import { Context } from '../../context/Context';
import { useNavigate } from "react-router-dom";

const SubjectSelect = () => {
    const navigate = useNavigate();
    // Get the SETTER function from context
    const { setSelectedSubject, setInput } = useContext(Context); 

    const handleCardClick = (subject) => {
        console.log(`CLICK: Setting subject to '${subject}'`); // DEBUG
        setSelectedSubject(subject); // This now updates context state & localStorage
        setInput(""); 
        navigate("/"); 
    };

    return (
        <div className="mainwindow-container">
            <CardSection handleCardClick={handleCardClick} />
        </div>
    );
};

export default SubjectSelect;