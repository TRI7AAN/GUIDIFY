"""
AI Gateway Module

Single internal module that all services call into for any LLM interaction.
Centralizes prompt versioning, retries, cost logging, and provider abstraction.

Per techspec.md §2-3: Never call Gemini directly from feature code.
"""

from app.ai_gateway.gateway import AIGateway

__all__ = ["AIGateway"]
