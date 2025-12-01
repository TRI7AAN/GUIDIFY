import os
import random
from typing import Dict, Any, List, Optional, Union, Tuple

def generate_response(data: Any = None, error: Optional[str] = None) -> Dict[str, Any]:
    """
    Generate a standardized API response
    
    Args:
        data: Response data
        error: Error message if any
        
    Returns:
        Standardized response dictionary
    """
    return {
        "success": error is None,
        "data": data,
        "error": error
    }

def save_uploaded_file(file_content: bytes, filename: str, directory: str = "/tmp") -> str:
    """
    Save uploaded file to disk
    
    Args:
        file_content: File content bytes
        filename: Original filename
        directory: Directory to save file in
        
    Returns:
        Path to saved file
    """
    os.makedirs(directory, exist_ok=True)
    file_path = os.path.join(directory, filename)
    
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    return file_path

def generate_random_college_data(college_name: str, stream: str) -> Dict[str, Any]:
    """
    Generate random metadata for a college
    
    Args:
        college_name: Name of the college
        stream: Academic stream
        
    Returns:
        Dictionary with college metadata
    """
    rating = round(random.uniform(2.5, 5.0), 2)
    placement_rate = random.randint(40, 95)
    management_rating = round(random.uniform(3.0, 5.0), 2)
    
    courses = {
        "Science": ["B.Tech - 4 years", "B.Sc - 3 years", "MBBS - 5.5 years"],
        "Commerce": ["B.Com - 3 years", "CA - 3 years", "BBA - 3 years"],
        "Arts": ["BA - 3 years", "BFA - 4 years", "B.Ed - 2 years"]
    }
    
    return {
        "college": college_name,
        "course": random.choice(courses.get(stream, ["General Studies - 3 years"])),
        "rating": rating,
        "placement_rate": f"{placement_rate}%",
        "management_rating": management_rating
    }

def generate_random_company_data(company_name: str, role: str, skills: List[str]) -> Dict[str, Any]:
    """
    Generate random metadata for a company
    
    Args:
        company_name: Name of the company
        role: Job role
        skills: List of skills
        
    Returns:
        Dictionary with company metadata
    """
    min_salary = random.randint(3, 12) * 100000
    max_salary = min_salary + random.randint(2, 8) * 100000
    
    # Select a subset of skills for tech stack
    tech_stack = random.sample(skills, min(len(skills), random.randint(2, 5)))
    
    return {
        "name": company_name,
        "role": role,
        "salary_range": f"₹{min_salary//100000}.{min_salary%100000//10000}L - ₹{max_salary//100000}.{max_salary%100000//10000}L",
        "tech_stack": tech_stack,
        "interview_process": random.choice([
            "3 rounds: Technical, HR, Culture Fit",
            "4 rounds: Coding, System Design, Behavioral, HR",
            "2 rounds: Technical Assessment, Final Interview"
        ]),
        "culture_fit": round(random.uniform(3.0, 5.0), 2)
    }