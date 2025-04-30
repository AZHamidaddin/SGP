from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import json
import random

app = Flask(__name__)
CORS(app)

# Load movie.csv (input source)
movie_df = pd.read_csv("data/movie.csv")
movie_df["genres"] = movie_df["genres"].fillna("").apply(lambda g: g.split("|"))

# Load newdata.json (recommendation source)
with open("data/newdata.json", encoding="utf-8") as f:
    newdata = json.load(f)
    # Handle both list or {"movies": [...]}
    all_movies = newdata if isinstance(newdata, list) else newdata.get("movies", [])

@app.route("/movies", methods=["GET"])
def get_movies():
    movies = movie_df[["movieId", "title"]].sort_values(by="title").to_dict(orient="records")
    return jsonify({"movies": movies})

@app.route("/recommend", methods=["POST"])
def recommend():
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

    # Filter newdata.json movies by genre match
    candidates = [
        m for m in all_movies
        if m.get("Genre") and any(g in selected_genres for g in m["Genre"])
    ]

    # Fallback to 3 random if no genre match
    if not candidates:
        candidates = random.sample([m for m in all_movies if m.get("Genre")], min(3, len(all_movies)))
    else:
        random.shuffle(candidates)
        candidates = candidates[:10]

    recommendations = [
        {
            "title": m.get("Title", "Unknown Title"),
            "rating": random.randint(70, 100),  # Optional mock rating
            "genre": m.get("Genre"),
            "image": m.get("Image URL"),
            "language": m.get("Language"),
            "description": m.get("Description")
        }
        for m in candidates
    ]

    return jsonify({"recommendations": recommendations})

if __name__ == "__main__":
    app.run(debug=True, port=5050)
