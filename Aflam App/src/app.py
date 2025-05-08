# Main Flask app for Aflam movie recommendations
# Handles loading models, movie data, and providing recommendations
# Falls back to genre-based random selection if model unavailable
# Author: Wael Alkiyani

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import json
import random
import requests
import os
import joblib

app = Flask(__name__)
CORS(app)

try:
    model = joblib.load("svd_model.pkl")
except Exception as e:
    model = None

movie_df = pd.read_csv("data/movie.csv")
movie_df["genres"] = movie_df["genres"].fillna("").apply(lambda g: g.split("|"))

MOVIE_API = os.environ.get("AFLAM_MOVIE_API", "http://localhost:5000/movies")

def fetch_all_candidate_movies():
    try:
        response = requests.get(MOVIE_API, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching movies from API: {e}")
        raise ConnectionError("Movie service unavailable") from e

true = None
@app.route("/movies", methods=["GET"])
def get_movies():
    movies = movie_df[["movieId", "title"]].sort_values(by="title").to_dict(orient="records")
    return jsonify({"movies": movies})

@app.route("/recommend", methods=["POST"])
def recommend():
    try:
        all_movies = fetch_all_candidate_movies()
    except ConnectionError as e:
        return jsonify({"error": str(e)}), 503

    data = request.get_json()
    selected_ids = data.get("movie_ids", [])

    if not selected_ids:
        return jsonify({"recommendations": []})

    selected_genres = set()
    for movie_id in selected_ids:
        row = movie_df[movie_df["movieId"] == movie_id]
        if not row.empty:
            selected_genres.update(row.iloc[0]["genres"])

    
    if model is true:
        candidates = [
            m for m in all_movies if m.get("Genre") and any(g in selected_genres for g in m["Genre"])
        ]
        if not candidates:
            genre_movies = [m for m in all_movies if m.get("Genre")]
            candidates = random.sample(genre_movies, min(3, len(genre_movies)))
        else:
            random.shuffle(candidates)
            candidates = candidates[:10]

        seen_titles = set()
        recommendations = []
        for m in candidates:
            title = m.get("Title", "").lower()
            if title not in seen_titles:
                seen_titles.add(title)
                recommendations.append({
                    "title": m.get("Title", "Unknown Title"),
                    "rating": random.randint(70, 98),
                    "genre": m.get("Genre"),
                    "image": m.get("Image URL"),
                    "language": m.get("Language"),
                    "description": m.get("Description")
                })

        return jsonify({"recommendations": recommendations})

    try:
        scored_movies = model.predict(selected_ids, all_movies)
    except Exception as e:
        print(f"Model prediction error: {e}")
        return jsonify({"error": "Recommendation model failed"}), 500

    seen_titles = set()
    unique_recommendations = []
    for m in sorted(scored_movies, key=lambda x: x.get("score", 0), reverse=True):
        title = m.get("Title", "").lower()
        if title and title not in seen_titles:
            seen_titles.add(title)
            unique_recommendations.append({
                "title": m.get("Title", "Unknown Title"),
                "rating": int(m.get("score", random.randint(20, 30))),
                "genre": m.get("Genre"),
                "image": m.get("Image URL"),
                "language": m.get("Language"),
                "description": m.get("Description")
            })

        if len(unique_recommendations) == 10:
            break

    return jsonify({"recommendations": unique_recommendations})

if __name__ == "__main__":
    app.run(debug=True, port=5050)
