import os
import re
from typing import Optional, Dict, Any
import pytesseract
from PIL import Image
from pdf2image import convert_from_path
import PyPDF2
import docx

def extract_text_from_file(file_path: str) -> str:
    """
    Extract text from various file formats (PDF, DOCX, TXT, images)
    
    Args:
        file_path: Path to the file
        
    Returns:
        Extracted text as string
    """
    file_extension = os.path.splitext(file_path)[1].lower()
    
    try:
        if file_extension == '.pdf':
            # Try PyPDF2 first (faster)
            try:
                with open(file_path, 'rb') as file:
                    reader = PyPDF2.PdfReader(file)
                    text = ""
                    for page in reader.pages:
                        text += page.extract_text() or ""
                
                # If PyPDF2 extracted meaningful text, return it
                if len(text.strip()) > 100:
                    return text
                    
                # Otherwise, fall back to OCR
                pages = convert_from_path(file_path, 300)
                text = ""
                for page in pages:
                    text += pytesseract.image_to_string(page)
                return text
            except Exception as e:
                # Fall back to OCR if PyPDF2 fails
                pages = convert_from_path(file_path, 300)
                text = ""
                for page in pages:
                    text += pytesseract.image_to_string(page)
                return text
                
        elif file_extension == '.docx':
            doc = docx.Document(file_path)
            return "\n".join([para.text for para in doc.paragraphs])
            
        elif file_extension == '.txt':
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as file:
                return file.read()
                
        elif file_extension in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif']:
            img = Image.open(file_path)
            return pytesseract.image_to_string(img)
            
        else:
            return f"Unsupported file format: {file_extension}"
            
    except Exception as e:
        return f"Error extracting text: {str(e)}"

def extract_marks(text: str) -> int:
    """
    Extract marks/percentage from text
    
    Args:
        text: Text containing marks
        
    Returns:
        Extracted marks as integer
    """
    # Look for percentage patterns
    percentage_patterns = [
        r'(\d{1,3})%',  # 85%
        r'percentage[:\s]+(\d{1,3})',  # percentage: 85
        r'marks[:\s]+(\d{1,3})',  # marks: 85
        r'score[:\s]+(\d{1,3})',  # score: 85
        r'grade[:\s]+(\d{1,3})',  # grade: 85
    ]
    
    for pattern in percentage_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            for match in matches:
                try:
                    mark = int(match)
                    if 0 <= mark <= 100:
                        return mark
                except ValueError:
                    continue
    
    # If no percentage pattern found, look for standalone numbers
    nums = re.findall(r'\b\d{1,3}\b', text)
    candidates = []
    for n in nums:
        try:
            v = int(n)
            if 0 <= v <= 100:
                candidates.append(v)
        except ValueError:
            continue
    
    if candidates:
        # Return the highest number that could be a mark
        return max(candidates)
    
    # Default fallback
    return 75  # reasonable default

def extract_resume_data(text: str) -> Dict[str, Any]:
    """
    Extract structured data from resume text
    
    Args:
        text: Resume text
        
    Returns:
        Dictionary with extracted resume data
    """
    # Extract skills (look for common skill section headers)
    skills_section = re.search(r'(?:SKILLS|TECHNICAL SKILLS|KEY SKILLS|EXPERTISE).*?(?=\n\n|\Z)', 
                              text, re.IGNORECASE | re.DOTALL)
    
    skills = []
    if skills_section:
        skills_text = skills_section.group(0)
        # Extract individual skills
        skills = re.findall(r'[A-Za-z0-9#\+\-\.\s]{2,25}', skills_text)
        skills = [s.strip() for s in skills if len(s.strip()) > 2 and s.strip().lower() not in 
                 ['skills', 'technical skills', 'key skills', 'expertise']]
    
    # Extract education
    education = None
    edu_section = re.search(r'(?:EDUCATION|ACADEMIC|QUALIFICATION).*?(?=\n\n|\Z)', 
                           text, re.IGNORECASE | re.DOTALL)
    if edu_section:
        education = edu_section.group(0)
    
    # Extract CGPA/percentage
    cgpa = None
    cgpa_patterns = [
        r'CGPA[:\s]+(\d+\.\d+)',
        r'GPA[:\s]+(\d+\.\d+)',
        r'percentage[:\s]+(\d{1,3})',
    ]
    
    for pattern in cgpa_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                cgpa_val = float(match.group(1))
                # Normalize to 10-point scale if needed
                if cgpa_val > 10:
                    cgpa = cgpa_val / 10 if cgpa_val <= 100 else cgpa_val / 100
                else:
                    cgpa = cgpa_val
                break
            except ValueError:
                continue
    
    # Extract projects
    projects = []
    project_section = re.search(r'(?:PROJECTS|PROJECT EXPERIENCE|ACADEMIC PROJECTS).*?(?=\n\n|\Z)', 
                               text, re.IGNORECASE | re.DOTALL)
    if project_section:
        project_text = project_section.group(0)
        # Look for project titles (usually at the beginning of lines or after bullet points)
        project_titles = re.findall(r'(?:^|\n)(?:\s*[\•\-\*]\s*)?([A-Z][A-Za-z0-9\s\-]{3,50})(?=:|\n)', 
                                   project_text)
        projects = [p.strip() for p in project_titles if len(p.strip()) > 3]
    
    return {
        "skills": skills[:10],  # Limit to top 10 skills
        "education": education,
        "cgpa": cgpa,
        "projects": projects[:3]  # Limit to top 3 projects
    }