import { createGlobalStyle } from 'styled-components';
import { cssVariables } from './theme';

const GlobalStyles = createGlobalStyle`
  ${cssVariables}
  
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  html,
  body {
    overflow-x: hidden;
    background-color: var(--deep-space-blue);
    color: var(--cyber-white);
    font-family: var(--font-primary);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  #root {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  
  /* Typography */
  h1, h2, h3, h4, h5, h6 {
    margin-bottom: 0.5rem;
    font-weight: 700;
    line-height: 1.2;
  }
  
  h1 {
    font-size: 2.5rem;
  }
  
  h2 {
    font-size: 2rem;
  }
  
  h3 {
    font-size: 1.75rem;
  }
  
  h4 {
    font-size: 1.5rem;
  }
  
  h5 {
    font-size: 1.25rem;
  }
  
  h6 {
    font-size: 1rem;
  }
  
  p {
    margin-bottom: 1rem;
  }
  
  /* Links */
  a {
    color: var(--emerald-neon);
    text-decoration: none;
    transition: color var(--animation-fast) ease;
    
    &:hover {
      text-decoration: underline;
    }
  }
  
  /* Buttons */
  button {
    cursor: pointer;
    font-family: var(--font-primary);
  }
  
  /* Glass Card Effect */
  .glass-card {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 1rem;
    backdrop-filter: blur(10px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    transition: all var(--animation-medium) ease;
  }
  
  /* Glow Button Effect */
  .glow-button {
    background: var(--emerald-neon);
    color: black;
    font-weight: bold;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.5rem;
    box-shadow: var(--shadow-glow);
    transition: all var(--animation-medium) ease;
    
    &:hover {
      transform: scale(1.05);
      box-shadow: var(--shadow-glow-strong);
    }
    
    &:active {
      transform: scale(0.98);
    }
  }
  
  /* Animations */
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
  
  @keyframes glow {
    0% { box-shadow: 0 0 5px var(--emerald-neon); }
    50% { box-shadow: 0 0 20px var(--emerald-neon), 0 0 30px var(--emerald-neon); }
    100% { box-shadow: 0 0 5px var(--emerald-neon); }
  }
  
  /* Blob animation from the original design */
  @keyframes blob {
    0% {
      transform: translate(0px, 0px) scale(1);
    }
    33% {
      transform: translate(30px, -50px) scale(1.1);
    }
    66% {
      transform: translate(-20px, 20px) scale(0.9);
    }
    100% {
      transform: translate(0px, 0px) scale(1);
    }
  }
  
  .animate-blob {
    animation: blob 7s infinite;
  }
  
  .animation-delay-2000 {
    animation-delay: 2s;
  }
  
  .animation-delay-4000 {
    animation-delay: 4s;
  }
  
  /* Accessibility */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
  
  /* Form elements */
  input, textarea, select {
    padding: 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid var(--glass-border);
    background: rgba(255, 255, 255, 0.05);
    color: var(--cyber-white);
    font-family: var(--font-primary);
    transition: all var(--animation-fast) ease;
    
    &:focus {
      outline: none;
      border-color: var(--emerald-neon);
      box-shadow: 0 0 0 2px rgba(57, 255, 20, 0.2);
    }
  }
  
  /* Scrollbar styling */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  ::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
  }
  
  ::-webkit-scrollbar-thumb {
    background: var(--lucid-lavender);
    border-radius: 4px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: var(--emerald-neon);
  }
`;

export { GlobalStyles };