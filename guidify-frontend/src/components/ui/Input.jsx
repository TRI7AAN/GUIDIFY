import React, { forwardRef } from 'react';
import styled, { css } from 'styled-components';
import { theme } from '../../styles/theme';

// Base input styles
const InputContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: ${theme.spacing.md};
  width: ${props => props.fullWidth ? '100%' : 'auto'};
`;

const InputLabel = styled.label`
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.text.secondary};
  margin-bottom: ${theme.spacing.xs};
  display: flex;
  align-items: center;
  
  ${props => props.required && css`
    &:after {
      content: '*';
      color: ${theme.colors.status.error};
      margin-left: ${theme.spacing.xs};
    }
  `}
`;

const StyledInput = styled.input`
  background-color: ${theme.colors.background.paper};
  color: ${theme.colors.text.primary};
  border: 1px solid ${theme.colors.ui.border};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.md};
  font-size: ${theme.typography.fontSize.base};
  transition: all ${theme.animation.fast} ease;
  outline: none;
  width: 100%;
  
  &::placeholder {
    color: ${theme.colors.text.disabled};
  }
  
  &:focus {
    border-color: ${theme.colors.brand.primary};
    box-shadow: 0 0 0 2px rgba(57, 255, 20, 0.2);
  }
  
  &:disabled {
    background-color: ${theme.colors.background.disabled};
    cursor: not-allowed;
    opacity: 0.7;
  }
  
  /* Size variants */
  ${props => props.size === 'sm' && css`
    padding: ${theme.spacing.sm};
    font-size: ${theme.typography.fontSize.sm};
  `}
  
  ${props => props.size === 'lg' && css`
    padding: ${theme.spacing.lg};
    font-size: ${theme.typography.fontSize.lg};
  `}
  
  /* Error state */
  ${props => props.error && css`
    border-color: ${theme.colors.status.error};
    
    &:focus {
      box-shadow: 0 0 0 2px rgba(255, 51, 102, 0.2);
    }
  `}
  
  /* Success state */
  ${props => props.success && css`
    border-color: ${theme.colors.status.success};
    
    &:focus {
      box-shadow: 0 0 0 2px rgba(0, 200, 83, 0.2);
    }
  `}
`;

const TextArea = styled(StyledInput).attrs({ as: 'textarea' })`
  min-height: 100px;
  resize: vertical;
`;

const HelperText = styled.span`
  font-size: ${theme.typography.fontSize.xs};
  margin-top: ${theme.spacing.xs};
  
  ${props => props.error && css`
    color: ${theme.colors.status.error};
  `}
  
  ${props => props.success && css`
    color: ${theme.colors.status.success};
  `}
  
  ${props => !props.error && !props.success && css`
    color: ${theme.colors.text.secondary};
  `}
`;

const InputAdornment = styled.div`
  display: flex;
  align-items: center;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  color: ${theme.colors.text.secondary};
  
  ${props => props.position === 'start' && css`
    left: ${theme.spacing.md};
  `}
  
  ${props => props.position === 'end' && css`
    right: ${theme.spacing.md};
  `}
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  
  ${props => props.startAdornment && css`
    ${StyledInput} {
      padding-left: ${theme.spacing.xxl};
    }
  `}
  
  ${props => props.endAdornment && css`
    ${StyledInput} {
      padding-right: ${theme.spacing.xxl};
    }
  `}
`;

/**
 * Input Component
 * 
 * @param {Object} props - Component props
 * @param {string} [props.id] - Input id
 * @param {string} [props.name] - Input name
 * @param {string} [props.type='text'] - Input type
 * @param {string} [props.label] - Input label
 * @param {string} [props.placeholder] - Input placeholder
 * @param {string} [props.value] - Input value
 * @param {Function} [props.onChange] - Change handler
 * @param {boolean} [props.required=false] - Whether input is required
 * @param {boolean} [props.disabled=false] - Whether input is disabled
 * @param {boolean} [props.fullWidth=false] - Whether input takes full width
 * @param {string} [props.size='md'] - Input size (sm, md, lg)
 * @param {boolean} [props.error=false] - Whether input has error
 * @param {boolean} [props.success=false] - Whether input has success state
 * @param {string} [props.helperText] - Helper text
 * @param {React.ReactNode} [props.startAdornment] - Start adornment
 * @param {React.ReactNode} [props.endAdornment] - End adornment
 * @param {string} [props.className] - Additional CSS classes
 */
const Input = forwardRef(({ 
  id,
  name,
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  required = false,
  disabled = false,
  fullWidth = false,
  size = 'md',
  error = false,
  success = false,
  helperText,
  startAdornment,
  endAdornment,
  className,
  ...rest
}, ref) => {
  // Determine if we should render a textarea instead of an input
  const isTextArea = type === 'textarea';
  const InputComponent = isTextArea ? TextArea : StyledInput;
  
  return (
    <InputContainer fullWidth={fullWidth} className={className}>
      {label && (
        <InputLabel htmlFor={id} required={required}>
          {label}
        </InputLabel>
      )}
      
      <InputWrapper 
        startAdornment={startAdornment} 
        endAdornment={endAdornment}
      >
        {startAdornment && (
          <InputAdornment position="start">
            {startAdornment}
          </InputAdornment>
        )}
        
        <InputComponent
          ref={ref}
          id={id}
          name={name}
          type={isTextArea ? undefined : type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          size={size}
          error={error}
          success={success}
          {...rest}
        />
        
        {endAdornment && (
          <InputAdornment position="end">
            {endAdornment}
          </InputAdornment>
        )}
      </InputWrapper>
      
      {helperText && (
        <HelperText error={error} success={success}>
          {helperText}
        </HelperText>
      )}
    </InputContainer>
  );
});

export { Input };