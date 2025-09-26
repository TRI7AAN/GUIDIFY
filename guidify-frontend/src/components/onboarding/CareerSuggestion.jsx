import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../contexts/OnboardingContext';

const CareerSuggestion = () => {
  const { quizScores, saveCareerSuggestion } = useOnboarding();
  const [suggestion, setSuggestion] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch career suggestion from backend API
    const fetchCareerSuggestion = async () => {
      try {
        setIsLoading(true);
        
        // API call to backend
        const response = await fetch('/api/aptitude/career-suggestion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ scores: quizScores }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch career suggestion');
        }
        
        const data = await response.json();
        
        if (data.success && data.data.suggestion) {
          setSuggestion(data.data.suggestion);
          // Save to Supabase
          await saveCareerSuggestion(data.data.suggestion);
        } else {
          // Fallback suggestion if API fails
          const fallbackSuggestion = generateFallbackSuggestion(quizScores);
          setSuggestion(fallbackSuggestion);
          await saveCareerSuggestion(fallbackSuggestion);
        }
      } catch (error) {
        console.error('Error fetching career suggestion:', error);
        // Fallback suggestion if API fails
        const fallbackSuggestion = generateFallbackSuggestion(quizScores);
        setSuggestion(fallbackSuggestion);
        await saveCareerSuggestion(fallbackSuggestion);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCareerSuggestion();
  }, [quizScores, saveCareerSuggestion]);

  // Generate a fallback suggestion based on quiz scores if API fails
  const generateFallbackSuggestion = (scores) => {
    const topCategories = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([category]) => category);
    
    const suggestions = {
      Analytical: {
        career: 'Data Analysis or Engineering',
        degree: 'Computer Science, Mathematics, or Statistics',
        reason: 'Your analytical strengths indicate you would excel in fields requiring logical thinking and problem-solving.'
      },
      Creative: {
        career: 'Design or Content Creation',
        degree: 'Fine Arts, Digital Media, or Communications',
        reason: 'Your creative abilities suggest you would thrive in fields that value innovation and artistic expression.'
      },
      Social: {
        career: 'Human Resources or Counseling',
        degree: 'Psychology, Sociology, or Education',
        reason: 'Your social skills indicate you would excel in careers focused on helping and understanding others.'
      },
      Business: {
        career: 'Business Management or Marketing',
        degree: 'Business Administration, Economics, or Marketing',
        reason: 'Your business acumen suggests you would succeed in commercial or entrepreneurial roles.'
      },
      Science: {
        career: 'Research or Healthcare',
        degree: 'Biology, Chemistry, or Health Sciences',
        reason: 'Your scientific aptitude indicates you would excel in fields requiring analytical and investigative skills.'
      }
    };
    
    const primarySuggestion = suggestions[topCategories[0]];
    const secondarySuggestion = suggestions[topCategories[1]];
    
    return `Based on your interests, ${primarySuggestion.career} aligns with your ${topCategories[0].toLowerCase()} strengths. Consider pursuing a degree in ${primarySuggestion.degree}. ${primarySuggestion.reason} Alternatively, ${secondarySuggestion.career} could also be a good fit given your ${topCategories[1].toLowerCase()} abilities.`;
  };

  const handleFinish = () => {
    navigate('/dashboard');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold mb-2">Your Personalized Career Path</h3>
        <p className="text-emerald-300">
          Based on your aptitude profile, here are career paths that might be a great fit for you
        </p>
      </div>

      {/* Career Suggestion Card */}
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 rounded-lg shadow-xl p-6 mb-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mb-4"></div>
            <p className="text-emerald-300">Analyzing your profile and generating personalized suggestions...</p>
          </div>
        ) : (
          <>
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 rounded-full bg-emerald-700 flex items-center justify-center text-2xl mr-4">
                🚀
              </div>
              <h4 className="text-lg font-medium text-emerald-300">AI Career Recommendation</h4>
            </div>
            
            <p className="text-white leading-relaxed mb-6">
              {suggestion}
            </p>
            
            <div className="border-t border-indigo-700 pt-4 mt-4">
              <h5 className="font-medium text-emerald-300 mb-2">Next Steps:</h5>
              <ul className="list-disc list-inside space-y-1 text-white">
                <li>Explore courses and colleges aligned with these paths</li>
                <li>Research job opportunities and requirements</li>
                <li>Connect with professionals in these fields</li>
              </ul>
            </div>
          </>
        )}
      </div>

      {/* Finish Button */}
      <div className="text-center mt-8">
        <button
          onClick={handleFinish}
          disabled={isLoading}
          className={`px-8 py-3 rounded-lg font-medium transition-colors ${
            isLoading
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {isLoading ? 'Please wait...' : 'Finish & Go to Dashboard'}
        </button>
      </div>
    </div>
  );
};

export default CareerSuggestion;