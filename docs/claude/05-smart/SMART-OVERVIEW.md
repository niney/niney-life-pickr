# SMART-OVERVIEW.md

> **Last Updated**: 2025-10-23 23:50
> **Purpose**: Python FastAPI ML/AI backend server (future development)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Current Status](#4-current-status)
5. [Planned Features](#5-planned-features)
6. [Development Workflow](#6-development-workflow)
7. [Related Documentation](#7-related-documentation)

---

## 1. Overview

### 1.1 Purpose

**Smart** is the Python-based ML/AI backend server for Niney Life Pickr, designed to provide:
- Machine learning model integration
- Personalized restaurant recommendations
- Intelligent predictions and analytics
- FastAPI-based REST API endpoints

### 1.2 Server Information

**Location**: `servers/smart/`

**Package Name**: `niney-life-pickr-smart`

**Version**: 0.1.0

**Port**: 5000 (development)

**Framework**: FastAPI (Python)

**Status**: 🚧 **Early Development Stage** - Prepared structure, minimal implementation

---

## 2. Technology Stack

### 2.1 Core Framework

**FastAPI**
- Modern Python web framework
- Automatic OpenAPI documentation
- Pydantic data validation
- Async/await support

### 2.2 Language and Tools

- **Python 3.10+**: Required minimum version
- **pip/Poetry**: Dependency management
- **pytest**: Testing framework
- **black**: Code formatting
- **isort**: Import sorting
- **ruff**: Fast Python linter
- **mypy**: Static type checking

### 2.3 Planned ML Libraries

- **scikit-learn**: Classical ML algorithms
- **pandas**: Data manipulation
- **numpy**: Numerical computing
- **TensorFlow/PyTorch**: Deep learning (future)

---

## 3. Project Structure

```
servers/smart/
├── src/                      # Source code
│   ├── api/                  # FastAPI endpoints
│   │   └── __init__.py
│   ├── core/                 # Core functionality
│   │   ├── __init__.py
│   │   ├── app.py            # FastAPI application
│   │   └── main.py           # Entry point
│   ├── models/               # ML models (future)
│   │   └── __init__.py
│   └── services/             # Business logic (future)
│       └── __init__.py
├── tests/                    # Test files
│   ├── unit/                 # Unit tests
│   │   └── __init__.py
│   └── integration/          # Integration tests
│       └── __init__.py
├── scripts/                  # Development scripts
│   ├── dev.py                # Development server launcher
│   └── prod.py               # Production server launcher
├── pyproject.toml            # Project configuration
├── requirements.txt          # Python dependencies
├── pytest.ini                # Pytest configuration
├── setup.cfg                 # Tool configurations
└── README.md                 # Documentation
```

---

## 4. Current Status

### 4.1 Implemented

- ✅ Project structure setup
- ✅ FastAPI application scaffolding
- ✅ Development server scripts
- ✅ pytest testing infrastructure
- ✅ Code quality tools (black, ruff, mypy)
- ✅ YAML configuration support

### 4.2 Not Yet Implemented

- ⏳ API endpoints (health check, predictions)
- ⏳ ML model integration
- ⏳ Recommendation algorithms
- ⏳ Database connections
- ⏳ Comprehensive tests
- ⏳ CI/CD pipeline

---

## 5. Planned Features

### 5.1 Restaurant Recommendations

**Goal**: Personalized restaurant suggestions based on user preferences

**Approach**:
- Collaborative filtering (user-based, item-based)
- Content-based filtering (category, cuisine type, price range)
- Hybrid recommendation system

**Data Sources**:
- User ratings and reviews from Friendly server
- Restaurant metadata (category, location, price)
- User behavior (viewed restaurants, bookmarked items)

### 5.2 Sentiment Analysis

**Goal**: Advanced sentiment analysis beyond Ollama's basic scoring

**Approach**:
- Fine-tuned BERT models for Korean text
- Aspect-based sentiment analysis (food, service, atmosphere)
- Emotion detection (happy, satisfied, disappointed)

**Data**: Review text from Friendly server

### 5.3 Predictive Analytics

**Goal**: Predict restaurant popularity, wait times, user churn

**Approach**:
- Time series forecasting (restaurant traffic patterns)
- Classification models (user retention prediction)
- Regression models (rating prediction)

---

## 6. Development Workflow

### 6.1 Setup

```bash
cd servers/smart

# Install dependencies
pip install -e ".[dev,ml]"

# Activate virtual environment (if using venv)
source .venv/bin/activate  # Linux/Mac
.venv\Scripts\activate     # Windows
```

### 6.2 Development Server

```bash
# Run with auto-reload
python scripts/dev.py

# Server starts on http://localhost:5000
```

### 6.3 Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=term-missing

# Run specific test file
pytest tests/unit/test_example.py
```

### 6.4 Code Quality

```bash
# Format code
black src tests
isort src tests

# Lint
ruff check src tests

# Type check
mypy src
```

---

## 7. Related Documentation

### Backend Documentation
- **[FRIENDLY-OVERVIEW.md](../04-friendly/FRIENDLY-OVERVIEW.md)**: Primary Node.js backend
- **[FRIENDLY-REVIEW-SUMMARY.md](../04-friendly/FRIENDLY-REVIEW-SUMMARY.md)**: Ollama integration (current AI system)

### Frontend Documentation
- **[SHARED-SERVICES.md](../03-shared/SHARED-SERVICES.md)**: API client (will connect to Smart in future)
- **[WEB-RESTAURANT.md](../01-web/WEB-RESTAURANT.md)**: Web client (future ML integration)

### Core Documentation
- **[ARCHITECTURE.md](../00-core/ARCHITECTURE.md)**: Overall system architecture
- **[DEVELOPMENT.md](../00-core/DEVELOPMENT.md)**: Development workflow

---

## Appendix: Future Roadmap

### Phase 1: Foundation (Current)

- ✅ Project structure
- ✅ Development environment
- ⏳ Basic FastAPI endpoints (health, info)
- ⏳ Connection to Friendly database (read-only)

### Phase 2: Simple Recommendations

- ⏳ Popularity-based recommendations (most reviewed, highest rated)
- ⏳ Category-based filtering
- ⏳ Location-based suggestions (nearby restaurants)

### Phase 3: ML Integration

- ⏳ Collaborative filtering model training
- ⏳ Content-based recommendation engine
- ⏳ Model serving via FastAPI

### Phase 4: Advanced Features

- ⏳ Real-time predictions with streaming
- ⏳ A/B testing framework for recommendation algorithms
- ⏳ Model monitoring and retraining pipeline

---

**Document Version**: 1.0.0
**Covers Files**: Smart server structure, technology stack, planned features
**Status**: 🚧 **Early Stage** - Structure ready, features planned but not implemented
