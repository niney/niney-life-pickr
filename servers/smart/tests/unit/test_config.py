"""Unit tests for configuration module."""

import os
from pathlib import Path
from unittest.mock import mock_open, patch

import pytest

from src.core.config import Settings, load_yaml_config


class TestLoadYamlConfig:
    """Test yaml configuration loading."""

    def test_load_valid_yaml(self):
        """Test loading valid YAML configuration."""
        yaml_content = """
        app:
          name: test-app
          port: 3000
        """
        with patch("builtins.open", mock_open(read_data=yaml_content)):
            config = load_yaml_config("test.yml")
            assert config["app"]["name"] == "test-app"
            assert config["app"]["port"] == 3000

    def test_load_nonexistent_file(self):
        """Test loading non-existent file returns empty dict."""
        with patch("pathlib.Path.exists", return_value=False):
            config = load_yaml_config("nonexistent.yml")
            assert config == {}

    def test_load_invalid_yaml(self):
        """Test loading invalid YAML returns empty dict."""
        invalid_yaml = "{ invalid yaml content :"
        with patch("builtins.open", mock_open(read_data=invalid_yaml)):
            with patch("pathlib.Path.exists", return_value=True):
                config = load_yaml_config("invalid.yml")
                assert config == {}


class TestSettings:
    """Test Settings configuration."""

    def test_default_settings(self):
        """Test default settings values."""
        settings = Settings()
        assert settings.app_name == "Niney Life Pickr Smart Server"
        assert settings.debug is False
        assert settings.api_v1_str == "/api/v1"
        assert settings.server_host == "0.0.0.0"
        assert settings.server_port == 5000

    def test_settings_from_env(self):
        """Test settings from environment variables."""
        with patch.dict(
            os.environ,
            {
                "APP_NAME": "Test App",
                "DEBUG": "true",
                "SERVER_PORT": "8000",
                "CORS_ORIGINS": '["http://localhost:3000"]',
            },
        ):
            settings = Settings()
            assert settings.app_name == "Test App"
            assert settings.debug is True
            assert settings.server_port == 8000
            assert settings.cors_origins == ["http://localhost:3000"]

    def test_settings_from_yaml(self):
        """Test settings from YAML configuration."""
        yaml_content = """
        servers:
          smart:
            host: 127.0.0.1
            port: 5001
        """
        with patch("builtins.open", mock_open(read_data=yaml_content)):
            with patch("pathlib.Path.exists", return_value=True):
                with patch.dict(os.environ, {"PYTHON_ENV": "test"}):
                    settings = Settings()
                    # YAML config should be loaded but default values still apply
                    # since we're not parsing the specific structure in Settings
                    assert settings.server_port == 5000  # Default value

    @pytest.mark.parametrize(
        "env_value,expected",
        [
            ("development", "development"),
            ("production", "production"),
            ("test", "test"),
            ("", "development"),
            (None, "development"),
        ],
    )
    def test_environment_detection(self, env_value, expected):
        """Test environment detection from PYTHON_ENV."""
        if env_value is None:
            with patch.dict(os.environ, {}, clear=True):
                settings = Settings()
                assert settings.environment == expected
        else:
            with patch.dict(os.environ, {"PYTHON_ENV": env_value}):
                settings = Settings()
                assert settings.environment == expected