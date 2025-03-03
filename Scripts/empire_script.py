from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from bs4 import BeautifulSoup
import re
import time
import json
from datetime import datetime, timedelta

EMPIRE_URL = "https://ksa.empirecinemas.com/"

options = Options()
options.add_argument('--headless')
driver = webdriver.Chrome(options=options)  # Ensure you have chromedriver installed and in PATH
driver.maximize_window()
driver.get(EMPIRE_URL)

time.sleep(1)

close_button = driver.find_element(By.CLASS_NAME, "btn-close")
driver.execute_script("arguments[0].click();", close_button)

time.sleep(3)  # Allow page to load
page_source = driver.page_source
soup = BeautifulSoup(page_source, "html.parser")

# Get the initial list of movie divs by re-fetching using an XPath
movie_divs = driver.find_elements(By.XPATH, "//*[starts-with(@id, 'movie-card')]")
# Optionally filter for movie-card followed by digits:
movie_divs = [div for div in movie_divs if re.match(r"movie-card\d+", div.get_attribute("id"))]

movie_count = len(movie_divs)
print(f"Found {movie_count} movie divs.")

movies_list = []  # List to accumulate our JSON objects

# Loop over each movie by index. We re-fetch the elements on each iteration to avoid stale references.
for i in range(movie_count):
    try:
        # Re-fetch the current list of movie elements
        current_movie_divs = driver.find_elements(By.XPATH, "//*[starts-with(@id, 'movie-card')]")
        current_movie_divs = [div for div in current_movie_divs if re.match(r"movie-card\d+", div.get_attribute("id"))]
        # Check if the index is still valid
        if i >= len(current_movie_divs):
            print(f"Index {i} is out of range. Skipping.")
            continue
        movie = current_movie_divs[i]

        # Extract the image URL from the movie card before clicking it
        try:
            img_elem = movie.find_element(By.TAG_NAME, "img")
            image_url = img_elem.get_attribute("src")
        except Exception as e:
            print("Error extracting image URL:", e)
            image_url = ""

        # Scroll the element into view if necessary
        driver.execute_script("arguments[0].scrollIntoView();", movie)
        time.sleep(1)
        movie.click()
        time.sleep(3)
    except Exception as e:
        print(f"Error clicking movie at index {i}: {e}")
        continue

    try:
        # --- Attempt to click the "read more" button for the synopsis ---
        readmore_buttons = driver.find_elements(By.XPATH, "//a[@id='readmore' and contains(text(),'read more')]")
        readmore_btn = None
        for btn in readmore_buttons:
            if btn.is_displayed():
                readmore_btn = btn
                break
        if readmore_btn:
            driver.execute_script("arguments[0].click();", readmore_btn)
            time.sleep(2)
        else:
            print("No visible 'read more' button found.")
    except Exception as e:
        print("Error clicking readmore button:", e)

    try:
        page_source = driver.page_source
        soup = BeautifulSoup(page_source, "html.parser")
        movie_card = soup.find("div", id="movie-animation")
        if not movie_card:
            print("Could not find movie details for index", i)
            continue

        # --- Begin JSON Parsing ---
        title_div = movie_card.find("div", class_="title")
        title = title_div.get_text(strip=True) if title_div else ""

        rating_div = movie_card.find("div", class_="tags")
        rating = rating_div.get_text(strip=True) if rating_div else ""

        # ---- Updated Genre Parsing ----
        genre_div = movie_card.find("div", class_="features")
        if genre_div:
            raw_genres = genre_div.get_text(strip=True)
            # Split on commas to get each genre as a separate item
            genre = [g.strip() for g in raw_genres.split(",") if g.strip()]
        else:
            genre = []

        synopsis = ""
        synopsis_heading = movie_card.find(lambda tag: tag.name == "h6" and "Synopsis:" in tag.get_text())
        if synopsis_heading:
            synopsis_div = synopsis_heading.find_next("div")
            if synopsis_div:
                synopsis = synopsis_div.get_text(strip=True)
                synopsis = synopsis.replace("read moreread less", "").strip()

        # Remove original hyphens from title, then create slug by replacing spaces with hyphens.
        title_clean = title.replace("-", "")
        slug = title_clean.lower().replace(" ", "-")

        language = ""
        sub_features = movie_card.find("div", class_="sub-features")
        if sub_features:
            sub_divs = sub_features.find_all("div", class_="sub")
            if len(sub_divs) >= 2:
                language = sub_divs[1].get_text(strip=True)
        if not language:
            language = "N/A"

        movie_json = {
            "Title": title,
            "Slug": slug,
            "Identifier": slug,
            "Parent": "Empire",
            "Image URL": image_url,
            "Rating": rating,
            "Language": language,
            "Description": synopsis,
            "Genre": genre,  # Now a list of separate strings
            "Showtimes URL": "",
            "Timings": []
        }

        print(f"Fetching data for {title}")

        # --- Now click the BOOK NOW button and perform additional operations ---
        try:
            book_now_btn = driver.find_element(
                By.XPATH, "//div[@id='movie-animation']//button[contains(@class, 'btn-book-now')]"
            )
            driver.execute_script("arguments[0].click();", book_now_btn)
            time.sleep(2)

            showtimes_url = driver.current_url
            movie_json["Showtimes URL"] = showtimes_url

            # --- Process each date-card to extract showtime details for each day ---
            date_cards = driver.find_elements(By.CLASS_NAME, "date-card")
            timings = []
            base_date = datetime.now()
            for idx, date_card in enumerate(date_cards):
                try:
                    driver.execute_script("arguments[0].click();", date_card)
                    time.sleep(2)

                    page_source = driver.page_source
                    soup = BeautifulSoup(page_source, "html.parser")

                    times_divs = soup.find_all("div", class_="row mx-0 d-flex align-items-center pt-4 pb-3")
                    showtimes_list = []
                    for time_div in times_divs:
                        location_div = time_div.find("div", class_="col-md-2 px-0")
                        if location_div:
                            location_text = location_div.get_text(strip=True)
                            parts = [part.strip() for part in location_text.split("-")]
                            if len(parts) == 2:
                                city, place = parts[0], parts[1]
                            else:
                                city, place = "", location_text
                        else:
                            city, place = "", ""

                        experience_div = time_div.find("div", class_="col-md-2 ar-number")
                        if experience_div:
                            exp_text = experience_div.get_text(strip=True)
                            experience = exp_text.split("-")[0].strip()
                        else:
                            experience = ""

                        times_list = []
                        # Find all ULs that contain showtimes (including after midnight)
                        times_uls = time_div.find_all("ul", class_=re.compile(r"showtimes__time-tag"))
                        for ul in times_uls:
                            li_items = ul.find_all("li")
                            for li in li_items:
                                # Get the text from the li element, which should capture "02:20 AM", etc.
                                time_text = li.get_text(strip=True)
                                if time_text:
                                    times_list.append(time_text)

                        showtime_entry = {
                            "Place": place,
                            "City": city,
                            "Experiences": [
                                {
                                    "Experience": experience,
                                    "Times": times_list
                                }
                            ]
                        }
                        showtimes_list.append(showtime_entry)

                    current_date = (base_date + timedelta(days=idx)).strftime("%Y-%m-%d")
                    timing_entry = {
                        "Date": current_date,
                        "day_of_week": "",
                        "Showtimes": showtimes_list
                    }
                    timings.append(timing_entry)
                except Exception as e:
                    print("Error processing date card:", e)
                    continue

            movie_json["Timings"] = timings

            driver.back()
            time.sleep(2)
        except Exception as e:
            print("Error processing BOOK NOW operations:", e)

        movies_list.append(movie_json)
        # --- End JSON Parsing ---
        # Optionally, if you want to process all movies, remove break below
        # break

    except Exception as e:
        print(f"Error fetching data for movie at index {i}: {e}")

driver.quit()
print(json.dumps(movies_list, indent=4))
with open("empire_movies.json", "w", encoding="utf-8") as f:
    json.dump(movies_list, f, ensure_ascii=False, indent=4)
