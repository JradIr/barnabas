import AxiosInstance from './AxiosInstance'
import React, { useEffect, useMemo, useState, useRef } from 'react'
import { Box, Typography, Button, Grid, Accordion, AccordionSummary, AccordionDetails, Fab, Container } from '@mui/material'
import { BubbleChat } from 'flowise-embed-react'
import { useNavigate } from 'react-router-dom'
import './style/Home.css'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import PeopleIcon from '@mui/icons-material/People'
import StarIcon from '@mui/icons-material/Star'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import SpeedIcon from '@mui/icons-material/Speed'

const Home = () => {
  const [myData, setMyData] = useState([])
  const [loading, setLoading] = useState(true)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const navigate = useNavigate()

  // Refs for animated sections
  const featuresRef = useRef(null)
  const servicesRef = useRef(null)
  const aboutRef = useRef(null)

  const GetData = () => {
    AxiosInstance.get('users/')
      .then((res) => {
        setMyData(res.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    GetData()
  }, [])

  // Scroll animation observer
  useEffect(() => {
    const handleScroll = () => {
      // Show/hide scroll top button
      if (window.scrollY > 300) {
        setShowScrollTop(true)
      } else {
        setShowScrollTop(false)
      }

      // Animate sections on scroll
      const sections = document.querySelectorAll('.fade-up, .fade-left, .fade-right, .scale-in')
      sections.forEach(section => {
        const sectionTop = section.getBoundingClientRect().top
        const windowHeight = window.innerHeight
        if (sectionTop < windowHeight - 100) {
          section.classList.add('visible')
        }
      })
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Initial check
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  const faqs = [
    {
      question: 'How often should I visit the dentist?',
      answer: 'We recommend visiting the dentist every 6 months for regular check-ups and cleanings. However, some patients may need more frequent visits based on their oral health needs.'
    },
    {
      question: 'Do you accept insurance?',
      answer: 'Yes, we accept most major dental insurance plans. Contact our office to verify your specific coverage and benefits.'
    },
    {
      question: 'What if I have dental anxiety?',
      answer: 'We understand dental anxiety is common. We offer sedation options and create a comfortable, relaxing environment to ensure your visit is stress-free.'
    },
    {
      question: 'Do you offer emergency dental services?',
      answer: 'Yes, we provide emergency dental services during business hours. For after-hours emergencies, please call our emergency hotline.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept cash, credit cards, debit cards, and most major insurance plans. We also offer flexible payment plans for qualified patients.'
    },
    {
      question: 'How do I schedule an appointment?',
      answer: 'You can schedule an appointment by calling our office, using our online booking system, or visiting us in person. We offer flexible scheduling options.'
    }
  ]

  return (
    <>

      {/* Scroll to Top Button */}
      <Fab 
        className={`scroll-top-btn ${showScrollTop ? 'visible' : ''}`}
        onClick={scrollToTop}
        color="primary"
        aria-label="scroll to top"
      >
        <ArrowUpwardIcon />
      </Fab>

      {/* Hero Section - Centered with Dark Teal Background */}
      <Box className="hero-section">
        <Container maxWidth="lg">
          <Box className="hero-content">
            <div className="hero-badge animate-badge">
              <EmojiEventsIcon className="badge-icon" />
              <Typography variant="body2">Trusted Since 2006</Typography>
            </div>
            
            <Typography variant="h1" className="hero-title animate-title">
              Barnabas Dental Clinic
            </Typography>
            
            <Typography variant="h5" className="hero-subtitle animate-subtitle">
              Where healthy smiles begin and confidence shines. 
              Experience exceptional dental care with a personal touch.
            </Typography>
            
            <div className="hero-buttons animate-buttons">
              <Button 
                variant="contained" 
                className="hero-btn-primary"
                onClick={() => navigate('/calendar')}
                startIcon={<CalendarTodayIcon />}
              >
                Book Appointment
              </Button>
              <Button 
                variant="outlined" 
                className="hero-btn-secondary"
                onClick={() => navigate('/services')}
              >
                Our Services
              </Button>
            </div>
          </Box>
        </Container>
        
        {/* Animated Background Elements */}
        <div className="hero-bg-animation">
          <div className="hero-circle hero-circle-1"></div>
          <div className="hero-circle hero-circle-2"></div>
          <div className="hero-circle hero-circle-3"></div>
          <div className="hero-circle hero-circle-4"></div>
        </div>
      </Box>

      {/* Features Section */}
      <Box className="section features-section" ref={featuresRef}>
        <Container maxWidth="lg">
          <Typography variant="h3" className="section-title fade-left">
            Why Choose Us
          </Typography>
          <Typography variant="body1" className="section-subtitle fade-left" style={{ animationDelay: '0.05s' }}>
            Experience dentistry at its finest with our modern approach and patient-first philosophy
          </Typography>
          <Grid container spacing={4} className="features-grid">
            <Grid item xs={12} md={4}>
              <Box className="feature-card fade-left" style={{ animationDelay: '0.1s' }}>
                <LocalHospitalIcon className="feature-icon" />
                <Typography variant="h5" className="feature-title">Modern Technology</Typography>
                <Typography className="feature-description">
                  State-of-the-art equipment and digital dentistry for precise, comfortable treatments
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box className="feature-card fade-left" style={{ animationDelay: '0.2s' }}>
                <PeopleIcon className="feature-icon" />
                <Typography variant="h5" className="feature-title">Expert Team</Typography>
                <Typography className="feature-description">
                  Experienced dentists and friendly staff dedicated to your comfort and care
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box className="feature-card fade-left" style={{ animationDelay: '0.3s' }}>
                <CheckCircleIcon className="feature-icon" />
                <Typography variant="h5" className="feature-title">Quality Guaranteed</Typography>
                <Typography className="feature-description">
                  High-quality materials and proven techniques for lasting results
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Services Section */}
      <Box className="section services-section" ref={servicesRef}>
        <Container maxWidth="lg">
          <Box sx={{ mb: 6, mt: 0 }}>
            <Typography variant="h3" className="section-title fade-right">
              Our Services
            </Typography>
            <Typography variant="body1" className="section-subtitle fade-right" style={{ animationDelay: '0.05s' }}>
              Comprehensive dental care tailored to your unique needs
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Box sx={{ width: '100%', maxWidth: '600px', mb: 4 }}>
              <Box className="service-card fade-right" style={{ animationDelay: '0.1s' }}>
                <div className="service-image">
                  <img src="https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400" alt="General Dentistry" />
                  <div className="service-overlay">
                    <SpeedIcon className="overlay-icon" />
                  </div>
                </div>
                <Box className="service-content">
                  <Typography variant="h5">General Dentistry</Typography>
                  <Typography>Routine check-ups, cleanings, and preventive care to keep your smile healthy.</Typography>
                  <div className="learn-more-wrapper">
                    <Button 
                      className="learn-more" 
                      onClick={() => navigate('/services')}
                      endIcon={<ArrowForwardIcon />}
                    >
                      Learn More
                    </Button>
                  </div>
                </Box>
              </Box>
            </Box>
            
            <Box sx={{ width: '100%', maxWidth: '600px', mb: 4 }}>
              <Box className="service-card fade-right" style={{ animationDelay: '0.2s' }}>
                <div className="service-image">
                  <img src="https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400" alt="Cosmetic Dentistry" />
                  <div className="service-overlay">
                    <StarIcon className="overlay-icon" />
                  </div>
                </div>
                <Box className="service-content">
                  <Typography variant="h5">Cosmetic Dentistry</Typography>
                  <Typography>Whitening, veneers, and smile makeovers to boost your confidence.</Typography>
                  <div className="learn-more-wrapper">
                    <Button 
                      className="learn-more" 
                      onClick={() => navigate('/services')}
                      endIcon={<ArrowForwardIcon />}
                    >
                      Learn More
                    </Button>
                  </div>
                </Box>
              </Box>
            </Box>
            
            <Box sx={{ width: '100%', maxWidth: '600px' }}>
              <Box className="service-card fade-right" style={{ animationDelay: '0.3s' }}>
                <div className="service-image">
                  <img src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400" alt="Orthodontics" />
                  <div className="service-overlay">
                    <CheckCircleIcon className="overlay-icon" />
                  </div>
                </div>
                <Box className="service-content">
                  <Typography variant="h5">Orthodontics</Typography>
                  <Typography>Braces and aligners designed to give you a straight, beautiful smile.</Typography>
                  <div className="learn-more-wrapper">
                    <Button 
                      className="learn-more" 
                      onClick={() => navigate('/services')}
                      endIcon={<ArrowForwardIcon />}
                    >
                      Learn More
                    </Button>
                  </div>
                </Box>
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* About Section */}
      <Box className="section about-section" ref={aboutRef}>
        <Container maxWidth="lg">
          <Box sx={{ mb: 6, textAlign: 'center' }}>
            <Typography variant="h3" className="section-title fade-up">
              About Barnabas Dental
            </Typography>
          </Box>
          
          <Box className="about-content-wrapper">
            <Box className="about-paragraph about-paragraph-left fade-left">
              <Typography variant="body1">
                Founded in 2005, Barnabas Dental Clinic has been serving the community with excellence in dental care. 
                Our philosophy is simple: every patient deserves personalized treatment, a comfortable environment, 
                and a smile they can be proud of.
              </Typography>
            </Box>
            
            <Box className="about-paragraph about-paragraph-right fade-left">
              <Typography variant="body1">
                With state-of-the-art equipment and a team that truly cares, we are here to make your dental journey 
                stress-free and rewarding. We believe in educating our patients and involving them in their treatment decisions.
              </Typography>
            </Box>
          </Box>
          
          <img 
            src="https://images.unsplash.com/photo-1629909613654-28e377c37b1a?w=600" 
            alt="Dental Clinic Interior" 
            className="about-image scale-in"
          />
          
          <Button 
            variant="outlined" 
            className="about-button fade-up"
            onClick={() => navigate('/about')}
          >
            Learn More About Us
          </Button>
        </Container>
      </Box>

      {/* FAQ Section */}
      <Box className="section faq-section">
        <Container maxWidth="lg">
          <Typography variant="h3" className="section-title fade-up">
            Frequently Asked Questions
          </Typography>
          <Typography variant="body1" className="section-subtitle fade-up" style={{ animationDelay: '0.05s' }}>
            Find answers to common questions about our dental practice
          </Typography>
          <Box className="faq-container">
            <Grid container spacing={3}>
              {faqs.map((faq, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <Accordion className="faq-item fade-up" style={{ animationDelay: `${index * 0.1}s` }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon className="faq-expand-icon" />}>
                      <Typography variant="h6" className="faq-question">
                        {faq.question}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography className="faq-answer">
                        {faq.answer}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box className="cta-section">
        <Container maxWidth="lg">
          <Grid container spacing={3} alignItems="center" justifyContent="center">
            <Grid item xs={12} md={8} sx={{ textAlign: 'center' }}>
              <Typography variant="h4" className="fade-left">Ready for a healthier smile?</Typography>
              <Typography variant="body1" className="fade-left" style={{ animationDelay: '0.1s' }}>
                Book your appointment today and experience exceptional dental care.
              </Typography>
            </Grid>
            <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
              <Button 
                variant="contained" 
                className="cta-button pulse-animation"
                onClick={() => navigate('/calendar')}
                startIcon={<CalendarTodayIcon />}
              >
                Book Appointment Now
              </Button>
            </Grid>
          </Grid>
        </Container>
      </Box>

    </>
  )
}

export default Home