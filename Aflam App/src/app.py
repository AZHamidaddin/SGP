from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import json
import random
import requests
import os

app = Flask(__name__)
CORS(app)

# Environment variable for the movie API
MOVIE_API = os.environ.get("AFLAM_MOVIE_API", "http://localhost:5000/movies")

# Load movie.csv (input source)
movie_df = pd.read_csv("data/movie.csv")
movie_df["genres"] = movie_df["genres"].fillna("").apply(lambda g: g.split("|"))

# Helper function to fetch candidate movies from the API
def fetch_all_candidate_movies():
    try:
        response = requests.get(MOVIE_API, timeout=10)  # Increased timeout slightly
        response.raise_for_status()  # Raises HTTPError for bad responses (4xx or 5xx)
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching movies from API: {e}")
        # Reraise a specific exception to be caught in the route
        raise ConnectionError("Movie service unavailable") from e

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

    # Extract genres from selected movie IDs (from movie.csv)
    selected_genres = set()
    for movie_id in selected_ids:
        row = movie_df[movie_df["movieId"] == movie_id]
        if not row.empty:
            selected_genres.update(row.iloc[0]["genres"])

    candidates = [
        m for m in all_movies
        if m.get("Genre") and any(g in selected_genres for g in m["Genre"])
    ]

    # Fallback to 3 random if no genre match
    if not candidates:
        # Ensure there are movies to sample from
        genre_movies = [m for m in all_movies if m.get("Genre")]
        if not genre_movies:
             return jsonify({"recommendations": []}) # Return empty if no movies with genres available
        candidates = random.sample(genre_movies, min(3, len(genre_movies)))
    else:
        random.shuffle(candidates)
        candidates = candidates[:10]

    # Deduplicate candidates based on title before assigning ratings
    unique_candidates = []
    seen_titles = set()
    for m in candidates:
        title = m.get("Title", "Unknown Title")
        # Convert title to lowercase for case-insensitive comparison
        title_lower = title.lower() 
        if title_lower not in seen_titles:
            unique_candidates.append(m)
            # Add the lowercase version to the set
            seen_titles.add(title_lower) 

    recommendations = [
        {
            "title": m.get("Title", "Unknown Title"),
            "rating": random.randint(70, 100),  # Optional mock rating
            "genre": m.get("Genre"),
            "image": m.get("Image URL"),
            "language": m.get("Language"),
            "description": m.get("Description")
        }
        for m in unique_candidates  # Use the deduplicated list
    ]

    return jsonify({"recommendations": recommendations})

if __name__ == "__main__":
    app.run(debug=True, port=5050)
