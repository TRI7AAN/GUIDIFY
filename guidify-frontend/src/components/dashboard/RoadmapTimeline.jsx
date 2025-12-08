import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FaCheckCircle, FaCircle, FaLock } from 'react-icons/fa';

const TimelineContainer = styled.div`
  position: relative;
  padding: 2rem 0;
  max-width: 800px;
  margin: 0 auto;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 20px;
    width: 4px;
    background: #1F2330;
    border-radius: 2px;
  }
`;

const TimelineItem = styled(motion.div)`
  display: flex;
  gap: 2rem;
  margin-bottom: 3rem;
  position: relative;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const IconWrapper = styled.div`
  width: 44px;
  height: 44px;
  background: ${props => props.$completed ? '#39FF14' : (props.$active ? '#4AD8E6' : '#1F2330')};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  flex-shrink: 0;
  border: 4px solid #0D0F18;
  box-shadow: 0 0 0 2px ${props => props.$completed ? '#39FF14' : (props.$active ? '#4AD8E6' : '#1F2330')};
`;

const ContentCard = styled.div`
  background: #151821;
  border: 1px solid ${props => props.$active ? '#4AD8E6' : '#1F2330'};
  border-radius: 12px;
  padding: 1.5rem;
  flex: 1;
  position: relative;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateX(5px);
    border-color: ${props => props.$active ? '#4AD8E6' : '#39FF14'};
  }
  
  &::before {
    content: '';
    position: absolute;
    left: -10px;
    top: 22px;
    width: 0;
    height: 0;
    border-top: 10px solid transparent;
    border-bottom: 10px solid transparent;
    border-right: 10px solid ${props => props.$active ? '#4AD8E6' : '#1F2330'};
  }
`;

const StepTitle = styled.h3`
  font-size: 1.2rem;
  color: ${props => props.$completed ? '#39FF14' : (props.$active ? 'white' : '#A4ACBC')};
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StepDescription = styled.p`
  color: #A4ACBC;
  font-size: 0.95rem;
  line-height: 1.6;
  margin-bottom: 1rem;
`;

const Tag = styled.span`
  background: rgba(74, 216, 230, 0.1);
  color: #4AD8E6;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-right: 0.5rem;
`;

const RoadmapTimeline = ({ steps = [] }) => {
    if (!steps || steps.length === 0) {
        return <div style={{ color: '#555', textAlign: 'center' }}>No roadmap data available.</div>;
    }

    return (
        <TimelineContainer>
            {steps.map((step, index) => {
                const isCompleted = step.completed;
                // Active is the first non-completed step
                const isActive = !isCompleted && (index === 0 || steps[index - 1].completed);
                const isLocked = !isCompleted && !isActive;

                return (
                    <TimelineItem
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <IconWrapper $completed={isCompleted} $active={isActive}>
                            {isCompleted ? <FaCheckCircle color="black" size={20} /> :
                                isActive ? <FaCircle color="black" size={16} /> :
                                    <FaLock color="#555" size={16} />}
                        </IconWrapper>

                        <ContentCard $active={isActive}>
                            <div style={{ marginBottom: '0.5rem' }}>
                                <Tag>{step.type || 'Milestone'}</Tag>
                                <span style={{ color: '#555', fontSize: '0.8rem' }}>{step.duration}</span>
                            </div>

                            <StepTitle $completed={isCompleted} $active={isActive}>
                                {step.title}
                            </StepTitle>

                            <StepDescription>
                                {step.description}
                            </StepDescription>

                            {isActive && (
                                <button style={{
                                    background: '#4AD8E6', color: 'black', border: 'none',
                                    padding: '0.6rem 1.2rem', borderRadius: '6px', fontWeight: 'bold',
                                    cursor: 'pointer', marginTop: '0.5rem'
                                }}>
                                    Start Learning
                                </button>
                            )}
                        </ContentCard>
                    </TimelineItem>
                );
            })}
        </TimelineContainer>
    );
};

export default RoadmapTimeline;
