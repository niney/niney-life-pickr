# Niney Life Pickr Smart Server

Python-based ML/AI backend service for intelligent recommendations and predictions.

## Features

- FastAPI-based REST API
- Machine Learning model integration
- Personalized recommendations
- Health check endpoints
- YAML-based configuration
- Comprehensive testing with pytest

## Prerequisites

- Python 3.10 or higher
- pip or Poetry for dependency management

## Installation

```bash
# Install dependencies
pip install -e .

# Install with development dependencies
pip install -e ".[dev]"

# Install with ML dependencies
pip install -e ".[ml]"
```

## Development

```bash
# Run development server
python scripts/dev.py

# Run tests
pytest

# Run tests with coverage
pytest --cov=src --cov-report=term-missing

# Format code
black src tests
isort src tests

# Lint code
ruff check src tests
mypy src
```

## Production

```bash
# Run production server
python scripts/start.py

# Or use the installed script
smart-server
```

## API Documentation

Once the server is running, visit:
- API Documentation: http://localhost:5000/docs
- Alternative API Documentation: http://localhost:5000/redoc

## Configuration

The server uses YAML configuration files from the root `config/` directory:
- `base.yml`: Base configuration
- `production.yml`: Production overrides
- `test.yml`: Test environment configuration

Environment variables can override configuration values.

## Testing

```bash
# Run all tests
pytest

# Run unit tests only
pytest tests/unit -m unit

# Run integration tests only
pytest tests/integration -m integration

# Run with coverage
pytest --cov=src --cov-report=html
```

## Project Structure

```
servers/smart/
├── src/
│   ├── api/           # API endpoints
│   ├── core/          # Core functionality
│   ├── models/        # ML models (future)
│   ├── services/      # Business logic (future)
│   ├── app.py         # FastAPI application
│   └── main.py        # Entry point
├── tests/
│   ├── unit/          # Unit tests
│   └── integration/   # Integration tests
├── scripts/           # Utility scripts
├── pyproject.toml     # Project configuration
└── README.md
```