# Tummer

**Tummer** is a personalized chronic illness management platform that helps users track symptoms, log meals, identify trigger foods, and gain insights into how diet and lifestyle impact their health.

The platform is designed for individuals with **chronic illnesses, food sensitivities, or dietary restrictions** who want a structured way to monitor their health and discover patterns over time.

By combining **daily health tracking with AI-powered insights**, Tummer helps users turn personal health data into actionable understanding.

---

## Features

### Health Tracking

Users can log daily health metrics such as:

- Overall feeling
- Stress level
- Energy level
- Sleep
- Hydration
- Weight
- Flare days
- Medication changes

This allows users to track trends and better understand how lifestyle factors impact their symptoms.

---

### Meal Logging

Users can log meals throughout the day to build a history of what they’ve eaten.

Each meal entry can include:

- Food name
- Category
- Notes
- Time eaten

This helps users identify correlations between meals and symptoms.

---

### Food Safety Tracking

Users can categorize foods based on their personal reactions:

- Safe foods
- Trigger foods
- Unknown foods

Additional metadata includes:

- Severity of reaction
- Common symptoms
- Last reaction date
- Notes

This creates a personalized food database unique to each user.

---

### Symptom & Bowel Tracking

Users can log symptoms and digestive events throughout the day to provide more context to their health data.

This data contributes to identifying patterns between:

- Food
- Symptoms
- Daily health metrics

---

### AI Health Insights

Tummer generates AI-driven insights based on user data, helping users identify possible patterns such as:

- Foods commonly associated with flare days
- Lifestyle factors affecting symptoms
- Potential trigger foods

The goal is to help users better understand **why symptoms occur**, not just track them.

---

## Tech Stack

**Frontend**

- Next.js  
- React  
- TypeScript  
- Tailwind CSS  
- Radix UI  

**Backend / Data**

- Supabase (PostgreSQL + Auth + Realtime)

**AI Integration**

- OpenAI API for personalized insights

---

## Architecture Overview

Tummer uses a modern full-stack architecture:

**Frontend**

Next.js handles routing, UI rendering, and client interactions.

**Backend**

Supabase manages authentication, database storage, and data syncing.

**State Management**

React Context is used to manage application state such as:

- meals
- foods
- symptoms
- daily health logs

**AI Insights**

User data is analyzed using the OpenAI API to generate personalized insights.

---

## Project Goals

The goal of Tummer is to:

- Help people with chronic illnesses understand their health patterns
- Make symptom tracking simple and intuitive
- Provide meaningful insights instead of just raw data
- Create a supportive ecosystem for managing diet-related health conditions

---

## Future Improvements

Planned features include:

- Community support system
- Advanced analytics dashboards
- Pattern detection for trigger foods
- Health report generation
- Mobile optimization
- Exportable health data

---

## Author

**Martin Ganen**  
Computer Science Student — University of South Florida

Interested in building tools that combine **data, health, and user experience** to solve real-world problems.
