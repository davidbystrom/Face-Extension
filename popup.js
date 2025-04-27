// Author: @davidbystrom
// Date: April 27, 2025
// Description: Handles the popup functionality for the Face Detection extension.

document.addEventListener("DOMContentLoaded", async function () {
    try {
        // Update the status in the popup
        const statusElement = document.getElementById("status");
        statusElement.textContent = "Processing...";

        // Retrieve API key and endpoint from storage
        chrome.storage.sync.get(["apiKey", "apiEndpoint"], async (data) => {
            const API_KEY = data.apiKey;
            const API_URL = data.apiEndpoint;

            if (!API_KEY || !API_URL) {
                statusElement.textContent = "Please configure your API key and endpoint in the settings.";
                return;
            }

            // Capture a screenshot of the current tab
            const screenshotDataUrl = await chrome.tabs.captureVisibleTab();

            // Create an image to get the actual screenshot dimensions
            const img = new Image();
            img.src = screenshotDataUrl;
            img.onload = async () => {
                const screenshotWidth = img.width;
                const screenshotHeight = img.height;

                // Convert the screenshot to a Blob
                const base64Image = screenshotDataUrl.split(",")[1];
                const byteCharacters = atob(base64Image);
                const byteNumbers = new Array(byteCharacters.length).fill(0).map((_, i) => byteCharacters.charCodeAt(i));
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: "image/png" });

                // Create FormData and append the Blob
                const formData = new FormData();
                formData.append("file", blob, "screenshot.png");

                // Send the screenshot to the CompreFace API
                const response = await fetch(API_URL, {
                    method: "POST",
                    headers: {
                        "x-api-key": API_KEY
                    },
                    body: formData
                });

                // Parse the API response
                const result = await response.json();

                // Check if there are any faces detected
                if (!result?.result || result.result.length === 0) {
                    statusElement.textContent = "No faces detected.";
                    return;
                }

                // Update the status to indicate success
                statusElement.textContent = "Faces detected. Drawing boxes...";

                // Inject a canvas overlay into the current webpage
                chrome.scripting.executeScript({
                    target: { tabId: (await chrome.tabs.query({ active: true, currentWindow: true }))[0].id },
                    func: (faces, screenshotWidth, screenshotHeight) => {
                        try {
                            // Create a canvas element
                            const canvas = document.createElement("canvas");
                            canvas.style.position = "fixed";
                            canvas.style.top = "0";
                            canvas.style.left = "0";
                            canvas.style.width = "100vw";
                            canvas.style.height = "100vh";
                            canvas.style.pointerEvents = "none";
                            canvas.style.zIndex = "10000";

                            // Append the canvas to the body
                            document.body.appendChild(canvas);

                            // Set canvas dimensions
                            canvas.width = window.innerWidth;
                            canvas.height = window.innerHeight;

                            // Get the canvas context
                            const ctx = canvas.getContext("2d");
                            if (!ctx) {
                                console.error("Failed to get 2D context for the canvas.");
                                return;
                            }

                            // Calculate scaling factors
                            const scaleX = canvas.width / screenshotWidth;
                            const scaleY = canvas.height / screenshotHeight;

                            // Loop through each face and draw the bounding box and label
                            faces.forEach((face) => {
                                const { x_min, x_max, y_min, y_max } = face.box;
                                const identifiedPerson = face.subjects?.[0]?.subject || "Unknown";

                                // Scale the bounding box coordinates
                                const scaledXMin = x_min * scaleX;
                                const scaledXMax = x_max * scaleX;
                                const scaledYMin = y_min * scaleY;
                                const scaledYMax = y_max * scaleY;

                                // Draw the bounding box
                                ctx.strokeStyle = "red";
                                ctx.lineWidth = 4;
                                ctx.strokeRect(scaledXMin, scaledYMin, scaledXMax - scaledXMin, scaledYMax - scaledYMin);

                                // Add a label for the identified person
                                ctx.font = "16px Arial";
                                ctx.fillStyle = "red";
                                ctx.fillText(identifiedPerson, scaledXMin, scaledYMin - 10);
                            });

                            // Notify the popup that the process is complete
                            chrome.runtime.sendMessage({ status: "done" });

                            // Function to remove the canvas
                            const removeCanvas = () => {
                                canvas.remove();
                                window.removeEventListener("scroll", removeCanvas);
                                window.removeEventListener("click", removeCanvas);
                            };

                            // Add scroll and click event listeners to remove the canvas
                            window.addEventListener("scroll", removeCanvas);
                            window.addEventListener("click", removeCanvas);
                        } catch (error) {
                            console.error("Error in Injected Script:", error);
                        }
                    },
                    args: [result.result, screenshotWidth, screenshotHeight]
                });
            };
        });
    } catch (error) {
        console.error("Error:", error);
        const statusElement = document.getElementById("status");
        statusElement.textContent = `An error occurred: ${error.message}`;
    }
});

// Listen for messages from the injected script
chrome.runtime.onMessage.addListener((message) => {
    if (message.status === "done") {
        const statusElement = document.getElementById("status");
        statusElement.textContent = "Done! All faces processed.";
    }
});
