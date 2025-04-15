import requests
import json
import re
from bs4 import BeautifulSoup

VOX_BASE_URL = "https://ksa.voxcinemas.com/ticket-offer/summary"
all_offers = []

response = requests.get(VOX_BASE_URL)
soup = BeautifulSoup(response.text, "html.parser")
vox_offers_urls = soup.find_all("a", class_="banner")

# Loop through each offer
for offer in vox_offers_urls:
    # Extract the href attribute from the anchor tag
    href = offer.get("href")
    print("Fetching URL:", href)

    # Send a request to the offer URL
    offer_response = requests.get(href)
    offer_soup = BeautifulSoup(offer_response.text, "html.parser")

    # Extract and clean the page title for logging
    raw_title = offer_soup.title.string.strip() if offer_soup.title else "No title found"
    clean_title = re.sub(r'[^\x00-\x7F]+', '', raw_title)
    print("Offer page title (ASCII only):", clean_title)

    # Extract and clean the H1 offer name only once
    raw_offer_name = offer_soup.find("h1").text.upper().strip()
    clean_offer_name = re.sub(r'[^\x00-\x7F]+', '', raw_offer_name)
    print("Offer name (ASCII only):", clean_offer_name)

    # Extract offer image from the third image tag
    offer_image = offer_soup.find_all("img")[2].get("src")

    # Append the cleaned data to your list
    all_offers.append({
        "offer_image": offer_image,
        "parent": "Vox",
        "offer title": clean_offer_name,
        "offer URL": href
    })

    print("-" * 80)
    # Uncomment the next line if you want to only test with one offer
    # break

# Dump the final JSON, which now will only include ASCII characters in the offer title
print(json.dumps(all_offers, indent=4))
# with open("offers.json", "w", encoding="utf-8") as f:
#     json.dump(movies, f, ensure_ascii=False, indent=4)