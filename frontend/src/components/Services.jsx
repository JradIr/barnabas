// Services.jsx
import React, { useState, useEffect } from "react";

export default function Services() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);

      // Scroll animations
      const fadeUpElements = document.querySelectorAll('.fade-up');
      fadeUpElements.forEach((el) => {
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

  const services = [
    {
      id: 1,
      name: "Teeth Cleaning",
      icon: "🦷",
      price: "₱1,000",
      duration: "30 minutes - 1 hour",
      type: "Minor Procedure",
      description: "Professional dental cleaning removes plaque, tartar, and stains to maintain optimal oral health and prevent gum disease.",
      benefits: [
        "Prevents cavities and gum disease",
        "Fresher breath",
        "Brighter smile",
        "Early detection of dental issues"
      ]
    },
    {
      id: 2,
      name: "Tooth Extraction",
      icon: "🔧",
      price: "₱1,000",
      duration: "30 minutes - 1 hour",
      type: "Minor Procedure",
      description: "Safe and gentle tooth removal for damaged, decayed, or problematic teeth to prevent further oral health complications.",
      benefits: [
        "Relieves pain and infection",
        "Prevents crowding",
        "Prepares for orthodontic treatment",
        "Eliminates problematic teeth"
      ]
    },
    {
      id: 3,
      name: "Tooth Filling",
      icon: "⭐",
      price: "₱1,000",
      duration: "30 minutes - 1 hour",
      type: "Minor Procedure",
      description: "Restore decayed or damaged teeth with high-quality composite fillings that match your natural tooth color.",
      benefits: [
        "Restores tooth function",
        "Natural appearance",
        "Prevents further decay",
        "Long-lasting durability"
      ]
    },
    {
      id: 4,
      name: "Braces",
      icon: "😁",
      price: "₱50,000",
      duration: "1 hour - 3 hours",
      type: "Major Procedure",
      description: "Traditional metal braces to straighten teeth, correct bite issues, and create a beautiful, aligned smile.",
      benefits: [
        "Straightens crooked teeth",
        "Corrects bite problems",
        "Improves oral hygiene access",
        "Boosts confidence and appearance"
      ]
    }
  ];

  return (
    <div className="services-page">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Our Dental Services</h1>
          <p className="hero-subtitle">
            Quality & Affordable Dental Care for Every Smile
          </p>
          <button 
            className="hero-btn" 
            onClick={() => document.getElementById('services-grid')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Explore Services
          </button>
        </div>
      </div>

      {/* Services Grid Section */}
      <div className="content-wrapper" id="services-grid">
        <h2 className="main-title fade-up">What We Offer</h2>
        <p className="main-subtitle fade-up">
          Professional dental services tailored to your needs
        </p>
        
        <div className="services-grid">
          {services.map((service, index) => (
            <div 
              key={service.id} 
              className={`service-card fade-up ${index % 2 === 0 ? 'delay-1' : 'delay-2'}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="service-icon">{service.icon}</div>
              <h3 className="service-name">{service.name}</h3>
              <div className="service-price">{service.price}</div>
              <div className="service-duration">⏱️ {service.duration}</div>
              <div className="service-type">
                <span className={`type-badge ${service.type === 'Minor Procedure' ? 'minor' : 'major'}`}>
                  {service.type}
                </span>
              </div>
              <p className="service-description">{service.description}</p>
              <div className="service-benefits">
                <strong>Benefits:</strong>
                <ul>
                  {service.benefits.map((benefit, idx) => (
                    <li key={idx}>{benefit}</li>
                  ))}
                </ul>
              </div>
              <button className="book-btn">Book Appointment</button>
            </div>
          ))}
        </div>

        {/* Additional Information Section for Scrolling Length */}
        <div className="additional-info fade-up">
          <h2>Why Choose Barnabas Dental Clinic?</h2>
          <div className="info-grid">
            <div className="info-card">
              <div className="info-icon">💰</div>
              <h3>Affordable Pricing</h3>
              <p>Quality dental care at competitive prices with transparent pricing and no hidden fees.</p>
            </div>
            <div className="info-card">
              <div className="info-icon">👨‍⚕️</div>
              <h3>Experienced Professionals</h3>
              <p>Our skilled dentists have years of experience providing exceptional dental care to thousands of patients.</p>
            </div>
            <div className="info-card">
              <div className="info-icon">🏥</div>
              <h3>Modern Facilities</h3>
              <p>State-of-the-art equipment and sterilized instruments for safe and effective treatments.</p>
            </div>
            <div className="info-card">
              <div className="info-icon">💚</div>
              <h3>Compassionate Care</h3>
              <p>We prioritize your comfort and provide a reassuring, supportive environment for every patient.</p>
            </div>
          </div>
        </div>

        {/* FAQ Section for Additional Scrolling */}
        <div className="faq-section fade-up">
          <h2>Frequently Asked Questions</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h3>🦷 How often should I get dental cleaning?</h3>
              <p>It is recommended to get professional teeth cleaning every 6 months to maintain optimal oral health and prevent dental issues.</p>
            </div>
            <div className="faq-item">
              <h3>🔧 Is tooth extraction painful?</h3>
              <p>We use local anesthesia to ensure you feel minimal to no pain during the extraction procedure. Post-procedure discomfort is manageable with prescribed medication.</p>
            </div>
            <div className="faq-item">
              <h3>⭐ How long do fillings last?</h3>
              <p>Composite fillings typically last 5-7 years with proper oral hygiene, but can last longer with regular dental check-ups and good care.</p>
            </div>
            <div className="faq-item">
              <h3>😁 How long do I need to wear braces?</h3>
              <p>Treatment duration varies from 18 to 36 months depending on the complexity of your case and your compliance with wearing elastics and retainers.</p>
            </div>
            <div className="faq-item">
              <h3>💰 Do you accept dental insurance?</h3>
              <p>Yes, we accept various dental insurance plans. Contact our clinic for more information about coverage and payment options.</p>
            </div>
            <div className="faq-item">
              <h3>⏰ Do you offer emergency dental services?</h3>
              <p>Yes, we provide 24/7 emergency dental support for urgent dental issues such as severe pain, broken teeth, or dental trauma.</p>
            </div>
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

        .services-page {
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
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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
          max-width: 1400px;
          margin: 0 auto;
          padding: 60px 20px;
        }

        /* Fade Up Animation */
        .fade-up {
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.6s ease;
        }

        .fade-up.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .delay-1 {
          transition-delay: 0.1s;
        }

        .delay-2 {
          transition-delay: 0.2s;
        }

        /* Main Titles */
        .main-title {
          text-align: center;
          font-size: 2.5rem;
          color: #0a4c4c;
          margin-bottom: 15px;
          font-weight: 700;
        }

        .main-subtitle {
          text-align: center;
          font-size: 1.1rem;
          color: #666;
          margin-bottom: 50px;
        }

        /* Services Grid - Flexbox Layout */
        .services-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 30px;
          justify-content: center;
          margin-bottom: 80px;
        }

        .service-card {
          flex: 1;
          min-width: 250px;
          max-width: 320px;
          background: #ffffff;
          border-radius: 20px;
          padding: 30px 20px;
          text-align: center;
          box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          border: 1px solid #e0e0e0;
        }

        .service-card:hover {
          transform: translateY(-10px);
          box-shadow: 0 15px 35px rgba(10, 76, 76, 0.15);
          border-color: #0a4c4c;
        }

        .service-icon {
          font-size: 4rem;
          margin-bottom: 15px;
        }

        .service-name {
          font-size: 1.5rem;
          color: #0a4c4c;
          margin-bottom: 10px;
          font-weight: 600;
        }

        .service-price {
          font-size: 1.8rem;
          font-weight: bold;
          color: #0a4c4c;
          margin-bottom: 8px;
        }

        .service-duration {
          font-size: 0.9rem;
          color: #666;
          margin-bottom: 10px;
        }

        .service-type {
          margin-bottom: 15px;
        }

        .type-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .type-badge.minor {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .type-badge.major {
          background: #fff3e0;
          color: #e65100;
        }

        .service-description {
          font-size: 0.9rem;
          color: #555;
          line-height: 1.5;
          margin-bottom: 15px;
        }

        .service-benefits {
          text-align: left;
          background: #f9f9f9;
          padding: 12px;
          border-radius: 12px;
          margin-bottom: 20px;
        }

        .service-benefits strong {
          color: #0a4c4c;
          display: block;
          margin-bottom: 8px;
        }

        .service-benefits ul {
          padding-left: 20px;
        }

        .service-benefits li {
          font-size: 0.8rem;
          color: #555;
          margin-bottom: 5px;
        }

        .book-btn {
          background: #0a4c4c;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 25px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 100%;
        }

        .book-btn:hover {
          background: #0d5c5c;
          transform: scale(1.02);
        }

        /* Additional Information Section */
        .additional-info {
          margin-bottom: 80px;
        }

        .additional-info h2 {
          text-align: center;
          font-size: 2rem;
          color: #0a4c4c;
          margin-bottom: 40px;
        }

        .info-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 25px;
          justify-content: center;
        }

        .info-card {
          flex: 1;
          min-width: 220px;
          max-width: 280px;
          text-align: center;
          padding: 25px;
          background: #f9f9f9;
          border-radius: 15px;
          transition: all 0.3s ease;
        }

        .info-card:hover {
          transform: translateY(-5px);
          background: #f0f0f0;
        }

        .info-icon {
          font-size: 2.5rem;
          margin-bottom: 15px;
        }

        .info-card h3 {
          color: #0a4c4c;
          margin-bottom: 10px;
          font-size: 1.2rem;
        }

        .info-card p {
          color: #666;
          font-size: 0.9rem;
          line-height: 1.5;
        }

        /* FAQ Section */
        .faq-section {
          margin-bottom: 80px;
        }

        .faq-section h2 {
          text-align: center;
          font-size: 2rem;
          color: #0a4c4c;
          margin-bottom: 40px;
        }

        .faq-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          justify-content: center;
        }

        .faq-item {
          flex: 1;
          min-width: 300px;
          background: #ffffff;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          border-left: 4px solid #0a4c4c;
        }

        .faq-item h3 {
          color: #0a4c4c;
          margin-bottom: 10px;
          font-size: 1rem;
        }

        .faq-item p {
          color: #666;
          font-size: 0.9rem;
          line-height: 1.5;
        }

        /* CTA Section */
        .cta-section {
          text-align: center;
          background: linear-gradient(135deg, #0a4c4c, #062828);
          padding: 50px 30px;
          border-radius: 20px;
          color: white;
        }

        .cta-section h2 {
          font-size: 1.8rem;
          margin-bottom: 15px;
        }

        .cta-section p {
          margin-bottom: 25px;
          opacity: 0.9;
        }

        .cta-btn {
          background: white;
          color: #0a4c4c;
          border: none;
          padding: 12px 30px;
          font-size: 1rem;
          font-weight: bold;
          border-radius: 30px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .cta-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
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
          .main-title {
            font-size: 1.8rem;
          }
          .services-grid {
            gap: 20px;
          }
          .service-card {
            min-width: 280px;
          }
          .info-grid {
            gap: 15px;
          }
          .faq-item {
            min-width: 100%;
          }
          .cta-section h2 {
            font-size: 1.4rem;
          }
        }

        @media (max-width: 480px) {
          .hero-title {
            font-size: 1.8rem;
          }
          .hero-subtitle {
            font-size: 0.9rem;
          }
          .main-title {
            font-size: 1.5rem;
          }
          .service-card {
            min-width: 100%;
          }
          .content-wrapper {
            padding: 40px 16px;
          }
        }
      `}</style>
    </div>
  );
}