import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import './PaperSelector.css';
import { assets } from '../../assets/assets';

const PaperSelector = () => {
  const navigate = useNavigate();
  const [papers, setPapers] = useState([]);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [pdfBlob, setPdfBlob] = useState(null); // State to store PDF blob
  const { darkMode } = useTheme();

  const samplePapers = [
    {
      id: 1,
      title: 'O level Accounts Paper 1',
      subject: 'Accounts',
      level: 'Form 4',
      thumbnail: assets.accounts,
      pdfFile: assets.accountsp1
    },
    {
      id: 2,
      title: 'O level Accounts Paper 2',
      subject: 'Accounts',
      level: 'Form 4',
      thumbnail: assets.accounts,
      pdfFile: assets.accountsp2
    },
    {
      id: 3,
      title: 'A level Accounts Paper 1',
      subject: 'Accounts',
      level: 'Form 6',
      thumbnail: assets.accounts,
      pdfFile: assets.accountsp1a
    },
    {
      id: 4,
      title: 'A level Accounts Paper 2',
      subject: 'Accounts',
      level: 'Form 6',
      thumbnail: assets.accounts,
      pdfFile: assets.accountsp2a
    },
    {
      id: 5,
      title: 'A level Accounts Paper 3',
      subject: 'Accounts',
      level: 'Form 6',
      thumbnail: assets.accounts,
      pdfFile: assets.accountsp3a
    },
    {
      id: 6,
      title: 'O level Agriculture Paper 1',
      subject: 'Agriculture',
      level: 'Form 4',
      thumbnail: assets.agriculture,
      pdfFile: assets.agricp1 
    },
    {
      id: 7,
      title: 'O level Agriculture Paper 2',
      subject:'Agriculture',
      level: 'Form 4',
      thumbnail: assets.agriculture,
      pdfFile: assets.agricp2
    },
    {
      id: 8,
      title: 'A level Agriculture Paper 1',
      subject: 'Agriculture',
      level: 'Form 6',
      thumbnail: assets.agriculture,
      pdfFile: assets.agricp1a 
    },
    {
      id: 9,
      title: 'A level Agriculture Paper 2',
      subject: 'Mathematics',
      level: 'Form 6',
      thumbnail: assets.agriculture,
      pdfFile: assets.agricp2a
    },
    {
      id: 10,
      title: 'A level Agriculture Paper 3',
      subject: 'Agriculture',
      level: 'Form 6',
      thumbnail: assets.agriculture,
      pdfFile: assets.agricp3a
    },
    {
      id: 11,
      title: 'A level Agriculture Paper 3',
      subject: 'Agriculture',
      level: 'Form 6',
      thumbnail: assets.agriculture,
      pdfFile: assets.agricp32a 
    },
    {
      id: 12,
      title: 'O level Art Paper 1',
      subject: 'Art',
      level: 'Form 4',
      thumbnail: assets.art,
      pdfFile: assets.artp1
    },
    {
      id: 14,
      title: 'O level Art Paper 3',
      subject: 'Art',
      level: 'Form 4',
      thumbnail: assets.art,
      pdfFile: assets.artp3
    },
    {
      id: 15,
      title: 'A level Art Paper 1',
      subject: 'Art',
      level: 'Form 6',
      thumbnail: assets.art,
      pdfFile: assets.artp1a 
    },
    {
      id: 16,
      title: 'A level Art Paper 2',
      subject: 'Art',
      level: 'Form 6',
      thumbnail: assets.art,
      pdfFile: assets.artp2a 
    },
    {
      id: 17,
      title: 'O level Biology Paper 1',
      subject: 'Biology',
      level: 'Form 6',
      thumbnail: assets.biology,
      pdfFile: assets.biologyp1 
    },
    {
      id: 18,
      title: 'O level Biology Paper 2',
      subject: 'Biology',
      level: 'Form 4',
      thumbnail: assets.biology,
      pdfFile: assets.biop2
    },
    {
      id: 19,
      title: 'O level Biology Paper 3',
      subject: 'Art',
      level: 'Form 4',
      thumbnail: assets.biology,
      pdfFile: assets.biop3 
    },
    {
      id: 20,
      title: 'O level Business Enterprise Paper 1',
      subject: 'Business Enterprise',
      level: 'Form 4',
      thumbnail: assets.business,
      pdfFile: assets.businessenterprisep1 
    },
    {
      id: 21,
      title: 'O Business Enterprise Paper 2',
      subject: 'Business Enterprise',
      level: 'Form 4',
      thumbnail: assets.business,
      pdfFile: assets.businessenterprisep2
    },
    {
      id: 22,
      title: 'A level Business Enterprise Paper 1',
      subject: 'Business Enterprise',
      level: 'Form 6',
      thumbnail: assets.business,
      pdfFile: assets.businessenterprisep1a 
    },
    {
      id: 23,
      title: 'A Level Business Enterprise Paper 2',
      subject: 'Business Enterprise',
      level: 'Form 6',
      thumbnail: assets.business,
      pdfFile: assets.businessenterprisep2a 
    },
    {
      id: 24,
      title: 'A level Business Studies Paper 1',
      subject: 'Business Studies',
      level: 'Form 6',
      thumbnail: assets.business,
      pdfFile: assets.businessstudiesp1a 
    },
    {
      id: 25,
      title: 'A level Art Paper 2',
      subject: 'Business Studies',
      level: 'Form 6',
      thumbnail: assets.business,
      pdfFile: assets.businessstudiesp2a 
    },
    {
      id: 26,
      title: 'O level Chemistry Paper 1',
      subject: 'Chemistry',
      level: 'Form 4',
      thumbnail: assets.chemistry,
      pdfFile: assets.chemistryp1 
    },
    {
      id: 27,
      title: 'O level Chemistry Paper 2',
      subject: 'Chemistry',
      level: 'Form 4',
      thumbnail: assets.chemistry,
      pdfFile: assets.chemistryp2 
    },
    {
      id: 28,
      title: 'O level Chemistry Paper 3',
      subject: 'Chemistry',
      level: 'Form 4',
      thumbnail: assets.chemistry,
      pdfFile: assets.chemistryp3 
    },
    {
      id: 29,
      title: 'A level Art Paper 1',
      subject: 'Chemistry',
      level: 'Form 6',
      thumbnail: assets.chemistry,
      pdfFile: assets.chemistryp1a 
    },
    {
      id: 30,
      title: 'A level Chemistry Paper 2',
      subject: 'Art',
      level: 'Form 6',
      thumbnail: assets.chemistry,
      pdfFile: assets.chemistryp2a 
    },
    {
      id: 31,
      title: 'A level Chemistry Paper 3',
      subject: 'Chemistry',
      level: 'Form 6',
      thumbnail: assets.chemistry,
      pdfFile: assets.chemistryp3a 
    },
    {
      id: 32,
      title: 'A level Art Paper 4',
      subject: 'Chemistry',
      level: 'Form 4',
      thumbnail: assets.chemistry,
      pdfFile: assets.chemistryp4a
    },
    {
      id: 33,
      title: 'O level Commerce Paper 1',
      subject: 'Commerce',
      level: 'Form 4',
      thumbnail: assets.commerce,
      pdfFile: assets.commercep1 
    },
    {
      id: 34,
      title: 'O level Commerce Paper 2',
      subject: 'Commerce',
      level: 'Form 4',
      thumbnail: assets.commerce,
      pdfFile: assets.commercep2 
    },
    {
      id: 35,
      title: 'O level Computer Science Paper 1',
      subject: 'Computer Science',
      level: 'Form 4',
      thumbnail: assets.computers,
      pdfFile: assets.computersp2 
    },
    {
      id: 36,
      title: 'O level Computer Science Paper 2',
      subject: 'Computer Science',
      level: 'Form 4',
      thumbnail: assets.computers,
      pdfFile: assets.computersp2 
    },
    {
      id: 37,
      title: 'O level Computer Science Paper 3',
      subject: 'Computer Science',
      level: 'Form 4',
      thumbnail: assets.computers,
      pdfFile: assets.computersp3 
    },
    {
      id: 38,
      title: 'A level Computer Science Paper 1',
      subject: 'Computer Science',
      level: 'Form 6',
      thumbnail: assets.computers,
      pdfFile: assets.computersciencep1a 
    },
    {
      id: 39,
      title: 'A level Computer Science Paper 2',
      subject: 'Computer Science',
      level: 'Form 6',
      thumbnail: assets.computers,
      pdfFile: assets.computersciencep2a 
    },
    {
      id: 40,
      title: 'O level FARES Paper 1',
      subject: 'FARES',
      level: 'Form 4',
      thumbnail: assets.fareme,
      pdfFile: assets.faresp1 
    },
    {
      id: 41,
      title: 'O level FARES Paper 2',
      subject: 'FARES',
      level: 'Form 4',
      thumbnail: assets.fareme,
      pdfFile: assets.faresp1 
    },
    {
      id: 42,
      title: 'A level FARES Paper 1',
      subject: 'FARES',
      level: 'Form 6',
      thumbnail: assets.fareme,
      pdfFile: assets.faresp1a 
    },
    {
      id: 43,
      title: 'A level FARES Paper 2',
      subject: 'FARES',
      level: 'Form 4',
      thumbnail: assets.fareme,
      pdfFile: assets.faresp2a 
    },
    {
      id: 44,
      title: 'O level Textile Design and Technology Paper 1',
      subject: 'Textile Design and Technology',
      level: 'Form 4',
      thumbnail: assets.fashion,
      pdfFile: assets.fashionp1
    },
    {
      id: 45,
      title: 'A level Textile Design and Technology Paper 1',
      subject: 'Textile Design and Technology',
      level: 'Form 6',
      thumbnail: assets.fashion,
      pdfFile: assets.fashionp1a 
    },
    {
      id: 46,
      title: 'A level Textile Design and Technology Paper 2',
      subject: 'Textile Design and Technology',
      level: 'Form 4',
      thumbnail: assets.fashion,
      pdfFile: assets.fashionp1a 
    },
    {
      id: 47,
      title: 'O level Foods and Nutrition Paper 1',
      subject: 'Foods and Nutrition',
      level: 'Form 4',
      thumbnail: assets.foods,
      pdfFile: assets.foodsp1
    },
    {
      id: 48,
      title: 'O level Foods and Nutrition Paper 2',
      subject: 'Foods and Nutrition',
      level: 'Form 4',
      thumbnail: assets.foods,
      pdfFile: assets.foodsp2 
    },
    {
      id: 49,
      title: 'A level Foods and Nutrition Paper 1',
      subject: 'Foods and Nutrition',
      level: 'Form 6',
      thumbnail: assets.foods,
      pdfFile: assets.foodp1 
    },
    {
      id: 50,
      title: 'A level Foods and Nutrition Paper 2',
      subject: 'Foods and Nutrition',
      level: 'Form 6',
      thumbnail: assets.foods,
      pdfFile: assets.foodp2 
    },
    {
      id: 51,
      title: 'O level Geography Paper 1',
      subject: 'Geography',
      level: 'Form 4',
      thumbnail: assets.geo,
      pdfFile: assets.geop1 
    },
    {
      id: 52,
      title: 'O level Geography Paper 2',
      subject: 'Geography',
      level: 'Form 4',
      thumbnail: assets.geo,
      pdfFile: assets.geop2
    },
    {
      id: 53,
      title: 'A level Geography Paper 1',
      subject: 'Geography',
      level: 'Form 6',
      thumbnail: assets.geo,
      pdfFile: assets.geop1a
    },
    {
      id: 54,
      title: 'A level Geography Paper 2',
      subject: 'Geography',
      level: 'Form 6',
      thumbnail: assets.geo,
      pdfFile: assets.geop2a
    },
    {
      id: 55,
      title: 'A level Geography Paper 3',
      subject: 'Geography',
      level: 'Form 6',
      thumbnail: assets.geo,
      pdfFile: assets.geop3a
    },
    {
      id: 56,
      title: 'A level History Paper 1',
      subject: 'History',
      level: 'Form 4',
      thumbnail: assets.history,
      pdfFile: assets.historyp1a
    },
    {
      id: 57,
      title: 'O level Maths Paper 1',
      subject: 'Maths',
      level: 'Form 4',
      thumbnail: assets.maths,
      pdfFile: assets.mathsp1
    },
    {
      id: 58,
      title: 'O level Maths Paper 2',
      subject: 'Maths',
      level: 'Form 4',
      thumbnail: assets.maths,
      pdfFile: assets.mathsp2
    },
    {
      id: 59,
      title: 'O level Metal Work Paper 1',
      subject: 'Metal Work',
      level: 'Form 4',
      thumbnail: assets.metal,
      pdfFile: assets.metalp1
    },
    {
      id: 60,
      title: 'O level Metal Work Paper 2',
      subject: 'Metal Work',
      level: 'Form 4',
      thumbnail: assets.metal,
      pdfFile: assets.metalp2
    },
    {
      id: 61,
      title: 'O level Metal Work Paper 3',
      subject: 'Metal Work',
      level: 'Form 4',
      thumbnail: assets.metal,
      pdfFile: assets.metalp3
    },
    {
      id: 62,
      title: 'A level Metal Work Paper 1',
      subject: 'Metal Work',
      level: 'Form 4',
      thumbnail: assets.metal,
      pdfFile: assets.metalp1a
    },
    {
      id: 63,
      title: 'A level Metal Work Paper 2',
      subject: 'Metal Work',
      level: 'Form 6',
      thumbnail: assets.metal,
      pdfFile: assets.metalp2a
    },
    {
      id: 64,
      title: 'A level Metal Work Paper 3',
      subject: 'Metal Work',
      level: 'Form 6',
      thumbnail: assets.metal,
      pdfFile: assets.metalp1
    },
    {
      id: 65,
      title: 'A level Metal Work Paper 4',
      subject: 'Metal Work',
      level: 'Form 6',
      thumbnail: assets.metal,
      pdfFile: assets.metalp4a
    },
    {
      id: 66,
      title: 'O level Music Paper 1',
      subject: 'Music',
      level: 'Form 4',
      thumbnail: assets.music,
      pdfFile: assets.musicp1
    },
    {
      id: 67,
      title: 'O level Music Paper 2',
      subject: 'Music',
      level: 'Form 4',
      thumbnail: assets.music,
      pdfFile: assets.musicp2
    },
    {
      id: 68,
      title: 'O level Music Paper 3',
      subject: 'Music',
      level: 'Form 4',
      thumbnail: assets.music,
      pdfFile: assets.musicp3
    },
    {
      id: 69,
      title: 'A level Music Paper 1',
      subject: 'Music',
      level: 'Form 6',
      thumbnail: assets.music,
      pdfFile: assets.musicp1a
    },
    {
      id: 70,
      title: 'A level Music Paper 2',
      subject: 'Music',
      level: 'Form 6',
      thumbnail: assets.music,
      pdfFile: assets.musicp2a
    },
    {
      id: 71,
      title: 'O level PE Paper 1',
      subject: 'Physical Education',
      level: 'Form 4',
      thumbnail: assets.pe,
      pdfFile: assets.pep1
    },
    {
      id: 72,
      title: 'O level PE Paper 2',
      subject: 'Physical Education',
      level: 'Form 4',
      thumbnail: assets.pe,
      pdfFile: assets.pep2
    },
    {
      id: 72,
      title: 'O level PE Paper 3',
      subject: 'Physical Education',
      level: 'Form 4',
      thumbnail: assets.pe,
      pdfFile: assets.pep3
    },
    {
      id: 73,
      title: 'A level PE Paper 1',
      subject: 'Physical Education',
      level: 'Form 6',
      thumbnail: assets.pe,
      pdfFile: assets.pep1a
    },
    {
      id: 74,
      title: 'A level PE Paper 2',
      subject: 'Physical Education',
      level: 'Form 6',
      thumbnail: assets.pe,
      pdfFile: assets.pep2a
    },
    {
      id: 75,
      title: 'A level PE Paper 3',
      subject: 'Physical Education',
      level: 'Form 6',
      thumbnail: assets.pe,
      pdfFile: assets.pep3a
    },
    {
      id: 76,
      title: 'O level Physics Paper 1',
      subject: 'Physical Education',
      level: 'Form 4',
      thumbnail: assets.physics,
      pdfFile: assets.physicsp1
    },
    {
      id: 77,
      title: 'O level Physics Paper 2',
      subject: 'Physical Education',
      level: 'Form 4',
      thumbnail: assets.physics,
      pdfFile: assets.physicsp2
    },
    {
      id: 78,
      title: 'O level Physics Paper 3',
      subject: 'Physical Education',
      level: 'Form 4',
      thumbnail: assets.physics,
      pdfFile: assets.physicsp3
    },
    {
      id: 79,
      title: 'A level Physics Paper 1',
      subject: 'Physical Education',
      level: 'Form 6',
      thumbnail: assets.physics,
      pdfFile: assets.physicsp1a
    },
    {
      id: 80,
      title: 'A level Physics Paper 2',
      subject: 'Physical Education',
      level: 'Form 6',
      thumbnail: assets.physics,
      pdfFile: assets.physicsp2a
    },
    {
      id: 81,
      title: 'O level PE Paper 3',
      subject: 'Physical Education',
      level: 'Form 6',
      thumbnail: assets.physics,
      pdfFile: assets.physicsp3a
    },
    {
      id: 82,
      title: 'O level Physics Paper 4',
      subject: 'Physical Education',
      level: 'Form 6',
      thumbnail: assets.physics,
      pdfFile: assets.physicsp4a
    },
    {
      id: 83,
      title: 'O level Combined Science Paper 1',
      subject: 'Combined Science',
      level: 'Form 4',
      thumbnail: assets.science,
      pdfFile: assets.sciencep1
    },
    {
      id: 84,
      title: 'O level Combined Science Paper 2',
      subject: 'Combined Science',
      level: 'Form 4',
      thumbnail: assets.science,
      pdfFile: assets.sciencep2
    },
    {
      id: 85,
      title: 'O level Combined Science Paper 3',
      subject: 'Combined Science',
      level: 'Form 4',
      thumbnail: assets.science,
      pdfFile: assets.sciencep3
    },
    {
      id: 86,
      title: 'O level Combined Science Paper 3',
      subject: 'Combined Science',
      level: 'Form 4',
      thumbnail: assets.science,
      pdfFile: assets.sciencep32
    },
    {
      id: 87,
      title: 'O level Combined Science Paper 3',
      subject: 'Combined Science',
      level: 'Form 4',
      thumbnail: assets.science,
      pdfFile: assets.sciencep3
    },
    {
      id: 88,
      title: 'O level Shona Paper 1',
      subject: 'Shona',
      level: 'Form 4',
      thumbnail: assets.shona,
      pdfFile: assets.shonap1
    },
    {
      id: 89,
      title: 'O level Shona Paper 2',
      subject: 'Shona',
      level: 'Form 4',
      thumbnail: assets.shona,
      pdfFile: assets.shonap2
    },
    {
      id: 90,
      title: 'O level Technical Graphics Paper 1',
      subject: 'Technical Graphics',
      level: 'Form 4',
      thumbnail: assets.technical,
      pdfFile: assets.tgp1
    },
    {
      id: 91,
      title: 'O level Technical Graphics Paper 2',
      subject: 'Technical Graphics',
      level: 'Form 4',
      thumbnail: assets.technical,
      pdfFile: assets.tgp2
    },
    {
      id: 92,
      title: 'O Technical Graphics Paper 3',
      subject: 'Technical Graphics',
      level: 'Form 4',
      thumbnail: assets.technical,
      pdfFile: assets.tgp3
    },
    {
      id: 93,
      title: 'A level Technical Graphics Paper 1',
      subject: 'Technical Graphics',
      level: 'Form 6',
      thumbnail: assets.technical,
      pdfFile: assets.sciencep3
    },
    {
      id: 94,
      title: 'A level Technical Graphics Paper 2',
      subject: 'Technical Graphics',
      level: 'Form 6',
      thumbnail: assets.technical,
      pdfFile: assets.tgp2a
    },
    {
      id: 95,
      title: 'A level Technical Graphics Paper 3',
      subject: 'Technical Graphics',
      level: 'Form 6',
      thumbnail: assets.technical,
      pdfFile: assets.tgp3a
    },
    {
      id: 96,
      title: 'O level Woodwork Paper 1',
      subject: 'Woodwork',
      level: 'Form 4',
      thumbnail: assets.woodwork,
      pdfFile: assets.woodp1
    },
    {
      id: 97,
      title: 'O level Woodwork Paper 2',
      subject: 'Woodwork',
      level: 'Form 4',
      thumbnail: assets.woodwork,
      pdfFile: assets.woodp2
    },
    {
      id: 98,
      title: 'O level Woodwork Paper 1',
      subject: 'Woodwork',
      level: 'Form 4',
      thumbnail: assets.woodwork,
      pdfFile: assets.woodp1
    },
    {
      id: 99,
      title: 'O level Woodwork Paper 2',
      subject: 'Woodwork',
      level: 'Form 4',
      thumbnail: assets.woodwork,
      pdfFile: assets.woodp2
    },
    {
      id: 100,
      title: 'O level Woodwork Paper 3',
      subject: 'Woodwork',
      level: 'Form 4',
      thumbnail: assets.woodwork,
      pdfFile: assets.woodp3
    },
    {
      id: 101,
      title: 'A level Woodwork Paper 1',
      subject: 'Woodwork',
      level: 'Form 6',
      thumbnail: assets.woodwork,
      pdfFile: assets.woodp1a
    },
    {
      id: 102,
      title: 'A level Woodwork Paper 2',
      subject: 'Woodwork',
      level: 'Form 6',
      thumbnail: assets.woodwork,
      pdfFile: assets.woodp2a
    },
    {
      id: 103,
      title: 'A level Woodwork Paper 3',
      subject: 'Woodwork',
      level: 'Form 6',
      thumbnail: assets.woodwork,
      pdfFile: assets.woodp3a
    },
    {
      id: 104,
      title: 'A level Woodwork Paper 4',
      subject: 'Woodwork',
      level: 'Form 6',
      thumbnail: assets.woodwork,
      pdfFile: assets.woodp4a
    },
  ];

  useEffect(() => {
    setPapers(samplePapers);
    return () => {
      // Clean up any blob URLs when component unmounts
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  const validatePDF = (blob) => {
    if (blob.size === 0) throw new Error('Empty PDF file');
    if (blob.type !== 'application/pdf') throw new Error('Invalid file type');
  };

  const handleSelectPaper = async (paper) => {
    setLoading(true);
    setError(null);
    setSelectedPaper(paper);
    setPdfBlob(null);
    setPreviewUrl(''); // Clear previous preview URL

    try {
      if (!paper.pdfFile) throw new Error('PDF file is missing');

      const response = await fetch(paper.pdfFile);
      const blob = await response.blob();

      // Validate PDF before showing preview
      validatePDF(blob);

      // Store the blob and show preview
      setPdfBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      setShowPreview(true);

    } catch (err) {
      console.error('Paper loading error:', err);
      setError(err.message || 'Failed to load paper');
      if (previewUrl) URL.revokeObjectURL(previewUrl); // Revoke preview URL on error
      setPreviewUrl(''); // Ensure previewUrl is cleared on error
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = () => {
    if (!pdfBlob || !selectedPaper) return;

    // Create file from the stored blob
    const file = new File([pdfBlob], `${selectedPaper.title}.pdf`, {
      type: 'application/pdf',
      lastModified: Date.now()
    });

    navigate('/', {
      state: {
        paperFile: file,
        paperPreview: previewUrl, // Use existing previewUrl
        paperTitle: selectedPaper.title,
        prompt: `Can we do this examination paper together ${selectedPaper.subject} paper: ${selectedPaper.title}`
      }
    });

    // Cleanup after proceed - keep preview open until navigation completes in case of slow network.
    // Cleanup will happen on component unmount or when selecting another paper.
    // setShowPreview(false); // Keep preview open during navigation for better UX
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    setSelectedPaper(null);
    setPdfBlob(null);
  };

  const [menuVisible, setMenuVisible] = useState(false);
  const toggleMenu = () => {
    setMenuVisible(prevState => !prevState);
  };

  const closeMenu = () => {
    setMenuVisible(false);
  };
  


  return (
    <div className={`paper-selector-container ${darkMode ? 'dark' : ''}`}>
       <header className={`l-header ${darkMode ? 'dark' : ''}`}>
          <nav className="nav bd-grid">
              <a href="/subjectselect" className="nav__logo">
                
              </a>
  
               <div className={`nav__menu ${menuVisible ? 'show' : ''}`} id="nav-menu">
            <ul className="nav__list">
              <li className="nav__item">
                <a className="nav__link" onClick={() => navigate('/discover')}>Discover</a> {/* Use navigate */}
              </li>
              <li className="nav__item">
                <a className="nav__link" onClick={() => navigate('/test')}>Test</a> {/* Use navigate */}
              </li>
              <li className="nav__item">
                <a className="nav__link" onClick={() => navigate('/exercise')}>Exercise</a> {/* Use navigate */}
              </li>
              <li className="nav__item">
                <a className="nav__link" onClick={() => navigate('/reports')}>Reports</a> {/* Use navigate */}
              </li>
            </ul>
          </div>
            <link href='https://cdn.jsdelivr.net/npm/boxicons@2.0.5/css/boxicons.min.css' rel='stylesheet' />
            <div className="nav__toggle" id="nav-toggle">
              <i className='bx bx-menu'></i>
            </div>
          </nav>
        </header>

      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Select a Past Paper
      </motion.h2>

      {error && (
        <motion.div
          className="error-message"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Error: {error}
        </motion.div>
      )}

      {showPreview && (
        <motion.div
          className="preview-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="preview-content">
            <div className="preview-header">
              <h3>{selectedPaper?.title}</h3>
              <button
                onClick={handleClosePreview}
                className="close-button"
              >
                ×
              </button>
            </div>

            <div className="pdf-preview-container">
              {loading ? (
                <div className="loading-spinner">Loading Preview...</div>
              ) : (
                <iframe
                  title="PDF Preview"
                  src={previewUrl}
                  width="100%"
                  height="500px"
                  style={{ border: 'none' }}
                  allowFullScreen
                />
              )}
            </div>

            <div className="preview-actions">
              <button
                onClick={handleProceed}
                className="proceed-button"
                disabled={loading}
              >
                Proceed to AI Interaction
              </button>
            </div>
          </div>
        </motion.div>
      )}


      <div className="paper-grid">
        {papers.map((paper) => (
          <motion.div
            key={paper.id}
            className={`paper-card ${selectedPaper?.id === paper.id && showPreview ? 'selected' : ''}`}
            onClick={() => handleSelectPaper(paper)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <div className="paper-thumbnail">
              <img
                src={paper.thumbnail}
                alt={paper.title}
                onError={(e) => e.target.src = assets.default_thumbnail}
              />
              <div className="paper-badge">{paper.subject}</div>
            </div>
            <div className="paper-info">
              <h3>{paper.title}</h3>
              <p>{paper.level}</p>
              {loading && selectedPaper?.id === paper.id && (
                <div className="loading-spinner">Loading PDF...</div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {papers.length === 0 && !loading && (
        <motion.div
          className="empty-state"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p>No papers available at the moment.</p>
        </motion.div>
      )}
    </div>
  );
};

export default PaperSelector;
