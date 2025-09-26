import os
from typing import List, Dict, Any, Optional
from groq import Groq

class GroqClient:
    """Wrapper for Groq API client to handle LLM calls"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Groq client
        
        Args:
            api_key: Groq API key (defaults to environment variable)
        """
        self.api_key = api_key or os.environ.get("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("Groq API key not provided and not found in environment variables")
        
        self.client = Groq(api_key=self.api_key)
        self.default_model = "llama-3.1-8b-instant"
    
    def generate_text(self, prompt: str, model: Optional[str] = None, temperature: float = 0.7) -> str:
        """
        Generate text using Groq LLM
        
        Args:
            prompt: Text prompt for the LLM
            model: Model to use (defaults to llama-3.1-8b-instant)
            temperature: Temperature for generation (0.0 to 1.0)
            
        Returns:
            Generated text response
        """
        try:
            chat_completion = self.client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=model or self.default_model,
                temperature=temperature
            )
            return chat_completion.choices[0].message.content
        except Exception as e:
            print(f"Error in Groq API call: {str(e)}")
            return f"Error generating response: {str(e)}"
    
    def get_college_recommendations(self, marks: int, board: str, stream: str) -> List[str]:
        """
        Get college recommendations based on marks, board and stream
        
        Args:
            marks: Student's marks/percentage
            board: Education board (CBSE, ICSE, etc.)
            stream: Academic stream (Science, Commerce, Arts)
            
        Returns:
            List of recommended college names
        """
        prompt = f"""
        A student scored {marks}% in their {board} exam with stream {stream}.
        Suggest 5 top colleges in India suitable for them.
        Just give clean list of college names.
        """
        
        response = self.generate_text(prompt, temperature=0.3)
        colleges = [c.strip("-•* ") for c in response.split("\n") if c.strip()]
        return colleges[:5]
    
    def get_job_recommendations(self, skills: List[str], experience: int, role: str) -> List[Dict[str, Any]]:
        """
        Get job recommendations based on skills and experience
        
        Args:
            skills: List of skills
            experience: Years of experience
            role: Current or desired role
            
        Returns:
            List of job recommendations
        """
        skills_text = ", ".join(skills)
        prompt = f"""
        A professional with {experience} years of experience as {role} has the following skills:
        {skills_text}
        
        Suggest 5 suitable job roles with company types and salary ranges.
        Format as JSON array with fields: title, company_type, skills_needed, salary_range, growth_potential
        """
        
        response = self.generate_text(prompt, temperature=0.3)
        
        # Extract JSON from response (simple approach)
        try:
            import json
            import re
            
            # Find JSON array in the response
            json_match = re.search(r'\[\s*\{.*\}\s*\]', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                return json.loads(json_str)
            else:
                # Fallback to parsing the text response
                lines = response.split("\n")
                results = []
                current_item = {}
                
                for line in lines:
                    if line.strip().startswith(("-", "•", "*")) and ":" in line:
                        parts = line.strip().strip("-•* ").split(":", 1)
                        if len(parts) == 2:
                            key = parts[0].strip().lower().replace(" ", "_")
                            value = parts[1].strip()
                            current_item[key] = value
                    elif line.strip() and not line.strip().startswith(("-", "•", "*")):
                        if current_item:
                            results.append(current_item)
                            current_item = {}
                        current_item["title"] = line.strip()
                
                if current_item:
                    results.append(current_item)
                
                return results[:5]
        except Exception as e:
            print(f"Error parsing job recommendations: {str(e)}")
            return []
    
    def create_roadmap(self, subjects: str, career: str) -> str:
        """
        Create a learning roadmap based on subjects and career goal
        
        Args:
            subjects: Current subjects or skills
            career: Target career
            
        Returns:
            Roadmap description
        """
        prompt = f"""
        Create a detailed learning roadmap for someone who knows {subjects} and wants to become a {career}.
        Include key milestones, skills to learn, and approximate timeline.
        Format as a clear step-by-step guide with headers and bullet points.
        """
        
        return self.generate_text(prompt, temperature=0.5)
    
    def generate_quiz(self, topic: str, num_questions: int = 5) -> List[Dict[str, Any]]:
        """
        Generate a quiz on a specific topic
        
        Args:
            topic: Quiz topic
            num_questions: Number of questions to generate
            
        Returns:
            List of quiz questions with options and answers
        """
        prompt = f"""
        Create a multiple-choice quiz on {topic} with {num_questions} questions.
        Each question should have 4 options with exactly one correct answer.
        Format as JSON array with fields: question, options (array), correct_answer (index 0-3)
        """
        
        response = self.generate_text(prompt, temperature=0.7)
        
        try:
            import json
            import re
            
            # Find JSON array in the response
            json_match = re.search(r'\[\s*\{.*\}\s*\]', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                return json.loads(json_str)
            else:
                # Fallback to parsing the text response
                questions = []
                current_question = {}
                options = []
                
                lines = response.split("\n")
                for i, line in enumerate(lines):
                    line = line.strip()
                    if not line:
                        continue
                    
                    # New question starts with a number or Q
                    if re.match(r'^(\d+[\.\)]|Q\d+[\.\)])', line):
                        if current_question and options:
                            current_question["options"] = options
                            current_question["correct_answer"] = 0  # Default to first option
                            questions.append(current_question)
                        
                        question_text = re.sub(r'^(\d+[\.\)]|Q\d+[\.\)])\s*', '', line)
                        current_question = {"question": question_text}
                        options = []
                    
                    # Option line
                    elif re.match(r'^[A-D][\.\)]', line):
                        option_text = re.sub(r'^[A-D][\.\)]\s*', '', line)
                        options.append(option_text)
                        
                        # Check if this is marked as correct
                        if "correct" in line.lower() or "*" in line:
                            current_question["correct_answer"] = len(options) - 1
                
                # Add the last question
                if current_question and options:
                    current_question["options"] = options
                    if "correct_answer" not in current_question:
                        current_question["correct_answer"] = 0
                    questions.append(current_question)
                
                return questions
                
        except Exception as e:
            print(f"Error parsing quiz: {str(e)}")
            return []