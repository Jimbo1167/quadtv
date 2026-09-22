# QuadTV - Firefox Add-ons (AMO) Submission Checklist

## Pre-Submission Requirements

### 1. Account Setup
- [ ] Create Firefox Add-ons developer account at https://addons.mozilla.org
- [ ] Verify email address
- [ ] Set up developer profile

### 2. Extension Metadata

#### Required Files
- [x] manifest.json with valid metadata
- [x] Icons (16x16, 32x32, 48x48, 96x96)
- [ ] README.md with installation/usage instructions
- [ ] PRIVACY.md or privacy policy document
- [ ] LICENSE file (recommend MIT or similar open source license)

#### Descriptions
- [ ] Short description (< 132 characters) for listing summary
- [ ] Full description (detailed feature list, use cases)
- [ ] Version release notes (for each release)
- [ ] Support contact/URL (recommend GitHub issues)

### 3. Permissions Justification

Current permissions in manifest.json:
- [ ] `activeTab` - Explain: Required to inject QuadTV grid into current YouTube TV tab
- [ ] `tabs` - Explain: Required to query active tab and manage browser action state
- [ ] `storage` - Explain: Required to save user layout preferences and grid sizing
- [ ] `*://tv.youtube.com/*` - Explain: Required to run only on YouTube TV pages

### 4. Visual Assets

#### Screenshots (Required)
- [ ] Screenshot 1: QuadTV inactive (normal YouTube TV)
- [ ] Screenshot 2: QuadTV active with 2x2 layout
- [ ] Screenshot 3: Layout selection in popup
- [ ] Screenshot 4: Resizable dividers demonstration
- [ ] Screenshot 5: 1+2 or 2-vertical layout example

**Requirements:**
- Format: PNG or JPG
- Dimensions: At least 640x480, max 5MB each
- Minimum 1 screenshot, recommended 3-5

#### Promotional Graphics (Optional but Recommended)
- [ ] Promotional tile (440x280) - Main listing image
- [ ] Small promotional tile (220x140) - For featured sections

### 5. Documentation

- [ ] **Privacy Policy**: Document data collection practices
  - What: Grid ratios, layout preferences
  - Where: localStorage (local only, never transmitted)
  - Why: Persist user customizations across sessions

- [ ] **Support Documentation**:
  - How to activate/deactivate
  - How to change layouts
  - How to resize streams
  - How to reset grid sizing
  - Keyboard shortcuts (Esc, Ctrl/Cmd+Space, 1-4, arrows, Alt+M, ?)

- [ ] **Permissions Explanation**: Clear justification for each permission

- [ ] **Known Limitations**:
  - Works only on tv.youtube.com
  - Requires YouTube TV subscription
  - YouTube TV's own speaker icon may not reflect QuadTV's mute; ad breaks cause a brief blip

### 6. Code Quality & Review

- [ ] Remove all console.log statements (or make debug-only)
- [ ] Remove commented-out code
- [ ] Ensure no external analytics or tracking
- [ ] Verify no hardcoded credentials or API keys
- [ ] Test on clean Firefox installation
- [ ] Test all layouts (2x2, 1+2, 2-vertical)
- [ ] Test divider resizing on all layouts
- [ ] Test grid reset functionality
- [ ] Test keyboard shortcut (Ctrl+Shift+Q)
- [ ] Test browser action icon and popup

### 7. Source Code Preparation

Mozilla may request source code review:
- [ ] Ensure repository is clean and organized
- [ ] Add comprehensive README with:
  - Build instructions (if applicable)
  - Development setup
  - Architecture overview
  - Testing instructions
- [ ] Include CLAUDE.md for AI-assisted development context
- [ ] Prepare statement: "This extension was developed with assistance from Claude Code"

### 8. Versioning & Releases

- [ ] Decide on initial public version number (recommend 1.0.0)
- [ ] Create git tag for release version
- [ ] Write comprehensive release notes
- [ ] Document changelog from v0.x.x to v1.0.0

### 9. Build & Package

- [ ] Create build script to package extension
- [ ] Generate .zip file with only necessary files:
  ```
  src/
    background/
    content/
    popup/
    shared/
    icons/
    manifest.json
  ```
- [ ] Exclude from package:
  - node_modules/
  - tests/
  - docs/
  - .git/
  - development files
- [ ] Test packaged extension before submission

### 10. Legal & Compliance

- [ ] Choose open source license (MIT recommended)
- [ ] Verify no trademark violations
- [ ] Ensure YouTube TV usage complies with their ToS
- [ ] Add disclaimer: "Not affiliated with Google or YouTube"
- [ ] Review Mozilla's Add-on Policies: https://extensionworkshop.com/documentation/publish/add-on-policies/

## Submission Process

### Step 1: Create Listing
- [ ] Log into addons.mozilla.org
- [ ] Click "Submit a New Add-on"
- [ ] Choose distribution channel:
  - [ ] Listed (publicly searchable)
  - [ ] Unlisted (signed but not public)

### Step 2: Upload Package
- [ ] Upload .zip package
- [ ] Mozilla will automatically validate
- [ ] Fix any validation errors/warnings

### Step 3: Complete Listing Details
- [ ] Add-on name: "QuadTV"
- [ ] Slug/URL: quadtv
- [ ] Summary (short description)
- [ ] Description (full details with features)
- [ ] Categories: Video & Audio, Entertainment
- [ ] Tags: youtube, tv, streaming, multi-view, quad, split-screen
- [ ] Upload screenshots (in order)
- [ ] Upload promotional images
- [ ] Add support email/URL
- [ ] Add privacy policy

### Step 4: Review & Submit
- [ ] Preview listing
- [ ] Submit for review
- [ ] Wait for Mozilla review (typically 1-5 days)
- [ ] Respond to any reviewer questions/requests

## Post-Submission

### After Approval
- [ ] Update GitHub README with AMO link
- [ ] Announce release (if applicable)
- [ ] Monitor reviews and support requests
- [ ] Plan for future updates

### Ongoing Maintenance
- [ ] Set up update process for new versions
- [ ] Monitor compatibility with Firefox updates
- [ ] Plan Manifest v3 migration (future requirement)
- [ ] Respond to user feedback and bug reports

## Resources

- **Firefox Extension Workshop**: https://extensionworkshop.com/
- **Submission Guide**: https://extensionworkshop.com/documentation/publish/submitting-an-add-on/
- **Review Policies**: https://extensionworkshop.com/documentation/publish/add-on-policies/
- **Developer Hub**: https://addons.mozilla.org/developers/
- **Source Code Submission**: https://extensionworkshop.com/documentation/publish/source-code-submission/

## Notes

- **Current Version**: 0.3.7 (development)
- **Target Public Version**: 1.0.0
- **Estimated Time to Prepare**: 4-8 hours
- **Review Time**: 1-5 business days
- **License Decision**: Recommend MIT for open source project

---

## 1.0.0 Submission Steps (2026-09-22)

1. `git checkout v1.0.0 && ./build.sh` → `dist/quadtv-1.0.0.zip` (36 KB). Or use the zip already built from the tag.
2. Sign in at https://addons.mozilla.org/developers/ .
   - Existing listing: open the add-on → **Upload New Version**.
   - No listing yet: **Submit a New Add-on** → "On this site" (listed).
3. Upload the zip. The validator must show 0 errors. The manifest already declares `data_collection_permissions: none`, which AMO requires.
4. Answer "Do you need to submit source code?" **No** — the zip is unminified, unbundled source (`REVIEWER-NOTES.md` says how to reproduce it).
5. Version notes: paste **Version 1.0.0** from `AMO-LISTING.md`.
6. **Notes to reviewer**: paste `REVIEWER-NOTES.md`, and add a line up front that a YouTube TV subscription is needed to see streams, plus why one content script uses `all_frames`.
7. Listing (first submission only, otherwise just check it): name, summary (`Short Description`), description (`Full Description`), categories Video & Audio / Entertainment, tags, support URL and homepage (fill in the real GitHub URLs), license MIT, privacy policy (paste `PRIVACY.md`).
8. Screenshots: take fresh ones on master — 2x2 with the top bar showing, popup, 1+2, 2 Vertical, and one with a stream badge/red glow. At least 640×480, PNG.
9. Submit. Listed submissions are auto-approved after validation and then human-reviewed; the `all_frames` script will likely draw a question, which `REVIEWER-NOTES.md` answers.
10. After approval: update `README.md` "Coming Soon" with the AMO link, and add `browser_specific_settings.gecko.id` from the listing to the manifest for future uploads.
