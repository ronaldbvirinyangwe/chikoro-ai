import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./LandingPage.css";
import { assets } from "../../assets/assets";

const LandingPage = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Embed URL with 3 videos looping: primary video and two extras
  const youtubeEmbedUrl =
    "https://www.youtube.com/embed/hzwuUKD5ZLo?autoplay=1&mute=1&loop=1&playlist=hzwuUKD5ZLo,7VMAah1eVYI,WWJ3Q3y7t-s&controls=0&modestbranding=1";

  return (
    <div className="landing-container">
      {/* Navigation Bar */}
      <nav className={`navbar ${isScrolled ? "scrolled" : ""}`}>
        <div className="nav-container">
          <Link to="/login" className="logo-brand">
            <img
              src={assets.logo}
              alt="Chikoro AI"
              className="logo-icon"
            />
            <span className="brand-name">Chikoro AI</span>
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

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Reinventing Education
            <br />
            Through AI-Powered Learning
          </h1>
          <p className="hero-subtitle">
            Personalized learning experiences powered by adaptive AI, serving
            over 50,000 students.
          </p>
          <div className="cta-group">
            <Link to="/signup" className="cta-primary">
              Get Started
            </Link>
          </div>
        </div>
        <div className="hero-video">
          <iframe
            src={youtubeEmbedUrl}
            title="Educational Video"
            frameBorder="0"
            allow="autoplay; encrypted-media"
            allowFullScreen
          ></iframe>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title">Features</h2>
        <div className="features-container">
          <div className="feature-card">
            <div className="feature-icon">🚀</div>
            <h3 className="feature-title">Fast Learning</h3>
            <p className="feature-description">
              Adaptive AI accelerates your learning pace with personalized
              content.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎓</div>
            <h3 className="feature-title">Expert Tutors</h3>
            <p className="feature-description">
              Get insights and support from 24/7 subject-subject specific tutors
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💡</div>
            <h3 className="feature-title">Innovative Tools</h3>
            <p className="feature-description">
              Utilize cutting-edge tools to make learning interactive and fun.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <h2 className="section-title">Testimonials</h2>
        <div className="testimonials-container">
          <div className="testimonial-card">
            <p className="testimonial-quote">
              "Chikoro AI has transformed my learning experience. The adaptive
              courses are simply outstanding!"
            </p>
            <p className="testimonial-author">- Tafara Muchafa</p>
          </div>
          <div className="testimonial-card">
            <p className="testimonial-quote">
              "I never thought education could be this engaging. Highly recommend
              Chikoro AI to every student."
            </p>
            <p className="testimonial-author">- Tonderai Mashaya</p>
          </div>
          <div className="testimonial-card">
            <p className="testimonial-quote">
              "The personalized approach makes learning so much more effective
              and enjoyable."
            </p>
            <p className="testimonial-author">- Nomatter Neshiri</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <h2 className="section-title">How It Works</h2>
        <div className="steps-container">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3 className="step-title">Sign Up</h3>
            <p className="step-description">
              Create your account to get started with personalized learning.
            </p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3 className="step-title">Choose a Subject</h3>
            <p className="step-description">
              Select the course that best suits your interests and goals.
            </p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3 className="step-title">Learn & Grow</h3>
            <p className="step-description">
              Engage with adaptive content and interactive tools to master your
              subject.
            </p>
          </div>
        </div>
      </section>

      {/* Final Call-To-Action Section */}
      <section className="final-cta-section">
        <h2 className="section-title">
          Ready to Transform Your Learning?
        </h2>
        <div className="cta-group">
          <Link to="/signup" className="cta-primary">
            Join Now
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;