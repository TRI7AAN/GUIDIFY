import requests
from bs4 import BeautifulSoup
import json
import time
import os
from typing import List, Dict

# Configuration
BASE_URL = "https://www.nqr.gov.in/"
SEARCH_URL = "https://www.nqr.gov.in/qualifications-register/search"
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "../data/nqr_scraped_data.json")

def scrape_nqr(pages: int = 5):
    """
    Scrapes NQR data.
    Limits to 'pages' to avoid overloading in dev environment.
    """
    print(f"Starting NQR Scrape for {pages} pages...")
    all_qualifications = []
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    for page in range(0, pages): # Paging often starts at 0 or 1, assuming 0-based for Drupal views or 1 based
        print(f"Scraping page {page + 1}...")
        try:
            # Note: The actual NQR search might use GET parameters like ?page=1 or POST.
            # adjusting to standard common pattern or user suggestion.
            # User suggested POST data={'paged': page}
            
            # Trying GET first as it's common for public portals
            response = requests.get(f"{SEARCH_URL}?page={page}", headers=headers)
            
            if response.status_code != 200:
                print(f"Failed to fetch page {page}: {response.status_code}")
                continue

            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Select rows - structure is typically a table or grid of divs
            # Trying generic selectors based on visual structure of NQR
            rows = soup.find_all('div', class_='views-row') 
            
            if not rows:
                print("No rows found. Updating selector strategy...")
                # Fallback to looking for table rows if it's a table
                rows = soup.find_all('tr')

            for row in rows:
                try:
                    # Extract Data
                    title_elem = row.find('a')
                    if not title_elem: continue
                    
                    title = title_elem.text.strip()
                    link = title_elem['href']
                    if not link.startswith('http'):
                        link = BASE_URL.rstrip('/') + link
                        
                    # NSQF Level
                    text_content = row.get_text()
                    level = "Unknown"
                    if "Level" in text_content:
                        # naive extraction
                        import re
                        match = re.search(r'Level\s*[:\-]?\s*(\d+(\.\d+)?)', text_content, re.IGNORECASE)
                        if match:
                            level = match.group(1)
                            
                    sector = "Unknown"
                    # Try to find sector in text
                    # (In a real scrape, we'd inspect the specific DOM classes)
                    
                    qp_data = {
                        "title": title,
                        "nsqf_level": level,
                        "sector": sector,
                        "url": link,
                        "source": "NQR_SCRAPE"
                    }
                    all_qualifications.append(qp_data)
                    
                except Exception as row_e:
                    continue

            time.sleep(1) # Be polite

        except Exception as e:
            print(f"Error scraping page {page}: {e}")

    # Remove duplicates
    unique_qps = {v['url']: v for v in all_qualifications}.values()
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(list(unique_qps), f, indent=2, ensure_ascii=False)
        
    print(f"Scrape complete. Saved {len(unique_qps)} qualifications to {OUTPUT_FILE}")

if __name__ == "__main__":
    scrape_nqr(pages=3)
