import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/apiClient';
import { supabase } from '../utils/supabaseClient';
import {
  BookOpen, Briefcase, Award, Map,
  CheckCircle, Circle, ArrowRight, Loader
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PageContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: #0D0F18;
  color: white;
  font-family: 'Inter', sans-serif;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const LeftPanel = styled.div`
  flex: 1;
  padding: 3rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-right: 1px solid #1F2330;
  background: radial-gradient(circle at top left, rgba(57, 255, 20, 0.05), transparent 40%);

  h1 {
    font-size: 2.5rem;
    font-weight: 800;
    margin-bottom: 1rem;
    background: linear-gradient(90deg, #fff, #A4ACBC);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  p {
    color: #A4ACBC;
    margin-bottom: 2rem;
    font-size: 1.1rem;
  }
`;

const InputGroup = styled.div`
  margin-bottom: 1.5rem;

  label {
    display: block;
    margin-bottom: 0.5rem;
    color: #39FF14;
    font-weight: 600;
    font-size: 0.9rem;
  }

  input, select {
    width: 100%;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid #1F2330;
    border-radius: 12px;
    color: white;
    font-size: 1rem;
    transition: all 0.3s ease;

    &:focus {
      outline: none;
      border-color: #39FF14;
      box-shadow: 0 0 15px rgba(57, 255, 20, 0.1);
    }
  }
`;

const GenerateButton = styled(motion.button)`
  width: 100%;
  padding: 1rem;
  background: #39FF14;
  color: black;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const RightPanel = styled.div`
  flex: 1.5;
  padding: 3rem;
  overflow-y: auto;
  background-color: #0D0F18;
  position: relative;

  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-thumb {
    background: #1F2330;
    border-radius: 4px;
  }
`;

const TimelineContainer = styled.div`
  position: relative;
  max-width: 600px;
  margin: 0 auto;
  padding-left: 2rem;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 2px;
    background: linear-gradient(180deg, #39FF14, #4AD8E6, transparent);
  }
`;

const StepCard = styled(motion.div)`
  background: rgba(21, 24, 33, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid #1F2330;
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    left: -2.4rem;
    top: 1.5rem;
    width: 12px;
    height: 12px;
    background: #0D0F18;
    border: 2px solid #39FF14;
    border-radius: 50%;
    z-index: 10;
  }

  &:hover {
    border-color: #4AD8E6;
    transform: translateX(5px);
    transition: all 0.3s ease;
  }
`;

const StepHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
`;

const StepTitle = styled.h3`
  font-size: 1.2rem;
  font-weight: 600;
  color: white;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StepDuration = styled.span`
  font-size: 0.8rem;
  color: #39FF14;
  background: rgba(57, 255, 20, 0.1);
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
`;

const StepTypeIcon = ({ type }) => {
  switch (type) {
    case 'course': return <BookOpen size={18} color="#4AD8E6" />;
    case 'project': return <Briefcase size={18} color="#FF5722" />;
    case 'certification': return <Award size={18} color="#FFC107" />;
    default: return <Map size={18} color="#A4ACBC" />;
  }
};

const CareerRoadmap = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState('');
  const [career, setCareer] = useState('');
  const [currentLevel, setCurrentLevel] = useState('Beginner');
  const [availability, setAvailability] = useState('10');
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);

  const [isCreating, setIsCreating] = useState(true);

  // Load existing roadmap on mount
  useEffect(() => {
    const loadRoadmap = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('career_roadmap')
        .eq('user_id', user.id)
        .single();

      if (data?.career_roadmap) {
        setRoadmap(data.career_roadmap);
        setIsCreating(false); // Switch to view mode if roadmap exists
      }
    };
    loadRoadmap();
  }, [user]);

  const handleGenerate = async () => {
    if (!subjects || !career) return alert("Please fill in all fields");

    setLoading(true);
    try {
      const res = await apiClient.post('/api/roadmap/generate', {
        current_subjects: subjects,
        target_career: career,
        current_level: currentLevel,
        availability_hours: availability,
        user_id: user.id
      });
      setRoadmap(res);
      setIsCreating(false); // Switch to view mode after generation
    } catch (error) {
      console.error("Generation failed:", error);
      // Check for specific error types
      if (error.code === 'ERR_NETWORK') {
        alert("Network error: Could not connect to the server. Please check if the backend is running.");
      } else if (error.response?.status === 500) {
        alert("Server error: The AI service might be overloaded. Please try again in a moment.");
      } else {
        alert(`Failed to generate roadmap: ${error.message || "Unknown error"}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteStep = async (index) => {
    if (!roadmap) return;

    // Optimistic Update
    const newSteps = [...roadmap.steps];
    newSteps[index].completed = true;
    setRoadmap({ ...roadmap, steps: newSteps });

    try {
      await apiClient.post('/api/roadmap/complete-step', {
        user_id: user.id,
        step_index: index
      });
    } catch (error) {
      console.error("Failed to complete step:", error);
      // Revert on error
      newSteps[index].completed = false;
      setRoadmap({ ...roadmap, steps: newSteps });
      alert("Failed to update progress. Please check your connection.");
    }
  };

  return (
    <PageContainer>
      <LeftPanel>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'none', border: 'none', color: '#A4ACBC',
            cursor: 'pointer', marginBottom: '2rem', display: 'flex', alignItems: 'centre', gap: '0.5rem'
          }}
        >
          ← Back to Dashboard
        </button>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1>Design Your Future</h1>
          <p>AI-powered roadmap generator to guide you from where you are to where you want to be.</p>

          {!isCreating && roadmap ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'rgba(255,255,255,0.05)',
                padding: '1.5rem',
                borderRadius: '16px',
                border: '1px solid #1F2330'
              }}
            >
              <h3 style={{ color: '#39FF14', marginBottom: '0.5rem' }}>Current Roadmap Active</h3>
              <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                You are currently viewing <strong>{roadmap.title}</strong>.
              </p>

              <GenerateButton
                onClick={() => setIsCreating(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Map size={20} /> Create New Roadmap
              </GenerateButton>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <InputGroup>
                <label>Current Subjects / Stream</label>
                <input
                  type="text"
                  placeholder="e.g. PCM, Commerce, Computer Science"
                  value={subjects}
                  onChange={(e) => setSubjects(e.target.value)}
                />
              </InputGroup>

              <InputGroup>
                <label>Dream Career</label>
                <input
                  type="text"
                  placeholder="e.g. AI Engineer, Data Scientist,"
                  value={career}
                  onChange={(e) => setCareer(e.target.value)}
                />
              </InputGroup>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <InputGroup style={{ flex: 1 }}>
                  <label>Current Level</label>
                  <select
                    value={currentLevel}
                    onChange={(e) => setCurrentLevel(e.target.value)}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </InputGroup>

                <InputGroup style={{ flex: 1 }}>
                  <label>Learning Hours/Week</label>
                  <input
                    type="number"
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                  />
                </InputGroup>
              </div>

              <GenerateButton
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? <Loader className="animate-spin" /> : <><Map /> Generate Roadmap</>}
              </GenerateButton>

              {roadmap && (
                <button
                  onClick={() => setIsCreating(false)}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: 'transparent',
                    color: '#A4ACBC',
                    border: '1px solid #1F2330',
                    borderRadius: '12px',
                    marginTop: '1rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              )}
            </motion.div>
          )}
        </motion.div>
      </LeftPanel>

      <RightPanel>
        <AnimatePresence mode="wait">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '600px', margin: '0 auto' }}>
              {[1, 2, 3].map(i => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ height: '120px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px' }}
                />
              ))}
            </div>
          ) : roadmap ? (
            <TimelineContainer>
              <h2 style={{ marginBottom: '2rem', color: '#39FF14' }}>{roadmap.title}</h2>
              <p style={{ marginBottom: '2rem', color: '#A4ACBC' }}>{roadmap.summary}</p>

              {roadmap.steps?.map((step, index) => (
                <StepCard
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  style={{
                    borderColor: step.completed ? '#39FF14' : '#1F2330',
                    opacity: step.completed ? 0.8 : 1
                  }}
                >
                  <StepHeader>
                    <StepTitle>
                      <button
                        onClick={() => handleCompleteStep(index)}
                        disabled={step.completed}
                        style={{
                          background: 'none', border: 'none', cursor: step.completed ? 'default' : 'pointer',
                          marginRight: '0.5rem', display: 'flex', alignItems: 'center'
                        }}
                      >
                        {step.completed ? <CheckCircle color="#39FF14" size={24} /> : <Circle color="#555" size={24} />}
                      </button>
                      <StepTypeIcon type={step.type} />
                      <span style={{ marginLeft: '0.5rem', textDecoration: step.completed ? 'line-through' : 'none', color: step.completed ? '#A4ACBC' : 'white' }}>
                        {step.title}
                      </span>
                    </StepTitle>
                    <StepDuration>{step.duration}</StepDuration>
                  </StepHeader>
                  <p style={{ color: '#A4ACBC', fontSize: '0.95rem', lineHeight: '1.5', paddingLeft: '2.5rem' }}>
                    {step.description}
                  </p>
                </StepCard>
              ))}
            </TimelineContainer>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
              <div style={{ textAlign: 'center' }}>
                <Map size={64} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                <p>Enter your details to generate a roadmap.</p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </RightPanel >
    </PageContainer >
  );
};

export default CareerRoadmap;
