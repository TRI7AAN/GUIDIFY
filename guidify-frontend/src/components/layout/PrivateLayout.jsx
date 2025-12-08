import React from 'react';
import styled from 'styled-components';

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--deep-space-blue);
  color: var(--cyber-white);
`;

const MainContent = styled.main`
  flex: 1;
  width: 100%;
  /* No padding-top or max-width constraints by default for private pages 
     as they often handle their own layout (e.g. Dashboard Sidebar) */
`;

/**
 * PrivateLayout
 * Renders ONLY the content without the global Navbar.
 * Used for Dashboard, Onboarding, Profile, etc.
 */
const PrivateLayout = ({ children }) => {
    return (
        <PageContainer>
            <MainContent>
                {children}
            </MainContent>
        </PageContainer>
    );
};

export default PrivateLayout;
