# Personal Journal Assistant

A full-stack AI-powered journal application that allows you to write entries in any language and ask questions about your past.

## Features

-   **Multilingual Journaling**: Write in English, Hindi, Tamil, etc. The system detects and translates it.
-   **AI-Powered Insights**: Uses Google Gemini to extract structured events (people, places, emotions).
-   **Natural Language Querying**: Ask questions like "What did I do last week?" and get summarized answers.
-   **Clean UI**: Minimalist design built with Next.js and Tailwind CSS.

## Tech Stack

-   **Frontend**: Next.js (React), Tailwind CSS, Lucide Icons
-   **Backend**: Python FastAPI
-   **Database**: MongoDB
-   **AI**: Google Gemini API (gemini-1.5-flash)

## Prerequisites

-   Node.js & npm
-   Python 3.8+
-   MongoDB (running locally or Atlas URI)
-   Google Gemini API Key

## Installation

### 1. Backend Setup

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Configure environment variables:
    -   Open `.env` file.
    -   Add your `GEMINI_API_KEY`.
    -   Update `MONGODB_URI` if needed.
4.  Run the server:
    ```bash
    uvicorn main:app --reload
    ```
    The API will be available at `http://localhost:8000`.

### 2. Frontend Setup

1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run the development server:
    ```bash
    npm run dev
    ```
    Open `http://localhost:3000` in your browser.

## Usage

1.  **Add Entry**: Type your day's events in the text box and click "Save Entry".
2.  **Ask Question**: Switch to the "Ask a Question" tab and type your query.

## Project Structure

-   `backend/`: FastAPI application
    -   `main.py`: Entry point
    -   `routes/`: API endpoints
    -   `services/`: Gemini AI integration
    -   `models/`: Pydantic models
-   `frontend/`: Next.js application
    -   `app/`: Pages and layout
    -   `components/`: UI components
