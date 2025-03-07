import json
import time
import yaml
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from selenium.common.exceptions import NoAlertPresentException, TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager

def setup_driver():
    """Set up and configure the WebDriver"""
    print("Setting up the WebDriver...")
    options = webdriver.ChromeOptions()
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--start-maximized')
    options.add_argument('--disable-gpu')
    service = Service(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=options)

def handle_popups(driver, exclude_handles=None):
    """Handle different types of popups, but exclude specified handles"""
    if exclude_handles is None:
        exclude_handles = []
    

    try:
        alert = driver.switch_to.alert
        print("Alert detected, accepting it...")
        alert.accept()
        return True
    except NoAlertPresentException:
        pass
    
    # Try to find and click common close buttons for modal popups
    try:
        close_buttons = driver.find_elements(By.CSS_SELECTOR, 
            "button[class*='close'], div[class*='close'], span[class*='close'], "
            "button[aria-label*='close'], button[title*='Close'], "
            "button.dismiss-button, #dismiss-button, .dismiss-button"
        )
        
        for button in close_buttons:
            if button.is_displayed():
                print("Found close button, clicking it...")
                button.click()
                time.sleep(1)
                return True
    except:
        pass
    
    # Try to handle iframe-based ads
    try:
        iframes = driver.find_elements(By.TAG_NAME, "iframe")
        for iframe in iframes:
            try:
                driver.switch_to.frame(iframe)
         
                close_buttons = driver.find_elements(By.CSS_SELECTOR, 
                    "#dismiss-button, .dismiss-button, button[class*='close'], "
                    "div[class*='close'], span[class*='close']"
                )
                
                for button in close_buttons:
                    if button.is_displayed():
                        print("Found close button in iframe, clicking it...")
                        button.click()
                        time.sleep(1)
                        driver.switch_to.default_content()
                        return True
                
                driver.switch_to.default_content()
            except:
                driver.switch_to.default_content()
    except:
        driver.switch_to.default_content()
    
    return False

def update_yaml_file(org_id, org_name, org_url, ideas_url):
    """Update the YAML file with organization data for a specific ID only"""
    yaml_file = "gsoc_ideasdata.yaml"
    

    if not os.path.exists(yaml_file):
        print(f"YAML file not found: {yaml_file}")
        return False
    
    try:
        
        with open(yaml_file, 'r', encoding='utf-8') as file:
            lines = file.readlines()
        
    
        in_target_org = False
        found_org = False
        updated_lines = []
        
        for line in lines:
        
            if line.strip() == "- organization_id:" or line.strip().startswith("- organization_id:"):
             
                in_target_org = False
           
            if "organization_id:" in line and str(org_id) in line:
                in_target_org = True
                found_org = True
            
        
            if in_target_org:
                if "organization_name:" in line:
                    updated_lines.append(f"    organization_name: {org_name}\n")
                    continue
                elif "gsocorganization_dev_url:" in line:
                    updated_lines.append(f"    gsocorganization_dev_url: {org_url}\n")
                    continue
                elif "idea_list_url:" in line:
                    updated_lines.append(f"    idea_list_url: {ideas_url}\n")
                    continue
            
          
            updated_lines.append(line)
        
        if found_org:
          
            with open(yaml_file, 'w', encoding='utf-8') as file:
                file.writelines(updated_lines)
            
            print(f"Updated organization ID {org_id} in YAML file")
            return True
        else:
            print(f"Organization ID {org_id} not found in YAML file")
            return False
    except Exception as e:
        print(f"Error updating YAML file: {str(e)}")
        return False

def scrape_gsoc_organizations(start_id=21, end_id=185):
    driver = setup_driver()
    base_url = "https://www.gsocorganizations.dev/"
    current_id = start_id
    processed_count = 0
    
    try:
        # Navigate to the main page
        print(f"Navigating to {base_url}...")
        driver.get(base_url)
        time.sleep(5)
        
        # Handle any initial popups
        handle_popups(driver)
        
        # Click the 2025 filter once
        print("Clicking 2025 filter...")
        year_2025_label = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//div[contains(@class, 'ui checkbox')]/label[text()='2025']"))
        )
        year_2025_label.click()
        print("2025 filter applied")
        time.sleep(5)
        
        # Store the main window handle
        main_window = driver.current_window_handle
        print(f"Main window handle: {main_window}")
        
        # Skip the first 20 organizations
        print(f"Skipping to organization ID {start_id}...")
        skipped_count = 0
        while skipped_count < start_id - 1:  
            try:
                org_card = WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.CLASS_NAME, "org-card-container"))
                )
                driver.execute_script("arguments[0].remove();", org_card)
                skipped_count += 1
                time.sleep(0.5)
            except Exception as e:
                print(f"Error skipping organizations: {str(e)}")
                break
        
        print(f"Skipped {skipped_count} organizations, starting from ID {start_id}")
        
        # Process organizations from start_id to end_id
        while current_id <= end_id:
            try:
              
                handle_popups(driver)
                
             
                print(f"\nLooking for organization ID {current_id}...")
                org_card = WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.CLASS_NAME, "org-card-container"))
                )
                
              
                org_name = org_card.find_element(By.CLASS_NAME, "org-card-name-container").text
                print(f"\nProcessing ID {current_id}: {org_name}")
                
            
                before_window_handles = driver.window_handles
                
         
                action = webdriver.ActionChains(driver)
                action.key_down(Keys.CONTROL).click(org_card).key_up(Keys.CONTROL).perform()
                time.sleep(3)
                
               
                after_window_handles = driver.window_handles
                
                new_tab = None
                for handle in after_window_handles:
                    if handle not in before_window_handles:
                        new_tab = handle
                        break
                
                if new_tab:
                 
                    driver.switch_to.window(new_tab)
                    
                   
                    time.sleep(5)
                    
                   
                    handle_popups(driver, [new_tab])
                    
               
                    time.sleep(2)
                    
            
                    org_url = driver.current_url
                    print(f"Organization URL: {org_url}")
                    
           
                    ideas_url = ""
                    try:
                  
                        ideas_link_selectors = [
                            "//u[contains(text(), 'ideas list')]/..",
                            "//a[contains(text(), 'ideas list')]",
                            "//a[contains(@href, 'ideas')]",
                            "//a[contains(text(), 'Ideas')]",
                            "//a[contains(text(), 'project')]",
                            "//a[contains(text(), 'Project')]"
                        ]
                        
                        for selector in ideas_link_selectors:
                            try:
                                ideas_element = driver.find_element(By.XPATH, selector)
                                if ideas_element:
                                    ideas_url = ideas_element.get_attribute("href")
                                    if ideas_url:
                                        print(f"Ideas list URL: {ideas_url}")
                                        break
                            except NoSuchElementException:
                                continue
                    except Exception as e:
                        print(f"Error finding ideas list URL: {str(e)}")
                    
                    
                    update_yaml_file(current_id, org_name, org_url, ideas_url)
                    
                
                    driver.close()
                    
                    
                    driver.switch_to.window(main_window)
                    time.sleep(2)
                    
                 
                    print("\nSummary:")
                    print(f"Organization ID: {current_id}")
                    print(f"Organization: {org_name}")
                    print(f"Organization URL: {org_url}")
                    print(f"Ideas List URL: {ideas_url}")
                    
               
                    processed_count += 1
                else:
                    print("No new tab was detected, continuing...")
                
               
                driver.execute_script("arguments[0].remove();", org_card)
                time.sleep(2)
             
                current_id += 1
                
            except Exception as e:
                print(f"Error processing organization {current_id}: {str(e)}")
             
                current_id += 1
                
                # If we're stuck, try to get back to the main page
                if driver.current_window_handle != main_window:
                    try:
                        driver.close()
                        driver.switch_to.window(main_window)
                    except:
                        # If we can't recover, restart the browser
                        driver.quit()
                        driver = setup_driver()
                        driver.get(base_url)
                        time.sleep(5)
                        
                        # Reapply the 2025 filter
                        year_2025_label = WebDriverWait(driver, 10).until(
                            EC.element_to_be_clickable((By.XPATH, "//div[contains(@class, 'ui checkbox')]/label[text()='2025']"))
                        )
                        year_2025_label.click()
                        time.sleep(5)
                        
                        # Skip to where we left off
                        skipped_count = 0
                        while skipped_count < current_id - 1:
                            try:
                                org_card = WebDriverWait(driver, 10).until(
                                    EC.presence_of_element_located((By.CLASS_NAME, "org-card-container"))
                                )
                                driver.execute_script("arguments[0].remove();", org_card)
                                skipped_count += 1
                                time.sleep(0.5)
                            except:
                                break
                
        print(f"\nProcessed {processed_count} organizations from ID {start_id} to {end_id}")
        
    except Exception as e:
        print(f"An error occurred: {str(e)}")
    finally:
        print("\nClosing the browser...")
        time.sleep(3)
        driver.quit()

if __name__ == "__main__":
    scrape_gsoc_organizations(start_id=21, end_id=185)