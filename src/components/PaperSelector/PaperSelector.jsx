import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import './PaperSelector.css';
import { assets } from '../../assets/assets';
import Greeting from '../Enrol/Greeting';

const PaperSelector = () => {
  const navigate = useNavigate();
  const [papers, setPapers] = useState([]);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [pdfBlob, setPdfBlob] = useState(null);
  const [examBoardFilter, setExamBoardFilter] = useState('All');
  const { darkMode } = useTheme();


  const samplePapers = [
    {
      id: 1,
      title: "O level Accounts Paper 1",
      subject: "Accounts",
      level: "Form 4",
      thumbnail: assets.accounts,
      pdfFile: assets.accountsp1,
      examBoard: "Zimsec",
    },
    {
      id: 2,
      title: "O level Accounts Paper 2",
      subject: "Accounts",
      level: "Form 4",
      thumbnail: assets.accounts,
      pdfFile: assets.accountsp2,
      examBoard: "Zimsec",
    },
    {
      id: 3,
      title: "A level Accounts Paper 1",
      subject: "Accounts",
      level: "Form 6",
      thumbnail: assets.accounts,
      pdfFile: assets.accountsp1a,
      examBoard: "Zimsec",
    },
    {
      id: 4,
      title: "A level Accounts Paper 2",
      subject: "Accounts",
      level: "Form 6",
      thumbnail: assets.accounts,
      pdfFile: assets.accountsp2a,
      examBoard: "Zimsec",
    },
    {
      id: 5,
      title: "A level Accounts Paper 3",
      subject: "Accounts",
      level: "Form 6",
      thumbnail: assets.accounts,
      pdfFile: assets.accountsp3a,
      examBoard: "Zimsec",
    },
    {
      id: 6,
      title: "O level Agriculture Paper 1",
      subject: "Agriculture",
      level: "Form 4",
      thumbnail: assets.agriculture,
      pdfFile: assets.agricp1,
      examBoard: "Zimsec",
    },
    {
      id: 7,
      title: "O level Agriculture Paper 2",
      subject: "Agriculture",
      level: "Form 4",
      thumbnail: assets.agriculture,
      pdfFile: assets.agricp2,
      examBoard: "Zimsec",
    },
    {
      id: 8,
      title: "A level Agriculture Paper 1",
      subject: "Agriculture",
      level: "Form 6",
      thumbnail: assets.agriculture,
      pdfFile: assets.agricp1a,
      examBoard: "Zimsec",
    },
    {
      id: 9,
      title: "A level Agriculture Paper 2",
      subject: "Mathematics",
      level: "Form 6",
      thumbnail: assets.agriculture,
      pdfFile: assets.agricp2a,
      examBoard: "Zimsec",
    },
    {
      id: 10,
      title: "A level Agriculture Paper 3",
      subject: "Agriculture",
      level: "Form 6",
      thumbnail: assets.agriculture,
      pdfFile: assets.agricp3a,
      examBoard: "Zimsec",
    },
    {
      id: 11,
      title: "A level Agriculture Paper 3",
      subject: "Agriculture",
      level: "Form 6",
      thumbnail: assets.agriculture,
      pdfFile: assets.agricp32a,
      examBoard: "Zimsec",
    },
    {
      id: 12,
      title: "O level Art Paper 1",
      subject: "Art",
      level: "Form 4",
      thumbnail: assets.art,
      pdfFile: assets.artp1,
      examBoard: "Zimsec",
    },
    {
      id: 14,
      title: "O level Art Paper 3",
      subject: "Art",
      level: "Form 4",
      thumbnail: assets.art,
      pdfFile: assets.artp3,
      examBoard: "Zimsec",
    },
    {
      id: 15,
      title: "A level Art Paper 1",
      subject: "Art",
      level: "Form 6",
      thumbnail: assets.art,
      pdfFile: assets.artp1a,
      examBoard: "Zimsec",
    },
    {
      id: 16,
      title: "A level Art Paper 2",
      subject: "Art",
      level: "Form 6",
      thumbnail: assets.art,
      pdfFile: assets.artp2a,
      examBoard: "Zimsec",
    },
    {
      id: 17,
      title: "O level Biology Paper 1",
      subject: "Biology",
      level: "Form 6",
      thumbnail: assets.biology,
      pdfFile: assets.biologyp1,
      examBoard: "Zimsec",
    },
    {
      id: 18,
      title: "O level Biology Paper 2",
      subject: "Biology",
      level: "Form 4",
      thumbnail: assets.biology,
      pdfFile: assets.biop2,
      examBoard: "Zimsec",
    },
    {
      id: 19,
      title: "O level Biology Paper 3",
      subject: "Art",
      level: "Form 4",
      thumbnail: assets.biology,
      pdfFile: assets.biop3,
      examBoard: "Zimsec",
    },
    {
      id: 20,
      title: "O level Business Enterprise Paper 1",
      subject: "Business Enterprise",
      level: "Form 4",
      thumbnail: assets.business,
      pdfFile: assets.businessenterprisep1,
      examBoard: "Zimsec",
    },
    {
      id: 21,
      title: "O Business Enterprise Paper 2",
      subject: "Business Enterprise",
      level: "Form 4",
      thumbnail: assets.business,
      pdfFile: assets.businessenterprisep2,
      examBoard: "Zimsec",
    },
    {
      id: 22,
      title: "A level Business Enterprise Paper 1",
      subject: "Business Enterprise",
      level: "Form 6",
      thumbnail: assets.business,
      pdfFile: assets.businessenterprisep1a,
      examBoard: "Zimsec",
    },
    {
      id: 23,
      title: "A Level Business Enterprise Paper 2",
      subject: "Business Enterprise",
      level: "Form 6",
      thumbnail: assets.business,
      pdfFile: assets.businessenterprisep2a,
      examBoard: "Zimsec",
    },
    {
      id: 24,
      title: "A level Business Studies Paper 1",
      subject: "Business Studies",
      level: "Form 6",
      thumbnail: assets.business,
      pdfFile: assets.businessstudiesp1a,
      examBoard: "Zimsec",
    },
    {
      id: 25,
      title: "A level Art Paper 2",
      subject: "Business Studies",
      level: "Form 6",
      thumbnail: assets.business,
      pdfFile: assets.businessstudiesp2a,
      examBoard: "Zimsec",
    },
    {
      id: 26,
      title: "O level Chemistry Paper 1",
      subject: "Chemistry",
      level: "Form 4",
      thumbnail: assets.chemistry,
      pdfFile: assets.chemistryp1,
      examBoard: "Zimsec",
    },
    {
      id: 27,
      title: "O level Chemistry Paper 2",
      subject: "Chemistry",
      level: "Form 4",
      thumbnail: assets.chemistry,
      pdfFile: assets.chemistryp2,
      examBoard: "Zimsec",
    },
    {
      id: 28,
      title: "O level Chemistry Paper 3",
      subject: "Chemistry",
      level: "Form 4",
      thumbnail: assets.chemistry,
      pdfFile: assets.chemistryp3,
      examBoard: "Zimsec",
    },
    {
      id: 29,
      title: "A level Art Paper 1",
      subject: "Chemistry",
      level: "Form 6",
      thumbnail: assets.chemistry,
      pdfFile: assets.chemistryp1a,
      examBoard: "Zimsec",
    },
    {
      id: 30,
      title: "A level Chemistry Paper 2",
      subject: "Art",
      level: "Form 6",
      thumbnail: assets.chemistry,
      pdfFile: assets.chemistryp2a,
      examBoard: "Zimsec",
    },
    {
      id: 31,
      title: "A level Chemistry Paper 3",
      subject: "Chemistry",
      level: "Form 6",
      thumbnail: assets.chemistry,
      pdfFile: assets.chemistryp3a,
      examBoard: "Zimsec",
    },
    {
      id: 32,
      title: "A level Art Paper 4",
      subject: "Chemistry",
      level: "Form 4",
      thumbnail: assets.chemistry,
      pdfFile: assets.chemistryp4a,
      examBoard: "Zimsec",
    },
    {
      id: 33,
      title: "O level Commerce Paper 1",
      subject: "Commerce",
      level: "Form 4",
      thumbnail: assets.commerce,
      pdfFile: assets.commercep1,
      examBoard: "Zimsec",
    },
    {
      id: 34,
      title: "O level Commerce Paper 2",
      subject: "Commerce",
      level: "Form 4",
      thumbnail: assets.commerce,
      pdfFile: assets.commercep2,
      examBoard: "Zimsec",
    },
    {
      id: 35,
      title: "O level Computer Science Paper 1",
      subject: "Computer Science",
      level: "Form 4",
      thumbnail: assets.computers,
      pdfFile: assets.computersp2,
      examBoard: "Zimsec",
    },
    {
      id: 36,
      title: "O level Computer Science Paper 2",
      subject: "Computer Science",
      level: "Form 4",
      thumbnail: assets.computers,
      pdfFile: assets.computersp2,
      examBoard: "Zimsec",
    },
    {
      id: 37,
      title: "O level Computer Science Paper 3",
      subject: "Computer Science",
      level: "Form 4",
      thumbnail: assets.computers,
      pdfFile: assets.computersp3,
      examBoard: "Zimsec",
    },
    {
      id: 38,
      title: "A level Computer Science Paper 1",
      subject: "Computer Science",
      level: "Form 6",
      thumbnail: assets.computers,
      pdfFile: assets.computersciencep1a,
      examBoard: "Zimsec",
    },
    {
      id: 39,
      title: "A level Computer Science Paper 2",
      subject: "Computer Science",
      level: "Form 6",
      thumbnail: assets.computers,
      pdfFile: assets.computersciencep2a,
      examBoard: "Zimsec",
    },
    {
      id: 40,
      title: "O level FARES Paper 1",
      subject: "FARES",
      level: "Form 4",
      thumbnail: assets.fareme,
      pdfFile: assets.faresp1,
      examBoard: "Zimsec",
    },
    {
      id: 41,
      title: "O level FARES Paper 2",
      subject: "FARES",
      level: "Form 4",
      thumbnail: assets.fareme,
      pdfFile: assets.faresp1,
      examBoard: "Zimsec",
    },
    {
      id: 42,
      title: "A level FARES Paper 1",
      subject: "FARES",
      level: "Form 6",
      thumbnail: assets.fareme,
      pdfFile: assets.faresp1a,
      examBoard: "Zimsec",
    },
    {
      id: 43,
      title: "A level FARES Paper 2",
      subject: "FARES",
      level: "Form 4",
      thumbnail: assets.fareme,
      pdfFile: assets.faresp2a,
      examBoard: "Zimsec",
    },
    {
      id: 44,
      title: "O level Textile Design and Technology Paper 1",
      subject: "Textile Design and Technology",
      level: "Form 4",
      thumbnail: assets.fashion,
      pdfFile: assets.fashionp1,
      examBoard: "Zimsec",
    },
    {
      id: 45,
      title: "A level Textile Design and Technology Paper 1",
      subject: "Textile Design and Technology",
      level: "Form 6",
      thumbnail: assets.fashion,
      pdfFile: assets.fashionp1a,
      examBoard: "Zimsec",
    },
    {
      id: 46,
      title: "A level Textile Design and Technology Paper 2",
      subject: "Textile Design and Technology",
      level: "Form 4",
      thumbnail: assets.fashion,
      pdfFile: assets.fashionp1a,
      examBoard: "Zimsec",
    },
    {
      id: 47,
      title: "O level Foods and Nutrition Paper 1",
      subject: "Foods and Nutrition",
      level: "Form 4",
      thumbnail: assets.foods,
      pdfFile: assets.foodsp1,
      examBoard: "Zimsec",
    },
    {
      id: 48,
      title: "O level Foods and Nutrition Paper 2",
      subject: "Foods and Nutrition",
      level: "Form 4",
      thumbnail: assets.foods,
      pdfFile: assets.foodsp2,
      examBoard: "Zimsec",
    },
    {
      id: 49,
      title: "A level Foods and Nutrition Paper 1",
      subject: "Foods and Nutrition",
      level: "Form 6",
      thumbnail: assets.foods,
      pdfFile: assets.foodp1,
      examBoard: "Zimsec",
    },
    {
      id: 50,
      title: "A level Foods and Nutrition Paper 2",
      subject: "Foods and Nutrition",
      level: "Form 6",
      thumbnail: assets.foods,
      pdfFile: assets.foodp2,
      examBoard: "Zimsec",
    },
    {
      id: 51,
      title: "O level Geography Paper 1",
      subject: "Geography",
      level: "Form 4",
      thumbnail: assets.geo,
      pdfFile: assets.geop1,
      examBoard: "Zimsec",
    },
    {
      id: 52,
      title: "O level Geography Paper 2",
      subject: "Geography",
      level: "Form 4",
      thumbnail: assets.geo,
      pdfFile: assets.geop2,
      examBoard: "Zimsec",
    },
    {
      id: 53,
      title: "A level Geography Paper 1",
      subject: "Geography",
      level: "Form 6",
      thumbnail: assets.geo,
      pdfFile: assets.geop1a,
      examBoard: "Zimsec",
    },
    {
      id: 54,
      title: "A level Geography Paper 2",
      subject: "Geography",
      level: "Form 6",
      thumbnail: assets.geo,
      pdfFile: assets.geop2a,
      examBoard: "Zimsec",
    },
    {
      id: 55,
      title: "A level Geography Paper 3",
      subject: "Geography",
      level: "Form 6",
      thumbnail: assets.geo,
      pdfFile: assets.geop3a,
      examBoard: "Zimsec",
    },
    {
      id: 56,
      title: "A level History Paper 1",
      subject: "History",
      level: "Form 4",
      thumbnail: assets.history,
      pdfFile: assets.historyp1a,
      examBoard: "Zimsec",
    },
    {
      id: 57,
      title: "O level Maths Paper 1",
      subject: "Maths",
      level: "Form 4",
      thumbnail: assets.maths,
      pdfFile: assets.mathsp1,
      examBoard: "Zimsec",
    },
    {
      id: 58,
      title: "O level Maths Paper 2",
      subject: "Maths",
      level: "Form 4",
      thumbnail: assets.maths,
      pdfFile: assets.mathsp2,
      examBoard: "Zimsec",
    },
    {
      id: 59,
      title: "O level Metal Work Paper 1",
      subject: "Metal Work",
      level: "Form 4",
      thumbnail: assets.metal,
      pdfFile: assets.metalp1,
      examBoard: "Zimsec",
    },
    {
      id: 60,
      title: "O level Metal Work Paper 2",
      subject: "Metal Work",
      level: "Form 4",
      thumbnail: assets.metal,
      pdfFile: assets.metalp2,
      examBoard: "Zimsec",
    },
    {
      id: 61,
      title: "O level Metal Work Paper 3",
      subject: "Metal Work",
      level: "Form 4",
      thumbnail: assets.metal,
      pdfFile: assets.metalp3,
      examBoard: "Zimsec",
    },
    {
      id: 62,
      title: "A level Metal Work Paper 1",
      subject: "Metal Work",
      level: "Form 4",
      thumbnail: assets.metal,
      pdfFile: assets.metalp1a,
      examBoard: "Zimsec",
    },
    {
      id: 63,
      title: "A level Metal Work Paper 2",
      subject: "Metal Work",
      level: "Form 6",
      thumbnail: assets.metal,
      pdfFile: assets.metalp2a,
      examBoard: "Zimsec",
    },
    {
      id: 64,
      title: "A level Metal Work Paper 3",
      subject: "Metal Work",
      level: "Form 6",
      thumbnail: assets.metal,
      pdfFile: assets.metalp1,
      examBoard: "Zimsec",
    },
    {
      id: 65,
      title: "A level Metal Work Paper 4",
      subject: "Metal Work",
      level: "Form 6",
      thumbnail: assets.metal,
      pdfFile: assets.metalp4a,
      examBoard: "Zimsec",
    },
    {
      id: 66,
      title: "O level Music Paper 1",
      subject: "Music",
      level: "Form 4",
      thumbnail: assets.music,
      pdfFile: assets.musicp1,
      examBoard: "Zimsec",
    },
    {
      id: 67,
      title: "O level Music Paper 2",
      subject: "Music",
      level: "Form 4",
      thumbnail: assets.music,
      pdfFile: assets.musicp2,
      examBoard: "Zimsec",
    },
    {
      id: 68,
      title: "O level Music Paper 3",
      subject: "Music",
      level: "Form 4",
      thumbnail: assets.music,
      pdfFile: assets.musicp3,
      examBoard: "Zimsec",
    },
    {
      id: 69,
      title: "A level Music Paper 1",
      subject: "Music",
      level: "Form 6",
      thumbnail: assets.music,
      pdfFile: assets.musicp1a,
      examBoard: "Zimsec",
    },
    {
      id: 70,
      title: "A level Music Paper 2",
      subject: "Music",
      level: "Form 6",
      thumbnail: assets.music,
      pdfFile: assets.musicp2a,
      examBoard: "Zimsec",
    },
    {
      id: 71,
      title: "O level PE Paper 1",
      subject: "Physical Education",
      level: "Form 4",
      thumbnail: assets.pe,
      pdfFile: assets.pep1,
      examBoard: "Zimsec",
    },
    {
      id: 105,
      title: "O level PE Paper 2",
      subject: "Physical Education",
      level: "Form 4",
      thumbnail: assets.pe,
      pdfFile: assets.pep2,
      examBoard: "Zimsec",
    },
    {
      id: 72,
      title: "O level PE Paper 3",
      subject: "Physical Education",
      level: "Form 4",
      thumbnail: assets.pe,
      pdfFile: assets.pep3,
      examBoard: "Zimsec",
    },
    {
      id: 73,
      title: "A level PE Paper 1",
      subject: "Physical Education",
      level: "Form 6",
      thumbnail: assets.pe,
      pdfFile: assets.pep1a,
      examBoard: "Zimsec",
    },
    {
      id: 74,
      title: "A level PE Paper 2",
      subject: "Physical Education",
      level: "Form 6",
      thumbnail: assets.pe,
      pdfFile: assets.pep2a,
      examBoard: "Zimsec",
    },
    {
      id: 75,
      title: "A level PE Paper 3",
      subject: "Physical Education",
      level: "Form 6",
      thumbnail: assets.pe,
      pdfFile: assets.pep3a,
      examBoard: "Zimsec",
    },
    {
      id: 76,
      title: "O level Physics Paper 1",
      subject: "Physical Education",
      level: "Form 4",
      thumbnail: assets.physics,
      pdfFile: assets.physicsp1,
      examBoard: "Zimsec",
    },
    {
      id: 77,
      title: "O level Physics Paper 2",
      subject: "Physical Education",
      level: "Form 4",
      thumbnail: assets.physics,
      pdfFile: assets.physicsp2,
      examBoard: "Zimsec",
    },
    {
      id: 78,
      title: "O level Physics Paper 3",
      subject: "Physical Education",
      level: "Form 4",
      thumbnail: assets.physics,
      pdfFile: assets.physicsp3,
      examBoard: "Zimsec",
    },
    {
      id: 79,
      title: "A level Physics Paper 1",
      subject: "Physical Education",
      level: "Form 6",
      thumbnail: assets.physics,
      pdfFile: assets.physicsp1a,
      examBoard: "Zimsec",
    },
    {
      id: 80,
      title: "A level Physics Paper 2",
      subject: "Physical Education",
      level: "Form 6",
      thumbnail: assets.physics,
      pdfFile: assets.physicsp2a,
      examBoard: "Zimsec",
    },
    {
      id: 81,
      title: "O level PE Paper 3",
      subject: "Physical Education",
      level: "Form 6",
      thumbnail: assets.physics,
      pdfFile: assets.physicsp3a,
      examBoard: "Zimsec",
    },
    {
      id: 82,
      title: "O level Physics Paper 4",
      subject: "Physical Education",
      level: "Form 6",
      thumbnail: assets.physics,
      pdfFile: assets.physicsp4a,
      examBoard: "Zimsec",
    },
    {
      id: 83,
      title: "O level Combined Science Paper 1",
      subject: "Combined Science",
      level: "Form 4",
      thumbnail: assets.science,
      pdfFile: assets.sciencep1,
      examBoard: "Zimsec",
    },
    {
      id: 84,
      title: "O level Combined Science Paper 2",
      subject: "Combined Science",
      level: "Form 4",
      thumbnail: assets.science,
      pdfFile: assets.sciencep2,
      examBoard: "Zimsec",
    },
    {
      id: 85,
      title: "O level Combined Science Paper 3",
      subject: "Combined Science",
      level: "Form 4",
      thumbnail: assets.science,
      pdfFile: assets.sciencep3,
      examBoard: "Zimsec",
    },
    {
      id: 86,
      title: "O level Combined Science Paper 3",
      subject: "Combined Science",
      level: "Form 4",
      thumbnail: assets.science,
      pdfFile: assets.sciencep32,
      examBoard: "Zimsec",
    },
    {
      id: 87,
      title: "O level Combined Science Paper 3",
      subject: "Combined Science",
      level: "Form 4",
      thumbnail: assets.science,
      pdfFile: assets.sciencep3,
      examBoard: "Zimsec",
    },
    {
      id: 88,
      title: "O level Shona Paper 1",
      subject: "Shona",
      level: "Form 4",
      thumbnail: assets.shona,
      pdfFile: assets.shonap1,
      examBoard: "Zimsec",
    },
    {
      id: 89,
      title: "O level Shona Paper 2",
      subject: "Shona",
      level: "Form 4",
      thumbnail: assets.shona,
      pdfFile: assets.shonap2,
      examBoard: "Zimsec",
    },
    {
      id: 90,
      title: "O level Technical Graphics Paper 1",
      subject: "Technical Graphics",
      level: "Form 4",
      thumbnail: assets.technical,
      pdfFile: assets.tgp1,
      examBoard: "Zimsec",
    },
    {
      id: 91,
      title: "O level Technical Graphics Paper 2",
      subject: "Technical Graphics",
      level: "Form 4",
      thumbnail: assets.technical,
      pdfFile: assets.tgp2,
      examBoard: "Zimsec",
    },
    {
      id: 92,
      title: "O Technical Graphics Paper 3",
      subject: "Technical Graphics",
      level: "Form 4",
      thumbnail: assets.technical,
      pdfFile: assets.tgp3,
      examBoard: "Zimsec",
    },
    {
      id: 93,
      title: "A level Technical Graphics Paper 1",
      subject: "Technical Graphics",
      level: "Form 6",
      thumbnail: assets.technical,
      pdfFile: assets.sciencep3,
      examBoard: "Zimsec",
    },
    {
      id: 94,
      title: "A level Technical Graphics Paper 2",
      subject: "Technical Graphics",
      level: "Form 6",
      thumbnail: assets.technical,
      pdfFile: assets.tgp2a,
      examBoard: "Zimsec",
    },
    {
      id: 95,
      title: "A level Technical Graphics Paper 3",
      subject: "Technical Graphics",
      level: "Form 6",
      thumbnail: assets.technical,
      pdfFile: assets.tgp3a,
      examBoard: "Zimsec",
    },
    {
      id: 96,
      title: "O level Woodwork Paper 1",
      subject: "Woodwork",
      level: "Form 4",
      thumbnail: assets.woodwork,
      pdfFile: assets.woodp1,
      examBoard: "Zimsec",
    },
    {
      id: 97,
      title: "O level Woodwork Paper 2",
      subject: "Woodwork",
      level: "Form 4",
      thumbnail: assets.woodwork,
      pdfFile: assets.woodp2,
      examBoard: "Zimsec",
    },
    {
      id: 98,
      title: "O level Woodwork Paper 1",
      subject: "Woodwork",
      level: "Form 4",
      thumbnail: assets.woodwork,
      pdfFile: assets.woodp1,
      examBoard: "Zimsec",
    },
    {
      id: 99,
      title: "O level Woodwork Paper 2",
      subject: "Woodwork",
      level: "Form 4",
      thumbnail: assets.woodwork,
      pdfFile: assets.woodp2,
      examBoard: "Zimsec",
    },
    {
      id: 100,
      title: "O level Woodwork Paper 3",
      subject: "Woodwork",
      level: "Form 4",
      thumbnail: assets.woodwork,
      pdfFile: assets.woodp3,
      examBoard: "Zimsec",
    },
    {
      id: 101,
      title: "A level Woodwork Paper 1",
      subject: "Woodwork",
      level: "Form 6",
      thumbnail: assets.woodwork,
      pdfFile: assets.woodp1a,
      examBoard: "Zimsec",
    },
    {
      id: 102,
      title: "A level Woodwork Paper 2",
      subject: "Woodwork",
      level: "Form 6",
      thumbnail: assets.woodwork,
      pdfFile: assets.woodp2a,
      examBoard: "Zimsec",
    },
    {
      id: 103,
      title: "A level Woodwork Paper 3",
      subject: "Woodwork",
      level: "Form 6",
      thumbnail: assets.woodwork,
      pdfFile: assets.woodp3a,
      examBoard: "Zimsec",
    },
    {
      id: 104,
      title: "A level Woodwork Paper 4",
      subject: "Woodwork",
      level: "Form 6",
      thumbnail: assets.woodwork,
      pdfFile: assets.woodp4a,
      examBoard: "Zimsec",
    },
    {
      id: 106,
      title: "AS and A level Accounting Paper 3 insert nov 2024 9706/31",
      subject: "Accounting",
      level: "Form 6",
      thumbnail: assets.accounts,
      pdfFile: assets.accountingp3insertnov2024,
      examBoard: "Cambridge",
    },
    {
      id: 107,
      title: "AS and A level Accounting Paper 4  nov 2024 9706/41",
      subject: "Accounting",
      level: "Form 6",
      thumbnail: assets.accounts,
      pdfFile: assets.accountingp4nov2024,
      examBoard: "Cambridge",
    },
    {
      id: 108,
      title: "AS and A level Accounting Paper 4  nov 2024 9706/42",
      subject: "Accounting",
      level: "Form 6",
      thumbnail: assets.accounts,
      pdfFile: assets.accountingp4nov20242,
      examBoard: "Cambridge",
    },
    {
      id: 109,
      title: "AS and A level Accounting Paper 3  nov 2024 9706/33",
      subject: "Accounting",
      level: "Form 6",
      thumbnail: assets.accounts,
      pdfFile: assets.accountingp32024,
      examBoard: "Cambridge",
    },
    {
      id: 110,
      title: "AS and A level Accounting Paper 4  nov 2024 9706/42",
      subject: "Accounting",
      level: "Form 6",
      thumbnail: assets.accounts,
      pdfFile: assets.accountingp4nov20242,
      examBoard: "Cambridge",
    },
    {
      id: 111,
      title: "AS and A level Art Paper 1  nov 2019 9704/01",
      subject: "Art",
      level: "Form 6",
      thumbnail: assets.art,
      pdfFile: assets.artp1nov2019,
      examBoard: "Cambridge",
    },
    {
      id: 112,
      title: "AS and A level Art Paper 2  nov 2019 9704/02",
      subject: "Art",
      level: "Form 6",
      thumbnail: assets.art,
      pdfFile: assets.artp2nov2019,
      examBoard: "Cambridge",
    },
    {
      id: 113,
      title: "AS and A level Biology Paper 1  june 2014 9184/13",
      subject: "Biology",
      level: "Form 6",
      thumbnail: assets.biology,
      pdfFile: assets.biop1june2014,
      examBoard: "Cambridge",
    },
    {
      id: 114,
      title: "AS and A level Biology Paper 1  june 2014 9184/35",
      subject: "Biology",
      level: "Form 6",
      thumbnail: assets.biology,
      pdfFile: assets.biop1june20142,
      examBoard: "Cambridge",
    },
    {
      id: 115,
      title: "AS and A level Biology Paper 2  june 2014 9184/23",
      subject: "Biology",
      level: "Form 6",
      thumbnail: assets.biology,
      pdfFile: assets.biop2june2014,
      examBoard: "Cambridge",
    },
    {
      id: 116,
      title: "AS and A level Biology Paper 3  nov 2024 9700/31",
      subject: "Biology",
      level: "Form 6",
      thumbnail: assets.biology,
      pdfFile: assets.biop3nov2024,
      examBoard: "Cambridge",
    },
    {
      id: 117,
      title: "AS and A level Biology Paper 3  nov 2024 9700/33",
      subject: "Biology",
      level: "Form 6",
      thumbnail: assets.biology,
      pdfFile: assets.biop3nov20242,
      examBoard: "Cambridge",
    },
    {
      id: 118,
      title: "AS and A level Biology Paper 3  nov 2024 9700/34",
      subject: "Biology",
      level: "Form 6",
      thumbnail: assets.biology,
      pdfFile: assets.biop3nov20243,
      examBoard: "Cambridge",
    },
    {
      id: 119,
      title: "AS and A level Biology Paper 2  nov 2024 9700/35",
      subject: "Biology",
      level: "Form 6",
      thumbnail: assets.biology,
      pdfFile: assets.biop3nov20244,
      examBoard: "Cambridge",
    },
    {
      id: 120,
      title: "AS and A level Biology Paper 4  june 2014 9184/43",
      subject: "Biology",
      level: "Form 6",
      thumbnail: assets.biology,
      pdfFile: assets.biop4june2014,
      examBoard: "Cambridge",
    },
    {
      id: 121,
      title: "AS and A level Biology Paper 5  june 2014 9184/53",
      subject: "Biology",
      level: "Form 6",
      thumbnail: assets.biology,
      pdfFile: assets.biop5june2014,
      examBoard: "Cambridge",
    },
    {
      id: 122,
      title: "AS and A level Business Paper 1  nov 2024 9609/13",
      subject: "Business",
      level: "Form 6",
      thumbnail: assets.business,
      pdfFile: assets.businessp1,
      examBoard: "Cambridge",
    },
    {
      id: 123,
      title: "AS and A level Business Paper 1  nov 2024 9609/11",
      subject: "Business",
      level: "Form 6",
      thumbnail: assets.business,
      pdfFile: assets.businessp1nov2024,
      examBoard: "Cambridge",
    },
    {
      id: 124,
      title: "AS and A level Business Paper 1  nov 2024 9609/12",
      subject: "Business",
      level: "Form 6",
      thumbnail: assets.business,
      pdfFile: assets.businessp1nov20242,
      examBoard: "Cambridge",
    },
    {
      id: 125,
      title: "AS and A level Business Paper 3  nov 2014 9609/32",
      subject: "Business",
      level: "Form 6",
      thumbnail: assets.business,
      pdfFile: assets.businessp3nov2014,
      examBoard: "Cambridge",
    },
    {
      id: 126,
      title: "AS and A level Business Paper 3  nov 2014 9609/33",
      subject: "Business",
      level: "Form 6",
      thumbnail: assets.business,
      pdfFile: assets.businessp3nov2024,
      examBoard: "Cambridge",
    },
    {
      id: 127,
      title: "AS and A level Chemistry Paper 1  june 2024 9185/13",
      subject: "Chemistry",
      level: "Form 6",
      thumbnail: assets.chemistry,
      pdfFile: assets.chemistryp1june,
      examBoard: "Cambridge",
    },
    {
      id: 128,
      title: "AS and A level Chemistry Paper 1  nov 2024 9701/11",
      subject: "Chemistry",
      level: "Form 6",
      thumbnail: assets.chemistry,
      pdfFile: assets.chemistryp1nov2024,
      examBoard: "Cambridge",
    },
    {
      id: 129,
      title: "AS and A level Chemistry Paper 1  nov 2024 9701/12",
      subject: "Chemistry",
      level: "Form 6",
      thumbnail: assets.chemistry,
      pdfFile: assets.chemistryp1nov20242,
      examBoard: "Cambridge",
    },
    {
      id: 130,
      title: " Grade 7 Social Science Paper 1",
      subject: "Social Science",
      level: "Grade 7",
      thumbnail: assets.science_sub,
      pdfFile: assets.social_scienceg7p1,
      examBoard: "Zimsec",
    },
    {
      id: 131,
      title: " Grade 7 Social Science Paper 2",
      subject: "Social Science",
      level: "Grade 7",
      thumbnail: assets.science_sub,
      pdfFile: assets.social_scienceg7p2,
      examBoard: "Zimsec",
    },
    {
      id: 132,
      title: " Grade 7 Maths Paper 1",
      subject: "Maths",
      level: "Grade 7",
      thumbnail: assets.maths,
      pdfFile: assets.mathsg7p12,
      examBoard: "Zimsec",
    },
    {
      id: 133,
      title: " Grade 7 Maths Paper 2",
      subject: "Maths",
      level: "Grade 7",
      thumbnail: assets.maths,
      pdfFile: assets.mathsg7p2,
      examBoard: "Zimsec",
    },
    {
      id: 134,
      title: " Grade 7 English Paper 1",
      subject: "English",
      level: "Grade 7",
      thumbnail: assets.english,
      pdfFile: assets.englishg7p1,
      examBoard: "Zimsec",
    },
    {
      id: 135,
      title: " Grade 7 English Paper 2",
      subject: "English",
      level: "Grade 7",
      thumbnail: assets.english,
      pdfFile: assets.englishg7p2,
      examBoard: "Zimsec",
    },
    {
      id: 136,
      title: " Grade 7 Agric, Science and Tech Paper 1",
      subject: "Agric, Science and Tech",
      level: "Grade 7",
      thumbnail: assets.agriculture,
      pdfFile: assets.agric_scientechg7p1,
      examBoard: "Zimsec",
    },
    {
      id: 137,
      title: " Grade 7 Agric, Science and Tech Paper 2",
      subject: "Agric, Science and Tech",
      level: "Grade 7",
      thumbnail: assets.agriculture,
      pdfFile: assets.agric_scientechg7p2,
      examBoard: "Zimsec",
    },
  ];

  
  useEffect(() => {
    setPapers(samplePapers);
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  // Filtering function for exam boards
  const filteredPapers = papers.filter(paper => 
    examBoardFilter === 'All' || paper.examBoard === examBoardFilter
  );

  const validatePDF = (blob) => {
    if (blob.size === 0) throw new Error('Empty PDF file');
    if (blob.type !== 'application/pdf') throw new Error('Invalid file type');
  };

  const handleSelectPaper = async (paper) => {
    setLoading(true);
    setError(null);
    setSelectedPaper(paper);
    setPdfBlob(null);
    setPreviewUrl('');

    try {
      if (!paper.pdfFile) throw new Error('PDF file is missing');

      const response = await fetch(paper.pdfFile);
      const blob = await response.blob();

      validatePDF(blob);

      setPdfBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      setShowPreview(true);

    } catch (err) {
      console.error('Paper loading error:', err);
      setError(err.message || 'Failed to load paper');
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = () => {
    if (!pdfBlob || !selectedPaper) return;

    const file = new File([pdfBlob], `${selectedPaper.title}.pdf`, {
      type: 'application/pdf',
      lastModified: Date.now()
    });

    navigate('/', {
      state: {
        paperFile: file,
        paperPreview: previewUrl,
        paperTitle: selectedPaper.title,
      }
    });
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

  // Fixed examBoardFilter function - resolves naming conflict
  const handleExamBoardFilter = (boardType) => {
    // Update the state to the selected filter
    setExamBoardFilter(boardType);
    
    console.log(`Filter set to: ${boardType}`);
    
    // The actual filtering logic is handled by the filteredPapers constant
    // which uses the examBoardFilter state
  };

  return (
    <div className={`paper-selector-container ${darkMode ? "dark" : ""}`}>
      <header className={`l-header ${darkMode ? "dark" : ""}`}>
        <nav className="nav bd-grid">
          <Link to="/subjectselect" className="nav__logo">
            <Greeting />
          </Link>

          <div
            className={`nav__menu ${menuVisible ? "show" : ""}`}
            id="nav-menu"
          >
            <ul className="nav__list">
              {/* <li className="nav__item">
                <a className="nav__link" onClick={() => navigate("/discover")}>
                  Discover
                </a>
              </li> */}
              <li className="nav__item">
                <a className="nav__link" onClick={() => navigate("/test")}>
                  Test
                </a>
              </li>
              <li className="nav__item">
                <a className="nav__link" onClick={() => navigate("/papers")}>
                  Exam Papers
                </a>
              </li>
              <li className="nav__item">
                <a className="nav__link" onClick={() => navigate("/reports")}>
                  Reports
                </a>
              </li>
            </ul>
          </div>
          <link
            href="https://cdn.jsdelivr.net/npm/boxicons@2.0.5/css/boxicons.min.css"
            rel="stylesheet"
          />
          <div className="nav__toggle" id="nav-toggle" onClick={toggleMenu}>
            <i className="bx bx-menu"></i>
          </div>
        </nav>
      </header>

      {/* Exam Board Filter Buttons */}
      <div className="exam-board-filter">
        <button 
          onClick={() => handleExamBoardFilter('All')}
          className={`filter-btn all ${examBoardFilter === 'All' ? 'active' : ''}`}
        >
          All 
        </button>
        <button 
          onClick={() => handleExamBoardFilter('Zimsec')}
          className={`filter-btn zimsec ${examBoardFilter === 'Zimsec' ? 'active' : ''}`}
        >
          Zimsec
        </button>
        <button 
          onClick={() => handleExamBoardFilter('Cambridge')}
          className={`filter-btn cambridge ${examBoardFilter === 'Cambridge' ? 'active' : ''}`}
        >
          Cambridge 
        </button>
      </div>

      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
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
              <button onClick={handleClosePreview} className="close-button">
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
                  style={{ border: "none" }}
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
        {filteredPapers.map((paper) => (
          <motion.div
            key={paper.id}
            className={`paper-card ${
              selectedPaper?.id === paper.id && showPreview ? "selected" : ""
            }`}
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
                onError={(e) => (e.target.src = assets.default_thumbnail)}
              />
              <div className="paper-badge">
                {paper.subject} - {paper.examBoard}
              </div>
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

      {filteredPapers.length === 0 && !loading && (
        <motion.div
          className="empty-state"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p>No papers available for the selected exam board.</p>
        </motion.div>
      )}
    </div>
  );
};

export default PaperSelector;