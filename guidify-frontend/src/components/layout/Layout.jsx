import React from 'react';
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
  return (
    <PageContainer>
      <Navbar />
      <MainContent>
        {children}
      </MainContent>
      <Footer />
    </PageContainer>
  );
};

export default Layout;