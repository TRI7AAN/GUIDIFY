from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.utils.file_parser import extract_text_from_file, extract_resume_data
from app.utils.helpers import save_uploaded_file, generate_response, generate_random_company_data

router = APIRouter()

@router.post("/recommend")
async def recommend_jobs(
    file: UploadFile = File(...),
    stream: str = Form(...),
    institute: str = Form(...),
    location: str = Form(...)
):
    """
    Recommend jobs for fresh graduates
    
    - **file**: Resume file (PDF/DOCX/TXT)
    - **stream**: Academic stream
    - **institute**: Educational institute
    - **location**: Preferred job location
    """
    try:
        # Save uploaded file
        file_path = save_uploaded_file(await file.read(), file.filename)
        
        # Extract text from resume
        resume_text = extract_text_from_file(file_path)
        
        # Extract resume data
        profile = extract_resume_data(resume_text)
        
        # Generate company recommendations (in a real app, this would use ML or external API)
        companies = []
        company_names = [
            "TechSolutions Inc.", 
            "InnovateX", 
            "DataMinds", 
            "CloudNative Systems", 
            "NextGen Software"
        ]
        
        roles = {
            "Science": ["Junior Developer", "Data Analyst", "Research Assistant"],
            "Commerce": ["Financial Analyst", "Business Associate", "Marketing Coordinator"],
            "Arts": ["Content Writer", "HR Assistant", "Media Coordinator"]
        }
        
        stream_roles = roles.get(stream, ["Associate"])
        
        for company in company_names:
            role = stream_roles[company_names.index(company) % len(stream_roles)]
            companies.append(generate_random_company_data(company, role, profile.get("skills", [])))
        
        return generate_response(data={
            "profile": profile,
            "companies": companies
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))