// src/components/StaffLogin.jsx

import '../App.css'
import './style/StaffLogin.css'
import { Box, Container, Typography } from '@mui/material'
import MyTextField from './forms/MyTextField';
import MyPassField from './forms/MyPassField';
import MyButton from './forms/MyButton';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AxiosInstance from './AxiosInstance';
import Message from './Message';
import { React, useState, useEffect } from 'react'

const StaffLogin = () => {
    const [showMessage, setShowMessage] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const { handleSubmit, control } = useForm()
    const navigate = useNavigate()

    useEffect(() => {
        document.body.classList.add('staff-login-page-active')
        return () => document.body.classList.remove('staff-login-page-active')
    }, [])

    const submission = (data) => {
        setLoading(true)
        setShowMessage(false)
        
        AxiosInstance.post(`staff-login/`, {
            email: data.email,
            password: data.password,
        })
        .then((response) => {
            if(response.data.user) {
                localStorage.setItem('Token', response.data.token)
                localStorage.setItem('user', JSON.stringify(response.data.user))
                navigate('/staff/dashboard')
            } else {
                setShowMessage(true)
                setErrorMessage('Invalid credentials. Please try again.')
                setLoading(false)
                setTimeout(() => setShowMessage(false), 3000)
            }
        })
        .catch((error) => {
            setShowMessage(true)
            setErrorMessage('Invalid email or password. Please try again.')
            setLoading(false)
            setTimeout(() => setShowMessage(false), 3000)
            console.error('Staff login failed:', error)
        })
    }
    
    return (  
        <Box className="staff-login-wrapper">
            {/* Animated Background Elements */}
            <div className="staff-bg-animation">
                <div className="staff-bg-circle staff-bg-circle-1"></div>
                <div className="staff-bg-circle staff-bg-circle-2"></div>
                <div className="staff-bg-circle staff-bg-circle-3"></div>
                <div className="staff-bg-circle staff-bg-circle-4"></div>
                <div className="staff-bg-circle staff-bg-circle-5"></div>
                <div className="staff-bg-circle staff-bg-circle-6"></div>
            </div>

            {/* Floating particles */}
            <div className="staff-particles">
                {[...Array(20)].map((_, i) => (
                    <div key={i} className="staff-particle" style={{
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 10}s`,
                        animationDuration: `${5 + Math.random() * 10}s`
                    }}></div>
                ))}
            </div>

            <Container maxWidth="lg" className="staff-login-container">
                <Box className="staff-login-card landscape-card">
                    {/* Left Side - Branding with Dark Teal Background */}
                    <div className="staff-branding-side">
                        <div className="staff-branding-content">
                            <div className="staff-shield-wrapper">
                                <div className="staff-shield-icon">
                                    <svg viewBox="0 0 24 24" width="60" height="60" fill="white">
                                        <path d="M12 2L3 7l9 5 9-5-9-5z"/>
                                        <path d="M3 12l9 5 9-5"/>
                                        <path d="M3 17l9 5 9-5"/>
                                    </svg>
                                </div>
                            </div>
                            
                            <Typography className="staff-brand-title">
                                Receptionist Portal
                            </Typography>
                            
                            <Typography className="staff-brand-tagline">
                                Secure staff access with role-based permissions and streamlined workflows.
                            </Typography>
                            
                            <div className="staff-brand-features">
                                <div className="staff-feature-item">
                                    <div className="staff-feature-dot"></div>
                                    <span>Patient Management</span>
                                </div>
                                <div className="staff-feature-item">
                                    <div className="staff-feature-dot"></div>
                                    <span>Appointment Scheduling</span>
                                </div>
                                <div className="staff-feature-item">
                                    <div className="staff-feature-dot"></div>
                                    <span>Medical Records Access</span>
                                </div>
                                <div className="staff-feature-item">
                                    <div className="staff-feature-dot"></div>
                                    <span>Billing Assistance</span>
                                </div>
                                <div className="staff-feature-item">
                                    <div className="staff-feature-dot"></div>
                                    <span>Treatment Coordination</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Login Form */}
                    <div className="staff-form-side">
                        <div className="staff-form-container">
                            <Typography className="staff-form-title">
                                Receptionist Login
                            </Typography>
                            
                            <Typography className="staff-form-subtitle">
                                Enter your credentials to access the staff dashboard
                            </Typography>

                            {/* Error Message - Centered at top */}
                            {showMessage && (
                                <div className="staff-error-message-wrapper">
                                    <Message text={errorMessage || 'Staff login failed'} color={'#f8f9fa'} />
                                    <div className="staff-error-progress"></div>
                                </div>
                            )}

                            <form onSubmit={handleSubmit(submission)} className="staff-login-form">
                                <div className="staff-form-field">
                                    <MyTextField 
                                        label={'Email Address'} 
                                        name={'email'} 
                                        control={control}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '12px',
                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            }
                                        }}
                                    />
                                </div>

                                <div className="staff-form-field">
                                    <MyPassField 
                                        label={'Password'} 
                                        name={'password'} 
                                        control={control}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '12px',
                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            }
                                        }}
                                    />
                                </div>

                                <MyButton 
                                    label={loading ? 'Authenticating...' : 'Staff Login'}
                                    type={'submit'}
                                    disabled={loading}
                                    className={`staff-login-button ${loading ? 'loading' : ''}`}
                                />

                                <div className="staff-back-link">
                                    <a href="/" className="staff-back-link-text">
                                        ← Back to Main Site
                                    </a>
                                </div>
                                
                                <div className="staff-admin-link">
                                    <a href="/admin" className="staff-admin-link-text">
                                        Administrator Login →
                                    </a>
                                </div>
                            </form>
                        </div>
                    </div>
                </Box>
            </Container>

            {/* Footer */}
            <Box className="staff-login-footer">
                <Typography variant="body2">
                    © {new Date().getFullYear()} Barnabas Dental Clinic. All rights reserved.
                </Typography>
            </Box>
        </Box>
    )
}

export default StaffLogin