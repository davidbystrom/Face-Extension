// Author: @davidbystrom
// Date: April 27, 2025
// Description: Manages the settings page for saving API key and endpoint.

document.addEventListener("DOMContentLoaded", () => {
  const apiKeyInput = document.getElementById("apiKey");
  const apiEndpointInput = document.getElementById("apiEndpoint");
  const saveButton = document.getElementById("saveButton");
  const messageElement = document.getElementById("message");

  // Load saved settings
  chrome.storage.sync.get(["apiKey", "apiEndpoint"], (data) => {
    if (data.apiKey) apiKeyInput.value = data.apiKey;
    if (data.apiEndpoint) apiEndpointInput.value = data.apiEndpoint;
  });

  // Save settings
  saveButton.addEventListener("click", () => {
    const apiKey = apiKeyInput.value.trim();
    const apiEndpoint = apiEndpointInput.value.trim();

    if (!apiKey || !apiEndpoint) {
      messageElement.textContent = "Please fill in both fields.";
      messageElement.style.color = "red";
      return;
    }

    chrome.storage.sync.set({ apiKey, apiEndpoint }, () => {
      messageElement.textContent = "Settings saved successfully!";
      messageElement.style.color = "green";
    });
  });
});