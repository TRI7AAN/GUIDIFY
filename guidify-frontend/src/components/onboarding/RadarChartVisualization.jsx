import React, { useState, useEffect } from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

const RadarChartVisualization = () => {
  const { quizScores, nextStep } = useOnboarding();
  const [animatedScores, setAnimatedScores] = useState({
    Analytical: 0,
    Creative: 0,
    Social: 0,
    Business: 0,
    Science: 0,
  });
  const [isAnimating, setIsAnimating] = useState(true);

  // Animate the scores when component mounts
  useEffect(() => {
    const animationDuration = 1500; // ms
    const steps = 20;
    const interval = animationDuration / steps;
    
    let currentStep = 0;
    
    const timer = setInterval(() => {
      currentStep++;
      
      if (currentStep <= steps) {
        const progress = currentStep / steps;
        
        setAnimatedScores({
          Analytical: Math.round(quizScores.Analytical * progress),
          Creative: Math.round(quizScores.Creative * progress),
          Social: Math.round(quizScores.Social * progress),
          Business: Math.round(quizScores.Business * progress),
          Science: Math.round(quizScores.Science * progress),
        });
      } else {
        setIsAnimating(false);
        clearInterval(timer);
      }
    }, interval);
    
    return () => clearInterval(timer);
  }, [quizScores]);

  // Format data for the radar chart
  const chartData = [
    { subject: 'Analytical', A: animatedScores.Analytical, fullMark: 100 },
    { subject: 'Creative', A: animatedScores.Creative, fullMark: 100 },
    { subject: 'Social', A: animatedScores.Social, fullMark: 100 },
    { subject: 'Business', A: animatedScores.Business, fullMark: 100 },
    { subject: 'Science', A: animatedScores.Science, fullMark: 100 },
  ];

  // Find the top categories
  const sortedCategories = Object.entries(quizScores)
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category);

  const topCategories = sortedCategories.slice(0, 2);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold mb-2">Your Aptitude Profile</h3>
        <p className="text-emerald-300">
          Based on your responses, here's a visualization of your strengths and interests
        </p>
      </div>

      {/* Radar Chart */}
      <div className="h-80 w-full mb-8">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
            <PolarGrid stroke="#6366f1" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#d1fae5' }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#d1fae5' }} />
            <Radar
              name="Score"
              dataKey="A"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.6}
              animationDuration={1500}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Strengths Summary */}
      <div className="bg-indigo-900 bg-opacity-50 rounded-lg p-6 mb-6">
        <h4 className="text-lg font-medium mb-3 text-emerald-300">Your Top Strengths</h4>
        <div className="space-y-4">
          {topCategories.map((category, index) => (
            <div key={category} className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center text-xl mr-4">
                {index === 0 ? '🥇' : '🥈'}
              </div>
              <div>
                <h5 className="font-medium">{category}</h5>
                <div className="w-full bg-indigo-700 rounded-full h-2.5 mt-1">
                  <div
                    className="bg-emerald-500 h-2.5 rounded-full"
                    style={{ width: `${animatedScores[category]}%` }}
                  ></div>
                </div>
              </div>
              <span className="ml-auto font-bold">{animatedScores[category]}%</span>
            </div>
          ))}
        </div>
      </div>


    </div>
  );
};

export default RadarChartVisualization;