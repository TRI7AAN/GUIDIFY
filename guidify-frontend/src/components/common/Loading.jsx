import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100%;
  position: fixed;
  top: 0;
  left: 0;
  background: #0D0F18; /* Deep Space */
  z-index: 9999;
  flex-direction: column;
  gap: 1rem;
`;

const Spinner = styled.div`
  width: 50px;
  height: 50px;
  border: 4px solid rgba(57, 255, 20, 0.3);
  border-top: 4px solid #39FF14;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  box-shadow: 0 0 15px rgba(57, 255, 20, 0.2);

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.div`
  color: #39FF14;
  font-family: 'Inter', sans-serif;
  font-size: 1.2rem;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
  text-shadow: 0 0 10px rgba(57, 255, 20, 0.5);
  animation: pulse 1.5s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const FallbackButton = styled.button`
  margin-top: 2rem;
  background: transparent;
  border: 1px solid #39FF14;
  color: #39FF14;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-family: monospace;
  opacity: 0.7;
  transition: all 0.3s;
  
  &:hover {
    opacity: 1;
    background: rgba(57, 255, 20, 0.1);
  }
`;

const Loading = ({ message = "Loading..." }) => {
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFallback(true);
    }, 3000); // Show fallback after 3 seconds

    return () => clearTimeout(timer);
  }, []);

  return (
    <LoadingContainer>
      <Spinner />
      <LoadingText>{message}</LoadingText>

      {showFallback && (
        <FallbackButton onClick={() => window.location.href = '/login'}>
          Stuck? Click here to restart.
        </FallbackButton>
      )}
    </LoadingContainer>
  );
};

export default Loading;
