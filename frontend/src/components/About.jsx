// About.jsx
import React, { useState, useEffect } from "react";

export default function About() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);

      // Scroll animations for fade-up and fade-down elements
      const fadeUpElements = document.querySelectorAll('.fade-up');
      fadeUpElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        if (rect.top < windowHeight - 100 && rect.bottom > 50) {
          el.classList.add('visible');
        }
      });

      const fadeDownElements = document.querySelectorAll('.fade-down');
      fadeDownElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        if (rect.top < windowHeight - 100 && rect.bottom > 50) {
          el.classList.add('visible');
        }
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="about-page">
      {/* Hero Section with Gradient */}
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Barnabas Dental Clinic</h1>
          <p className="hero-subtitle">"Son of Encouragement" — Compassionate Care Since 2006</p>
          <button className="hero-btn" onClick={() => document.getElementById('story')?.scrollIntoView({ behavior: 'smooth' })}>
            Read Our Story
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="content-wrapper">
        {/* Founding Story - Left */}
        <div className="section fade-up left" id="story">
          <div className="container">
            <h2 className="section-title">Founding Story</h2>
            <div className="title-underline"></div>
            <p className="section-text">
              Barnabas Dental Clinic was founded in 2006 with a vision of delivering exceptional dental care grounded in compassion, integrity, and dedication; the founder began her journey immediately after earning her dental license, gaining experience in established clinics while nurturing the dream of creating her own practice.
            </p>
          </div>
        </div>

        {/* Humble Beginnings - Right */}
        <div className="section fade-down right">
          <div className="container">
            <h2 className="section-title">Humble Beginnings</h2>
            <div className="title-underline"></div>
            <p className="section-text">
              The clinic operated on modest beginnings—starting with basic equipment in a small boarding house where friends and colleagues became its first patients—and despite limited resources, the founder balanced multiple roles across respected institutions in Pasig, Santa Lucia, Camp Aguinaldo, and St. Camillus in Cainta.
            </p>
          </div>
        </div>

        {/* Turning Point - Left */}
        <div className="section fade-up left">
          <div className="container">
            <h2 className="section-title">Turning Point</h2>
            <div className="title-underline"></div>
            <p className="section-text">
              A pivotal turning point came after Typhoon Ondoy in 2009, when she acquired her first dental chair and transitioned into a small clinic space in Cainta, and in 2012 Barnabas Dental Clinic was formally registered.
            </p>
          </div>
        </div>

        {/* Full Commitment - Right */}
        <div className="section fade-down right">
          <div className="container">
            <h2 className="section-title">Full Commitment</h2>
            <div className="title-underline"></div>
            <p className="section-text">
              In 2016, with the steadfast support of her husband and family, the founder made the defining decision to focus fully on the clinic, allowing the practice to evolve into an advanced, well-equipped facility prioritizing both clinical excellence and patient comfort.
            </p>
          </div>
        </div>

        {/* Meaning of Barnabas - Left */}
        <div className="section fade-up left">
          <div className="container">
            <h2 className="section-title">The Meaning of Barnabas</h2>
            <div className="title-underline"></div>
            <p className="section-text">
              The name "Barnabas," meaning "son of encouragement," reflects the clinic's core philosophy to provide not only high-quality dental services but also a reassuring and supportive experience for every patient.
            </p>
          </div>
        </div>

        {/* Vision - Right */}
        <div className="section fade-down right">
          <div className="container">
            <h2 className="section-title">Our Vision</h2>
            <div className="title-underline"></div>
            <p className="section-text">
              The clinic's vision is to be a private dental clinic recognized for delivering excellent, patient-centered care and creating confident, healthy smiles in the community.
            </p>
          </div>
        </div>

        {/* Mission - Left */}
        <div className="section fade-up left">
          <div className="container">
            <h2 className="section-title">Our Mission</h2>
            <div className="title-underline"></div>
            <p className="section-text">
              Its mission is to provide quality and affordable dental services through skilled professionals, modern technology, and compassionate care, while promoting oral health, ensuring patient comfort, and building lasting relationships based on trust and integrity.
            </p>
          </div>
        </div>

        {/* Core Values - Right */}
        <div className="section fade-down right">
          <div className="container">
            <h2 className="section-title">Core Values</h2>
            <div className="title-underline"></div>
            <p className="section-text">
              The core values guiding the clinic are compassion, excellence, integrity, innovation, community, and trust.
            </p>
          </div>
        </div>

        {/* Barnabas Dental Clinic Today - Left */}
        <div className="section fade-up left">
          <div className="container">
            <h2 className="section-title">Barnabas Dental Clinic Today</h2>
            <div className="title-underline"></div>
            <p className="section-text">
              Today, nearly two decades since its founding, Barnabas Dental Clinic has evolved into a modern, well-equipped facility that serves generations of patients under the continued leadership of its founder, maintaining its founding principles of compassion, excellence, and integrity, with over 18 years of service, more than 1,000 happy patients, and 24/7 emergency support.
            </p>
          </div>
        </div>
      </div>

      {/* Scroll to Top Button */}
      <button className={`scroll-top-btn ${showScrollTop ? 'visible' : ''}`} onClick={scrollToTop}>
        ↑
      </button>

      {/* Internal CSS */}
      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .about-page {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: #ffffff;
          min-height: 100vh;
        }

        /* Hero Section with Gradient */
        .hero-section {
          background: linear-gradient(135deg, #0a4c4c 0%, #062828 50%, #0a4c4c 100%);
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .hero-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(10, 76, 76, 0.85), rgba(5, 45, 45, 0.95));
          z-index: 1;
        }

        .hero-section::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          animation: rotate 20s linear infinite;
          z-index: 0;
        }

        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .hero-content {
          position: relative;
          z-index: 2;
          color: white;
          padding: 20px;
          animation: fadeInUp 1s ease-out;
        }

        .hero-title {
          font-size: 3.5rem;
          margin-bottom: 1rem;
          letter-spacing: 2px;
        }

        .hero-subtitle {
          font-size: 1.3rem;
          margin-bottom: 2rem;
          opacity: 0.9;
        }

        .hero-btn {
          background: #ffffff;
          color: #0a4c4c;
          border: none;
          padding: 12px 30px;
          font-size: 1rem;
          font-weight: bold;
          border-radius: 30px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }

        .hero-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
          background: #f0f0f0;
        }

        /* Content Wrapper */
        .content-wrapper {
          max-width: 1000px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        /* Section Styling with Alternating Layouts */
        .section {
          margin-bottom: 30px;
          opacity: 0;
          transition: all 0.6s ease;
        }

        .section.left {
          text-align: left;
        }

        .section.right {
          text-align: right;
        }

        .section.fade-up {
          transform: translateY(30px);
        }

        .section.fade-up.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .section.fade-down {
          transform: translateY(-30px);
        }

        .section.fade-down.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .container {
          max-width: 800px;
          margin: 0 auto;
        }

        .section.left .container {
          margin-left: 0;
          margin-right: auto;
        }

        .section.right .container {
          margin-right: 0;
          margin-left: auto;
        }

        .section-title {
          font-size: 1.6rem;
          color: #0a4c4c;
          margin-bottom: 10px;
          font-weight: 600;
          letter-spacing: 1px;
        }

        .title-underline {
          width: 60px;
          height: 3px;
          background: #0a4c4c;
          margin-bottom: 20px;
          border-radius: 2px;
        }

        .section.left .title-underline {
          margin-left: 0;
          margin-right: auto;
        }

        .section.right .title-underline {
          margin-right: 0;
          margin-left: auto;
        }

        .section-text {
          font-size: 1rem;
          line-height: 1.6;
          color: #0a4c4c;
          background: #ffffff;
          padding: 16px 20px;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .section-text:hover {
          box-shadow: 0 4px 12px rgba(10, 76, 76, 0.15);
          transform: translateX(5px);
        }

        .section.left .section-text:hover {
          transform: translateX(5px);
        }

        .section.right .section-text:hover {
          transform: translateX(-5px);
        }

        /* Scroll to Top Button */
        .scroll-top-btn {
          position: fixed;
          bottom: 30px;
          right: 30px;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0a4c4c, #062828);
          color: white;
          border: none;
          font-size: 24px;
          cursor: pointer;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .scroll-top-btn.visible {
          opacity: 1;
          visibility: visible;
        }

        .scroll-top-btn:hover {
          background: linear-gradient(135deg, #0d5c5c, #0a4c4c);
          transform: translateY(-3px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        /* Animations */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .hero-title {
            font-size: 2.2rem;
          }
          .hero-subtitle {
            font-size: 1rem;
          }
          .section-title {
            font-size: 1.4rem;
          }
          .section-text {
            font-size: 0.95rem;
            padding: 14px 18px;
          }
          .content-wrapper {
            padding: 30px 16px;
          }
          .section {
            margin-bottom: 25px;
          }
          .section.left .container,
          .section.right .container {
            margin-left: auto;
            margin-right: auto;
          }
          .section.left,
          .section.right {
            text-align: center;
          }
          .section.left .title-underline,
          .section.right .title-underline {
            margin-left: auto;
            margin-right: auto;
          }
        }

        @media (max-width: 480px) {
          .hero-title {
            font-size: 1.8rem;
          }
          .hero-subtitle {
            font-size: 0.9rem;
          }
          .hero-btn {
            padding: 10px 24px;
            font-size: 0.9rem;
          }
          .section-title {
            font-size: 1.3rem;
          }
          .section-text {
            font-size: 0.9rem;
            padding: 12px 15px;
          }
          .section {
            margin-bottom: 20px;
          }
        }
      `}</style>
    </div>
  );
}