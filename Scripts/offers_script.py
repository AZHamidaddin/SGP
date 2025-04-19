import requests
import json
import re
from bs4 import BeautifulSoup
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


VOX_BASE_URL = "https://ksa.voxcinemas.com/ticket-offer/summary"
MUVI_BASE_URL = "https://www.muvicinemas.com"
AMC_BASE_URL = "https://www.amccinemas.com"
EMPIRE_BASE_URL = "https://ksa.empirecinemas.com"
all_offers = []


def getVoxOffers():

    response = requests.get(VOX_BASE_URL)
    soup = BeautifulSoup(response.text, "html.parser")
    vox_offers_urls = soup.find_all("a", class_="banner")

    print("Loading Vox offers...")

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


def getMuviOffers():

    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    driver = webdriver.Chrome(options=options)  # Ensure you have chromedriver installed
    driver.get(f'{MUVI_BASE_URL}/en/offers')  # Replace with the target URL

    print("\n" * 5)
    print("loading Muvi offers...")

    time.sleep(3)  # Adjust as needed

    # Locate and click the radio button with id="city-Jeddah"
    radio_button = driver.find_element(By.ID, "city-Jeddah")
    driver.execute_script("arguments[0].click();", radio_button)

    print("selecting city...")

    # Wait for a short duration
    time.sleep(2)

    # Locate and click the submit button with id="city-submit"
    submit_button = driver.find_element(By.ID, "city-submit")
    driver.execute_script("arguments[0].click();", submit_button)

    # Optional: Wait to see the result before closing
    time.sleep(5)

    scroll_pause_time = 3  # Adjust based on loading speed
    last_height = driver.execute_script("return document.body.scrollHeight")

    while True:
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(scroll_pause_time)
        new_height = driver.execute_script("return document.body.scrollHeight")
        if new_height == last_height:
            break
        last_height = new_height

    page_source = driver.page_source

    driver.quit()

    # Parse the HTML
    soup = BeautifulSoup(page_source, "html.parser")
    # print(soup.prettify())

    muvi_offers_divs = soup.find_all("div", class_="css-9xl0n4")
    for muvi_offer in muvi_offers_divs:

        image_element = muvi_offer.find("img", id="image")
        offer_image = image_element.get("src")
        offer_title = image_element.get('alt').upper().strip()

        # Offer URL
        explore_button = muvi_offer.find("a", class_="css-px42a5")
        offer_url = explore_button.get("href")

        print("Fetching URL:", offer_url)
        print("Offer name:", offer_title)
        print("-" * 80)

        # Append the cleaned data to the list
        all_offers.append({
            "offer_image": f'{MUVI_BASE_URL}{offer_image}',
            "parent": "Muvi",
            "offer title": offer_title,
            "offer URL": f'{MUVI_BASE_URL}{offer_url}'
        })


def getAMCOffers():

    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    driver = webdriver.Chrome(options=options)  # Ensure you have chromedriver installed
    driver.get(f'{AMC_BASE_URL}')  # Replace with the target URL

    wait = WebDriverWait(driver, 10)
    english_btn = wait.until(EC.element_to_be_clickable((
        By.CSS_SELECTOR,
        "a.amc-btn-default.amc-btn[onclick=\"ChangeUserLanguage('en-US');\"]"
    )))
    english_btn.click()

    time.sleep(5)

    driver.get(f'{AMC_BASE_URL}/Offer')

    time.sleep(3)

    print("\n" * 5)
    print("loading AMC offers...")
    page_source = driver.page_source

    driver.quit()

    # Parse the HTML
    soup = BeautifulSoup(page_source, "html.parser")
    # print(soup.prettify())

    amc_offers_divs = soup.find_all("section", class_="nahar-offer")
    for amc_offer in amc_offers_divs:

        offer_image = amc_offer.find("img").get("src")
        offer_title = amc_offer.find("h3").text.upper().strip()

        # Offer URL
        know_more_button = amc_offer.find("a", class_="amc-btn")
        offer_url = know_more_button.get("href")

        print("Fetching URL:", offer_url)
        print("Offer name:", offer_title)
        print("-" * 80)

        # Append the cleaned data to the list
        all_offers.append({
            "offer_image": offer_image,
            "parent": "AMC",
            "offer title": offer_title,
            "offer URL": f'{AMC_BASE_URL}{offer_url}'
        })


def getEmpireOffers():

    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    driver = webdriver.Chrome(options=options)  # Ensure you have chromedriver installed
    driver.get(EMPIRE_BASE_URL)  # Replace with the target URL

    print("\n" * 5)
    print("loading Empire offers...")

    time.sleep(4)  # Adjust as needed

    driver.get(f'{EMPIRE_BASE_URL}/cinema-offer')

    time.sleep(5)  # Adjust as needed

    page_source = driver.page_source
    driver.quit()

    # Parse the HTML
    soup = BeautifulSoup(page_source, "html.parser")
    # print(soup.prettify())

    offer_divs = soup.find_all(
        "div",
        id=re.compile(r"^offer-content\d+$")
    )

    for offer in offer_divs:

        offer_title = offer.find("div", class_="title").text.upper().strip()
        offer_image = offer.find("img").get("src")

        print("Fetching Offer:", offer_image)
        print("Offer name:", offer_title)
        print("-" * 80)

        # Append the cleaned data to the list
        all_offers.append({
            "offer_image": offer_image,
            "parent": "Empire",
            "offer title": offer_title,
            "offer URL": f'{EMPIRE_BASE_URL}/cinema-offer'
        })



getVoxOffers()
getMuviOffers()
getAMCOffers()
getEmpireOffers()

# Dump the final JSON, which now will only include ASCII characters in the offer title
print(json.dumps(all_offers, indent=4))
with open("offers.json", "w", encoding="utf-8") as f:
    json.dump(all_offers, f, ensure_ascii=False, indent=4)
