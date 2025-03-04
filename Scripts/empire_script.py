from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from bs4 import BeautifulSoup
import re
import time
import json
from datetime import datetime, date
from datetime import timedelta

# Map from short month to numeric month
MONTH_MAP = {
    "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
    "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12
}

EMPIRE_URL = "https://ksa.empirecinemas.com/"

options = Options()
options.add_argument('--headless')
driver = webdriver.Chrome(options=options)  # Ensure you have chromedriver installed and in PATH

# Maximize the window (optional)
driver.maximize_window()

driver.get(EMPIRE_URL)
time.sleep(1)

# Close the popup
close_button = driver.find_element(By.CLASS_NAME, "btn-close")
driver.execute_script("arguments[0].click();", close_button)

time.sleep(3)  # Allow page to load
page_source = driver.page_source
soup = BeautifulSoup(page_source, "html.parser")

# Get the initial list of movie divs by re-fetching using an XPath
movie_divs = driver.find_elements(By.XPATH, "//*[starts-with(@id, 'movie-card')]")
movie_divs = [div for div in movie_divs if re.match(r"movie-card\d+", div.get_attribute("id"))]

movie_count = len(movie_divs)
print(f"Found {movie_count} movie divs.")

movies_list = []

for i in range(movie_count):
    try:
        # Re-fetch the current list of movie elements to avoid stale references
        current_movie_divs = driver.find_elements(By.XPATH, "//*[starts-with(@id, 'movie-card')]")
        current_movie_divs = [div for div in current_movie_divs if re.match(r"movie-card\d+", div.get_attribute("id"))]
        if i >= len(current_movie_divs):
            print(f"Index {i} is out of range. Skipping.")
            continue
        movie = current_movie_divs[i]

        # Extract the image URL
        try:
            img_elem = movie.find_element(By.TAG_NAME, "img")
            image_url = img_elem.get_attribute("src")
        except Exception as e:
            print("Error extracting image URL:", e)
            image_url = ""

        # Scroll into view if necessary
        driver.execute_script("arguments[0].scrollIntoView();", movie)
        time.sleep(1)
        movie.click()
        time.sleep(3)
    except Exception as e:
        print(f"Error clicking movie at index {i}: {e}")
        continue

    # Attempt to click the "read more" button
    try:
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

        # --- JSON Parsing ---
        title_div = movie_card.find("div", class_="title")
        title = title_div.get_text(strip=True) if title_div else ""

        rating_div = movie_card.find("div", class_="tags")
        rating = rating_div.get_text(strip=True) if rating_div else ""

        genre_div = movie_card.find("div", class_="features")
        if genre_div:
            raw_genres = genre_div.get_text(strip=True)
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

        # Generate slug
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
            "Genre": genre,
            "Showtimes URL": "",
            "Timings": []
        }

        print(f"Fetching data for {title}")

        # Click the BOOK NOW button
        try:
            book_now_btn = driver.find_element(
                By.XPATH, "//div[@id='movie-animation']//button[contains(@class, 'btn-book-now')]"
            )
            driver.execute_script("arguments[0].click();", book_now_btn)
            time.sleep(2)

            showtimes_url = driver.current_url
            movie_json["Showtimes URL"] = showtimes_url

            # Process each date-card
            date_cards = driver.find_elements(By.CLASS_NAME, "date-card")
            timings = []

            for date_card in date_cards:
                # Extract the month, date, and day from the card
                month_elem = date_card.find_element(By.CLASS_NAME, "month")
                date_elem = date_card.find_element(By.CLASS_NAME, "date")
                # day_elem = date_card.find_element(By.CLASS_NAME, "day")  # if needed

                month_text = month_elem.text.strip()
                date_text = date_elem.text.strip()

                # Convert month text to a numeric month
                short_month = month_text[:3]  # e.g., "Mar"
                year = datetime.now().year
                month_num = MONTH_MAP.get(short_month, 1)  # default to 1 if not found
                day_num = int(date_text) if date_text.isdigit() else 1

                # Construct the date string
                date_str = f"{year:04d}-{month_num:02d}-{day_num:02d}"

                # Click the date card
                driver.execute_script("arguments[0].click();", date_card)
                time.sleep(2)

                # Re-parse the updated page source
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
                    times_uls = time_div.find_all("ul", class_=re.compile(r"showtimes__time-tag"))
                    for ul in times_uls:
                        li_items = ul.find_all("li")
                        for li_ in li_items:
                            time_text = li_.get_text(strip=True)
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

                timing_entry = {
                    "Date": date_str,
                    "day_of_week": "",
                    "Showtimes": showtimes_list
                }
                timings.append(timing_entry)

            movie_json["Timings"] = timings

            # Go back
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

# Print final JSON
print(json.dumps(movies_list, indent=4))
with open("empire_movies.json", "w", encoding="utf-8") as f:
    json.dump(movies_list, f, ensure_ascii=False, indent=4)
