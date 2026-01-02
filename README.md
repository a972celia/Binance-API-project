<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Project Title: 
Binance Volatility & Trend Consistency Analyzer

# Overview: 
This project focuses on the programmatic retrieval and analysis of high-frequency financial time-series data. Utilizing Python and the Binance API, I engineered a robust script to harvest historical pricing data for major cryptocurrencies (BTC, ETH) with 1-minute granularity.

# Key Features:

- Data Ingestion: Automated the retrieval of extensive historical datasets (2017–Present) while managing API pagination and rate limits.

- Data Transformation: Leveraged Pandas to resample and structure raw data into 15-minute analysis windows.

- Trend Logic: Developed an analytical algorithm to compare price direction at the "Check Point" (14m 30s mark) versus the "Close" (15m mark). This metric helps identify market consistency and potential late-stage price reversals within a specific timeframe.

- Tech Stack: Python, Pandas, REST API, Google Colab.

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1C6ru66In_--N89lZn436Wzjjk7pzsAlA

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
