import React, { useState } from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';

// Quiz questions with visual options
const quizQuestions = [
  {
    question: "What kind of problem excites you the most?",
    options: [
      { id: "Analytical", text: "Solving puzzles/numbers" },
      { id: "Creative", text: "Designing something new" },
      { id: "Social", text: "Talking & leading people" },
      { id: "Business", text: "Planning businesses/money" }
    ],
    categoryImpact: ["Analytical", "Creative", "Social", "Business"]
  },
  {
    question: "In school, which subject do you enjoy the most?",
    options: [
      { id: "Science", text: "Science & Experiments" },
      { id: "Analytical", text: "Math & Logic" },
      { id: "Social", text: "Languages & Communication" },
      { id: "Tech", text: "Computers & Tech" }
    ],
    categoryImpact: ["Science", "Analytical", "Social", "Tech"]
  },
  {
    question: "You’re given a group project. What role do you naturally take?",
    options: [
      { id: "Business", text: "Organizer (plans & manages)" },
      { id: "Creative", text: "Idea generator (creative direction)" },
      { id: "Analytical", text: "Problem-solver (logic, coding, fixing)" },
      { id: "Social", text: "Presenter (speaks, motivates team)" }
    ],
    categoryImpact: ["Business", "Creative", "Analytical", "Social"]
  },
  {
    question: "Which activity feels the most satisfying?",
    options: [
      { id: "Analytical", text: "Researching & analyzing data" },
      { id: "Creative", text: "Expressing through art/writing" },
      { id: "Social", text: "Helping others solve problems" },
      { id: "Business", text: "Managing money or trade" }
    ],
    categoryImpact: ["Analytical", "Creative", "Social", "Business"]
  },
  {
    question: "If you had 2 free hours daily, how would you use them?",
    options: [
      { id: "Tech", text: "Learn new science/tech stuff" },
      { id: "Creative", text: "Create content/art/music" },
      { id: "Social", text: "Socialize, volunteer, lead clubs" },
      { id: "Business", text: "Plan investments/business ideas" }
    ],
    categoryImpact: ["Tech", "Creative", "Social", "Business"]
  },
  {
    question: "What kind of workplace do you dream of?",
    options: [
      { id: "Business", text: "Corporate office (finance/management)" },
      { id: "Science", text: "Lab or R&D" },
      { id: "Creative", text: "Creative studio / design hub" },
      { id: "Social", text: "Public speaking, community engagement" }
    ],
    categoryImpact: ["Business", "Science", "Creative", "Social"]
  },
  {
    question: "When facing a tough problem, you usually…",
    options: [
      { id: "Analytical", text: "Research & calculate solutions" },
      { id: "Creative", text: "Think outside the box creatively" },
      { id: "Social", text: "Ask people and collaborate" },
      { id: "Business", text: "Break it into a business plan" }
    ],
    categoryImpact: ["Analytical", "Creative", "Social", "Business"]
  },
  {
    question: "What do your friends usually come to you for?",
    options: [
      { id: "Analytical", text: "Homework & logic help" },
      { id: "Creative", text: "Creative project ideas" },
      { id: "Social", text: "Advice & emotional support" },
      { id: "Business", text: "Financial tips / leadership guidance" }
    ],
    categoryImpact: ["Analytical", "Creative", "Social", "Business"]
  },
  {
    question: "Which real-world figure inspires you most?",
    options: [
      { id: "Science", text: "APJ Abdul Kalam / scientists" },
      { id: "Creative", text: "M.F. Hussain / creators" },
      { id: "Social", text: "Social leaders / activists" },
      { id: "Business", text: "Ratan Tata / Entrepreneurs" }
    ],
    categoryImpact: ["Science", "Creative", "Social", "Business"]
  },
  {
    question: "What excites you most about the future?",
    options: [
      { id: "Tech", text: "Solving big global problems with tech" },
      { id: "Creative", text: "Creating something original that inspires" },
      { id: "Social", text: "Leading people / making impact" },
      { id: "Business", text: "Building businesses & financial freedom" }
    ],
    categoryImpact: ["Tech", "Creative", "Social", "Business"]
  }
];

const PersonalityTest = () => {
  const { quizResponses, setQuizResponses, calculateCategoryScores, saveQuizResponses, nextStep } = useOnboarding();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectOption = (questionIndex, answerId) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: answerId
    }));
  };

  const handleNext = () => {
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    // Convert selected answers to the format expected by the context
    const responses = Object.entries(selectedAnswers).map(([questionId, answerId]) => ({
      questionId: parseInt(questionId),
      answerId
    }));

    setIsSubmitting(true);

    // Save responses to context
    setQuizResponses(responses);

    // Calculate category scores
    calculateCategoryScores(responses);

    // Save to Supabase
    const success = await saveQuizResponses();

    setIsSubmitting(false);

    if (success) {
      nextStep();
    } else {
      alert("Failed to save your responses. Please try again.");
    }
  };

  const question = quizQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / quizQuestions.length) * 100;
  const allQuestionsAnswered = quizQuestions.every((_, idx) => selectedAnswers[idx]);
  const isLastQuestion = currentQuestion === quizQuestions.length - 1;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm font-medium">Question {currentQuestion + 1}/{quizQuestions.length}</span>
        <div className="w-2/3 bg-gray-700 rounded-full h-2">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Question */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-6 text-center">{question.question}</h3>

        <div className="grid grid-cols-2 gap-4">
          {question.options.map(option => (
            <button
              key={option.id}
              onClick={() => handleSelectOption(currentQuestion, option.id)}
              className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${selectedAnswers[currentQuestion] === option.id
                  ? 'border-emerald-400 bg-emerald-900 bg-opacity-50'
                  : 'border-indigo-600 hover:border-indigo-400'
                }`}
            >
              <span className="text-4xl mb-3">{option.icon}</span>
              <span className="text-center">{option.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          onClick={handlePrevious}
          disabled={currentQuestion === 0}
          className={`px-4 py-2 rounded-lg ${currentQuestion === 0
              ? 'bg-gray-700 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
        >
          Previous
        </button>

        {isLastQuestion ? (
          <button
            onClick={handleSubmit}
            disabled={!allQuestionsAnswered || isSubmitting}
            className={`px-6 py-2 rounded-lg font-medium ${!allQuestionsAnswered || isSubmitting
                ? 'bg-gray-700 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <span className="inline-block animate-spin h-4 w-4 border-t-2 border-white rounded-full mr-2"></span>
                Submitting...
              </span>
            ) : (
              'Submit Quiz'
            )}
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={!selectedAnswers[currentQuestion]}
            className={`px-4 py-2 rounded-lg ${!selectedAnswers[currentQuestion]
                ? 'bg-gray-700 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
          >
            Next
          </button>
        )}
      </div>

      {/* Question dots */}
      <div className="flex justify-center mt-8 space-x-2">
        {quizQuestions.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentQuestion(index)}
            className={`w-3 h-3 rounded-full ${index === currentQuestion
                ? 'bg-emerald-500'
                : selectedAnswers[index]
                  ? 'bg-indigo-400'
                  : 'bg-gray-600'
              }`}
            aria-label={`Go to question ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default PersonalityTest;