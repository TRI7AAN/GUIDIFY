import React from 'react';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';
import Navbar from './Navbar';
import Footer from './Footer';

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--deep-space-blue);
  color: var(--cyber-white);
`;

const MainContent = styled.main`
  flex: 1;
  padding-top: 80px; /* Space for fixed navbar */
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding-left: 2rem;
  padding-right: 2rem;
  
  @media (max-width: 768px) {
    padding-left: 1rem;
    padding-right: 1rem;
  }
`;

/**
 * Layout Component
 * Wraps all pages with the Navbar and Footer
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Page content
 */
const Layout = ({ children }) => {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');

  return (
    <PageContainer>
      {!isDashboard && <Navbar />}
      <MainContent style={isDashboard ? { paddingTop: 0, paddingLeft: 0, paddingRight: 0, maxWidth: '100%' } : {}}>
        {children}
      </MainContent>
      {!isDashboard && <Footer />}
    </PageContainer>
  );
};

export default Layout;