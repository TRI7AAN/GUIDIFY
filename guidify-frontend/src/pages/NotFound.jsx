import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import SEO from "../components/ui/SEO";

const NotFoundContainer = styled.div`
  text-align: center;
  margin-top: 15vh;
  padding: 2rem;
  animation: pulse 2s infinite;
  
  @keyframes pulse {
    0% {
      text-shadow: 0 0 5px rgba(57, 255, 20, 0.5);
    }
    50% {
      text-shadow: 0 0 20px rgba(57, 255, 20, 0.8), 0 0 30px rgba(57, 255, 20, 0.5);
    }
    100% {
      text-shadow: 0 0 5px rgba(57, 255, 20, 0.5);
    }
  }
`;

const NotFoundTitle = styled.h1`
  font-size: 8rem;
  color: var(--primary, #39FF14);
  margin-bottom: 1rem;
  font-weight: 800;
  letter-spacing: 0.5rem;
`;

const NotFoundText = styled.p`
  color: #fff;
  font-size: 1.5rem;
  margin-bottom: 2rem;
`;

const HomeLink = styled(Link)`
  display: inline-block;
  color: var(--primary, #39FF14);
  text-decoration: none;
  border: 1px solid var(--primary, #39FF14);
  padding: 0.75rem 2rem;
  border-radius: 4px;
  transition: all 0.3s ease;
  font-weight: 500;
  
  &:hover {
    background: rgba(57, 255, 20, 0.2);
    box-shadow: 0 0 15px rgba(57, 255, 20, 0.5);
    transform: translateY(-2px);
  }
`;

export default function NotFound() {
  return (
    <NotFoundContainer className="not-found neon">
      <SEO 
        title="404 Not Found" 
        description="The page you are looking for does not exist" 
        canonicalUrl="/404" 
      />
      <NotFoundTitle>404</NotFoundTitle>
      <NotFoundText>Oops! The page you are looking for does not exist.</NotFoundText>
      <HomeLink to="/">Return to Home</HomeLink>
    </NotFoundContainer>
  );
}
