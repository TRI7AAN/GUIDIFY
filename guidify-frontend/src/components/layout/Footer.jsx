import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { theme } from '../../styles/theme';

// Styled components
const FooterContainer = styled.footer`
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border-top: 1px solid var(--glass-border);
  padding: ${theme.spacing.xl} 0;
  margin-top: auto; // Push footer to bottom if content is short
`;

const FooterContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 ${theme.spacing.lg};
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${theme.spacing.xl};
  
  @media (max-width: ${theme.breakpoints.lg}) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: ${theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
    text-align: center;
  }
`;

const FooterSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const FooterTitle = styled.h3`
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.bold};
  margin-bottom: ${theme.spacing.sm};
  position: relative;
  display: inline-block;
  
  &:after {
    content: '';
    position: absolute;
    bottom: -5px;
    left: 0;
    width: 40px;
    height: 2px;
    background-color: ${theme.colors.brand.primary};
    box-shadow: 0 0 8px ${theme.colors.brand.primary};
    
    @media (max-width: ${theme.breakpoints.sm}) {
      left: 50%;
      transform: translateX(-50%);
    }
  }
`;

const FooterLink = styled(Link)`
  color: ${theme.colors.text.secondary};
  text-decoration: none;
  transition: all 0.2s ease;
  
  &:hover {
    color: ${theme.colors.brand.primary};
    transform: translateX(5px);
    
    @media (max-width: ${theme.breakpoints.sm}) {
      transform: none;
    }
  }
`;

const FooterText = styled.p`
  color: ${theme.colors.text.secondary};
  line-height: 1.6;
  margin: 0;
`;

const SocialLinks = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.sm};
  
  @media (max-width: ${theme.breakpoints.sm}) {
    justify-content: center;
  }
`;

const SocialLink = styled.a`
  color: ${theme.colors.text.secondary};
  font-size: 1.5rem;
  transition: all 0.2s ease;
  
  &:hover {
    color: ${theme.colors.brand.primary};
    transform: translateY(-3px);
  }
`;

const BottomBar = styled.div`
  max-width: 1400px;
  margin: ${theme.spacing.xl} auto 0;
  padding: ${theme.spacing.lg} ${theme.spacing.lg} 0;
  border-top: 1px solid var(--glass-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  @media (max-width: ${theme.breakpoints.md}) {
    flex-direction: column;
    gap: ${theme.spacing.md};
    text-align: center;
  }
`;

const Copyright = styled.p`
  color: ${theme.colors.text.secondary};
  margin: 0;
`;

const BottomLinks = styled.div`
  display: flex;
  gap: ${theme.spacing.lg};
  
  @media (max-width: ${theme.breakpoints.sm}) {
    flex-direction: column;
    gap: ${theme.spacing.sm};
  }
`;

// SVG icons
const TwitterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
  </svg>
);

const LinkedInIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
    <rect x="2" y="9" width="4" height="12"></rect>
    <circle cx="4" cy="4" r="2"></circle>
  </svg>
);

const GitHubIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
  </svg>
);

const InstagramIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

/**
 * Footer Component
 */
const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <FooterContainer>
      <FooterContent>
        <FooterSection>
          <FooterTitle>About GUIDIFY</FooterTitle>
          <FooterText>
            GUIDIFY is your AI-powered career companion, helping you navigate the job market, 
            improve your skills, and prepare for interviews with personalized guidance.
          </FooterText>
          <SocialLinks>
            <SocialLink href="https://twitter.com/guidify" target="_blank" rel="noopener noreferrer">
              <TwitterIcon />
            </SocialLink>
            <SocialLink href="https://linkedin.com/company/guidify" target="_blank" rel="noopener noreferrer">
              <LinkedInIcon />
            </SocialLink>
            <SocialLink href="https://github.com/guidify" target="_blank" rel="noopener noreferrer">
              <GitHubIcon />
            </SocialLink>
            <SocialLink href="https://instagram.com/guidify" target="_blank" rel="noopener noreferrer">
              <InstagramIcon />
            </SocialLink>
          </SocialLinks>
        </FooterSection>
        
        <FooterSection>
          <FooterTitle>Quick Links</FooterTitle>
          <FooterLink to="/">Home</FooterLink>
          <FooterLink to="/dashboard">Dashboard</FooterLink>
          <FooterLink to="/stats">Statistics</FooterLink>
          <FooterLink to="/org-profiles">Organizations</FooterLink>
        </FooterSection>
        
        <FooterSection>
          <FooterTitle>Resources</FooterTitle>
          <FooterLink to="/blog">Blog</FooterLink>
          <FooterLink to="/tutorials">Tutorials</FooterLink>
          <FooterLink to="/faq">FAQ</FooterLink>
          <FooterLink to="/support">Support</FooterLink>
          <FooterLink to="/contact">Contact Us</FooterLink>
        </FooterSection>
        
        <FooterSection>
          <FooterTitle>Legal</FooterTitle>
          <FooterLink to="/terms">Terms of Service</FooterLink>
          <FooterLink to="/privacy">Privacy Policy</FooterLink>
          <FooterLink to="/cookies">Cookie Policy</FooterLink>
          <FooterLink to="/accessibility">Accessibility</FooterLink>
        </FooterSection>
      </FooterContent>
      
      <BottomBar>
        <Copyright>© {currentYear} GUIDIFY. All rights reserved.</Copyright>
        <BottomLinks>
          <FooterLink to="/sitemap">Sitemap</FooterLink>
          <FooterLink to="/careers">Careers</FooterLink>
          <FooterLink to="/press">Press Kit</FooterLink>
        </BottomLinks>
      </BottomBar>
    </FooterContainer>
  );
};

export default Footer;