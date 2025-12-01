import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: var(--deep-space-gradient);
  padding: 0 1rem;
`;

const ErrorIcon = styled.div`
  color: var(--status-error);
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const ErrorTitle = styled.h2`
  color: var(--emerald-neon);
  margin-bottom: 0.5rem;
  text-align: center;
`;

const ErrorMessage = styled.div`
  color: white;
  margin-bottom: 2rem;
  text-align: center;
  max-width: 500px;
`;

const ActionButton = styled.button`
  background: var(--glass-bg);
  border: 1px solid var(--emerald-neon);
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
  
  &:hover {
    background: rgba(57, 255, 20, 0.1);
    box-shadow: 0 0 10px var(--emerald-neon);
  }
`;

/**
 * A reusable fallback component for authentication errors
 * 
 * @param {Object} props
 * @param {string} props.title - Error title
 * @param {string} props.message - Error message
 * @param {string} props.buttonText - Text for the action button
 * @param {string} props.redirectPath - Path to redirect to when button is clicked
 * @param {Function} props.onAction - Optional callback for button click
 */
const AuthErrorFallback = ({ 
  title = "Authentication Error", 
  message = "There was a problem with your authentication. Please try again.",
  buttonText = "Return to Login",
  redirectPath = "/login",
  onAction
}) => {
  const navigate = useNavigate();
  
  const handleAction = () => {
    if (onAction && typeof onAction === 'function') {
      onAction();
    } else {
      navigate(redirectPath, { replace: true });
    }
  };
  
  return (
    <ErrorContainer>
      <ErrorIcon>⚠️</ErrorIcon>
      <ErrorTitle>{title}</ErrorTitle>
      <ErrorMessage>{message}</ErrorMessage>
      <ActionButton onClick={handleAction}>
        {buttonText}
      </ActionButton>
    </ErrorContainer>
  );
};

export default AuthErrorFallback;