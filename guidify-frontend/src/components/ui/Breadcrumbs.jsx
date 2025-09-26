import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import useNavigation from '../../routes/useNavigation';

const BreadcrumbsContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  overflow-x: auto;
  padding-bottom: 0.5rem;
  
  &::-webkit-scrollbar {
    height: 3px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(57, 255, 20, 0.5);
    border-radius: 3px;
  }
`;

const BreadcrumbItem = styled.span`
  white-space: nowrap;
  
  &:last-child {
    color: var(--primary, #39FF14);
    font-weight: 500;
  }
`;

const BreadcrumbLink = styled(Link)`
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: color 0.2s ease;
  
  &:hover {
    color: var(--primary, #39FF14);
  }
`;

const Separator = styled.span`
  margin: 0 0.5rem;
  color: rgba(255, 255, 255, 0.4);
`;

/**
 * Breadcrumbs Component
 * 
 * Displays a breadcrumb navigation based on the current route
 */
const Breadcrumbs = ({ className }) => {
  const { getBreadcrumbs } = useNavigation();
  const breadcrumbs = getBreadcrumbs();
  
  // Don't show breadcrumbs on the home page
  if (breadcrumbs.length === 1) {
    return null;
  }
  
  return (
    <BreadcrumbsContainer className={className}>
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        
        return (
          <React.Fragment key={crumb.path}>
            <BreadcrumbItem>
              {isLast ? (
                crumb.name
              ) : (
                <BreadcrumbLink to={crumb.path}>{crumb.name}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
            
            {!isLast && <Separator>/</Separator>}
          </React.Fragment>
        );
      })}
    </BreadcrumbsContainer>
  );
};

export default Breadcrumbs;