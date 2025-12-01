from fastapi import APIRouter, HTTPException
from app.utils.groq_client import GroqClient
from app.utils.helpers import generate_response
import random

router = APIRouter()
groq_client = GroqClient()

@router.get("/search")
async def search_scholarships(country: str, field: str):
    """
    Search for scholarships based on country and field of study
    
    - **country**: Country of study
    - **field**: Field of study
    """
    try:
        # In a real app, this would call an external API or database
        # For now, generate some sample scholarships
        scholarships = []
        
        scholarship_names = [
            f"{country} Merit Scholarship",
            f"International {field} Fellowship",
            f"Global Education Fund for {field}",
            f"{country} Government Scholarship",
            f"{field} Research Grant"
        ]
        
        providers = [
            f"{country} Education Ministry",
            "Global Academic Foundation",
            f"{country} University Alliance",
            "International Student Exchange",
            f"World {field} Association"
        ]
        
        for i in range(min(5, len(scholarship_names))):
            amount = f"${random.randint(5, 30)}00-${random.randint(30, 100)}00"
            deadline = f"20{random.randint(23, 24)}-{random.randint(1, 12):02d}-{random.randint(1, 28):02d}"
            
            scholarships.append({
                "name": scholarship_names[i],
                "provider": providers[i],
                "amount": amount,
                "eligibility": f"Students pursuing {field} in {country}",
                "deadline": deadline,
                "application_link": f"https://example.com/scholarships/{i}"
            })
        
        return generate_response(data={"scholarships": scholarships})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))