"""Configuration settings for the Smart Server."""

import os
from pathlib import Path
from typing import List

import yaml
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""

    # Basic settings
    APP_NAME: str = "Niney Life Pickr Smart Server"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Server settings
    HOST: str = "localhost"
    PORT: int = 5000
    LOG_LEVEL: str = "INFO"

    # CORS settings
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:4000"]

    # API settings
    API_PREFIX: str = "/api"
    DOCS_ENABLED: bool = True

    # Security settings
    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # ML/AI settings
    MODEL_PATH: str = "models/"
    MAX_BATCH_SIZE: int = 32
    PREDICTION_TIMEOUT: int = 30

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    def __init__(self, **kwargs):
        """Initialize settings with YAML config support."""
        super().__init__(**kwargs)
        self._load_yaml_config()

    def _apply_yaml_config(self, config_path: Path) -> None:
        """Apply configuration from a YAML file.
        
        Args:
            config_path: Path to the YAML configuration file
        """
        if config_path.exists():
            with open(config_path, "r") as f:
                config = yaml.safe_load(f)
                if config and "server" in config and "smart" in config["server"]:
                    smart_config = config["server"]["smart"]
                    self.HOST = smart_config.get("host", self.HOST)
                    self.PORT = smart_config.get("port", self.PORT)
    
    def _load_yaml_config(self) -> None:
        """Load configuration from YAML files."""
        base_dir = Path(__file__).resolve().parent.parent.parent.parent
        config_dir = base_dir / "config"
        
        # Load base config
        base_config_path = config_dir / "base.yml"
        self._apply_yaml_config(base_config_path)
        
        # Load environment-specific config
        env = os.getenv("PYTHON_ENV", self.ENVIRONMENT)
        env_config_path = config_dir / f"{env}.yml"
        self._apply_yaml_config(env_config_path)
        
        # Environment variables override everything
        self.HOST = os.getenv("HOST", self.HOST)
        self.PORT = int(os.getenv("PORT", str(self.PORT)))
        self.ENVIRONMENT = os.getenv("PYTHON_ENV", self.ENVIRONMENT)
        self.LOG_LEVEL = os.getenv("LOG_LEVEL", self.LOG_LEVEL)


# Create settings instance
settings = Settings()