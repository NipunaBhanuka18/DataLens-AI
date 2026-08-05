import os
from typing import Optional
from langchain_core.language_models import BaseChatModel
from app.core.config import settings


def get_llm_model(temperature: float = 0.2) -> Optional[BaseChatModel]:
    """
    Instantiates and returns the configured Chat LLM model (Google GenAI or OpenAI) with a specified temperature.
    Returns None if no API keys are configured, enabling fallback execution mode.
    """
    gemini_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    openai_key = settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY")

    if settings.DEFAULT_LLM_PROVIDER.lower() == "google" and gemini_key:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            model_name = settings.DEFAULT_LLM_MODEL if "gemini" in settings.DEFAULT_LLM_MODEL else "gemini-2.5-flash"
            return ChatGoogleGenerativeAI(
                model=model_name,
                google_api_key=gemini_key,
                temperature=temperature
            )
        except Exception:
            pass

    if openai_key:
        try:
            from langchain_openai import ChatOpenAI
            model_name = settings.DEFAULT_LLM_MODEL if "gpt" in settings.DEFAULT_LLM_MODEL else "gpt-4o-mini"
            return ChatOpenAI(
                model=model_name,
                openai_api_key=openai_key,
                temperature=temperature
            )
        except Exception:
            pass

    if gemini_key:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            return ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",
                google_api_key=gemini_key,
                temperature=temperature
            )
        except Exception:
            pass

    return None
