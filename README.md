# Matching Activity Creator

A standalone, responsive matching activity inspired by the discontinued H5P Matching prototype.

## Features

- Text ↔ text, image ↔ text, text ↔ image, and image ↔ image pairs
- Automatic independent shuffling of both columns
- Mouse drag-and-drop, touch-friendly tap-to-match, and keyboard activation
- Teacher-selectable instant feedback or check-at-end mode
- Retry, show solution, and score
- Browser draft saving
- Export as JSON or a self-contained HTML file
- Shareable URL, iframe embed code, and QR code for smaller activities
- Shared framework-free matching engine suitable for a later H5P wrapper

## Run locally

Because browsers restrict some behaviour when pages are opened directly from disk, run a small local server:

```bash
python -m http.server 8000
```

Open `http://localhost:8000/creator.html`.

## Publish on GitHub Pages

1. Create a GitHub repository.
2. Upload all files and folders in this project.
3. In **Settings → Pages**, deploy from the main branch and root folder.
4. Open `creator.html` from the published Pages address.

## Notes

- Shareable URLs store activity data in the URL. Large uploaded images may exceed browser or QR-code limits.
- For image-heavy activities, use **Download HTML**, upload that HTML file to GitHub Pages, and share the hosted address.
- The QR preview uses the public QR Server image endpoint. The activity itself does not depend on that service.
- Direct GitHub publishing and an H5P wrapper are intentionally left for a later version.
