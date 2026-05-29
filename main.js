"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => CurrentNoteImageGalleryPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var VIEW_TYPE_IMAGE_GALLERY = "current-note-image-gallery";
var IMAGE_EXTENSIONS = /* @__PURE__ */ new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "bmp",
  "ico",
  "avif"
]);
var DEFAULT_SETTINGS = {
  minImageSizeKB: 80,
  thumbnailSize: 160,
  columnCount: 3,
  showFileName: true,
  imageClickAction: "preview",
  previewModalSize: null
};
var CurrentNoteImageGalleryView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW_TYPE_IMAGE_GALLERY;
  }
  getDisplayText() {
    return "Current Note Image Gallery";
  }
  getIcon() {
    return "image";
  }
  async onOpen() {
    this.contentEl.addClass("image-gallery-view");
    this.addAction("refresh-cw", "Refresh gallery", () => {
      void this.renderGallery();
    });
    await this.renderGallery();
  }
  async renderGallery() {
    const state = await this.plugin.buildGalleryState();
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("image-gallery-view");
    const headerEl = contentEl.createDiv({ cls: "image-gallery-header" });
    headerEl.createDiv({
      cls: "image-gallery-title",
      text: state.note ? state.note.basename : "Current Note Image Gallery"
    });
    headerEl.createDiv({
      cls: "image-gallery-subtitle",
      text: state.note ? `Collected ${state.items.length} image(s) from the current note, min size ${this.plugin.settings.minImageSizeKB} KB` : "Open a note to preview its images here"
    });
    if (state.message) {
      contentEl.createDiv({
        cls: "image-gallery-empty",
        text: state.message
      });
      return;
    }
    const gridEl = contentEl.createDiv({ cls: "image-gallery-grid" });
    gridEl.style.gridTemplateColumns = `repeat(${Math.max(1, this.plugin.settings.columnCount)}, minmax(0, 1fr))`;
    for (const [index, item] of state.items.entries()) {
      const cardEl = gridEl.createDiv({ cls: "image-gallery-card" });
      const imageEl = cardEl.createEl("img", {
        cls: "image-gallery-thumbnail",
        attr: {
          src: item.src,
          alt: item.name,
          loading: "lazy",
          referrerpolicy: "no-referrer"
        }
      });
      imageEl.style.height = `${this.plugin.settings.thumbnailSize}px`;
      imageEl.addEventListener("click", () => {
        void this.plugin.handleImageClick(state.items, index);
      });
      const metaEl = cardEl.createDiv({ cls: "image-gallery-meta" });
      if (this.plugin.settings.showFileName) {
        metaEl.createDiv({ cls: "image-gallery-name", text: item.name });
      }
      metaEl.createDiv({ cls: "image-gallery-source", text: item.source });
      metaEl.createDiv({
        cls: "image-gallery-source",
        text: item.sizeBytes === null ? "Size: external or unknown" : `Size: ${this.plugin.formatFileSize(item.sizeBytes)}`
      });
    }
  }
};
var CurrentNoteImageGalleryPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.currentNotePath = null;
    this.settings = DEFAULT_SETTINGS;
  }
  async onload() {
    await this.loadSettings();
    this.registerView(
      VIEW_TYPE_IMAGE_GALLERY,
      (leaf) => new CurrentNoteImageGalleryView(leaf, this)
    );
    this.addSettingTab(new CurrentNoteImageGallerySettingTab(this.app, this));
    this.addRibbonIcon("image", "Open current note image gallery", () => {
      void this.activateGalleryView();
    });
    this.addCommand({
      id: "open-current-note-image-gallery",
      name: "Open current note image gallery",
      callback: () => {
        void this.activateGalleryView();
      }
    });
    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        if (file?.extension === "md") {
          this.currentNotePath = file.path;
        }
        void this.refreshGalleryViews();
      })
    );
    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        if (this.isCurrentNote(file)) {
          void this.refreshGalleryViews();
        }
      })
    );
    this.registerEvent(
      this.app.metadataCache.on("resolved", () => {
        void this.refreshGalleryViews();
      })
    );
    this.app.workspace.onLayoutReady(() => {
      this.captureCurrentNoteFromActiveView();
      void this.refreshGalleryViews();
    });
  }
  async onunload() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_IMAGE_GALLERY)) {
      leaf.detach();
    }
  }
  async activateGalleryView() {
    this.captureCurrentNoteFromActiveView();
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_IMAGE_GALLERY)[0] ?? null;
    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(false);
    }
    if (!leaf) {
      return;
    }
    await leaf.setViewState({
      type: VIEW_TYPE_IMAGE_GALLERY,
      active: true
    });
    await this.app.workspace.revealLeaf(leaf);
    if (leaf.view instanceof CurrentNoteImageGalleryView) {
      await leaf.view.renderGallery();
    }
  }
  async refreshGalleryViews() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_IMAGE_GALLERY)) {
      if (leaf.view instanceof CurrentNoteImageGalleryView) {
        await leaf.view.renderGallery();
      }
    }
  }
  async buildGalleryState() {
    const note = this.getCurrentMarkdownFile();
    if (!note) {
      return {
        note: null,
        items: [],
        message: "No active note found. Open a Markdown note to build the gallery."
      };
    }
    const content = await this.app.vault.cachedRead(note);
    const items = this.collectGalleryItems(note, content);
    if (items.length === 0) {
      return {
        note,
        items,
        message: `No images matching the current size filter were found. Current minimum size: ${this.settings.minImageSizeKB} KB.`
      };
    }
    return { note, items };
  }
  async loadSettings() {
    const loaded = await this.loadData();
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...loaded ?? {}
    };
  }
  async saveSettings() {
    await this.saveData(this.settings);
    await this.refreshGalleryViews();
  }
  async savePreviewModalSize(width, height) {
    this.settings.previewModalSize = {
      width: Math.round(width),
      height: Math.round(height)
    };
    await this.saveData(this.settings);
  }
  async handleImageClick(items, index) {
    const item = items[index];
    if (!item) {
      return;
    }
    if (this.settings.imageClickAction === "open-in-obsidian" && item.file) {
      await this.app.workspace.getLeaf(false).openFile(item.file, { active: true });
      return;
    }
    new ImagePreviewModal(this.app, this, items, index).open();
  }
  captureCurrentNoteFromActiveView() {
    const activeMarkdownView = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
    const activeFile = activeMarkdownView?.file;
    if (activeFile?.extension === "md") {
      this.currentNotePath = activeFile.path;
    }
  }
  getCurrentMarkdownFile() {
    const activeMarkdownView = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
    const activeFile = activeMarkdownView?.file;
    if (activeFile?.extension === "md") {
      this.currentNotePath = activeFile.path;
      return activeFile;
    }
    if (!this.currentNotePath) {
      return null;
    }
    const file = this.app.vault.getAbstractFileByPath(this.currentNotePath);
    if (file instanceof import_obsidian.TFile && file.extension === "md") {
      return file;
    }
    return null;
  }
  isCurrentNote(file) {
    const currentNote = this.getCurrentMarkdownFile();
    return currentNote?.path === file.path;
  }
  collectGalleryItems(note, content) {
    const items = /* @__PURE__ */ new Map();
    const cache = this.app.metadataCache.getFileCache(note);
    for (const embed of cache?.embeds ?? []) {
      this.addImageCandidate(embed.link, note.path, items);
    }
    for (const link of this.extractImageLinks(content)) {
      this.addImageCandidate(link, note.path, items);
    }
    return [...items.values()];
  }
  addImageCandidate(rawLink, sourcePath, items) {
    const normalizedLink = this.normalizeImageLink(rawLink);
    if (!normalizedLink) {
      return;
    }
    const resolved = this.resolveImageLink(normalizedLink, sourcePath);
    if (!resolved || items.has(resolved.id)) {
      return;
    }
    if (!this.passesMinSizeFilter(resolved.sizeBytes)) {
      return;
    }
    items.set(resolved.id, resolved);
  }
  normalizeImageLink(rawLink) {
    const trimmed = rawLink.trim();
    if (!trimmed) {
      return null;
    }
    const [beforePipe] = trimmed.split("|");
    const withoutAngles = beforePipe.startsWith("<") && beforePipe.endsWith(">") ? beforePipe.slice(1, -1) : beforePipe;
    return withoutAngles.trim() || null;
  }
  resolveImageLink(link, sourcePath) {
    if (this.isExternalLink(link)) {
      return {
        id: `external:${link}`,
        name: this.readableName(link),
        source: link,
        src: link,
        sizeBytes: null,
        file: null
      };
    }
    const cleanLinkPath = link.split("#")[0];
    const resolved = this.app.metadataCache.getFirstLinkpathDest(cleanLinkPath, sourcePath) ?? this.getFileByPath(cleanLinkPath);
    if (!(resolved instanceof import_obsidian.TFile) || !this.isImageFile(resolved)) {
      return null;
    }
    return {
      id: `local:${resolved.path}`,
      name: resolved.basename,
      source: resolved.path,
      src: this.app.vault.getResourcePath(resolved),
      sizeBytes: resolved.stat.size,
      file: resolved
    };
  }
  getFileByPath(path) {
    const file = this.app.vault.getAbstractFileByPath((0, import_obsidian.normalizePath)(path));
    return file instanceof import_obsidian.TFile ? file : null;
  }
  isExternalLink(link) {
    return /^(https?:\/\/|data:)/i.test(link);
  }
  isImageFile(file) {
    return IMAGE_EXTENSIONS.has(file.extension.toLowerCase());
  }
  readableName(source) {
    const withoutQuery = source.split("?")[0];
    const parts = withoutQuery.split("/");
    return parts[parts.length - 1] || "image";
  }
  extractImageLinks(content) {
    const links = [];
    const wikiImageRegex = /!\[\[([^[\]]+?)\]\]/g;
    const markdownImageRegex = /!\[[^\]]*]\((<[^>]+>|[^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'))?\)/g;
    const htmlImageRegex = /<img\b[^>]*?\bsrc=["']([^"']+)["'][^>]*>/gi;
    for (const match of content.matchAll(wikiImageRegex)) {
      if (match[1]) {
        links.push(match[1]);
      }
    }
    for (const match of content.matchAll(markdownImageRegex)) {
      if (match[1]) {
        links.push(match[1]);
      }
    }
    for (const match of content.matchAll(htmlImageRegex)) {
      if (match[1]) {
        links.push(match[1]);
      }
    }
    return links;
  }
  passesMinSizeFilter(sizeBytes) {
    if (sizeBytes === null) {
      return true;
    }
    return sizeBytes >= this.settings.minImageSizeKB * 1024;
  }
  formatFileSize(sizeBytes) {
    if (sizeBytes < 1024) {
      return `${sizeBytes} B`;
    }
    if (sizeBytes < 1024 * 1024) {
      return `${(sizeBytes / 1024).toFixed(1)} KB`;
    }
    return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
  }
};
var ImagePreviewModal = class extends import_obsidian.Modal {
  constructor(app, plugin, items, startIndex) {
    super(app);
    this.plugin = plugin;
    this.items = items;
    this.isZoomed = false;
    this.imageEl = null;
    this.imageStageEl = null;
    this.previewContentEl = null;
    this.modalBoxEl = null;
    this.prevButtonEl = null;
    this.nextButtonEl = null;
    this.resizeHandleEls = [];
    this.activePointerId = null;
    this.activePointerTarget = null;
    this.keydownHandler = null;
    this.resizeState = null;
    this.handleHandlePointerStart = (event) => {
      const target = event.currentTarget;
      if (!(target instanceof HTMLElement) || !this.modalBoxEl || event.button !== 0) {
        return;
      }
      const direction = target.dataset.direction ?? null;
      const mode = target.dataset.mode === "move" ? "move" : "resize";
      if (!direction) {
        return;
      }
      const rect = this.modalBoxEl.getBoundingClientRect();
      this.activePointerId = event.pointerId;
      this.activePointerTarget = target;
      target.setPointerCapture(event.pointerId);
      target.addEventListener("pointermove", this.handlePointerMove);
      target.addEventListener("pointerup", this.handlePointerEnd);
      target.addEventListener("pointercancel", this.handlePointerEnd);
      event.preventDefault();
      event.stopPropagation();
      this.setInteractiveCursor(this.getInteractionCursor(mode, direction));
      this.resizeState = {
        mode,
        direction,
        startX: event.clientX,
        startY: event.clientY,
        startWidth: rect.width,
        startHeight: rect.height,
        startLeft: rect.left,
        startTop: rect.top
      };
      this.modalEl.addClass("is-resizing");
    };
    this.handlePointerMove = (event) => {
      if (!this.modalBoxEl || !this.resizeState || this.activePointerId === null || event.pointerId !== this.activePointerId) {
        return;
      }
      const minWidth = 360;
      const minHeight = 280;
      const maxWidth = Math.max(minWidth, window.innerWidth - 24);
      const maxHeight = Math.max(minHeight, window.innerHeight - 24);
      const deltaX = event.clientX - this.resizeState.startX;
      const deltaY = event.clientY - this.resizeState.startY;
      let width = this.resizeState.startWidth;
      let height = this.resizeState.startHeight;
      let left = this.resizeState.startLeft;
      let top = this.resizeState.startTop;
      if (this.resizeState.mode === "move") {
        left = this.clamp(
          this.resizeState.startLeft + deltaX,
          8,
          Math.max(8, window.innerWidth - width - 8)
        );
        top = this.clamp(
          this.resizeState.startTop + deltaY,
          8,
          Math.max(8, window.innerHeight - height - 8)
        );
      } else {
        if (this.resizeState.direction.includes("e")) {
          width = this.clamp(this.resizeState.startWidth + deltaX, minWidth, maxWidth);
        }
        if (this.resizeState.direction.includes("s")) {
          height = this.clamp(this.resizeState.startHeight + deltaY, minHeight, maxHeight);
        }
        if (this.resizeState.direction.includes("w")) {
          width = this.clamp(this.resizeState.startWidth - deltaX, minWidth, maxWidth);
          left = this.resizeState.startLeft + (this.resizeState.startWidth - width);
        }
        if (this.resizeState.direction.includes("n")) {
          height = this.clamp(this.resizeState.startHeight - deltaY, minHeight, maxHeight);
          top = this.resizeState.startTop + (this.resizeState.startHeight - height);
        }
        left = this.clamp(left, 8, Math.max(8, window.innerWidth - width - 8));
        top = this.clamp(top, 8, Math.max(8, window.innerHeight - height - 8));
      }
      this.modalBoxEl.style.width = `${width}px`;
      this.modalBoxEl.style.height = `${height}px`;
      this.modalBoxEl.style.left = `${left}px`;
      this.modalBoxEl.style.top = `${top}px`;
      this.setInteractiveCursor(
        this.getInteractionCursor(this.resizeState.mode, this.resizeState.direction)
      );
    };
    this.handlePointerEnd = (event) => {
      if (this.activePointerId === null || event.pointerId !== this.activePointerId) {
        return;
      }
      this.modalEl.removeClass("is-resizing");
      if (this.activePointerTarget) {
        try {
          this.activePointerTarget.releasePointerCapture(event.pointerId);
        } catch {
        }
        this.activePointerTarget.removeEventListener("pointermove", this.handlePointerMove);
        this.activePointerTarget.removeEventListener("pointerup", this.handlePointerEnd);
        this.activePointerTarget.removeEventListener("pointercancel", this.handlePointerEnd);
      }
      if (this.modalBoxEl && this.resizeState?.mode === "resize") {
        const width = this.modalBoxEl.getBoundingClientRect().width;
        const height = this.modalBoxEl.getBoundingClientRect().height;
        void this.plugin.savePreviewModalSize(width, height);
      }
      this.setInteractiveCursor("");
      this.activePointerId = null;
      this.activePointerTarget = null;
      this.resizeState = null;
    };
    this.currentIndex = startIndex;
  }
  onOpen() {
    this.modalEl.addClass("image-gallery-preview-modal");
    this.contentEl.empty();
    this.previewContentEl = this.contentEl.createDiv({ cls: "image-gallery-preview-content" });
    const navEl = this.previewContentEl.createDiv({ cls: "image-gallery-preview-nav" });
    const presetGroupEl = navEl.createDiv({ cls: "image-gallery-preview-presets" });
    this.createSizePresetButton(presetGroupEl, "\u5C0F", 640, 480);
    this.createSizePresetButton(presetGroupEl, "\u4E2D", 820, 620);
    this.createSizePresetButton(presetGroupEl, "\u5927", 1e3, 760);
    this.createSizePresetButton(presetGroupEl, "\u8D85\u5927", 1200, 860);
    this.prevButtonEl = navEl.createEl("button", {
      cls: "mod-cta",
      text: "\u4E0A\u4E00\u5F20"
    });
    this.prevButtonEl.addEventListener("click", () => {
      this.showPrevious();
    });
    this.nextButtonEl = navEl.createEl("button", {
      cls: "mod-cta",
      text: "\u4E0B\u4E00\u5F20"
    });
    this.nextButtonEl.addEventListener("click", () => {
      this.showNext();
    });
    this.imageStageEl = this.previewContentEl.createDiv({ cls: "image-gallery-preview-stage" });
    this.imageEl = this.imageStageEl.createEl("img", {
      cls: "image-gallery-preview-image",
      attr: {
        draggable: "false",
        referrerpolicy: "no-referrer"
      }
    });
    this.imageEl.addEventListener("dblclick", () => {
      this.toggleZoom();
    });
    this.keydownHandler = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        this.close();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        this.showPrevious();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        this.showNext();
      }
    };
    document.addEventListener("keydown", this.keydownHandler);
    this.setupResizableModal();
    this.renderCurrentItem();
  }
  onClose() {
    this.teardownResizableModal();
    if (this.keydownHandler) {
      document.removeEventListener("keydown", this.keydownHandler);
      this.keydownHandler = null;
    }
    this.contentEl.empty();
    this.previewContentEl = null;
  }
  renderCurrentItem() {
    const item = this.items[this.currentIndex];
    if (!item || !this.imageEl) {
      return;
    }
    this.titleEl.setText(item.name);
    this.imageEl.src = item.src;
    this.imageEl.alt = item.name;
    this.isZoomed = false;
    this.applyZoomState();
    if (this.prevButtonEl) {
      this.prevButtonEl.disabled = this.currentIndex === 0;
    }
    if (this.nextButtonEl) {
      this.nextButtonEl.disabled = this.currentIndex >= this.items.length - 1;
    }
  }
  showPrevious() {
    if (this.currentIndex <= 0) {
      return;
    }
    this.currentIndex -= 1;
    this.renderCurrentItem();
  }
  showNext() {
    if (this.currentIndex >= this.items.length - 1) {
      return;
    }
    this.currentIndex += 1;
    this.renderCurrentItem();
  }
  createSizePresetButton(containerEl, label, width, height) {
    const buttonEl = containerEl.createEl("button", { text: label });
    buttonEl.addClass("image-gallery-preset-button");
    buttonEl.addEventListener("click", () => {
      void this.applyPresetSize(width, height);
    });
  }
  async applyPresetSize(targetWidth, targetHeight) {
    this.modalBoxEl = this.resolveModalBoxEl();
    if (!this.modalBoxEl) {
      return;
    }
    const minWidth = 360;
    const minHeight = 280;
    const maxWidth = Math.max(minWidth, window.innerWidth - 24);
    const maxHeight = Math.max(minHeight, window.innerHeight - 24);
    const width = this.clamp(targetWidth, minWidth, maxWidth);
    const height = this.clamp(targetHeight, minHeight, maxHeight);
    const left = this.clamp((window.innerWidth - width) / 2, 8, Math.max(8, window.innerWidth - width - 8));
    const top = this.clamp((window.innerHeight - height) / 2, 8, Math.max(8, window.innerHeight - height - 8));
    this.modalBoxEl.style.width = `${width}px`;
    this.modalBoxEl.style.height = `${height}px`;
    this.modalBoxEl.style.left = `${left}px`;
    this.modalBoxEl.style.top = `${top}px`;
    await this.plugin.savePreviewModalSize(width, height);
  }
  toggleZoom() {
    if (!this.imageEl) {
      return;
    }
    this.isZoomed = !this.isZoomed;
    this.applyZoomState();
  }
  setupResizableModal() {
    const modalBoxEl = this.resolveModalBoxEl();
    if (!modalBoxEl) {
      return;
    }
    this.modalBoxEl = modalBoxEl;
    const rect = modalBoxEl.getBoundingClientRect();
    const minWidth = 360;
    const minHeight = 280;
    const maxWidth = Math.max(minWidth, window.innerWidth - 24);
    const maxHeight = Math.max(minHeight, window.innerHeight - 24);
    const savedSize = this.plugin.settings.previewModalSize;
    const width = this.clamp(savedSize?.width ?? rect.width, minWidth, maxWidth);
    const height = this.clamp(savedSize?.height ?? rect.height, minHeight, maxHeight);
    const left = this.clamp((window.innerWidth - width) / 2, 8, Math.max(8, window.innerWidth - width - 8));
    const top = this.clamp((window.innerHeight - height) / 2, 8, Math.max(8, window.innerHeight - height - 8));
    modalBoxEl.style.width = `${width}px`;
    modalBoxEl.style.height = `${height}px`;
    modalBoxEl.style.left = `${left}px`;
    modalBoxEl.style.top = `${top}px`;
    modalBoxEl.style.maxWidth = `${maxWidth}px`;
    modalBoxEl.style.maxHeight = `${maxHeight}px`;
    this.createInteractionHandles();
  }
  teardownResizableModal() {
    this.setInteractiveCursor("");
    if (this.modalBoxEl) {
      this.modalBoxEl.style.cursor = "";
      this.modalBoxEl = null;
    }
    for (const handleEl of this.resizeHandleEls) {
      handleEl.removeEventListener("pointerdown", this.handleHandlePointerStart);
      handleEl.remove();
    }
    this.resizeHandleEls = [];
    if (this.activePointerTarget && this.activePointerId !== null) {
      try {
        this.activePointerTarget.releasePointerCapture(this.activePointerId);
      } catch {
      }
      this.activePointerTarget.removeEventListener("pointermove", this.handlePointerMove);
      this.activePointerTarget.removeEventListener("pointerup", this.handlePointerEnd);
      this.activePointerTarget.removeEventListener("pointercancel", this.handlePointerEnd);
    }
    this.activePointerId = null;
    this.activePointerTarget = null;
    this.modalEl.removeClass("is-resizing");
    this.resizeState = null;
  }
  createInteractionHandles() {
    const resizeHostEl = this.modalBoxEl;
    if (!resizeHostEl) {
      return;
    }
    const configs = [
      { direction: "nw", mode: "resize" },
      { direction: "ne", mode: "resize" },
      { direction: "sw", mode: "resize" },
      { direction: "se", mode: "resize" },
      { direction: "n", mode: "move" },
      { direction: "e", mode: "move" },
      { direction: "s", mode: "move" },
      { direction: "w", mode: "move" }
    ];
    this.resizeHandleEls = configs.map(({ direction, mode }) => {
      const handleEl = resizeHostEl.createDiv({
        cls: `image-gallery-interaction-handle image-gallery-interaction-handle-${mode} image-gallery-interaction-handle-${direction}`
      });
      handleEl.dataset.direction = direction;
      handleEl.dataset.mode = mode;
      handleEl.addEventListener("pointerdown", this.handleHandlePointerStart);
      return handleEl;
    });
  }
  applyZoomState() {
    if (!this.imageEl) {
      return;
    }
    if (this.isZoomed) {
      const currentWidth = this.imageEl.getBoundingClientRect().width || this.imageEl.naturalWidth;
      this.imageEl.style.width = `${Math.max(320, currentWidth * 1.6)}px`;
      this.imageEl.style.maxWidth = "none";
      this.imageEl.style.maxHeight = "none";
      this.imageEl.addClass("is-zoomed");
      this.imageStageEl?.addClass("is-zoomed");
    } else {
      this.imageEl.style.width = "";
      this.imageEl.style.maxWidth = "";
      this.imageEl.style.maxHeight = "";
      this.imageEl.removeClass("is-zoomed");
      this.imageStageEl?.removeClass("is-zoomed");
    }
    this.setInteractiveCursor("");
  }
  setInteractiveCursor(cursor) {
    if (this.modalBoxEl) {
      this.modalBoxEl.style.cursor = cursor;
    }
    if (this.imageStageEl) {
      this.imageStageEl.style.cursor = cursor;
    }
    if (this.imageEl) {
      this.imageEl.style.cursor = cursor || (this.isZoomed ? "zoom-out" : "zoom-in");
    }
  }
  resolveModalBoxEl() {
    const closestModal = this.contentEl.closest(".modal");
    if (closestModal instanceof HTMLElement) {
      return closestModal;
    }
    const queriedModal = this.modalEl.querySelector(".modal");
    return queriedModal instanceof HTMLElement ? queriedModal : null;
  }
  getInteractionCursor(mode, direction) {
    if (mode === "move") {
      return "move";
    }
    return this.getResizeCursor(direction);
  }
  getResizeCursor(direction) {
    switch (direction) {
      case "n":
      case "s":
        return "ns-resize";
      case "e":
      case "w":
        return "ew-resize";
      case "ne":
      case "sw":
        return "nesw-resize";
      case "nw":
      case "se":
        return "nwse-resize";
      default:
        return "";
    }
  }
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
};
var CurrentNoteImageGallerySettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian.Setting(containerEl).setName("Gallery display").setHeading();
    new import_obsidian.Setting(containerEl).setName("Minimum image size").setDesc("Set the minimum size in KB. Only local vault images at or above this size are shown. External images are kept because their size cannot be read reliably.").addText((text) => {
      text.inputEl.type = "number";
      text.inputEl.min = "0";
      text.setPlaceholder("80").setValue(String(this.plugin.settings.minImageSizeKB)).onChange(async (value) => {
        const parsed = Number.parseInt(value.trim() || "0", 10);
        this.plugin.settings.minImageSizeKB = Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_SETTINGS.minImageSizeKB;
        text.setValue(String(this.plugin.settings.minImageSizeKB));
        await this.plugin.saveSettings();
      });
    }).addExtraButton((button) => {
      button.setIcon("reset").setTooltip("Reset to default 80 KB").onClick(async () => {
        this.plugin.settings.minImageSizeKB = DEFAULT_SETTINGS.minImageSizeKB;
        await this.plugin.saveSettings();
        this.display();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Thumbnail size").setDesc("Controls the height of each gallery thumbnail in pixels.").addSlider((slider) => {
      slider.setLimits(80, 360, 10).setDynamicTooltip().setValue(this.plugin.settings.thumbnailSize).onChange(async (value) => {
        this.plugin.settings.thumbnailSize = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Columns per row").setDesc("Sets how many columns are displayed in the gallery grid.").addSlider((slider) => {
      slider.setLimits(1, 8, 1).setDynamicTooltip().setValue(this.plugin.settings.columnCount).onChange(async (value) => {
        this.plugin.settings.columnCount = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Show file name").setDesc("Displays the image file name on each gallery card.").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.showFileName).onChange(async (value) => {
        this.plugin.settings.showFileName = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Image interaction").setHeading();
    new import_obsidian.Setting(containerEl).setName("Image click action").setDesc("Choose whether clicking an image opens it in Obsidian or shows a large preview modal.").addDropdown((dropdown) => {
      dropdown.addOption("preview", "Preview modal").addOption("open-in-obsidian", "Open in Obsidian").setValue(this.plugin.settings.imageClickAction).onChange(async (value) => {
        this.plugin.settings.imageClickAction = value === "open-in-obsidian" ? "open-in-obsidian" : "preview";
        await this.plugin.saveSettings();
      });
    });
  }
};
