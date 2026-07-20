# Matching Activity Creator — reviewed version

A framework-free matching activity for GitHub Pages, inspired by the discontinued H5P Matching prototype.

## Included features

- Text ↔ text, image ↔ text, text ↔ image, and image ↔ image pairs
- Independent automatic shuffling of both columns on start and Retry
- Mouse drag-and-drop
- Touch/pointer dragging on tablets and phones
- Tap/click-to-match and keyboard selection
- Teacher-selectable **Check at the end** or **Instant feedback**
- First-attempt scoring in instant-feedback mode
- Check, Retry, Show solution, combined result rows, and score
- Browser draft saving
- JSON export and import
- Self-contained HTML export using the same player engine as the main site
- Shareable links, iframe embed code, and QR preview for smaller activities
- Image descriptions for accessibility

## Upload to GitHub Pages

Upload **all files and folders** in this project to the repository root:

```text
index.html
creator.html
.nojekyll
css/
js/
examples/
README.md
```

Then select:

- **Settings → Pages**
- **Source:** Deploy from a branch
- **Branch:** `main`
- **Folder:** `/(root)`

The learner page will be:

```text
https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/
```

The creator will be:

```text
https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/creator.html
```

## Important sharing notes

- Shareable URLs contain the activity data. They are best for text-only or very small-image activities.
- For image-heavy activities, use **Download HTML**, upload the exported HTML file, and share its hosted URL.
- The QR preview uses an external QR image service. The matching activity itself does not depend on that service.
- Direct publishing into a GitHub repository and an H5P wrapper are not included yet.
