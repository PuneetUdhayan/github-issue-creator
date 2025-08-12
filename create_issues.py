# Python script to create a GitHub issue using the GitHub API
#
# Prerequisites:
# 1. A GitHub Personal Access Token (PAT) with 'repo' scope.
#    - You can create one here: https://github.com/settings/tokens
# 2. The 'requests' library installed.
#    - You can install it by running: pip install requests

import requests
import json

# --- CONFIGURATION ---
# Replace these placeholders with your actual data

# Your GitHub Personal Access Token. Keep this secret!
# It's best practice to load this from an environment variable or a secure vault.
GITHUB_TOKEN = "YOUR_PERSONAL_ACCESS_TOKEN"

# The owner of the repository (e.g., 'octocat')
REPO_OWNER = "YOUR_REPOSITORY_OWNER"

# The name of the repository (e.g., 'Hello-World')
REPO_NAME = "YOUR_REPOSITORY_NAME"

# Your GitHub Enterprise hostname. For example: 'github.yourcompany.com'
# If you are using public github.com, leave this as None.
GITHUB_HOSTNAME = None # e.g., "github.ibm.com"


def create_github_issue(title, body=None, assignees=None, labels=None):
    """
    Creates a new issue on a specified GitHub repository.

    Args:
        title (str): The title of the issue.
        body (str, optional): The contents of the issue. Defaults to None.
        assignees (list, optional): A list of GitHub usernames to assign to the issue.
                                    Defaults to None.
        labels (list, optional): A list of label names to add to the issue.
                                 Defaults to None.

    Returns:
        bool: True if the issue was created successfully, False otherwise.
    """
    # Construct the API URL based on whether a custom hostname is provided
    if GITHUB_HOSTNAME:
        # URL for GitHub Enterprise
        url = f"https://{GITHUB_HOSTNAME}/api/v3/repos/{REPO_OWNER}/{REPO_NAME}/issues"
    else:
        # URL for public GitHub
        url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/issues"

    # Set up the headers for the API request, including authentication
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
    }

    # Create the data payload for the new issue
    data = {
        "title": title,
        "body": body,
        "assignees": assignees if assignees else [],
        "labels": labels if labels else []
    }

    print(f"Sending request to create issue: '{title}' at {url}")

    try:
        # Make the POST request to the GitHub API
        response = requests.post(url, data=json.dumps(data), headers=headers)

        # Raise an exception for bad status codes (4xx or 5xx)
        response.raise_for_status()

        # If the request was successful (status code 201 Created)
        response_data = response.json()
        print(f"✅ Successfully created issue #{response_data['number']}.")
        print(f"   View it here: {response_data['html_url']}")
        return True

    except requests.exceptions.RequestException as e:
        # Handle potential errors like network issues or invalid API responses
        print(f"❌ Error creating issue: {e}")
        # Print the response content for more detailed error info if available
        if 'response' in locals() and response.content:
            print(f"   Response from server: {response.text}")
        return False


# --- SCRIPT EXECUTION ---
if __name__ == "__main__":
    # Example usage of the function
    # Define the details for the new issue you want to create
    issue_title = "My New Automated Issue"
    issue_body = "This is a test issue created by a Python script. ✨\n\nWe can even include **markdown**!"
    issue_assignees = []  # Optional: e.g., ["username1", "username2"]
    issue_labels = ["bug", "automation"] # Optional: e.g., ["bug", "help wanted"]

    # Check if the configuration variables have been changed from placeholders
    if GITHUB_TOKEN == "YOUR_PERSONAL_ACCESS_TOKEN" or \
       REPO_OWNER == "YOUR_REPOSITORY_OWNER" or \
       REPO_NAME == "YOUR_REPOSITORY_NAME":
        print("⚠️  Please update the configuration variables (GITHUB_TOKEN, REPO_OWNER, REPO_NAME) at the top of the script.")
    else:
        # Call the function to create the issue
        create_github_issue(issue_title, issue_body, issue_assignees, issue_labels)