import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useNavigation from '../../routes/useNavigation';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../styles/theme';

// Styled components
const NavbarContainer = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: ${theme.zIndex.navbar || theme.zIndex.sticky};
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--glass-border);
  transition: all 0.3s ease;
  
  ${props => !!props.$scrolled && `
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    border-bottom-color: rgba(57, 255, 20, 0.2);
  `}
`;

const NavbarContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
  
  @media (max-width: ${theme.breakpoints.md}) {
    padding: 1rem;
  }
`;

const Logo = styled(Link)`
  display: flex;
  align-items: center;
  text-decoration: none;
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.text.primary};
  
  span {
    color: ${theme.colors.brand.primary};
    margin-right: 0.5rem;
  }
  
  &:hover {
    transform: scale(1.05);
  }
`;

const NavLinks = styled.div`
  display: flex;
  gap: 2rem;
  align-items: center;
  
  @media (max-width: ${theme.breakpoints.md}) {
    display: none;
  }
`;

const NavLink = styled(Link)`
  position: relative;
  color: ${theme.colors.text.primary};
  text-decoration: none;
  font-weight: ${theme.typography.fontWeight.medium};
  padding: 0.5rem 0;
  transition: all 0.2s ease;
  
  &:hover {
    color: ${theme.colors.brand.primary};
  }
  
  &.active {
    color: ${theme.colors.brand.primary};
    
    &:after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 2px;
      background-color: ${theme.colors.brand.primary};
      box-shadow: 0 0 8px ${theme.colors.brand.primary};
    }
  }
`;

const AuthButtons = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  
  @media (max-width: ${theme.breakpoints.md}) {
    display: none;
  }
`;

const LoginButton = styled(Link)`
  color: ${theme.colors.brand.primary};
  text-decoration: none;
  font-weight: ${theme.typography.fontWeight.medium};
  padding: 0.5rem 1rem;
  border-radius: ${theme.borderRadius.md};
  transition: all 0.2s ease;
  
  &:hover {
    background-color: rgba(57, 255, 20, 0.1);
  }
`;

const SignupButton = styled(Link)`
  background-color: ${theme.colors.brand.primary};
  color: #000000;
  text-decoration: none;
  font-weight: ${theme.typography.fontWeight.medium};
  padding: 0.5rem 1.5rem;
  border-radius: ${theme.borderRadius.md};
  transition: all 0.2s ease;
  box-shadow: 0 0 10px rgba(57, 255, 20, 0.3);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 15px rgba(57, 255, 20, 0.5);
  }
`;

const MobileMenuButton = styled.button`
  display: none;
  background: none;
  border: none;
  color: ${theme.colors.text.primary};
  font-size: 1.5rem;
  cursor: pointer;
  
  @media (max-width: ${theme.breakpoints.md}) {
    display: block;
  }
`;

const MobileMenu = styled(motion.div)`
  position: fixed;
  top: 0;
  right: 0;
  width: 80%;
  max-width: 300px;
  height: 100vh;
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  z-index: ${theme.zIndex.modal};
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  border-left: 1px solid var(--glass-border);
  box-shadow: -5px 0 30px rgba(0, 0, 0, 0.3);
`;

const MobileNavLink = styled(Link)`
  color: ${theme.colors.text.primary};
  text-decoration: none;
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.medium};
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--glass-border);
  transition: all 0.2s ease;
  
  &:hover, &.active {
    color: ${theme.colors.brand.primary};
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  color: ${theme.colors.text.primary};
  font-size: 1.5rem;
  cursor: pointer;
  
  &:hover {
    color: ${theme.colors.brand.primary};
  }
`;

const UserMenu = styled.div`
  position: relative;
`;

const UserButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  color: ${theme.colors.text.primary};
  cursor: pointer;
  padding: 0.5rem;
  border-radius: ${theme.borderRadius.md};
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
  
  img {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid ${theme.colors.brand.primary};
  }
`;

const UserMenuDropdown = styled(motion.div)`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: ${theme.borderRadius.md};
  overflow: hidden;
  min-width: 200px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  z-index: ${theme.zIndex.dropdown};
`;

const UserMenuItem = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  color: ${theme.colors.text.primary};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: rgba(57, 255, 20, 0.1);
    color: ${theme.colors.brand.primary};
  }
  
  &:not(:last-child) {
    border-bottom: 1px solid var(--glass-border);
  }
`;

// SVG icons
const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

/**
 * Navbar Component
 * Main navigation for the GUIDIFY application
 */
const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, isAuthenticated, logout, onboardingComplete } = useAuth();
  const { isActive, currentPath } = useNavigation();
  const { navigateTo } = useNavigation();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when location changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [currentPath]);

  // Handle logout
  const handleLogout = () => {
    logout(); // This now calls the authService.logout() through the AuthContext
    setUserMenuOpen(false);
    navigateTo('/');
  };

  return (
    <NavbarContainer $scrolled={!!scrolled}>
      <NavbarContent>
        <Logo to="/">
          <span>GUIDIFY</span>
        </Logo>

        <NavLinks>
          <NavLink to="/" className={isActive('/') ? 'active' : ''}>
            Home
          </NavLink>

          {isAuthenticated ? (
            // Links for authenticated users
            onboardingComplete ? (
              <>
                <NavLink to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
                  Dashboard
                </NavLink>
              </>
            ) : null
          ) : (
            // Links for non-authenticated users
            <>

              <NavLink to="/#features" onClick={(e) => {
                e.preventDefault();
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              }} className={isActive('/#features') ? 'active' : ''}>
                Features
              </NavLink>
              <NavLink to="/#testimonials" onClick={(e) => {
                e.preventDefault();
                document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' });
              }} className={isActive('/#testimonials') ? 'active' : ''}>
                Testimonials
              </NavLink>
              <NavLink to="/#footer" className={isActive('/#footer') ? 'active' : ''}>
                Contact
              </NavLink>
            </>
          )}
        </NavLinks>

        {isAuthenticated ? (
          onboardingComplete ? (
            <UserMenu>
              <UserButton onClick={() => setUserMenuOpen(!userMenuOpen)}>
                <img
                  src={user?.avatar || 'https://via.placeholder.com/32'}
                  alt={user?.name || 'User'}
                />
                <span>{user?.name || 'User'}</span>
                <ChevronDownIcon />
              </UserButton>

              {userMenuOpen && (
                <UserMenuDropdown
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <UserMenuItem as={Link} to="/dashboard">
                    Dashboard
                  </UserMenuItem>
                  <UserMenuItem as={Link} to="/stats">
                    Statistics
                  </UserMenuItem>
                  <UserMenuItem as={Link} to="/org-profiles">
                    Organizations
                  </UserMenuItem>
                  <UserMenuItem onClick={handleLogout}>
                    Logout
                  </UserMenuItem>
                </UserMenuDropdown>
              )}
            </UserMenu>
          ) : (
            <AuthButtons>
              <button onClick={handleLogout} style={{
                background: 'none',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer'
              }}>
                Logout
              </button>
            </AuthButtons>
          )
        ) : (
          <AuthButtons>
            <LoginButton to="/login">Log In</LoginButton>
            <SignupButton to="/register">Sign Up</SignupButton>
          </AuthButtons>
        )}

        <MobileMenuButton onClick={() => setMobileMenuOpen(true)}>
          <MenuIcon />
        </MobileMenuButton>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <MobileMenu
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
          >
            <CloseButton onClick={() => setMobileMenuOpen(false)}>
              <CloseIcon />
            </CloseButton>


            {isAuthenticated ? (
              // Mobile links for authenticated users
              <>
                <MobileNavLink to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
                  Dashboard
                </MobileNavLink>
                <MobileNavLink to="/stats" className={isActive('/stats') ? 'active' : ''}>
                  Statistics
                </MobileNavLink>
                <MobileNavLink to="/org-profiles" className={isActive('/org-profiles') ? 'active' : ''}>
                  Organizations
                </MobileNavLink>
                <MobileNavLink as="button" onClick={handleLogout}>
                  Logout
                </MobileNavLink>
              </>
            ) : (
              // Mobile links for non-authenticated users
              <>
                <MobileNavLink to="/#features" onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                  setMobileMenuOpen(false); // Close mobile menu after clicking
                }} className={isActive('/#features') ? 'active' : ''}>
                  Features
                </MobileNavLink>
                <MobileNavLink to="/#testimonials" onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' });
                  setMobileMenuOpen(false); // Close mobile menu after clicking
                }} className={isActive('/#testimonials') ? 'active' : ''}>
                  Testimonials
                </MobileNavLink>
                {/* <MobileNavLink to="/#contact" onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                  setMobileMenuOpen(false); // Close mobile menu after clicking
                }} className={isActive('/#contact') ? 'active' : ''}>  
                  Contact
                </MobileNavLink> */}
                <MobileNavLink to="/login">
                  Log In
                </MobileNavLink>
                <MobileNavLink to="/register">
                  Sign Up
                </MobileNavLink>
              </>
            )}
          </MobileMenu>
        )}
      </NavbarContent>
    </NavbarContainer>
  );
};

export default Navbar;