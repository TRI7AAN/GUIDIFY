import React from 'react';
import styled, { css } from 'styled-components';
import { theme } from '../../styles/theme';

// Base button styles
const BaseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-primary);
  font-weight: ${theme.typography.fontWeight.bold};
  border-radius: ${theme.borderRadius.md};
  transition: all ${theme.animation.medium} ease;
  cursor: pointer;
  border: none;
  outline: none;
  position: relative;
  overflow: hidden;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  /* Size variants */
  ${props => props.size === 'sm' && css`
    padding: 0.5rem 1rem;
    font-size: ${theme.typography.fontSize.sm};
  `}
  
  ${props => props.size === 'md' || !props.size && css`
    padding: 0.75rem 1.5rem;
    font-size: ${theme.typography.fontSize.base};
  `}
  
  ${props => props.size === 'lg' && css`
    padding: 1rem 2rem;
    font-size: ${theme.typography.fontSize.lg};
  `}
  
  /* Full width variant */
  ${props => props.fullWidth && css`
    width: 100%;
  `}
`;

// Primary button (neon green glow)
const PrimaryButton = styled(BaseButton)`
  background-color: ${theme.colors.brand.primary};
  color: #000000;
  box-shadow: ${theme.shadows.glow};
  
  &:hover:not(:disabled) {
    transform: translateY(-2px) scale(1.02);
    box-shadow: ${theme.shadows.glowStrong};
  }
  
  &:active:not(:disabled) {
    transform: translateY(1px) scale(0.98);
  }
  
  /* Pulse animation on hover */
  &:after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: inherit;
    box-shadow: 0 0 0 0 ${theme.colors.brand.primary};
    opacity: 0.5;
  }
  
  &:hover:not(:disabled):after {
    animation: pulse 1.5s infinite;
  }
  
  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(57, 255, 20, 0.4);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(57, 255, 20, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(57, 255, 20, 0);
    }
  }
`;

// Secondary button (outlined with neon accents)
const SecondaryButton = styled(BaseButton)`
  background-color: transparent;
  color: ${theme.colors.brand.primary};
  border: 2px solid ${theme.colors.brand.primary};
  
  &:hover:not(:disabled) {
    background-color: rgba(57, 255, 20, 0.1);
    transform: translateY(-2px);
    box-shadow: 0 0 10px rgba(57, 255, 20, 0.3);
  }
  
  &:active:not(:disabled) {
    transform: translateY(1px);
  }
`;

// Ghost button (transparent with hover effect)
const GhostButton = styled(BaseButton)`
  background-color: transparent;
  color: ${theme.colors.text.primary};
  
  &:hover:not(:disabled) {
    color: ${theme.colors.brand.primary};
    background-color: rgba(255, 255, 255, 0.05);
  }
  
  &:active:not(:disabled) {
    transform: translateY(1px);
  }
`;

// Danger button (red variant for destructive actions)
const DangerButton = styled(BaseButton)`
  background-color: ${theme.colors.status.error};
  color: ${theme.colors.text.primary};
  
  &:hover:not(:disabled) {
    background-color: #ff1a4f; /* Brighter red on hover */
    transform: translateY(-2px);
    box-shadow: 0 0 15px rgba(255, 51, 102, 0.5);
  }
  
  &:active:not(:disabled) {
    transform: translateY(1px);
  }
`;

/**
 * Button Component
 * 
 * @param {Object} props - Component props
 * @param {string} [props.variant='primary'] - Button variant (primary, secondary, ghost, danger)
 * @param {string} [props.size='md'] - Button size (sm, md, lg)
 * @param {boolean} [props.fullWidth=false] - Whether button should take full width
 * @param {boolean} [props.disabled=false] - Whether button is disabled
 * @param {Function} props.onClick - Click handler
 * @param {React.ReactNode} props.children - Button content
 * @param {string} [props.type='button'] - Button type attribute
 */
const Button = ({ 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  disabled = false,
  onClick,
  children,
  type = 'button',
  ...rest
}) => {
  // Select the appropriate button component based on variant
  const ButtonComponent = {
    primary: PrimaryButton,
    secondary: SecondaryButton,
    ghost: GhostButton,
    danger: DangerButton
  }[variant] || PrimaryButton;
  
  return (
    <ButtonComponent
      size={size}
      fullWidth={fullWidth}
      disabled={disabled}
      onClick={onClick}
      type={type}
      {...rest}
    >
      {children}
    </ButtonComponent>
  );
};

export { Button };