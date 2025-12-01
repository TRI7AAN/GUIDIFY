import React from 'react';
import styled, { css } from 'styled-components';
import { theme } from '../../styles/theme';

// Base card styles with glass effect
const CardContainer = styled.div`
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: ${props => props.rounded ? theme.borderRadius.lg : theme.borderRadius.md};
  backdrop-filter: blur(10px);
  overflow: hidden;
  transition: all ${theme.animation.medium} ease;
  
  /* Elevation variants */
  ${props => props.elevation === 'low' && css`
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  `}
  
  ${props => (props.elevation === 'medium' || !props.elevation) && css`
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
  `}
  
  ${props => props.elevation === 'high' && css`
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
  `}
  
  /* Hover effect */
  ${props => props.hoverable && css`
    &:hover {
      transform: translateY(-5px);
      box-shadow: 0 12px 20px rgba(0, 0, 0, 0.2);
      border-color: rgba(57, 255, 20, 0.3);
    }
  `}
  
  /* Glow effect */
  ${props => props.glow && css`
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15), 0 0 10px rgba(57, 255, 20, 0.2);
    
    &:hover {
      box-shadow: 0 12px 20px rgba(0, 0, 0, 0.2), 0 0 15px rgba(57, 255, 20, 0.4);
    }
  `}
  
  /* Interactive card */
  ${props => props.interactive && css`
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
      transform: translateY(-5px);
    }
    
    &:active {
      transform: translateY(0);
    }
  `}
`;

const CardHeader = styled.div`
  padding: ${theme.spacing.lg};
  border-bottom: ${props => props.divider ? `1px solid var(--glass-border)` : 'none'};
  display: flex;
  align-items: center;
  justify-content: ${props => props.centered ? 'center' : 'space-between'};
`;

const CardTitle = styled.h3`
  margin: 0;
  color: ${theme.colors.text.primary};
  font-weight: ${theme.typography.fontWeight.semibold};
  font-size: ${theme.typography.fontSize.xl};
`;

const CardContent = styled.div`
  padding: ${theme.spacing.lg};
`;

const CardFooter = styled.div`
  padding: ${theme.spacing.lg};
  border-top: ${props => props.divider ? `1px solid var(--glass-border)` : 'none'};
  display: flex;
  align-items: center;
  justify-content: ${props => props.centered ? 'center' : 'flex-end'};
  gap: ${theme.spacing.md};
`;

/**
 * Card Component
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Card content
 * @param {string} [props.elevation='medium'] - Card elevation (low, medium, high)
 * @param {boolean} [props.hoverable=false] - Whether card has hover effect
 * @param {boolean} [props.glow=false] - Whether card has glow effect
 * @param {boolean} [props.interactive=false] - Whether card is interactive
 * @param {boolean} [props.rounded=false] - Whether card has more rounded corners
 * @param {Function} [props.onClick] - Click handler for interactive cards
 * @param {string} [props.className] - Additional CSS classes
 */
const Card = ({ 
  children,
  elevation = 'medium',
  hoverable = false,
  glow = false,
  interactive = false,
  rounded = false,
  onClick,
  className,
  ...rest
}) => {
  return (
    <CardContainer
      elevation={elevation}
      hoverable={hoverable}
      glow={glow}
      interactive={interactive}
      rounded={rounded}
      onClick={interactive ? onClick : undefined}
      className={className}
      {...rest}
    >
      {children}
    </CardContainer>
  );
};

/**
 * Card.Header Component
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Header content
 * @param {boolean} [props.divider=true] - Whether to show divider
 * @param {boolean} [props.centered=false] - Whether to center content
 * @param {string} [props.className] - Additional CSS classes
 */
Card.Header = ({ 
  children, 
  divider = true, 
  centered = false,
  className,
  ...rest 
}) => {
  return (
    <CardHeader 
      divider={divider} 
      centered={centered}
      className={className}
      {...rest}
    >
      {children}
    </CardHeader>
  );
};

/**
 * Card.Title Component
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Title content
 * @param {string} [props.className] - Additional CSS classes
 */
Card.Title = ({ children, className, ...rest }) => {
  return (
    <CardTitle className={className} {...rest}>
      {children}
    </CardTitle>
  );
};

/**
 * Card.Content Component
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Content
 * @param {string} [props.className] - Additional CSS classes
 */
Card.Content = ({ children, className, ...rest }) => {
  return (
    <CardContent className={className} {...rest}>
      {children}
    </CardContent>
  );
};

/**
 * Card.Footer Component
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Footer content
 * @param {boolean} [props.divider=true] - Whether to show divider
 * @param {boolean} [props.centered=false] - Whether to center content
 * @param {string} [props.className] - Additional CSS classes
 */
Card.Footer = ({ 
  children, 
  divider = true, 
  centered = false,
  className,
  ...rest 
}) => {
  return (
    <CardFooter 
      divider={divider} 
      centered={centered}
      className={className}
      {...rest}
    >
      {children}
    </CardFooter>
  );
};

export { Card };