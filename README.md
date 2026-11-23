# SafeTrip Karnataka — Full-Stack Tourist & Safety Platform

> **System Slogan**: *"Your Safe Journey, Our Priority"* | *"Travel Smart • Stay Safe • Explore Karnataka"*

---

## Architecture Overview

1. **Django REST Framework Backend (`/backend`)**:
   - JWT Auth (`rest_framework_simplejwt`) & Emergency Contacts.
   - MySQL 8.0 GIS Spatial database models & seed script (`seed_data.py`).
   - AI/ML Spatial-Temporal Risk Scoring engine (`apps/ai_engine/risk_calculator.py`).
   - Women Safety SOS Emergency dispatcher (`apps/women_safety`).

2. **React Website (`/web_react`)**:
   - 4 Interactive Web Views matching the poster UI specification.
   - Tailored with Tailwind CSS & Lucide Icons.
   - Interactive Safety Map, Plan Trip Wizard, Destination Details, and Home view.

3. **Flutter Mobile Application (`/mobile_flutter`)**:
   - 9 Core Mobile Screens matching the poster UI specification.
   - Women Mode toggle & Floating 1-Tap SOS Emergency button.

---

## Quick Start Instructions

### Running Django Backend
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python seed_data.py
python manage.py runserver
```

### Running React Web Application
```bash
cd web_react
npm install
npm run dev
```

### Running Flutter Mobile App
```bash
cd mobile_flutter
flutter pub get
flutter run
```
