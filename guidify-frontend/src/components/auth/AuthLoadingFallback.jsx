import React from 'react';
import styled from 'styled-components';

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: var(--deep-space-gradient);
`;

const LoadingText = styled.div`
  color: var(--emerald-neon);
  font-size: 1.5rem;
  margin-top: 1rem;
  text-shadow: 0 0 10px var(--emerald-neon);
`;

const LoadingSpinner = styled.div`
  width: 50px;
  height: 50px;
  border: 3px solid rgba(57, 255, 20, 0.3);
  border-radius: 50%;
  border-top-color: var(--emerald-neon);
  animation: spin 1s ease-in-out infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

/**
 * A reusable loading component for authentication processes
 * 
 * @param {Object} props
 * @param {string} props.message - Loading message to display
 */
const AuthLoadingFallback = ({ message = "Loading..." }) => {
  return (
    <LoadingContainer>
      <LoadingSpinner />
      <LoadingText>{message}</LoadingText>
    </LoadingContainer>
  );
};

export default AuthLoadingFallback;