import os
import tempfile
from typing import List, Set, Optional, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "DataLens AI API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    # Dynamic CORS Configuration from ALLOWED_ORIGINS env var
    ALLOWED_ORIGINS: Union[str, List[str]] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    CORS_ORIGINS: List[str] = []

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # Supported File Extensions
    ALLOWED_EXTENSIONS: Set[str] = {".csv", ".xlsx", ".xls"}
    
    # Storage Configuration (Stateless container fallback)
    TEMP_UPLOAD_DIR: str = os.getenv(
        "TEMP_UPLOAD_DIR",
        os.path.join(tempfile.gettempdir(), "datalens_temp_uploads")
    )
    
    # AI / LLM Configuration
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    DEFAULT_LLM_PROVIDER: str = "google"  # 'google' or 'openai'
    DEFAULT_LLM_MODEL: str = "gemini-2.5-flash"
    
    def model_post_init(self, __context) -> None:
        # Populate CORS_ORIGINS from ALLOWED_ORIGINS
        if isinstance(self.ALLOWED_ORIGINS, list):
            self.CORS_ORIGINS = self.ALLOWED_ORIGINS
        elif isinstance(self.ALLOWED_ORIGINS, str):
            self.CORS_ORIGINS = [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    def ensure_temp_dir(self) -> str:
        os.makedirs(self.TEMP_UPLOAD_DIR, exist_ok=True)
        return self.TEMP_UPLOAD_DIR
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
settings.ensure_temp_dir()
