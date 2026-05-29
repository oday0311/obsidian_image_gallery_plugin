# Current Note Image Gallery

Current Note Image Gallery is an Obsidian plugin that collects images from the active note and displays them in a dedicated gallery view.

## Features

- Collects images referenced by the current Markdown note.
- Supports wiki embeds, Markdown image syntax, and HTML `img` tags.
- Displays local vault images and external image URLs in a responsive gallery.
- Filters local images by minimum file size.
- Opens images in a preview modal or directly in Obsidian.
- Includes gallery layout settings for thumbnail size, columns, and file name visibility.
- Remembers the preview modal size between sessions.

## Installation

### Community plugins

After this plugin is approved by the Obsidian community plugin review process, you can install it from:

`Settings -> Community plugins -> Browse`

Search for `Current Note Image Gallery` and install it.

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest GitHub release.
2. Create the folder `.obsidian/plugins/image-gallery-current-note/` inside your vault.
3. Copy the downloaded files into that folder.
4. Restart Obsidian or reload community plugins.
5. Enable `Current Note Image Gallery` in `Settings -> Community plugins`.

## Usage

1. Open any Markdown note that contains image references.
2. Run the command `Open current note image gallery`.
3. Or click the image icon in the left ribbon to open the gallery view.
4. Click any image to preview it or open it in Obsidian, depending on your settings.

The gallery updates when you switch notes or when the current note changes.

## Supported Image Sources

- Wiki embeds such as `![[image.png]]`
- Markdown images such as `![Alt text](image.png)`
- HTML image tags such as `<img src="https://example.com/image.png">`
- Local vault image files
- External image URLs

## Settings

The plugin provides the following settings:

- Minimum image size in KB
- Thumbnail size
- Number of columns per row
- Toggle to show or hide file names
- Click action for images:
  - Preview modal
  - Open in Obsidian

## Preview Modal

The image preview modal supports:

- Previous and next navigation
- Keyboard navigation with left and right arrow keys
- Escape to close
- Double-click to zoom
- Resize presets
- Manual moving and resizing

## Development

```bash
npm install
npm run dev
```

To build a production bundle:

```bash
npm run build
```

To build and sync into a local Obsidian vault plugin directory:

```bash
npm run build:obsidian
```

By default, the sync script copies files into:

`/Users/xxx/Documents/Obsidian Vault/.obsidian/plugins`

You can override this by setting the `OBSIDIAN_PLUGINS_DIR` environment variable.

## Release Process

1. Update `version` in `manifest.json` and `package.json`.
2. Update `versions.json` if you change the minimum supported Obsidian version.
3. Run `npm run build`.
4. Create a Git tag that matches the plugin version, for example `0.1.0`.
5. Push the tag to GitHub.
6. Publish a GitHub release containing:
   - `main.js`
   - `manifest.json`
   - `styles.css`

This repository includes a GitHub Actions workflow that can build the plugin and create a release automatically when you push a version tag.

## Repository

- Homepage: [GitHub repository](https://github.com/oday0311/obsidian_image_gallery_plugin)
- Issues: [Bug reports and feature requests](https://github.com/oday0311/obsidian_image_gallery_plugin/issues)

## License

This project is licensed under the MIT License.
