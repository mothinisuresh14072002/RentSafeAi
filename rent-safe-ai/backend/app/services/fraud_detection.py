import re
import random

BROKER_KEYWORDS = [
    "commission", "brokerage", "deal", "whatsapp me", 
    "urgent", "negotiable", "broker", "agent", "msg me"
]

def calculate_fraud_risk_score(title: str, description: str, rent_amount: float, deposit_amount: float) -> int:
    """
    Calculates a fraud risk score (0-100) based on deterministic rules and AI models.
    A higher score means a higher probability of being a spam/broker listing.
    """
    score = 0
    text_to_analyze = f"{title} {description}".lower()

    # Rule 1: Broker keyword detection
    for keyword in BROKER_KEYWORDS:
        if keyword in text_to_analyze:
            score += 15
            
    # Rule 2: Unusually low deposit (bait pricing)
    # E.g., Deposit is less than 1 month's rent (uncommon in many Indian metros where 3-10 months is standard)
    if deposit_amount < rent_amount:
        score += 20
        
    # Rule 3: Suspicious characters or hidden phone numbers in description
    phone_pattern = re.compile(r'(\d[\s\-]?){10}')
    if phone_pattern.search(text_to_analyze):
        score += 25 # Owners should use platform communication, hidden numbers indicate broker evasion
        
    # Placeholder for AI Model Integration
    # try:
    #     ai_score = call_llm_fraud_detection(text_to_analyze, rent_amount)
    #     score += ai_score
    # except Exception:
    #     pass
    
    # Cap score at 100
    return min(score, 100)

def calculate_ai_safety_score(property_data: dict) -> int:
    """
    Calculates how safe the property is for a tenant (0-100).
    A higher score is better.
    """
    score = 50 # Base score
    
    # Increase score based on verification and completeness
    if property_data.get('is_owner_verified'):
        score += 30
        
    if property_data.get('documents'):
        score += 20
        
    return min(score, 100)
