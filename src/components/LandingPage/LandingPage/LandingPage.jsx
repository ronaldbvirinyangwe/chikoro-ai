import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./LandingPage.css";
import { motion, AnimatePresence } from "framer-motion";
import {assets} from "../../assets/assets"; // Assuming you have an assets folder for images

// In a real app, you would import these from your assets folder
// For now, these are placeholder image URLs for the demo
const demoImage1 = assets.choose_your_path;
const demoImage2 = assets.achieve_mastery;
const demoImage3 = assets.engage_and_learn;

// You would also import your logo from your assets
// For example: import logo from '../../assets/logo.png';

const LandingPage = () => {
  // State for the navbar scroll effect
  const [isScrolled, setIsScrolled] = useState(false);
  // State for the hero parallax effect
  const [parallaxOffset, setParallaxOffset] = useState(0);
  // State for the interactive product demo
  const [demoStep, setDemoStep] = useState(1);
  // State for animated text
  const [animatedTextComplete, setAnimatedTextComplete] = useState(false);

  // --- Intersection Observer States & Refs ---
  const [isFeaturesVisible, setIsFeaturesVisible] = useState(false);
  const [isDemoVisible, setIsDemoVisible] = useState(false);
  const [isTestimonialsVisible, setIsTestimonialsVisible] = useState(false);
  const [isHowItWorksVisible, setIsHowItWorksVisible] = useState(false);

  const featuresRef = useRef(null);
  const demoRef = useRef(null);
  const testimonialsRef = useRef(null);
  const howItWorksRef = useRef(null);

  useEffect(() => {
    // --- Combined Scroll Handler for multiple effects ---
    const handleScroll = () => {
      // 1. Navbar background effect
      setIsScrolled(window.scrollY > 50);
      // 2. Parallax effect calculation
      setParallaxOffset(window.scrollY * 0.3);
    };
    window.addEventListener("scroll", handleScroll);

    // --- Intersection Observer Setup for revealing sections on scroll ---
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    const observerCallback = (entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (entry.target === featuresRef.current) setIsFeaturesVisible(true);
          else if (entry.target === demoRef.current) setIsDemoVisible(true);
          else if (entry.target === testimonialsRef.current) setIsTestimonialsVisible(true);
          else if (entry.target === howItWorksRef.current) setIsHowItWorksVisible(true);
          observer.unobserve(entry.target); // Stop observing once visible
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    // Observe each section ref
    const refs = [featuresRef, demoRef, testimonialsRef, howItWorksRef];
    refs.forEach(ref => {
      if (ref.current) observer.observe(ref.current);
    });

    // --- Cleanup function on component unmount ---
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if(observer) observer.disconnect();
    };
  }, []);

  const youtubeEmbedUrl = "https://www.youtube.com/embed/hzwuUKD5ZLo?autoplay=1&mute=1&loop=1&playlist=hzwuUKD5ZLo,7VMAah1eVYI,WWJ3Q3y7t-s&controls=0&modestbranding=1"; // Replace with your actual YouTube embed URL

  const demoContent = {
    1: {
      title: "Choose Your Path",
      description: "Select from a wide range of subjects and let our AI curate the perfect learning journey for you.",
      image: demoImage1
    },
    2: {
      title: "Engage & Learn",
      description: "Interact with adaptive modules, get instant feedback, and track your progress in real-time on our dashboard.",
      image: demoImage2
    },
    3: {
      title: "Achieve Mastery",
      description: "Our system identifies your strengths and weaknesses, providing targeted exercises to help you succeed.",
      image: demoImage3
    }
  };

  return (
    <div className="landing-container">
      {/* Particle Background */}
      <div className="particles-container">
        <div className="matrix-dots"></div>
        <div className="particle particle-1"></div>
        <div className="particle particle-2"></div>
        <div className="particle particle-3"></div>
        <div className="particle particle-4"></div>
        <div className="particle particle-5"></div>
        <div className="particle particle-6"></div>
        <div className="particle particle-7"></div>
        <div className="particle particle-8"></div>
      </div>
      
      {/* Navigation Bar */}
      <nav className={`navbar ${isScrolled ? "scrolled" : ""}`}>
        <div className="nav-container">
          <Link to="/" className="logo-brand">
            {/* <img src={logo} alt="Chikoro AI" className="logo-icon" /> */}
            <span className="brand-name">
              <span className="gradient-text">Chikoro AI</span>
            </span>
          </Link>
          <div className="auth-section">
            <Link to="/login" className="auth-btn login-btn">
              Sign In
            </Link>
            <Link to="/signup" className="auth-btn signup-btn">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section with Parallax */}
      <section className="hero-section">
        <div
          className="parallax-bg"
          style={{ transform: `translateY(${parallaxOffset}px)` }}
        >
          <div className="floating-shape shape-1"></div>
          <div className="floating-shape shape-2"></div>
          <div className="floating-shape shape-3"></div>
          <div className="blur-circle circle-1"></div>
          <div className="blur-circle circle-2"></div>
        </div>
        
        <div className="hero-inner">
          <div className="hero-content">
          <motion.h1 
            className="hero-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <span className="animated-text">Reinventing Education</span>
            <br />
            <span className="gradient-text glitch-text">Through AI-Powered Learning</span>
            <span className="typing-cursor"></span>
          </motion.h1>
          
          <motion.p 
            className="hero-subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            Personalized learning experiences powered by adaptive AI, serving over 50,000 students.
          </motion.p>
          
          <motion.div 
            className="cta-group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            <Link to="/signup" className="cta-primary">
              <span className="btn-text">Get Started Free</span>
              <span className="btn-shine"></span>
            </Link>
          </motion.div>
          
          <div className="hero-floating-elements">
            <div className="floating-element element-1"></div>
            <div className="floating-element element-2"></div>
            <div className="floating-element element-3"></div>
          </div>
        </div>
        
        <motion.div 
          className="hero-video"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <div className="video-wrapper">
            <iframe
              src={youtubeEmbedUrl}
              title="Educational Video"
              frameBorder="0"
              allow="autoplay; encrypted-media"
              allowFullScreen
            ></iframe>
            <div className="video-border-effect"></div>
          </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section with Animated Icons */}
      <section ref={featuresRef} className={`features-section ${isFeaturesVisible ? 'is-visible' : ''}`}>
        <div className="section-background">
          <div className="bg-gradient-shape"></div>
        </div>
        <motion.h2 
          className="section-title gradient-text"
          initial={{ opacity: 0, y: 30 }}
          animate={isFeaturesVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          Why Chikoro AI?
        </motion.h2>
        <div className="features-container">
          <motion.div 
            className="feature-card"
            initial={{ opacity: 0, y: 50 }}
            animate={isFeaturesVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <div className="feature-icon">
              <div className="icon-3d-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M13.4142 12.0001L15.9497 9.46452L14.5355 8.0503L12 10.5859L9.46447 8.0503L8.05025 9.46452L10.5858 12.0001L8.05025 14.5356L9.46447 15.9498L12 13.4143L14.5355 15.9498L15.9497 14.5356L13.4142 12.0001Z M21.7071 2.29295C21.7071 2.29295 20.2929 0.878736 18.2929 2.87874C16.2929 4.87874 17.7071 6.29295 17.7071 6.29295C17.7071 6.29295 19.1213 7.70716 21.1213 5.70716C23.1213 3.70716 21.7071 2.29295 21.7071 2.29295Z M10 18.0001H4V22.0001H2V16.0001C2 15.4478 2.44772 15.0001 3 15.0001H11C11.5523 15.0001 12 15.4478 12 16.0001V22.0001H10V18.0001Z M12 1.9537L9.95355 4.00015L11.3678 5.41436L13.4142 3.36791L12 1.9537Z M8.53934 5.41436L4.29289 9.66081L2.87868 8.2466L7.12513 4.00015L8.53934 5.41436Z M6.46447 20.0001L5 18.5356L6.41421 17.1214L7.82843 18.5356L6.46447 20.0001Z"></path></svg>
              </div>
            </div>
            <h3 className="feature-title">Fast Learning</h3>
            <p className="feature-description">Our adaptive AI accelerates your learning pace with personalized content.</p>
            <div className="card-shine"></div>
          </motion.div>
          <motion.div 
            className="feature-card"
            initial={{ opacity: 0, y: 50 }}
            animate={isFeaturesVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <div className="feature-icon">
              <div className="icon-3d-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 13.5L9 11.5V14.5L12 16.5L15 14.5V11.5L12 13.5Z M12 2L1 7.5L3.5 9.11L12 14L20.5 9.11L23 7.5L12 2Z M3.5 10.91L1.5 12L12 17.5L22.5 12L20.5 10.91V16L19 16.75V11.8L12 15.5L5 11.8V16.75L3.5 16V10.91Z"></path></svg>
              </div>
            </div>
            <h3 className="feature-title">Expert Tutors</h3>
            <p className="feature-description">Get insights and support from our 24/7 subject-specific AI tutors.</p>
            <div className="card-shine"></div>
          </motion.div>
          <motion.div 
            className="feature-card"
            initial={{ opacity: 0, y: 50 }}
            animate={isFeaturesVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.5 }}
          >
            <div className="feature-icon">
              <div className="icon-3d-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM11 15H13V17H11V15ZM11 7H13V13H11V7Z"></path></svg>
              </div>
            </div>
            <h3 className="feature-title">Innovative Tools</h3>
            <p className="feature-description">Utilize cutting-edge tools to make learning interactive, fun, and effective.</p>
            <div className="card-shine"></div>
          </motion.div>
        </div>
      </section>

      {/* Interactive Product Demonstration Section */}
      <section ref={demoRef} className={`demo-section ${isDemoVisible ? 'is-visible' : ''}`}>
        <div className="demo-bg-wrapper">
          <div className="demo-bg-gradient"></div>
          <div className="demo-bg-shapes">
            <div className="demo-shape demo-shape-1"></div>
            <div className="demo-shape demo-shape-2"></div>
          </div>
        </div>
        
        <motion.h2 
          className="section-title gradient-text"
          initial={{ opacity: 0, y: 30 }}
          animate={isDemoVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          A Glimpse Inside
        </motion.h2>
        
        <div className="demo-container">
          <div className="demo-content">
            <motion.div 
              className={`demo-step ${demoStep === 1 ? 'active' : ''}`} 
              onClick={(e) => {
                // Create ripple effect
                const ripple = document.createElement('span');
                ripple.classList.add('ripple');
                const rect = e.currentTarget.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                ripple.style.width = ripple.style.height = `${size}px`;
                ripple.style.left = `${e.clientX - rect.left - size/2}px`;
                ripple.style.top = `${e.clientY - rect.top - size/2}px`;
                e.currentTarget.appendChild(ripple);
                
                setTimeout(() => {
                  ripple.remove();
                  setDemoStep(1);
                }, 600);
              }}
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <h3>1. Choose Your Path</h3>
            </motion.div>
            <motion.div 
              className={`demo-step ${demoStep === 2 ? 'active' : ''}`} 
              onClick={(e) => {
                // Create ripple effect
                const ripple = document.createElement('span');
                ripple.classList.add('ripple');
                const rect = e.currentTarget.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                ripple.style.width = ripple.style.height = `${size}px`;
                ripple.style.left = `${e.clientX - rect.left - size/2}px`;
                ripple.style.top = `${e.clientY - rect.top - size/2}px`;
                e.currentTarget.appendChild(ripple);
                
                setTimeout(() => {
                  ripple.remove();
                  setDemoStep(2);
                }, 600);
              }}
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <h3>2. Engage & Learn</h3>
            </motion.div>
            <motion.div 
              className={`demo-step ${demoStep === 3 ? 'active' : ''}`} 
              onClick={(e) => {
                // Create ripple effect
                const ripple = document.createElement('span');
                ripple.classList.add('ripple');
                const rect = e.currentTarget.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                ripple.style.width = ripple.style.height = `${size}px`;
                ripple.style.left = `${e.clientX - rect.left - size/2}px`;
                ripple.style.top = `${e.clientY - rect.top - size/2}px`;
                e.currentTarget.appendChild(ripple);
                
                setTimeout(() => {
                  ripple.remove();
                  setDemoStep(3);
                }, 600);
              }}
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <h3>3. Achieve Mastery</h3>
            </motion.div>
          </div>
          
          <AnimatePresence mode="wait">
            <motion.div 
              className="demo-display"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              key={`demo-${demoStep}`}
            >
            <motion.div 
              className="demo-text"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              key={`text-${demoStep}`}
            >
              <h4 className="gradient-text">{demoContent[demoStep].title}</h4>
              <p>{demoContent[demoStep].description}</p>
            </motion.div>
            
            <motion.div 
              className="demo-image-container"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              key={`image-container-${demoStep}`}
            >
              <div className="image-glow-effect"></div>
              <img src={demoContent[demoStep].image} alt={`Demonstration for step ${demoStep}`} key={`image-${demoStep}`} />
            </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* Testimonials Section */}
      <section ref={testimonialsRef} className={`testimonials-section ${isTestimonialsVisible ? 'is-visible' : ''}`}>
        <h2 className="section-title">Trusted by Learners in Zimbabwe</h2>
        <div className="testimonials-container">
          <div className="testimonial-card">
            <p className="testimonial-quote">"Chikoro AI has transformed my learning experience. The adaptive courses for ZIMSEC are simply outstanding!"</p>
            <p className="testimonial-author">- Tafara M., Harare</p>
          </div>
          <div className="testimonial-card">
            <p className="testimonial-quote">"I never thought A-Level chemistry could be this engaging. Highly recommend Chikoro AI to every student in Zimbabwe."</p>
            <p className="testimonial-author">- Tonderai N., Bulawayo</p>
          </div>
          <div className="testimonial-card">
            <p className="testimonial-quote">"The personalized approach makes learning so much more effective. It feels like it was designed just for me."</p>
            <p className="testimonial-author">- Nomatter C., Mutare</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section ref={howItWorksRef} className={`how-it-works-section ${isHowItWorksVisible ? 'is-visible' : ''}`}>
        <h2 className="section-title">Get Started in 3 Easy Steps</h2>
        <div className="steps-container">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3 className="step-title">Sign Up Free</h3>
            <p className="step-description">Create your account in seconds to get started with personalized learning.</p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3 className="step-title">Choose a Subject</h3>
            <p className="step-description">Select from ZIMSEC, Cambridge, or other curricula that suit your goals.</p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3 className="step-title">Learn & Grow</h3>
            <p className="step-description">Engage with adaptive content and interactive tools to master your subject.</p>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="final-cta-section">
        <div className="cta-bg-wrapper">
          <div className="cta-bg-gradient"></div>
          <div className="cta-particles">
            <div className="cta-particle cta-particle-1"></div>
            <div className="cta-particle cta-particle-2"></div>
            <div className="cta-particle cta-particle-3"></div>
          </div>
        </div>
        
        <motion.h2 
          className="section-title gradient-text"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          Ready to Transform Your Learning?
        </motion.h2>
        
        <motion.p 
          className="hero-subtitle"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          Join over 50,000 students and start your journey today.
        </motion.p>
        
        <motion.div 
          className="cta-group"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.4 }}
        >
          <Link to="/signup" className="cta-primary glow-button">
            <span className="btn-text">Join Now For Free</span>
            <span className="btn-shine"></span>
          </Link>
        </motion.div>
        
        <motion.div
          className="scroll-indicator"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          style={{
            position: 'absolute',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
            gap: '0.5rem'
          }}
        >
          <span style={{ fontWeight: 'light', color:'#000' }}>Thanks for visiting</span>
          <motion.div 
            style={{ 
              width: '30px', 
              height: '30px', 
              border: '2px solid var(--accent-color)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px var(--glow-color)'
            }}
            animate={{ 
              y: [0, 5, 0],
              boxShadow: [
                '0 0 5px var(--glow-color)',
                '0 0 15px var(--glow-color)',
                '0 0 5px var(--glow-color)'
              ]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 2,
              ease: "easeInOut"
            }}
          >
            <span style={{ 
              color: 'var(--accent-color)',
              fontSize: '1.2rem',
              fontWeight: 'bold'
            }}>✓</span>
          </motion.div>
        </motion.div>
        
        <div className="final-floating-elements">
          <div className="final-float final-float-1"></div>
          <div className="final-float final-float-2"></div>
          <div className="final-float final-float-3"></div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;