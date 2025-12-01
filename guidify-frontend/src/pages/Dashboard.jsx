
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../utils/supabaseClient";
import apiClient from "../api/apiClient";
import SkillsRadar from "../components/dashboard/SkillsRadar";
import {
  FaHome, FaChartPie, FaRoute, FaUser, FaBook, FaBriefcase,
  FaUniversity, FaCog, FaSignOutAlt, FaBell, FaSearch, FaFire, FaLayerGroup,
  FaChevronLeft, FaChevronRight
} from "react-icons/fa";
import { motion } from "framer-motion";

// --- Styled Components for Layout & Theme ---

const DashboardLayout = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: #0D0F18;
  color: #FFFFFF;
  font-family: 'Inter', sans-serif;
`;

const Sidebar = styled.aside`
  width: ${props => props.$collapsed ? '80px' : '260px'};
  background-color: #0D0F18;
  border-right: 1px solid #1F2330;
  display: flex;
  flex-direction: column;
  padding: 1.5rem ${props => props.$collapsed ? '0.5rem' : '1.5rem'};
  position: fixed;
  height: 100vh;
  transition: all 0.3s ease;
  z-index: 100;
  overflow-x: hidden;

  @media (max-width: 768px) {
    width: 80px;
    padding: 1rem 0.5rem;
    
    span {
      display: none;
    }
  }
`;

const Logo = styled.div`
  font-size: 1.5rem;
  font-weight: 800;
  color: #39FF14;
  margin-bottom: 0; /* Adjusted for layout */
  display: flex;
  align-items: center;
  justify-content: ${props => props.$collapsed ? 'center' : 'flex-start'};
  gap: 0.5rem;
  padding-left: ${props => props.$collapsed ? '0' : '0.5rem'};
  
  span {
    color: white;
    display: ${props => props.$collapsed ? 'none' : 'block'};
  }
`;

const ToggleButton = styled.button`
  background: none;
  border: none;
  color: #A4ACBC;
  cursor: pointer;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: white;
  }
`;

const NavItem = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: ${props => props.$collapsed ? 'center' : 'flex-start'};
  gap: 1rem;
  padding: 0.8rem 1rem;
  color: #A4ACBC;
  text-decoration: none;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  transition: all 0.2s ease;
  font-weight: 500;

  &:hover, &.active {
    background-color: rgba(57, 255, 20, 0.1);
    color: #39FF14;
  }

  svg {
    font-size: 1.2rem;
    min-width: 1.2rem; /* Prevent shrinking */
  }
`;

const MainContent = styled.main`
  flex: 1;
  margin-left: ${props => props.$collapsed ? '80px' : '260px'};
  padding: 2rem;
  background-color: #0D0F18;
  transition: margin-left 0.3s ease;

  @media (max-width: 768px) {
    margin-left: 80px;
  }
`;

const TopNav = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3rem;
`;

const SearchBar = styled.div`
  background-color: #151821;
  border: 1px solid #1F2330;
  border-radius: 20px;
  padding: 0.6rem 1.2rem;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  width: 100%;
  max-width: 400px;
  color: #A4ACBC;

  input {
    background: transparent;
    border: none;
    color: white;
    width: 100%;
    outline: none;
    
    &::placeholder {
      color: #555;
    }
  }
`;

const UserProfile = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
`;

const NotificationIcon = styled.div`
  position: relative;
  cursor: pointer;
  color: #A4ACBC;
  
  &:hover {
    color: white;
  }

  &::after {
    content: '';
    position: absolute;
    top: -2px;
    right: -2px;
    width: 8px;
    height: 8px;
    background-color: #39FF14;
    border-radius: 50%;
  }
`;

const Avatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #39FF14, #4AD8E6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: #000;
`;

const Greeting = styled.div`
  margin-bottom: 2rem;
  
  h1 {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }
  
  p {
    color: #A4ACBC;
  }
`;

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const StatsColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-width: 0; /* Prevent grid blowout */
`;

const Card = styled(motion.div)`
  background-color: #151821;
  border: 1px solid #1F2330;
  border-radius: 16px;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
  min-width: 0; /* Prevent flex blowout */
  
  &:hover {
    border-color: #39FF14;
    box-shadow: 0 0 20px rgba(57, 255, 20, 0.05);
  }
`;

const CardTitle = styled.h3`
  color: #A4ACBC;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StatValue = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
  margin-bottom: 0.5rem;
`;

const StatSubtext = styled.div`
  color: #39FF14;
  font-size: 0.9rem;
  font-weight: 500;
`;

const SectionTitle = styled.h2`
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  margin-top: 3rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &::before {
    content: '';
    width: 4px;
    height: 20px;
    background-color: #39FF14;
    border-radius: 2px;
  }
`;

const HeatmapGrid = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 1rem;
  overflow-x: auto;
  padding-bottom: 8px;

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-track {
    background: #0D0F18;
  }
  &::-webkit-scrollbar-thumb {
    background: #1F2330;
    border-radius: 2px;
  }
`;

const HeatmapCell = styled.div`
  min-width: 32px;
  height: 32px;
  background-color: ${props => {
    if (props.$intensity === 0) return '#1F2330';
    if (props.$intensity === 1) return 'rgba(57, 255, 20, 0.2)';
    if (props.$intensity === 2) return 'rgba(57, 255, 20, 0.5)';
    return '#39FF14';
  }};
  border-radius: 6px;
  cursor: pointer;
  transition: transform 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: ${props => props.$intensity > 1 ? 'black' : '#A4ACBC'};
  font-weight: bold;
  
  &:hover {
    transform: scale(1.1);
    z-index: 10;
  }
`;

const LearningPathScroll = styled.div`
  display: flex;
  gap: 1.5rem;
  overflow-x: auto;
  padding-bottom: 1rem;
  
  &::-webkit-scrollbar {
    height: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #0D0F18;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #1F2330;
    border-radius: 3px;
  }
`;

const PathCard = styled(Card)`
  min-width: 280px;
  background: linear-gradient(180deg, #151821 0%, #0D0F18 100%);
`;

const Tag = styled.span`
  background-color: rgba(74, 216, 230, 0.1);
  color: #4AD8E6;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
`;

// --- Dashboard Component ---

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [personalityData, setPersonalityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Dynamic Data State
  const [readinessScore, setReadinessScore] = useState(0);
  const [currentTier, setCurrentTier] = useState("Novice");
  const [loginStreak, setLoginStreak] = useState(0);
  const [heatmapData, setHeatmapData] = useState([]);
  const [recommendedCourses, setRecommendedCourses] = useState([]);
  const [districtColleges, setDistrictColleges] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Fetch Profile & Personality Analysis
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
          if (profileData.personality_analysis) {
            setPersonalityData(profileData.personality_analysis);
          }

          // 1. Login Streak
          setLoginStreak(profileData.login_streak || 0);

          // 2. Career Roadmap & Readiness
          const roadmap = profileData.career_roadmap;
          let score = 0;
          let tier = "Novice";
          let availability = 10; // Default

          if (roadmap && roadmap.steps) {
            const totalSteps = roadmap.steps.length;
            const completedSteps = roadmap.steps.filter(s => s.completed).length;
            score = Math.round((completedSteps / totalSteps) * 100);

            // Find current tier (first incomplete step)
            const currentStep = roadmap.steps.find(s => !s.completed);
            if (currentStep) {
              tier = currentStep.title.split(':')[0]; // Use "Phase 1" or "Foundations"
            } else if (completedSteps === totalSteps && totalSteps > 0) {
              tier = "Master";
            }

            if (roadmap.availability_hours) availability = parseInt(roadmap.availability_hours);
          }
          setReadinessScore(score);
          setCurrentTier(tier);

          // 3. Heatmap Data
          const activityLog = profileData.activity_log || {};
          const dailyGoal = Math.max(1, availability / 7); // Hours per day goal

          // Generate last 30 days data
          const heatData = [];
          for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const count = activityLog[dateStr] || 0;

            let intensity = 0;
            if (count > 0) intensity = 1;
            if (count >= dailyGoal * 0.5) intensity = 2;
            if (count >= dailyGoal) intensity = 3;

            heatData.push({ date: d, intensity, count });
          }
          setHeatmapData(heatData);
        }

        setDistrictColleges([
          { id: 1, name: "City Engineering College", location: "Mumbai, Maharashtra", tags: ["Computer Science", "AI & DS"] },
          { id: 2, name: "Metropolitan University", location: "Pune, Maharashtra", tags: ["Robotics", "Electronics"] },
          { id: 3, name: "Tech Institute of Innovation", location: "Bangalore, Karnataka", tags: ["Data Science", "Cybersecurity"] }
        ]);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Separate effect for NCVET courses to avoid blocking the UI
  const isFetchingRef = React.useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    const fetchNCVET = async () => {
      if (!currentTier || !profile || isFetchingRef.current) return;

      isFetchingRef.current = true;
      try {
        const careerGoal = profile.career_roadmap?.title || "Technology";
        console.log("Fetching NCVET courses (Async) for:", { currentTier, careerGoal });

        const nsqfRes = await apiClient.post('/api/courses/nsqf', {
          current_tier: currentTier,
          career_goal: careerGoal
        }, {
          signal: controller.signal
        });

        if (!mounted) return;

        if (nsqfRes && (nsqfRes.courses || nsqfRes.data?.courses)) {
          const courses = nsqfRes.courses || nsqfRes.data.courses;
          const mappedCourses = courses.map((c, idx) => ({
            id: idx,
            title: c.course_name,
            level: `NSQF Level ${c.nsqf_level}`,
            duration: `${c.duration_hours} Hours`,
            difficulty: c.certification_body,
            icon: <FaBook size={30} color="#4AD8E6" />,
            reason: c.reason
          }));
          setRecommendedCourses(mappedCourses);
        }
      } catch (err) {
        if (err.name === 'CanceledError' || err.message === 'canceled') return;
        console.error("Failed to fetch NCVET courses:", err.message);
        if (mounted) setRecommendedCourses([]);
      } finally {
        isFetchingRef.current = false;
      }
    };

    if (!loading && currentTier) {
      fetchNCVET();
    }

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [loading, currentTier, profile?.career_roadmap?.title]);





  const handleEnroll = (courseId) => {
    alert(`Enrolled in course ID: ${courseId} `);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <DashboardLayout>
      <Sidebar $collapsed={isCollapsed}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <Logo $collapsed={isCollapsed}>
            <FaChartPie /> {!isCollapsed && <span>GUIDIFY</span>}
          </Logo>
          <ToggleButton onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
          </ToggleButton>
        </div>

        <NavItem to="/dashboard" className="active" $collapsed={isCollapsed}>
          <FaHome /> {!isCollapsed && <span>Dashboard</span>}
        </NavItem>
        <NavItem to="/roadmap" $collapsed={isCollapsed}>
          <FaRoute /> {!isCollapsed && <span>Career Roadmap</span>}
        </NavItem>
        <NavItem to="/exam" $collapsed={isCollapsed}>
          <FaBook /> {!isCollapsed && <span>Exam Bot</span>}
        </NavItem>
        <NavItem to="/colleges" $collapsed={isCollapsed}>
          <FaUniversity /> {!isCollapsed && <span>College Recommender</span>}
        </NavItem>
        <NavItem to="/scholarships" $collapsed={isCollapsed}>
          <FaUniversity /> {!isCollapsed && <span>Scholarship Finder</span>}
        </NavItem>
        <NavItem to="/interview" $collapsed={isCollapsed}>
          <FaUser /> {!isCollapsed && <span>Voice Interview</span>}
        </NavItem>
        <NavItem to="/jobs" $collapsed={isCollapsed}>
          <FaBriefcase /> {!isCollapsed && <span>Job Recommender</span>}
        </NavItem>

        <div style={{ marginTop: 'auto' }}>
          <NavItem to="/profile" $collapsed={isCollapsed}>
            <FaUser /> {!isCollapsed && <span>My Profile</span>}
          </NavItem>
          <NavItem to="/settings" $collapsed={isCollapsed}>
            <FaCog /> {!isCollapsed && <span>Settings</span>}
          </NavItem>
          <NavItem as="button" onClick={handleLogout} style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer' }} $collapsed={isCollapsed}>
            <FaSignOutAlt /> {!isCollapsed && <span>Logout</span>}
          </NavItem>
        </div>
      </Sidebar>

      <MainContent>
        <TopNav>
          <SearchBar>
            <FaSearch />
            <input type="text" placeholder="Search courses, skills, careers..." />
          </SearchBar>

          <UserProfile>
            <NotificationIcon>
              <FaBell size={20} />
            </NotificationIcon>
            <Avatar>
              {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
            </Avatar>
          </UserProfile>
        </TopNav>

        <Greeting>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Welcome back, {profile?.name?.split(' ')[0] || 'Learner'}!
          </motion.h1>
          <p>Your personalized career journey continues.</p>
        </Greeting>

        {/* Progress Tracker */}
        <div style={{ marginBottom: '2rem', background: '#151821', padding: '1.5rem', borderRadius: '16px', border: '1px solid #1F2330' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: '#A4ACBC', fontWeight: '600', fontSize: '0.9rem' }}>Career Readiness Score</span>
            <span style={{ color: '#39FF14', fontWeight: 'bold' }}>{readinessScore}%</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: '#1F2330', borderRadius: '4px', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${readinessScore}% ` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              style={{ height: '100%', background: 'linear-gradient(90deg, #39FF14, #4AD8E6)' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#555' }}>
              <span style={{ color: '#4AD8E6', marginRight: '5px' }}>●</span> Learning Path: {Math.floor(readinessScore * 0.6)}%
            </div>
            <div style={{ fontSize: '0.8rem', color: '#555' }}>
              <span style={{ color: '#39FF14', marginRight: '5px' }}>●</span> Skills Mastery: {Math.floor(readinessScore * 0.8)}%
            </div>
          </div>
        </div>

        <DashboardGrid>
          {/* Left Column: Skills Radar (Large) */}
          <Card style={{ height: '100%', minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
            <CardTitle><FaChartPie color="#39FF14" /> Skills Radar</CardTitle>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {personalityData && personalityData.traits ? (
                <SkillsRadar data={personalityData.traits} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
                  <p style={{ marginBottom: '1rem' }}>No Analysis Data</p>
                  <button
                    onClick={() => navigate('/onboarding')}
                    style={{ padding: '0.5rem 1rem', background: '#39FF14', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Retake Quiz
                  </button>
                </div>
              )}
            </div>
          </Card>

          {/* Right Column: Stats Stack */}
          <StatsColumn>
            {/* Login Streak Card */}
            <Card whileHover={{ scale: 1.02 }}>
              <CardTitle><FaFire color="#FF5722" /> Login Streak</CardTitle>
              <StatValue>{loginStreak} Days</StatValue>
              <StatSubtext>+2% from last week</StatSubtext>
            </Card>

            {/* Tier Progress Card */}
            <Card whileHover={{ scale: 1.02 }}>
              <CardTitle><FaLayerGroup color="#4AD8E6" /> Current Phase</CardTitle>
              <StatValue style={{ fontSize: '1.8rem' }}>{currentTier}</StatValue>
              <StatSubtext>Global Progress: {readinessScore}%</StatSubtext>
              <div style={{ width: '100%', height: '6px', background: '#1F2330', borderRadius: '3px', marginTop: '1rem' }}>
                <div style={{ width: `${readinessScore}% `, height: '100%', background: '#4AD8E6', borderRadius: '3px' }} />
              </div>
            </Card>

            {/* Heatmap Card */}
            <Card whileHover={{ scale: 1.02 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <CardTitle style={{ marginBottom: 0 }}><FaChartPie color="#39FF14" /> Activity Heatmap</CardTitle>
                <span style={{ fontSize: '0.8rem', color: '#A4ACBC' }}>
                  {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
              </div>
              <HeatmapGrid>
                {heatmapData.map((data, idx) => (
                  <HeatmapCell
                    key={idx}
                    $intensity={data.intensity}
                    title={`${data.date.toDateString()}: ${data.count} activities`}
                  >
                    {data.date.getDate()}
                  </HeatmapCell>
                ))}
              </HeatmapGrid>
            </Card>
          </StatsColumn>
        </DashboardGrid>

        <SectionTitle>Your Learning Path</SectionTitle>
        <LearningPathScroll>
          <PathCard whileHover={{ y: -5 }}>
            <div style={{ marginBottom: '1rem' }}>
              <Tag>Step 1</Tag>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '0.5rem' }}>Data Fundamentals</h3>
            <p style={{ color: '#A4ACBC', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Learn the basics of data structures and algorithms.
            </p>
            <button style={{
              width: '100%', padding: '0.8rem', background: '#39FF14', color: 'black',
              border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'
            }}>
              Continue
            </button>
          </PathCard>

          <PathCard whileHover={{ y: -5 }} style={{ opacity: 0.7 }}>
            <div style={{ marginBottom: '1rem' }}>
              <Tag>Step 2</Tag>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '0.5rem' }}>Intro to ML</h3>
            <p style={{ color: '#A4ACBC', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Explore foundational ML concepts and models.
            </p>
            <button disabled style={{
              width: '100%', padding: '0.8rem', background: '#1F2330', color: '#555',
              border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'not-allowed'
            }}>
              Locked
            </button>
          </PathCard>

          <PathCard whileHover={{ y: -5 }} style={{ opacity: 0.7 }}>
            <div style={{ marginBottom: '1rem' }}>
              <Tag>Step 3</Tag>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '0.5rem' }}>Neural Networks</h3>
            <p style={{ color: '#A4ACBC', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Dive deep into the architecture of neural networks.
            </p>
            <button disabled style={{
              width: '100%', padding: '0.8rem', background: '#1F2330', color: '#555',
              border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'not-allowed'
            }}>
              Locked
            </button>
          </PathCard>
        </LearningPathScroll>

        <SectionTitle>Recommended Courses</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          {recommendedCourses.map((course) => (
            <Card key={course.id} whileHover={{ y: -5 }}>
              <div style={{ height: '120px', background: 'linear-gradient(45deg, #1F2330, #151821)', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {course.icon}
              </div>
              <Tag style={{ marginBottom: '0.5rem', display: 'inline-block' }}>{course.level}</Tag>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>{course.title}</h3>
              <p style={{ color: '#A4ACBC', fontSize: '0.85rem', marginBottom: '1rem', height: '40px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {course.reason || "Master concepts specifically for your career path."}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#555', marginBottom: '1rem' }}>
                <span><FaBriefcase style={{ marginRight: '4px' }} /> {course.duration}</span>
                <span style={{ color: '#39FF14' }}>{course.difficulty}</span>
              </div>
              <button
                onClick={() => handleEnroll(course.id)}
                style={{
                  width: '100%', padding: '0.6rem', border: '1px solid #39FF14', color: '#39FF14',
                  background: 'transparent', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.target.style.background = '#39FF14'; e.target.style.color = 'black'; }}
                onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#39FF14'; }}
              >
                Enroll Now
              </button>
            </Card>
          ))}
        </div>

        <SectionTitle>District-Level Institutions</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          {districtColleges.map((college) => (
            <Card key={college.id} whileHover={{ scale: 1.01 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ width: '60px', height: '60px', background: '#1F2330', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FaUniversity size={24} color="#39FF14" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.2rem' }}>{college.name}</h3>
                  <p style={{ color: '#A4ACBC', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    {college.location}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem' }}>
                    {college.tags.map((tag, idx) => (
                      <Tag key={idx}>{tag}</Tag>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

      </MainContent>
    </DashboardLayout >
  );
}
