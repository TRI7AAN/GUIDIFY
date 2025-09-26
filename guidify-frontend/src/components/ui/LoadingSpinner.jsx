import React from 'react';
import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const SpinnerContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: ${props => props.$fullPage ? '100vh' : '100%'};
  width: 100%;
`;

const Spinner = styled.div`
  width: ${props => props.$size || '40px'};
  height: ${props => props.$size || '40px'};
  border: 4px solid rgba(57, 255, 20, 0.1);
  border-radius: 50%;
  border-top: 4px solid var(--primary, #39FF14);
  animation: ${spin} 1s linear infinite;
  margin-bottom: 1rem;
`;

const LoadingText = styled.p`
  color: var(--cyber-white);
  font-size: 1rem;
  animation: ${pulse} 1.5s ease-in-out infinite;
  text-shadow: 0 0 10px rgba(57, 255, 20, 0.5);
`;

/**
 * LoadingSpinner Component
 * Displays a loading spinner with optional text
 * 
 * @param {Object} props - Component props
 * @param {string} props.size - Size of the spinner (e.g., '40px')
 * @param {string} props.text - Text to display below the spinner
 * @param {boolean} props.fullPage - Whether to take up the full page height
 */
const LoadingSpinner = ({ size, text = 'Loading...', fullPage = false }) => {
  return (
    <SpinnerContainer $fullPage={fullPage}>
      <Spinner $size={size} />
      <LoadingText>{text}</LoadingText>
    </SpinnerContainer>
  );
};

export default LoadingSpinner;