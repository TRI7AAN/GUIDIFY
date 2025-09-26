import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SEO from "../components/ui/SEO";
import styled from "styled-components";
import { getRoutesByCategory } from "../routes";
import { useAuth } from "../contexts/AuthContext";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import apiClient from "../api/apiClient";
import { supabase } from "../utils/supabaseClient";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';

const DashboardContainer = styled.div`
  max-width: 1000px;
  margin: 5vh auto;
  padding: 2rem;
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  border-radius: 2rem;
  border: 1.5px solid var(--glass-border);
  box-shadow: var(--shadow-glow-strong);
`;

const WelcomeSection = styled.div`
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--glass-border);
  padding-bottom: 1.5rem;
`;

const RecommendationsSection = styled.div`
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--glass-border);
  padding-bottom: 1.5rem;
`;

const CategorySection = styled.div`
  margin-bottom: 2rem;
`;

const CategoryTitle = styled.h3`
  color: var(--emerald-neon);
  font-size: 1.3rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;

  &:after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--glass-border);
    margin-left: 1rem;
  }
`;

const ButtonsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`;

const StyledLink = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: var(--glass-bg);
  color: var(--cyber-white);
  text-decoration: none;
  border-radius: 1rem;
  border: 1.5px solid var(--emerald-neon);
  transition: all 0.3s ease;
  text-align: center;
  font-weight: 600;
  height: 60px;
  box-shadow: var(--shadow-glow);

  &:hover {
    background: rgba(57, 255, 20, 0.1);
    border-color: var(--emerald-neon);
    box-shadow: var(--shadow-glow-strong);
    transform: translateY(-2px) scale(1.03);
    color: var(--emerald-neon);
  }
`;

export default function Dashboard() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch user profile from Supabase
    const fetchProfile = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
          setError('Failed to load your profile. Please try refreshing the page.');
        } else if (data) {
          setProfile(data);
        }
        
        // Fetch recommendations
        try {
          const response = await apiClient.post('/ai/recommendations', { userId: user.id });
          setRecommendations(response.data);
        } catch (recError) {
          console.error('Failed to fetch recommendations:', recError);
          // Don't set main error for recommendations failure
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  // Get routes by category
  const learningRoutes = getRoutesByCategory('learning');
  const careerRoutes = getRoutesByCategory('career');
  const toolsRoutes = getRoutesByCategory('tools');

  // If still loading, show a loading spinner
  if (isLoading) {
    return (
      <DashboardContainer className="glass-card">
        <SEO title="Dashboard" description="Your personalized GUIDIFY dashboard" canonicalUrl="/dashboard" />
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--emerald-neon)' }}></div>
          <p className="mt-4">Loading your dashboard...</p>
        </div>
      </DashboardContainer>
    );
  }

  // If there's an error, show error message with retry button
  if (error) {
    return (
      <DashboardContainer className="glass-card">
        <SEO title="Dashboard" description="Your personalized GUIDIFY dashboard" canonicalUrl="/dashboard" />
        <div className="flex flex-col items-center justify-center h-64">
          <div className="text-red-500 text-xl mb-4">⚠️ {error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer className="glass-card">
      <SEO title="Dashboard" description="Your personalized GUIDIFY dashboard" canonicalUrl="/dashboard" />

      <Breadcrumbs />

      <WelcomeSection>
        <h2 style={{ color: 'var(--primary, #39FF14)' }}>
          Welcome, {profile?.name || user?.user_metadata?.name || 'User'}
        </h2>
        <p>Access all GUIDIFY features from your personalized dashboard</p>
      </WelcomeSection>

      {/* Recommendations Section */}
      <RecommendationsSection>
        <h3 style={{ color: 'var(--primary, #39FF14)' }}>Your Recommendations</h3>
        {recommendations.length > 0 ? (
          <ul>
            {recommendations.map((rec, index) => (
              <li key={index}>{rec}</li>
            ))}
          </ul>
        ) : (
          <p>No recommendations available at the moment.</p>
        )}
      </RecommendationsSection>

      {/* Learning Section */}
      <CategorySection>
        <CategoryTitle>Learning</CategoryTitle>
        <ButtonsGrid>
          {learningRoutes.map(route => (
            <StyledLink key={route.path} to={route.path}>
              {route.name}
            </StyledLink>
          ))}
        </ButtonsGrid>
      </CategorySection>

      {/* Career Section */}
      <CategorySection>
        <CategoryTitle>Career</CategoryTitle>
        <ButtonsGrid>
          {careerRoutes.map(route => (
            <StyledLink key={route.path} to={route.path}>
              {route.name}
            </StyledLink>
          ))}
        </ButtonsGrid>
      </CategorySection>

      {/* Tools Section */}
      <CategorySection>
        <CategoryTitle>Tools</CategoryTitle>
        <ButtonsGrid>
          {toolsRoutes.map(route => (
            <StyledLink key={route.path} to={route.path}>
              {route.name}
            </StyledLink>
          ))}
        </ButtonsGrid>
      </CategorySection>
    </DashboardContainer>
  );
}
