import os
import re
import pytesseract
from PIL import Image
from pdf2image import convert_from_path
import pdfplumber
from fastapi import UploadFile
import shutil
from pathlib import Path
from typing import Optional, Tuple

# Create temp directory for file processing
TEMP_DIR = Path("./temp")
TEMP_DIR.mkdir(exist_ok=True)

async def save_upload_file(upload_file: UploadFile) -> str:
    """Save uploaded file to temp directory and return the path"""
    temp_file = TEMP_DIR / upload_file.filename
    with open(temp_file, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)
    return str(temp_file)

def extract_text_from_file(file_path: str) -> str:
    """Extract text from PDF or image file using OCR"""
    try:
        if file_path.lower().endswith(".pdf"):
            # Try pdfplumber first for text extraction
            with pdfplumber.open(file_path) as pdf:
                text = ""
                for page in pdf.pages:
                    text += page.extract_text() or ""
                
            # If text extraction yields little content, use OCR as fallback
            if len(text.strip()) < 100:
                pages = convert_from_path(file_path, 300)
                text = "".join([pytesseract.image_to_string(p) for p in pages])
            return text
        else:
            # For images, use OCR directly
            img = Image.open(file_path)
            return pytesseract.image_to_string(img)
    except Exception as e:
        print(f"Error extracting text: {e}")
        return ""

def extract_marks(text: str) -> int:
    """Extract marks from OCR text"""
    nums = re.findall(r'\b\d{1,3}\b', text)
    candidates = []
    for n in nums:
        try:
            v = int(n)
            if 0 <= v <= 100:
                candidates.append(v)
        except:
            pass
    
    # Return highest mark found or default to 75
    return max(candidates) if candidates else 75

def cleanup_temp_files(file_path: Optional[str] = None):
    """Remove temporary files after processing"""
    if file_path and os.path.exists(file_path):
        os.remove(file_path)