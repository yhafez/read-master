# Read Master - Comprehensive Manual Testing Plan

**Version:** 1.0
**Date:** 2026-01-23
**Status:** Production Ready Testing
**Platforms:** Web, Desktop (macOS/Windows/Linux), Mobile (iOS/Android)

---

## Table of Contents

1. [Testing Overview](#testing-overview)
2. [Test Environment Setup](#test-environment-setup)
3. [Test Data Requirements](#test-data-requirements)
4. [Core Feature Testing](#core-feature-testing)
5. [Cross-Platform Testing](#cross-platform-testing)
6. [Integration Testing](#integration-testing)
7. [User Journey Testing](#user-journey-testing)
8. [Edge Case Testing](#edge-case-testing)
9. [Performance Testing](#performance-testing)
10. [Security Testing](#security-testing)
11. [Accessibility Testing](#accessibility-testing)
12. [Internationalization Testing](#internationalization-testing)
13. [Regression Testing Checklist](#regression-testing-checklist)

---

## Testing Overview

### Objective

Ensure Read Master functions correctly across all platforms, handles all user scenarios, and provides a seamless experience for all features including:

- Content import and library management
- AI-powered reading features
- Spaced repetition system (SRS)
- Social features and community
- Gamification and analytics
- Cross-platform synchronization
- Payment processing
- Accessibility compliance

### Testing Approach

- **Manual Exploratory Testing**: Human testers explore features
- **Scripted Testing**: Follow step-by-step test cases
- **Cross-Platform Verification**: Test on Web, Desktop, and Mobile
- **User Journey Testing**: Complete end-to-end workflows
- **Edge Case Testing**: Boundary conditions and error handling
- **Accessibility Testing**: WCAG 2.2 AAA compliance verification

### Success Criteria

- All test cases pass on all platforms
- No critical or high-priority bugs
- Cross-platform feature parity verified
- Performance meets benchmarks
- Accessibility standards met
- Security vulnerabilities addressed

---

## Test Environment Setup

### Prerequisites

#### Accounts Required

- [ ] Test user account (Free tier)
- [ ] Test user account (Pro tier)
- [ ] Test user account (Scholar tier)
- [ ] Admin account (for admin features)
- [ ] Multiple test accounts for social features (at least 5)
- [ ] Clerk authentication account
- [ ] Stripe test account
- [ ] Email account for testing email features

#### Test Devices

- [ ] **Web**: Chrome, Firefox, Safari, Edge (latest versions)
- [ ] **Desktop**:
  - macOS (latest)
  - Windows 10/11
  - Ubuntu Linux (latest LTS)
- [ ] **Mobile**:
  - iPhone (iOS 16+)
  - iPad (iOS 16+)
  - Android phone (Android 12+)
  - Android tablet (Android 12+)

#### Network Conditions

- [ ] High-speed WiFi
- [ ] Slow 3G (for mobile testing)
- [ ] Offline mode
- [ ] Intermittent connection (airplane mode toggling)

#### Browser Tools

- [ ] DevTools for network throttling
- [ ] Lighthouse for performance audits
- [ ] axe DevTools for accessibility testing
- [ ] Screen readers (NVDA, JAWS, VoiceOver)

---

## Test Data Requirements

### Sample Books

Prepare the following test files:

#### EPUBs

- [ ] Small EPUB (< 1 MB, ~50 pages) - "Alice in Wonderland"
- [ ] Medium EPUB (1-5 MB, 100-300 pages) - "Pride and Prejudice"
- [ ] Large EPUB (> 5 MB, 500+ pages) - "War and Peace"
- [ ] EPUB with images
- [ ] EPUB with complex formatting (tables, code blocks)
- [ ] EPUB in non-English language (Arabic, Japanese, Spanish)

#### PDFs

- [ ] Text-based PDF (searchable)
- [ ] Scanned PDF (image-based, no OCR)
- [ ] PDF with annotations
- [ ] Technical PDF (with diagrams, charts)
- [ ] Multi-column PDF (academic paper)
- [ ] Large PDF (> 50 MB, 500+ pages)

#### Other Formats

- [ ] DOCX file
- [ ] Plain text file (.txt)
- [ ] Large text file (> 10 MB)
- [ ] Markdown file
- [ ] HTML file

#### URL Sources

- [ ] Blog article (Medium, Substack)
- [ ] News article
- [ ] Wikipedia page
- [ ] Academic paper (arXiv)
- [ ] Long-form article (> 10,000 words)

#### Audio/Video Content

- [ ] Podcast RSS feed
- [ ] MP3 audio file
- [ ] Video file (MP4)
- [ ] YouTube video URL

#### Invalid/Edge Case Files

- [ ] Corrupted EPUB
- [ ] Empty PDF
- [ ] Extremely large file (> 100 MB)
- [ ] File with special characters in name
- [ ] Password-protected PDF
- [ ] File with Unicode characters

---

## Core Feature Testing

### 1. User Authentication & Onboarding

#### 1.1 Sign Up

**Platforms:** Web, Desktop, Mobile

| Step | Action                        | Expected Result                                 | Web | Desktop | Mobile |
| ---- | ----------------------------- | ----------------------------------------------- | --- | ------- | ------ |
| 1    | Navigate to signup page       | Signup form displayed                           | ☐   | ☐       | ☐      |
| 2    | Enter email and password      | Fields accept input                             | ☐   | ☐       | ☐      |
| 3    | Submit with invalid email     | Error: "Invalid email format"                   | ☐   | ☐       | ☐      |
| 4    | Submit with weak password     | Error: "Password must be at least 8 characters" | ☐   | ☐       | ☐      |
| 5    | Submit with valid credentials | Account created, redirect to onboarding         | ☐   | ☐       | ☐      |
| 6    | Complete onboarding tutorial  | Tutorial completed, redirect to library         | ☐   | ☐       | ☐      |
| 7    | Verify email sent             | Welcome email received                          | ☐   | ☐       | ☐      |

#### 1.2 Sign In

**Platforms:** Web, Desktop, Mobile

| Step | Action                      | Expected Result                       | Web | Desktop | Mobile |
| ---- | --------------------------- | ------------------------------------- | --- | ------- | ------ |
| 1    | Navigate to login page      | Login form displayed                  | ☐   | ☐       | ☐      |
| 2    | Enter incorrect credentials | Error: "Invalid credentials"          | ☐   | ☐       | ☐      |
| 3    | Enter correct credentials   | Login successful, redirect to library | ☐   | ☐       | ☐      |
| 4    | Use "Remember me"           | Session persists after browser close  | ☐   | ☐       | ☐      |
| 5    | Sign in with Google OAuth   | Google auth flow, account linked      | ☐   | ☐       | ☐      |
| 6    | Request password reset      | Reset email sent                      | ☐   | ☐       | ☐      |
| 7    | Complete password reset     | Password updated, can sign in         | ☐   | ☐       | ☐      |

#### 1.3 Session Management

| Step | Action                         | Expected Result                   | Web | Desktop | Mobile |
| ---- | ------------------------------ | --------------------------------- | --- | ------- | ------ |
| 1    | Sign in on multiple devices    | All sessions active               | ☐   | ☐       | ☐      |
| 2    | Sign out on one device         | Other sessions remain active      | ☐   | ☐       | ☐      |
| 3    | Sign out from all devices      | All sessions terminated           | ☐   | ☐       | ☐      |
| 4    | Leave session idle for 30 days | Session expires, require re-login | ☐   | ☐       | ☐      |

---

### 2. Content Import & Library Management

#### 2.1 File Upload

| Step | Action                      | Expected Result                     | Web | Desktop | Mobile |
| ---- | --------------------------- | ----------------------------------- | --- | ------- | ------ |
| 1    | Click "Add Book" button     | Upload dialog opens                 | ☐   | ☐       | ☐      |
| 2    | Select EPUB file (small)    | Upload progress shown               | ☐   | ☐       | ☐      |
| 3    | Wait for upload completion  | Book appears in library with cover  | ☐   | ☐       | ☐      |
| 4    | Upload same book again      | Error: "Book already exists"        | ☐   | ☐       | ☐      |
| 5    | Upload PDF file             | PDF processed and added             | ☐   | ☐       | ☐      |
| 6    | Upload DOCX file            | Document converted and added        | ☐   | ☐       | ☐      |
| 7    | Upload .txt file            | Text file added                     | ☐   | ☐       | ☐      |
| 8    | Upload large file (> 50 MB) | Error: "File too large (max 50 MB)" | ☐   | ☐       | ☐      |
| 9    | Upload corrupted file       | Error: "Invalid file format"        | ☐   | ☐       | ☐      |
| 10   | Upload multiple files (5)   | All files uploaded successfully     | ☐   | ☐       | ☐      |
| 11   | Cancel upload mid-process   | Upload cancelled, no partial book   | ☐   | ☐       | ☐      |

#### 2.2 URL Import

| Step | Action                       | Expected Result                  | Web | Desktop | Mobile |
| ---- | ---------------------------- | -------------------------------- | --- | ------- | ------ |
| 1    | Click "Import from URL"      | URL input dialog opens           | ☐   | ☐       | ☐      |
| 2    | Enter blog article URL       | Article extracted and added      | ☐   | ☐       | ☐      |
| 3    | Enter Wikipedia page URL     | Page content extracted           | ☐   | ☐       | ☐      |
| 4    | Enter invalid URL            | Error: "Invalid URL"             | ☐   | ☐       | ☐      |
| 5    | Enter URL to paywall content | Error or partial content warning | ☐   | ☐       | ☐      |
| 6    | Enter very long article URL  | Content extracted successfully   | ☐   | ☐       | ☐      |

#### 2.3 Google Books Integration

| Step | Action                          | Expected Result                | Web | Desktop | Mobile |
| ---- | ------------------------------- | ------------------------------ | --- | ------- | ------ |
| 1    | Click "Search Google Books"     | Search dialog opens            | ☐   | ☐       | ☐      |
| 2    | Search for "1984 George Orwell" | Results displayed with covers  | ☐   | ☐       | ☐      |
| 3    | Click on a result               | Book details shown             | ☐   | ☐       | ☐      |
| 4    | Click "Add to Library"          | Book added (if available)      | ☐   | ☐       | ☐      |
| 5    | Search for obscure book         | No results or limited results  | ☐   | ☐       | ☐      |
| 6    | Filter by public domain         | Only public domain books shown | ☐   | ☐       | ☐      |

#### 2.4 Open Library Integration

| Step | Action                           | Expected Result                 | Web | Desktop | Mobile |
| ---- | -------------------------------- | ------------------------------- | --- | ------- | ------ |
| 1    | Click "Search Open Library"      | Search dialog opens             | ☐   | ☐       | ☐      |
| 2    | Search for "Pride and Prejudice" | Results displayed               | ☐   | ☐       | ☐      |
| 3    | Select a book                    | Book details and editions shown | ☐   | ☐       | ☐      |
| 4    | Add to library                   | Book added successfully         | ☐   | ☐       | ☐      |

#### 2.5 Paste Text Directly

| Step | Action                                | Expected Result                | Web | Desktop | Mobile |
| ---- | ------------------------------------- | ------------------------------ | --- | ------- | ------ |
| 1    | Click "Paste Text"                    | Text input dialog opens        | ☐   | ☐       | ☐      |
| 2    | Paste short text (< 500 words)        | Text accepted                  | ☐   | ☐       | ☐      |
| 3    | Enter title and author                | Metadata saved                 | ☐   | ☐       | ☐      |
| 4    | Save as new book                      | Book created in library        | ☐   | ☐       | ☐      |
| 5    | Paste very long text (> 50,000 words) | Text accepted or warning shown | ☐   | ☐       | ☐      |
| 6    | Paste with special characters/emojis  | Characters preserved correctly | ☐   | ☐       | ☐      |

#### 2.6 Library Organization

##### Collections/Folders

| Step | Action                          | Expected Result                  | Web | Desktop | Mobile |
| ---- | ------------------------------- | -------------------------------- | --- | ------- | ------ |
| 1    | Create new collection "Fiction" | Collection created               | ☐   | ☐       | ☐      |
| 2    | Add books to collection         | Books appear in collection       | ☐   | ☐       | ☐      |
| 3    | Create nested collection        | Subcollection created            | ☐   | ☐       | ☐      |
| 4    | Rename collection               | Name updated                     | ☐   | ☐       | ☐      |
| 5    | Delete collection               | Collection deleted, books remain | ☐   | ☐       | ☐      |
| 6    | Move collection (drag & drop)   | Collection moved successfully    | ☐   | ☐       | ☐      |

##### Tags

| Step | Action                              | Expected Result             | Web | Desktop | Mobile |
| ---- | ----------------------------------- | --------------------------- | --- | ------- | ------ |
| 1    | Create tag "Sci-Fi" with blue color | Tag created                 | ☐   | ☐       | ☐      |
| 2    | Add tag to book                     | Tag appears on book card    | ☐   | ☐       | ☐      |
| 3    | Add multiple tags to book           | All tags displayed          | ☐   | ☐       | ☐      |
| 4    | Filter library by tag               | Only tagged books shown     | ☐   | ☐       | ☐      |
| 5    | Rename tag                          | Tag name updated everywhere | ☐   | ☐       | ☐      |
| 6    | Change tag color                    | Color updated on all books  | ☐   | ☐       | ☐      |
| 7    | Delete tag                          | Tag removed from all books  | ☐   | ☐       | ☐      |

##### Shelves

| Step | Action                       | Expected Result                   | Web | Desktop | Mobile |
| ---- | ---------------------------- | --------------------------------- | --- | ------- | ------ |
| 1    | Create shelf "Want to Read"  | Shelf created                     | ☐   | ☐       | ☐      |
| 2    | Add book to shelf            | Book appears on shelf             | ☐   | ☐       | ☐      |
| 3    | Add book to multiple shelves | Book appears on all shelves       | ☐   | ☐       | ☐      |
| 4    | Remove book from shelf       | Book removed from that shelf only | ☐   | ☐       | ☐      |
| 5    | Delete shelf                 | Shelf deleted, books remain       | ☐   | ☐       | ☐      |

##### Reading Lists

| Step | Action                            | Expected Result               | Web | Desktop | Mobile |
| ---- | --------------------------------- | ----------------------------- | --- | ------- | ------ |
| 1    | Create reading list "Summer 2026" | List created                  | ☐   | ☐       | ☐      |
| 2    | Add books in specific order       | Order preserved               | ☐   | ☐       | ☐      |
| 3    | Reorder books (drag & drop)       | Order changed                 | ☐   | ☐       | ☐      |
| 4    | Mark list as public               | List becomes shareable        | ☐   | ☐       | ☐      |
| 5    | Share list URL                    | Others can view list          | ☐   | ☐       | ☐      |
| 6    | Make list private                 | URL returns "private" message | ☐   | ☐       | ☐      |

#### 2.7 Search and Filtering

##### Search

| Step | Action                         | Expected Result                     | Web | Desktop | Mobile |
| ---- | ------------------------------ | ----------------------------------- | --- | ------- | ------ |
| 1    | Search by title "1984"         | Matching books shown                | ☐   | ☐       | ☐      |
| 2    | Search by author "Orwell"      | Books by Orwell shown               | ☐   | ☐       | ☐      |
| 3    | Search with typo "Orwel"       | Fuzzy match suggests "Orwell"       | ☐   | ☐       | ☐      |
| 4    | Search for non-existent book   | "No results" message                | ☐   | ☐       | ☐      |
| 5    | Full-text search within books  | Matching content highlighted        | ☐   | ☐       | ☐      |
| 6    | Search with special characters | Results handle characters correctly | ☐   | ☐       | ☐      |

##### Filters

| Step | Action                             | Expected Result                    | Web | Desktop | Mobile |
| ---- | ---------------------------------- | ---------------------------------- | --- | ------- | ------ |
| 1    | Filter by status "Reading"         | Only currently reading books shown | ☐   | ☐       | ☐      |
| 2    | Filter by genre "Fiction"          | Only fiction books shown           | ☐   | ☐       | ☐      |
| 3    | Filter by tag "Sci-Fi"             | Only tagged books shown            | ☐   | ☐       | ☐      |
| 4    | Filter by progress "50-75%"        | Books in that range shown          | ☐   | ☐       | ☐      |
| 5    | Filter by date added "Last 7 days" | Recent books shown                 | ☐   | ☐       | ☐      |
| 6    | Filter by file type "EPUB"         | Only EPUBs shown                   | ☐   | ☐       | ☐      |
| 7    | Combine multiple filters           | AND logic applied correctly        | ☐   | ☐       | ☐      |
| 8    | Clear all filters                  | All books shown                    | ☐   | ☐       | ☐      |
| 9    | Save filter as preset              | Filter saved for quick access      | ☐   | ☐       | ☐      |

##### Sorting

| Step | Action                           | Expected Result              | Web | Desktop | Mobile |
| ---- | -------------------------------- | ---------------------------- | --- | ------- | ------ |
| 1    | Sort by title A-Z                | Books alphabetically ordered | ☐   | ☐       | ☐      |
| 2    | Sort by title Z-A                | Reverse alphabetical order   | ☐   | ☐       | ☐      |
| 3    | Sort by author                   | Books grouped by author      | ☐   | ☐       | ☐      |
| 4    | Sort by date added (newest)      | Most recent first            | ☐   | ☐       | ☐      |
| 5    | Sort by progress (most complete) | Highest % first              | ☐   | ☐       | ☐      |
| 6    | Sort by last read                | Recently read first          | ☐   | ☐       | ☐      |

#### 2.8 Bulk Actions

| Step | Action                          | Expected Result                  | Web | Desktop | Mobile |
| ---- | ------------------------------- | -------------------------------- | --- | ------- | ------ |
| 1    | Select multiple books (5)       | Checkboxes selected              | ☐   | ☐       | ☐      |
| 2    | Bulk add to collection          | All added to collection          | ☐   | ☐       | ☐      |
| 3    | Bulk add tags                   | Tags added to all                | ☐   | ☐       | ☐      |
| 4    | Bulk change status to "Read"    | All statuses updated             | ☐   | ☐       | ☐      |
| 5    | Bulk delete (with confirmation) | Confirmation dialog, then delete | ☐   | ☐       | ☐      |
| 6    | Select all books (50+)          | All selected                     | ☐   | ☐       | ☐      |
| 7    | Deselect all                    | All checkboxes cleared           | ☐   | ☐       | ☐      |

---

### 3. Reading Interface

#### 3.1 EPUB Reader

| Step | Action                       | Expected Result                      | Web | Desktop | Mobile |
| ---- | ---------------------------- | ------------------------------------ | --- | ------- | ------ |
| 1    | Open EPUB book               | Book opens to last position or start | ☐   | ☐       | ☐      |
| 2    | Navigate to next page        | Next page displayed                  | ☐   | ☐       | ☐      |
| 3    | Navigate to previous page    | Previous page displayed              | ☐   | ☐       | ☐      |
| 4    | Use arrow keys (desktop)     | Page navigation works                | ☐   | ☐       | N/A    |
| 5    | Swipe left/right (mobile)    | Page navigation works                | N/A | N/A     | ☐      |
| 6    | Tap left/right side (mobile) | Page navigation works                | N/A | N/A     | ☐      |
| 7    | Use table of contents        | Jump to chapter works                | ☐   | ☐       | ☐      |
| 8    | Use progress slider          | Scrub through book works             | ☐   | ☐       | ☐      |
| 9    | View current progress %      | Accurate percentage shown            | ☐   | ☐       | ☐      |
| 10   | Images in EPUB               | Images load and display correctly    | ☐   | ☐       | ☐      |
| 11   | Hyperlinks in EPUB           | Links are clickable                  | ☐   | ☐       | ☐      |
| 12   | Close book                   | Position saved automatically         | ☐   | ☐       | ☐      |
| 13   | Reopen book                  | Opens to last position               | ☐   | ☐       | ☐      |

#### 3.2 PDF Reader

| Step | Action                 | Expected Result                   | Web | Desktop | Mobile |
| ---- | ---------------------- | --------------------------------- | --- | ------- | ------ |
| 1    | Open PDF book          | PDF renders correctly             | ☐   | ☐       | ☐      |
| 2    | Zoom in                | Text enlarges, remains readable   | ☐   | ☐       | ☐      |
| 3    | Zoom out               | Text shrinks, layout preserved    | ☐   | ☐       | ☐      |
| 4    | Pinch to zoom (mobile) | Zoom works smoothly               | N/A | N/A     | ☐      |
| 5    | Navigate pages         | Smooth page transitions           | ☐   | ☐       | ☐      |
| 6    | View thumbnails        | All pages shown in thumbnail view | ☐   | ☐       | ☐      |
| 7    | Jump to page number    | Navigates to correct page         | ☐   | ☐       | ☐      |
| 8    | Search in PDF          | Text found and highlighted        | ☐   | ☐       | ☐      |
| 9    | Scanned PDF            | Image-based PDF displayed         | ☐   | ☐       | ☐      |

#### 3.3 Text Customization

| Step | Action                           | Expected Result                 | Web | Desktop | Mobile |
| ---- | -------------------------------- | ------------------------------- | --- | ------- | ------ |
| 1    | Increase font size               | Text larger, reflows            | ☐   | ☐       | ☐      |
| 2    | Decrease font size               | Text smaller                    | ☐   | ☐       | ☐      |
| 3    | Change font family to serif      | Font changes                    | ☐   | ☐       | ☐      |
| 4    | Change font family to sans-serif | Font changes                    | ☐   | ☐       | ☐      |
| 5    | Enable OpenDyslexic font         | Dyslexia-friendly font applied  | ☐   | ☐       | ☐      |
| 6    | Adjust line spacing              | Spacing increases/decreases     | ☐   | ☐       | ☐      |
| 7    | Adjust letter spacing            | Character spacing changes       | ☐   | ☐       | ☐      |
| 8    | Change text alignment            | Text aligns left/center/justify | ☐   | ☐       | ☐      |

#### 3.4 Theme Customization

| Step | Action                     | Expected Result              | Web | Desktop | Mobile |
| ---- | -------------------------- | ---------------------------- | --- | ------- | ------ |
| 1    | Switch to dark theme       | Dark background, light text  | ☐   | ☐       | ☐      |
| 2    | Switch to sepia theme      | Sepia background applied     | ☐   | ☐       | ☐      |
| 3    | Switch to high contrast    | High contrast colors applied | ☐   | ☐       | ☐      |
| 4    | Switch back to light theme | Light theme restored         | ☐   | ☐       | ☐      |
| 5    | Adjust background color    | Custom color applied         | ☐   | ☐       | ☐      |
| 6    | Adjust text color          | Custom text color applied    | ☐   | ☐       | ☐      |
| 7    | Save custom theme          | Theme saved for future use   | ☐   | ☐       | ☐      |

#### 3.5 Annotations & Highlights

| Step | Action                        | Expected Result            | Web | Desktop | Mobile |
| ---- | ----------------------------- | -------------------------- | --- | ------- | ------ |
| 1    | Select text                   | Selection menu appears     | ☐   | ☐       | ☐      |
| 2    | Highlight in yellow           | Text highlighted yellow    | ☐   | ☐       | ☐      |
| 3    | Highlight in blue             | Text highlighted blue      | ☐   | ☐       | ☐      |
| 4    | Add note to highlight         | Note dialog opens          | ☐   | ☐       | ☐      |
| 5    | Save note                     | Note attached to highlight | ☐   | ☐       | ☐      |
| 6    | Click on highlight            | Note displayed             | ☐   | ☐       | ☐      |
| 7    | Edit note                     | Note updated               | ☐   | ☐       | ☐      |
| 8    | Delete highlight              | Highlight removed          | ☐   | ☐       | ☐      |
| 9    | View all highlights           | Highlights list shown      | ☐   | ☐       | ☐      |
| 10   | Filter highlights by color    | Filtered view shown        | ☐   | ☐       | ☐      |
| 11   | Export highlights to Markdown | MD file downloaded         | ☐   | ☐       | ☐      |
| 12   | Share highlight               | Share dialog opens         | ☐   | ☐       | ☐      |

#### 3.6 Bookmarks

| Step | Action                 | Expected Result             | Web | Desktop | Mobile |
| ---- | ---------------------- | --------------------------- | --- | ------- | ------ |
| 1    | Add bookmark           | Bookmark icon changes state | ☐   | ☐       | ☐      |
| 2    | Add bookmark with note | Note saved with bookmark    | ☐   | ☐       | ☐      |
| 3    | View bookmarks list    | All bookmarks shown         | ☐   | ☐       | ☐      |
| 4    | Click on bookmark      | Navigate to bookmarked page | ☐   | ☐       | ☐      |
| 5    | Delete bookmark        | Bookmark removed            | ☐   | ☐       | ☐      |

#### 3.7 Dictionary

| Step | Action                   | Expected Result                    | Web | Desktop | Mobile |
| ---- | ------------------------ | ---------------------------------- | --- | ------- | ------ |
| 1    | Select word              | Context menu appears               | ☐   | ☐       | ☐      |
| 2    | Click "Define"           | Dictionary definition shown        | ☐   | ☐       | ☐      |
| 3    | Look up complex word     | Definition and pronunciation shown | ☐   | ☐       | ☐      |
| 4    | Look up non-English word | Definition in target language      | ☐   | ☐       | ☐      |
| 5    | Save word to vocabulary  | Word added to personal list        | ☐   | ☐       | ☐      |
| 6    | View vocabulary list     | All saved words shown              | ☐   | ☐       | ☐      |

#### 3.8 Translation

| Step | Action                          | Expected Result                | Web | Desktop | Mobile |
| ---- | ------------------------------- | ------------------------------ | --- | ------- | ------ |
| 1    | Select text in Spanish          | Context menu shows "Translate" | ☐   | ☐       | ☐      |
| 2    | Click "Translate"               | Translation to English shown   | ☐   | ☐       | ☐      |
| 3    | Translate entire sentence       | Sentence translated            | ☐   | ☐       | ☐      |
| 4    | Translate to different language | Target language dropdown works | ☐   | ☐       | ☐      |
| 5    | Save translation                | Translation added to notes     | ☐   | ☐       | ☐      |

#### 3.9 Advanced Reading Features

##### Split-Screen Mode

| Step | Action                              | Expected Result               | Web | Desktop | Mobile |
| ---- | ----------------------------------- | ----------------------------- | --- | ------- | ------ |
| 1    | Enable split-screen                 | Screen splits into two panels | ☐   | ☐       | ☐      |
| 2    | Load different book in second panel | Both books visible            | ☐   | ☐       | ☐      |
| 3    | Navigate independently              | Each panel scrolls separately | ☐   | ☐       | ☐      |
| 4    | Adjust split ratio                  | Divider moves, panels resize  | ☐   | ☐       | ☐      |
| 5    | Close split-screen                  | Returns to single panel       | ☐   | ☐       | ☐      |

##### Parallel Text View

| Step | Action                        | Expected Result                    | Web | Desktop | Mobile |
| ---- | ----------------------------- | ---------------------------------- | --- | ------- | ------ |
| 1    | Enable parallel text          | Side-by-side view enabled          | ☐   | ☐       | ☐      |
| 2    | Load original and translation | Both versions shown                | ☐   | ☐       | ☐      |
| 3    | Scroll                        | Both texts scroll in sync          | ☐   | ☐       | ☐      |
| 4    | Click on sentence             | Corresponding sentence highlighted | ☐   | ☐       | ☐      |

#### 3.10 Reading Statistics

| Step | Action                        | Expected Result                 | Web | Desktop | Mobile |
| ---- | ----------------------------- | ------------------------------- | --- | ------- | ------ |
| 1    | View reading speed (WPM)      | WPM calculated and displayed    | ☐   | ☐       | ☐      |
| 2    | View estimated time remaining | Accurate estimate shown         | ☐   | ☐       | ☐      |
| 3    | View reading streak           | Current streak displayed        | ☐   | ☐       | ☐      |
| 4    | View session time             | Time reading this session shown | ☐   | ☐       | ☐      |
| 5    | View progress chart           | Visual progress graph displayed | ☐   | ☐       | ☐      |

---

### 4. AI-Powered Features

#### 4.1 Pre-Reading Guides

| Step | Action                             | Expected Result                          | Web | Desktop | Mobile |
| ---- | ---------------------------------- | ---------------------------------------- | --- | ------- | ------ |
| 1    | Open book for first time           | Option to generate guide shown           | ☐   | ☐       | ☐      |
| 2    | Click "Generate Pre-Reading Guide" | AI starts generating                     | ☐   | ☐       | ☐      |
| 3    | Wait for generation                | Progress indicator shown                 | ☐   | ☐       | ☐      |
| 4    | View generated guide               | Guide contains overview, themes, context | ☐   | ☐       | ☐      |
| 5    | Guide for fiction book             | Includes plot summary, characters        | ☐   | ☐       | ☐      |
| 6    | Guide for non-fiction book         | Includes main arguments, structure       | ☐   | ☐       | ☐      |
| 7    | Guide for academic paper           | Includes methodology, key findings       | ☐   | ☐       | ☐      |
| 8    | Save guide                         | Guide saved to book metadata             | ☐   | ☐       | ☐      |
| 9    | Regenerate guide                   | New guide generated                      | ☐   | ☐       | ☐      |
| 10   | Export guide to PDF                | PDF downloaded                           | ☐   | ☐       | ☐      |

#### 4.2 During-Reading AI Assistance

##### "Explain This" Feature

| Step | Action                      | Expected Result                     | Web | Desktop | Mobile |
| ---- | --------------------------- | ----------------------------------- | --- | ------- | ------ |
| 1    | Select confusing passage    | Context menu includes "Explain"     | ☐   | ☐       | ☐      |
| 2    | Click "Explain This"        | AI explanation panel opens          | ☐   | ☐       | ☐      |
| 3    | View explanation            | Clear, contextual explanation shown | ☐   | ☐       | ☐      |
| 4    | Ask follow-up question      | Chat interface allows questions     | ☐   | ☐       | ☐      |
| 5    | Request simpler explanation | AI simplifies explanation           | ☐   | ☐       | ☐      |
| 6    | Save explanation            | Explanation saved as note           | ☐   | ☐       | ☐      |

##### AI Chat

| Step | Action                            | Expected Result             | Web | Desktop | Mobile |
| ---- | --------------------------------- | --------------------------- | --- | ------- | ------ |
| 1    | Open AI chat sidebar              | Chat interface appears      | ☐   | ☐       | ☐      |
| 2    | Ask question about current page   | AI responds with context    | ☐   | ☐       | ☐      |
| 3    | Ask question about character      | AI provides character info  | ☐   | ☐       | ☐      |
| 4    | Ask "What happened in Chapter 2?" | AI summarizes chapter       | ☐   | ☐       | ☐      |
| 5    | Ask theoretical question          | AI engages in discussion    | ☐   | ☐       | ☐      |
| 6    | View chat history                 | All questions/answers shown | ☐   | ☐       | ☐      |
| 7    | Clear chat history                | Chat cleared                | ☐   | ☐       | ☐      |

#### 4.3 Voice Interaction

| Step | Action                                  | Expected Result                   | Web | Desktop | Mobile |
| ---- | --------------------------------------- | --------------------------------- | --- | ------- | ------ |
| 1    | Enable voice interaction                | Microphone permission requested   | ☐   | ☐       | ☐      |
| 2    | Click microphone button                 | "Listening..." indicator shown    | ☐   | ☐       | ☐      |
| 3    | Ask question verbally                   | Speech recognized and transcribed | ☐   | ☐       | ☐      |
| 4    | Receive AI response                     | AI responds with voice + text     | ☐   | ☐       | ☐      |
| 5    | Interrupt AI                            | Stops speaking immediately        | ☐   | ☐       | ☐      |
| 6    | Change voice settings (speed, language) | Settings applied                  | ☐   | ☐       | ☐      |
| 7    | Test in multiple languages              | Works in selected language        | ☐   | ☐       | ☐      |

#### 4.4 Post-Reading Assessments

| Step | Action                   | Expected Result                      | Web | Desktop | Mobile |
| ---- | ------------------------ | ------------------------------------ | --- | ------- | ------ |
| 1    | Complete reading (100%)  | Assessment option appears            | ☐   | ☐       | ☐      |
| 2    | Click "Take Assessment"  | AI generates questions               | ☐   | ☐       | ☐      |
| 3    | View question types      | Multiple choice, short answer, essay | ☐   | ☐       | ☐      |
| 4    | Answer multiple choice   | Immediate feedback shown             | ☐   | ☐       | ☐      |
| 5    | Answer short answer      | AI evaluates answer                  | ☐   | ☐       | ☐      |
| 6    | Submit essay response    | AI provides detailed feedback        | ☐   | ☐       | ☐      |
| 7    | View assessment score    | Score and breakdown shown            | ☐   | ☐       | ☐      |
| 8    | Review incorrect answers | Explanations provided                | ☐   | ☐       | ☐      |
| 9    | Retake assessment        | New questions generated              | ☐   | ☐       | ☐      |
| 10   | View assessment history  | All past assessments listed          | ☐   | ☐       | ☐      |

#### 4.5 Comprehension Checks

| Step | Action              | Expected Result                      | Web | Desktop | Mobile |
| ---- | ------------------- | ------------------------------------ | --- | ------- | ------ |
| 1    | Complete chapter    | Pop-up: "Quick comprehension check?" | ☐   | ☐       | ☐      |
| 2    | Accept check        | 3-5 questions shown                  | ☐   | ☐       | ☐      |
| 3    | Answer correctly    | Positive feedback                    | ☐   | ☐       | ☐      |
| 4    | Answer incorrectly  | Explanation + suggestion to re-read  | ☐   | ☐       | ☐      |
| 5    | Skip check          | Continue reading                     | ☐   | ☐       | ☐      |
| 6    | Disable auto-checks | No more pop-ups                      | ☐   | ☐       | ☐      |

#### 4.6 AI Model Selection

| Step | Action                | Expected Result                   | Web | Desktop | Mobile |
| ---- | --------------------- | --------------------------------- | --- | ------- | ------ |
| 1    | Open AI settings      | Model selection shown             | ☐   | ☐       | ☐      |
| 2    | View available models | Claude, GPT-4, Gemini listed      | ☐   | ☐       | ☐      |
| 3    | View cost per model   | Cost calculator shown             | ☐   | ☐       | ☐      |
| 4    | Switch to GPT-4       | Model changed, confirmation shown | ☐   | ☐       | ☐      |
| 5    | Test with new model   | AI responds using new model       | ☐   | ☐       | ☐      |
| 6    | Switch back to Claude | Model changed back                | ☐   | ☐       | ☐      |

#### 4.7 AI Flashcard Generation

| Step | Action                      | Expected Result                    | Web | Desktop | Mobile |
| ---- | --------------------------- | ---------------------------------- | --- | ------- | ------ |
| 1    | Select text                 | "Generate Flashcards" option shown | ☐   | ☐       | ☐      |
| 2    | Click "Generate Flashcards" | AI creates flashcards              | ☐   | ☐       | ☐      |
| 3    | Review generated cards      | Front/back, quality check          | ☐   | ☐       | ☐      |
| 4    | Edit card                   | Changes saved                      | ☐   | ☐       | ☐      |
| 5    | Delete poor quality card    | Card removed                       | ☐   | ☐       | ☐      |
| 6    | Add to SRS deck             | Cards added to review queue        | ☐   | ☐       | ☐      |
| 7    | Generate for entire chapter | Multiple cards created             | ☐   | ☐       | ☐      |

#### 4.8 AI Usage Tracking

| Step | Action                  | Expected Result                 | Web | Desktop | Mobile |
| ---- | ----------------------- | ------------------------------- | --- | ------- | ------ |
| 1    | View AI usage dashboard | Token count, cost shown         | ☐   | ☐       | ☐      |
| 2    | Check daily usage       | Current day stats displayed     | ☐   | ☐       | ☐      |
| 3    | Check monthly usage     | Month-to-date stats shown       | ☐   | ☐       | ☐      |
| 4    | View by feature         | Breakdown by feature type       | ☐   | ☐       | ☐      |
| 5    | Check quota (Free tier) | Usage vs. limit shown           | ☐   | ☐       | ☐      |
| 6    | Hit quota limit         | Warning message, upgrade prompt | ☐   | ☐       | ☐      |

---

### 5. Text-to-Speech (TTS)

#### 5.1 TTS Playback

| Step | Action                    | Expected Result                   | Web | Desktop | Mobile |
| ---- | ------------------------- | --------------------------------- | --- | ------- | ------ |
| 1    | Click TTS play button     | Audio starts playing              | ☐   | ☐       | ☐      |
| 2    | Text highlights as spoken | Current word/sentence highlighted | ☐   | ☐       | ☐      |
| 3    | Pause TTS                 | Audio pauses                      | ☐   | ☐       | ☐      |
| 4    | Resume TTS                | Audio resumes from pause point    | ☐   | ☐       | ☐      |
| 5    | Stop TTS                  | Audio stops, resets to start      | ☐   | ☐       | ☐      |
| 6    | Skip forward 10 seconds   | Audio jumps forward               | ☐   | ☐       | ☐      |
| 7    | Skip backward 10 seconds  | Audio jumps backward              | ☐   | ☐       | ☐      |

#### 5.2 TTS Settings

| Step | Action                     | Expected Result              | Web | Desktop | Mobile |
| ---- | -------------------------- | ---------------------------- | --- | ------- | ------ |
| 1    | Adjust speed to 1.5x       | Audio speeds up              | ☐   | ☐       | ☐      |
| 2    | Adjust speed to 0.5x       | Audio slows down             | ☐   | ☐       | ☐      |
| 3    | Change voice (male/female) | Voice changes                | ☐   | ☐       | ☐      |
| 4    | Change language            | Voice speaks in new language | ☐   | ☐       | ☐      |
| 5    | Adjust volume              | Volume changes               | ☐   | ☐       | ☐      |
| 6    | Enable auto-scroll         | Page follows audio           | ☐   | ☐       | ☐      |

#### 5.3 TTS Providers

| Step | Action                    | Expected Result               | Web | Desktop | Mobile |
| ---- | ------------------------- | ----------------------------- | --- | ------- | ------ |
| 1    | Switch to Google TTS      | Provider changed              | ☐   | ☐       | ☐      |
| 2    | Test playback             | Audio plays with Google voice | ☐   | ☐       | ☐      |
| 3    | Switch to Amazon Polly    | Provider changed              | ☐   | ☐       | ☐      |
| 4    | Test playback             | Audio plays with Polly voice  | ☐   | ☐       | ☐      |
| 5    | Switch to Microsoft Azure | Provider changed              | ☐   | ☐       | ☐      |
| 6    | Test playback             | Audio plays with Azure voice  | ☐   | ☐       | ☐      |

#### 5.4 TTS Downloads

| Step | Action                     | Expected Result             | Web | Desktop | Mobile |
| ---- | -------------------------- | --------------------------- | --- | ------- | ------ |
| 1    | Click "Download Audio"     | Audio generation starts     | ☐   | ☐       | ☐      |
| 2    | View progress              | Progress bar shown          | ☐   | ☐       | ☐      |
| 3    | Complete download          | MP3 file available          | ☐   | ☐       | ☐      |
| 4    | Download entire book       | Large file generated        | ☐   | ☐       | ☐      |
| 5    | Download single chapter    | Chapter-only file created   | ☐   | ☐       | ☐      |
| 6    | Check download quota (Pro) | Usage vs. limit shown       | ☐   | ☐       | ☐      |
| 7    | Exceed quota               | Error or upgrade prompt     | ☐   | ☐       | ☐      |
| 8    | Manage downloads           | List of all downloads shown | ☐   | ☐       | ☐      |
| 9    | Delete download            | File removed                | ☐   | ☐       | ☐      |

---

### 6. Spaced Repetition System (SRS)

#### 6.1 Flashcard Creation

| Step | Action                    | Expected Result                | Web | Desktop | Mobile |
| ---- | ------------------------- | ------------------------------ | --- | ------- | ------ |
| 1    | Click "Create Flashcard"  | Card creation form opens       | ☐   | ☐       | ☐      |
| 2    | Enter front text          | Text accepted                  | ☐   | ☐       | ☐      |
| 3    | Enter back text           | Text accepted                  | ☐   | ☐       | ☐      |
| 4    | Add image to card         | Image uploaded and shown       | ☐   | ☐       | ☐      |
| 5    | Add to deck               | Card added to deck             | ☐   | ☐       | ☐      |
| 6    | Create from highlight     | Card pre-filled with highlight | ☐   | ☐       | ☐      |
| 7    | Create from AI suggestion | Card created from AI text      | ☐   | ☐       | ☐      |

#### 6.2 Flashcard Review (SM-2 Algorithm)

| Step | Action                   | Expected Result                       | Web | Desktop | Mobile |
| ---- | ------------------------ | ------------------------------------- | --- | ------- | ------ |
| 1    | Click "Study Now"        | Review session starts                 | ☐   | ☐       | ☐      |
| 2    | View card front          | Front of card shown                   | ☐   | ☐       | ☐      |
| 3    | Click "Show Answer"      | Back of card revealed                 | ☐   | ☐       | ☐      |
| 4    | Rate as "Again" (forgot) | Card scheduled for soon               | ☐   | ☐       | ☐      |
| 5    | Rate as "Hard"           | Card interval increased slightly      | ☐   | ☐       | ☐      |
| 6    | Rate as "Good"           | Card interval increased normally      | ☐   | ☐       | ☐      |
| 7    | Rate as "Easy"           | Card interval increased significantly | ☐   | ☐       | ☐      |
| 8    | Complete review session  | Summary stats shown                   | ☐   | ☐       | ☐      |
| 9    | View next review time    | Accurate schedule shown               | ☐   | ☐       | ☐      |

#### 6.3 Deck Management

| Step | Action                          | Expected Result               | Web | Desktop | Mobile |
| ---- | ------------------------------- | ----------------------------- | --- | ------- | ------ |
| 1    | Create new deck "Spanish Vocab" | Deck created                  | ☐   | ☐       | ☐      |
| 2    | Add cards to deck               | Cards associated with deck    | ☐   | ☐       | ☐      |
| 3    | Rename deck                     | Name updated                  | ☐   | ☐       | ☐      |
| 4    | Move cards between decks        | Cards moved successfully      | ☐   | ☐       | ☐      |
| 5    | Delete deck                     | Deck deleted, cards preserved | ☐   | ☐       | ☐      |
| 6    | Create nested subdeck           | Hierarchy works               | ☐   | ☐       | ☐      |

#### 6.4 SRS Statistics

| Step | Action                 | Expected Result            | Web | Desktop | Mobile |
| ---- | ---------------------- | -------------------------- | --- | ------- | ------ |
| 1    | View SRS dashboard     | Stats overview shown       | ☐   | ☐       | ☐      |
| 2    | Check cards due today  | Accurate count displayed   | ☐   | ☐       | ☐      |
| 3    | View learning progress | Progress chart shown       | ☐   | ☐       | ☐      |
| 4    | Check review streak    | Current streak displayed   | ☐   | ☐       | ☐      |
| 5    | View retention rate    | Percentage shown           | ☐   | ☐       | ☐      |
| 6    | View forecast          | Future due cards predicted | ☐   | ☐       | ☐      |

#### 6.5 Import/Export

| Step | Action                | Expected Result             | Web | Desktop | Mobile |
| ---- | --------------------- | --------------------------- | --- | ------- | ------ |
| 1    | Export to Anki format | .apkg file downloaded       | ☐   | ☐       | ☐      |
| 2    | Import Anki deck      | Cards imported successfully | ☐   | ☐       | ☐      |
| 3    | Export to Quizlet     | CSV file downloaded         | ☐   | ☐       | ☐      |
| 4    | Import Quizlet deck   | Cards imported successfully | ☐   | ☐       | ☐      |
| 5    | Export to CSV         | CSV file downloaded         | ☐   | ☐       | ☐      |
| 6    | Import from CSV       | Cards imported successfully | ☐   | ☐       | ☐      |

---

### 7. Social Features

#### 7.1 User Profile

| Step | Action                   | Expected Result               | Web | Desktop | Mobile |
| ---- | ------------------------ | ----------------------------- | --- | ------- | ------ |
| 1    | View own profile         | Profile page shown            | ☐   | ☐       | ☐      |
| 2    | Edit display name        | Name updated                  | ☐   | ☐       | ☐      |
| 3    | Upload avatar            | Image uploaded and shown      | ☐   | ☐       | ☐      |
| 4    | Edit bio                 | Bio text updated              | ☐   | ☐       | ☐      |
| 5    | Set reading interests    | Interests saved               | ☐   | ☐       | ☐      |
| 6    | View reading stats       | Books read, pages, time shown | ☐   | ☐       | ☐      |
| 7    | View achievements        | Earned badges displayed       | ☐   | ☐       | ☐      |
| 8    | View public reading list | Shared books shown            | ☐   | ☐       | ☐      |
| 9    | Set profile to private   | Profile becomes private       | ☐   | ☐       | ☐      |

#### 7.2 Following

| Step | Action                      | Expected Result              | Web | Desktop | Mobile |
| ---- | --------------------------- | ---------------------------- | --- | ------- | ------ |
| 1    | Search for user             | User search results shown    | ☐   | ☐       | ☐      |
| 2    | Click on user profile       | Profile page opens           | ☐   | ☐       | ☐      |
| 3    | Click "Follow"              | User added to following list | ☐   | ☐       | ☐      |
| 4    | View following list         | All followed users shown     | ☐   | ☐       | ☐      |
| 5    | View followers list         | All followers shown          | ☐   | ☐       | ☐      |
| 6    | Unfollow user               | User removed from following  | ☐   | ☐       | ☐      |
| 7    | Receive follow notification | Notification appears         | ☐   | ☐       | ☐      |

#### 7.3 Activity Feed

| Step | Action                        | Expected Result         | Web | Desktop | Mobile |
| ---- | ----------------------------- | ----------------------- | --- | ------- | ------ |
| 1    | View activity feed            | Recent activities shown | ☐   | ☐       | ☐      |
| 2    | See friend completed book     | Activity shown in feed  | ☐   | ☐       | ☐      |
| 3    | See friend earned achievement | Activity shown in feed  | ☐   | ☐       | ☐      |
| 4    | See friend shared highlight   | Highlight shown in feed | ☐   | ☐       | ☐      |
| 5    | Like activity                 | Like count increases    | ☐   | ☐       | ☐      |
| 6    | Comment on activity           | Comment added           | ☐   | ☐       | ☐      |
| 7    | Filter feed by activity type  | Filtered view shown     | ☐   | ☐       | ☐      |
| 8    | Refresh feed                  | New activities loaded   | ☐   | ☐       | ☐      |

#### 7.4 Sharing

| Step | Action                      | Expected Result                  | Web | Desktop | Mobile |
| ---- | --------------------------- | -------------------------------- | --- | ------- | ------ |
| 1    | Share highlight             | Share dialog opens               | ☐   | ☐       | ☐      |
| 2    | Share to feed               | Highlight appears in feed        | ☐   | ☐       | ☐      |
| 3    | Share via link              | Shareable URL generated          | ☐   | ☐       | ☐      |
| 4    | Share to Twitter            | Twitter share dialog opens       | ☐   | ☐       | ☐      |
| 5    | Share to Facebook           | Facebook share dialog opens      | ☐   | ☐       | ☐      |
| 6    | Share reading list          | List becomes publicly accessible | ☐   | ☐       | ☐      |
| 7    | Make shared content private | Content becomes private          | ☐   | ☐       | ☐      |

#### 7.5 Book Clubs

##### Create Book Club

| Step | Action                   | Expected Result           | Web | Desktop | Mobile |
| ---- | ------------------------ | ------------------------- | --- | ------- | ------ |
| 1    | Click "Create Book Club" | Creation form opens       | ☐   | ☐       | ☐      |
| 2    | Enter club name          | Name accepted             | ☐   | ☐       | ☐      |
| 3    | Enter description        | Description saved         | ☐   | ☐       | ☐      |
| 4    | Set to public            | Club visible to all       | ☐   | ☐       | ☐      |
| 5    | Set to private           | Club invite-only          | ☐   | ☐       | ☐      |
| 6    | Add cover image          | Image uploaded            | ☐   | ☐       | ☐      |
| 7    | Create club              | Club created successfully | ☐   | ☐       | ☐      |

##### Join Book Club

| Step | Action            | Expected Result         | Web | Desktop | Mobile |
| ---- | ----------------- | ----------------------- | --- | ------- | ------ |
| 1    | Browse book clubs | List of clubs shown     | ☐   | ☐       | ☐      |
| 2    | Search for club   | Search results shown    | ☐   | ☐       | ☐      |
| 3    | Click on club     | Club details page opens | ☐   | ☐       | ☐      |
| 4    | Click "Join"      | Member added to club    | ☐   | ☐       | ☐      |
| 5    | View club members | All members listed      | ☐   | ☐       | ☐      |
| 6    | Leave club        | Membership removed      | ☐   | ☐       | ☐      |

##### Club Reading Management

| Step | Action                     | Expected Result            | Web | Desktop | Mobile |
| ---- | -------------------------- | -------------------------- | --- | ------- | ------ |
| 1    | Admin: Add book to club    | Book added to reading list | ☐   | ☐       | ☐      |
| 2    | Set reading schedule       | Start/end dates set        | ☐   | ☐       | ☐      |
| 3    | Set current page goal      | Goal displayed to members  | ☐   | ☐       | ☐      |
| 4    | View club reading progress | Member progress shown      | ☐   | ☐       | ☐      |
| 5    | Schedule discussion        | Discussion event created   | ☐   | ☐       | ☐      |

##### Club Discussions

| Step | Action                      | Expected Result           | Web | Desktop | Mobile |
| ---- | --------------------------- | ------------------------- | --- | ------- | ------ |
| 1    | View scheduled discussions  | Calendar view shown       | ☐   | ☐       | ☐      |
| 2    | Join discussion thread      | Thread page opens         | ☐   | ☐       | ☐      |
| 3    | Post message                | Message appears in thread | ☐   | ☐       | ☐      |
| 4    | Reply to message            | Nested reply shown        | ☐   | ☐       | ☐      |
| 5    | Like message                | Like count increases      | ☐   | ☐       | ☐      |
| 6    | Receive discussion reminder | Email reminder sent       | ☐   | ☐       | ☐      |

#### 7.6 Live Reading Sessions

| Step | Action               | Expected Result                | Web | Desktop | Mobile |
| ---- | -------------------- | ------------------------------ | --- | ------- | ------ |
| 1    | Start live session   | Session created                | ☐   | ☐       | ☐      |
| 2    | Share session invite | Invite link generated          | ☐   | ☐       | ☐      |
| 3    | Join active session  | Connected to session           | ☐   | ☐       | ☐      |
| 4    | View participants    | All participants listed        | ☐   | ☐       | ☐      |
| 5    | Host: Turn page      | All participants see page turn | ☐   | ☐       | ☐      |
| 6    | Send chat message    | Message visible to all         | ☐   | ☐       | ☐      |
| 7    | Add highlight        | Highlight visible to all       | ☐   | ☐       | ☐      |
| 8    | Leave session        | Disconnected, others continue  | ☐   | ☐       | ☐      |
| 9    | Host: End session    | Session ends for all           | ☐   | ☐       | ☐      |

#### 7.7 AI Recommendations

| Step | Action                           | Expected Result               | Web | Desktop | Mobile |
| ---- | -------------------------------- | ----------------------------- | --- | ------- | ------ |
| 1    | View "Readers Like You"          | Similar users shown           | ☐   | ☐       | ☐      |
| 2    | View recommendation explanation  | AI explains why recommended   | ☐   | ☐       | ☐      |
| 3    | Follow recommended user          | User added to following       | ☐   | ☐       | ☐      |
| 4    | View "Books Trending in Network" | Book recommendations shown    | ☐   | ☐       | ☐      |
| 5    | View book recommendation reason  | AI explains recommendation    | ☐   | ☐       | ☐      |
| 6    | Add recommended book             | Book added to library         | ☐   | ☐       | ☐      |
| 7    | Refresh recommendations          | New recommendations generated | ☐   | ☐       | ☐      |

---

### 8. Gamification & Analytics

#### 8.1 Achievements

| Step | Action                           | Expected Result                    | Web | Desktop | Mobile |
| ---- | -------------------------------- | ---------------------------------- | --- | ------- | ------ |
| 1    | View achievements page           | All achievements shown             | ☐   | ☐       | ☐      |
| 2    | Complete first book              | "First Book" achievement unlocked  | ☐   | ☐       | ☐      |
| 3    | Read 7 days straight             | "Week Streak" achievement unlocked | ☐   | ☐       | ☐      |
| 4    | Complete 10 books                | "Bookworm" achievement unlocked    | ☐   | ☐       | ☐      |
| 5    | Review 100 flashcards            | "Flashcard Master" unlocked        | ☐   | ☐       | ☐      |
| 6    | Receive achievement notification | Popup notification shown           | ☐   | ☐       | ☐      |
| 7    | View achievement rarity          | Rarity level displayed             | ☐   | ☐       | ☐      |
| 8    | Share achievement                | Shareable link generated           | ☐   | ☐       | ☐      |

#### 8.2 Challenges

| Step | Action                          | Expected Result              | Web | Desktop | Mobile |
| ---- | ------------------------------- | ---------------------------- | --- | ------- | ------ |
| 1    | View active challenges          | List of challenges shown     | ☐   | ☐       | ☐      |
| 2    | Join "30-Day Reading Challenge" | Enrolled in challenge        | ☐   | ☐       | ☐      |
| 3    | View challenge progress         | Progress bar and stats shown | ☐   | ☐       | ☐      |
| 4    | Complete daily goal             | Progress updated             | ☐   | ☐       | ☐      |
| 5    | Complete challenge              | Completion badge awarded     | ☐   | ☐       | ☐      |
| 6    | Create custom challenge         | Challenge created            | ☐   | ☐       | ☐      |
| 7    | Invite friends to challenge     | Invites sent                 | ☐   | ☐       | ☐      |

#### 8.3 Leaderboards

| Step | Action                         | Expected Result              | Web | Desktop | Mobile |
| ---- | ------------------------------ | ---------------------------- | --- | ------- | ------ |
| 1    | View global leaderboard        | Top 100 users shown          | ☐   | ☐       | ☐      |
| 2    | View friends leaderboard       | Only friends shown           | ☐   | ☐       | ☐      |
| 3    | View book club leaderboard     | Club members shown           | ☐   | ☐       | ☐      |
| 4    | Filter by time period (weekly) | This week's rankings shown   | ☐   | ☐       | ☐      |
| 5    | Filter by metric (pages read)  | Rankings by pages shown      | ☐   | ☐       | ☐      |
| 6    | View own rank                  | Highlighted in leaderboard   | ☐   | ☐       | ☐      |
| 7    | Opt out of leaderboards        | Removed from public rankings | ☐   | ☐       | ☐      |

#### 8.4 Reading Analytics Dashboard

| Step | Action                   | Expected Result            | Web | Desktop | Mobile |
| ---- | ------------------------ | -------------------------- | --- | ------- | ------ |
| 1    | View analytics dashboard | Overview stats displayed   | ☐   | ☐       | ☐      |
| 2    | Check books completed    | Accurate count shown       | ☐   | ☐       | ☐      |
| 3    | Check pages read         | Total pages displayed      | ☐   | ☐       | ☐      |
| 4    | Check time spent reading | Hours/minutes shown        | ☐   | ☐       | ☐      |
| 5    | View reading speed trend | WPM chart displayed        | ☐   | ☐       | ☐      |
| 6    | View reading by genre    | Pie chart shown            | ☐   | ☐       | ☐      |
| 7    | View reading calendar    | Heatmap of reading days    | ☐   | ☐       | ☐      |
| 8    | View reading streak      | Current and longest streak | ☐   | ☐       | ☐      |
| 9    | Export analytics to CSV  | CSV file downloaded        | ☐   | ☐       | ☐      |

---

### 9. Curriculum System

#### 9.1 Browse Curricula

| Step | Action                     | Expected Result             | Web | Desktop | Mobile |
| ---- | -------------------------- | --------------------------- | --- | ------- | ------ |
| 1    | Navigate to curricula page | List of curricula shown     | ☐   | ☐       | ☐      |
| 2    | Filter by subject          | Filtered results shown      | ☐   | ☐       | ☐      |
| 3    | Filter by level            | Appropriate curricula shown | ☐   | ☐       | ☐      |
| 4    | Search by keyword          | Search results displayed    | ☐   | ☐       | ☐      |
| 5    | View curriculum details    | Full details page opens     | ☐   | ☐       | ☐      |

#### 9.2 Create Curriculum

| Step | Action                      | Expected Result           | Web | Desktop | Mobile |
| ---- | --------------------------- | ------------------------- | --- | ------- | ------ |
| 1    | Click "Create Curriculum"   | Creation form opens       | ☐   | ☐       | ☐      |
| 2    | Enter title and description | Details accepted          | ☐   | ☐       | ☐      |
| 3    | Add books to curriculum     | Books added in order      | ☐   | ☐       | ☐      |
| 4    | Reorder books               | Drag & drop works         | ☐   | ☐       | ☐      |
| 5    | Set reading goals per book  | Goals saved               | ☐   | ☐       | ☐      |
| 6    | Add assessments             | Assessments linked        | ☐   | ☐       | ☐      |
| 7    | Publish curriculum          | Curriculum becomes public | ☐   | ☐       | ☐      |

#### 9.3 Follow Curriculum

| Step | Action                     | Expected Result                | Web | Desktop | Mobile |
| ---- | -------------------------- | ------------------------------ | --- | ------- | ------ |
| 1    | Click "Start Curriculum"   | Enrolled in curriculum         | ☐   | ☐       | ☐      |
| 2    | View curriculum progress   | Progress overview shown        | ☐   | ☐       | ☐      |
| 3    | Complete first book        | Progress updated               | ☐   | ☐       | ☐      |
| 4    | Take curriculum assessment | Assessment opens               | ☐   | ☐       | ☐      |
| 5    | View grades                | All assessment scores shown    | ☐   | ☐       | ☐      |
| 6    | Complete curriculum        | Completion certificate awarded | ☐   | ☐       | ☐      |

---

### 10. Community Forum

#### 10.1 Browse Forum

| Step | Action               | Expected Result             | Web | Desktop | Mobile |
| ---- | -------------------- | --------------------------- | --- | ------- | ------ |
| 1    | Navigate to forum    | Forum homepage shown        | ☐   | ☐       | ☐      |
| 2    | View categories      | All categories listed       | ☐   | ☐       | ☐      |
| 3    | Click on category    | Threads in category shown   | ☐   | ☐       | ☐      |
| 4    | View trending topics | Popular threads highlighted | ☐   | ☐       | ☐      |
| 5    | Search forum         | Search results displayed    | ☐   | ☐       | ☐      |

#### 10.2 Create Thread

| Step | Action                         | Expected Result            | Web | Desktop | Mobile |
| ---- | ------------------------------ | -------------------------- | --- | ------- | ------ |
| 1    | Click "New Thread"             | Thread creation form opens | ☐   | ☐       | ☐      |
| 2    | Enter title                    | Title accepted             | ☐   | ☐       | ☐      |
| 3    | Write post with Markdown       | Markdown formatting works  | ☐   | ☐       | ☐      |
| 4    | Upload image                   | Image embedded in post     | ☐   | ☐       | ☐      |
| 5    | Attach file (PDF/EPUB excerpt) | File attached              | ☐   | ☐       | ☐      |
| 6    | Preview post                   | Preview renders correctly  | ☐   | ☐       | ☐      |
| 7    | Publish thread                 | Thread appears in category | ☐   | ☐       | ☐      |

#### 10.3 Participate in Thread

| Step | Action                    | Expected Result          | Web | Desktop | Mobile |
| ---- | ------------------------- | ------------------------ | --- | ------- | ------ |
| 1    | Open thread               | Thread and replies shown | ☐   | ☐       | ☐      |
| 2    | Write reply               | Reply box opens          | ☐   | ☐       | ☐      |
| 3    | Submit reply              | Reply appears in thread  | ☐   | ☐       | ☐      |
| 4    | Edit own reply            | Reply updated            | ☐   | ☐       | ☐      |
| 5    | View edit history         | Previous versions shown  | ☐   | ☐       | ☐      |
| 6    | Delete own reply          | Reply removed            | ☐   | ☐       | ☐      |
| 7    | Upvote post               | Vote count increases     | ☐   | ☐       | ☐      |
| 8    | Downvote post             | Vote count decreases     | ☐   | ☐       | ☐      |
| 9    | Mark best answer          | Post marked as solution  | ☐   | ☐       | ☐      |
| 10   | Report inappropriate post | Report submitted         | ☐   | ☐       | ☐      |

#### 10.4 Moderation

| Step | Action                 | Expected Result        | Web | Desktop | Mobile |
| ---- | ---------------------- | ---------------------- | --- | ------- | ------ |
| 1    | Moderator: Pin thread  | Thread pinned to top   | ☐   | ☐       | ☐      |
| 2    | Moderator: Lock thread | No new replies allowed | ☐   | ☐       | ☐      |
| 3    | Moderator: Delete post | Post removed           | ☐   | ☐       | ☐      |
| 4    | Moderator: Ban user    | User cannot post       | ☐   | ☐       | ☐      |
| 5    | View reported posts    | Reports queue shown    | ☐   | ☐       | ☐      |

---

### 11. Podcast & Video Content

#### 11.1 Podcast Integration

| Step | Action                         | Expected Result          | Web | Desktop | Mobile |
| ---- | ------------------------------ | ------------------------ | --- | ------- | ------ |
| 1    | Import podcast RSS feed        | Podcast added to library | ☐   | ☐       | ☐      |
| 2    | View podcast episodes          | Episode list shown       | ☐   | ☐       | ☐      |
| 3    | Play episode                   | Audio player starts      | ☐   | ☐       | ☐      |
| 4    | Adjust playback speed          | Speed changes            | ☐   | ☐       | ☐      |
| 5    | View show notes                | Notes displayed          | ☐   | ☐       | ☐      |
| 6    | View transcript (if available) | Transcript shown         | ☐   | ☐       | ☐      |
| 7    | Mark as played                 | Episode marked           | ☐   | ☐       | ☐      |

#### 11.2 Video Content

| Step | Action                | Expected Result                  | Web | Desktop | Mobile |
| ---- | --------------------- | -------------------------------- | --- | ------- | ------ |
| 1    | Import video URL      | Video added to library           | ☐   | ☐       | ☐      |
| 2    | Upload video file     | Video processed and added        | ☐   | ☐       | ☐      |
| 3    | Play video            | Video player starts              | ☐   | ☐       | ☐      |
| 4    | Adjust playback speed | Speed changes                    | ☐   | ☐       | ☐      |
| 5    | Enable captions       | Captions displayed               | ☐   | ☐       | ☐      |
| 6    | View transcript       | Transcript shown alongside video | ☐   | ☐       | ☐      |
| 7    | Add video annotations | Annotations saved with timestamp | ☐   | ☐       | ☐      |

---

### 12. Settings & Preferences

#### 12.1 Reading Preferences

| Step | Action                             | Expected Result | Web | Desktop | Mobile |
| ---- | ---------------------------------- | --------------- | --- | ------- | ------ |
| 1    | Set default font                   | Font saved      | ☐   | ☐       | ☐      |
| 2    | Set default theme                  | Theme saved     | ☐   | ☐       | ☐      |
| 3    | Set default font size              | Size saved      | ☐   | ☐       | ☐      |
| 4    | Enable/disable page turn animation | Setting saved   | ☐   | ☐       | ☐      |
| 5    | Set reading goal (pages/day)       | Goal saved      | ☐   | ☐       | ☐      |
| 6    | Enable/disable auto-save position  | Setting saved   | ☐   | ☐       | ☐      |

#### 12.2 AI Preferences

| Step | Action                          | Expected Result           | Web | Desktop | Mobile |
| ---- | ------------------------------- | ------------------------- | --- | ------- | ------ |
| 1    | Disable AI globally             | All AI features disabled  | ☐   | ☐       | ☐      |
| 2    | Enable AI for specific features | Selected features enabled | ☐   | ☐       | ☐      |
| 3    | Disable AI for specific book    | AI disabled for that book | ☐   | ☐       | ☐      |
| 4    | Set AI personality (tone)       | Tone preference saved     | ☐   | ☐       | ☐      |
| 5    | Set default AI model            | Model preference saved    | ☐   | ☐       | ☐      |

#### 12.3 SRS Preferences

| Step | Action                          | Expected Result              | Web | Desktop | Mobile |
| ---- | ------------------------------- | ---------------------------- | --- | ------- | ------ |
| 1    | Set daily review goal           | Goal saved                   | ☐   | ☐       | ☐      |
| 2    | Enable/disable review reminders | Setting saved                | ☐   | ☐       | ☐      |
| 3    | Set reminder time               | Time saved                   | ☐   | ☐       | ☐      |
| 4    | Adjust difficulty settings      | Algorithm parameters updated | ☐   | ☐       | ☐      |

#### 12.4 Notification Preferences

| Step | Action                           | Expected Result        | Web | Desktop | Mobile |
| ---- | -------------------------------- | ---------------------- | --- | ------- | ------ |
| 1    | View notification settings       | All options shown      | ☐   | ☐       | ☐      |
| 2    | Enable email notifications       | Email notifications on | ☐   | ☐       | ☐      |
| 3    | Disable push notifications       | Push notifications off | ☐   | ☐       | ☐      |
| 4    | Set notification frequency       | Frequency saved        | ☐   | ☐       | ☐      |
| 5    | Mute specific notification types | Types muted            | ☐   | ☐       | ☐      |

#### 12.5 Privacy Settings

| Step | Action                  | Expected Result            | Web | Desktop | Mobile |
| ---- | ----------------------- | -------------------------- | --- | ------- | ------ |
| 1    | Set profile to private  | Profile becomes private    | ☐   | ☐       | ☐      |
| 2    | Hide reading activity   | Activity hidden from feed  | ☐   | ☐       | ☐      |
| 3    | Opt out of analytics    | Analytics disabled         | ☐   | ☐       | ☐      |
| 4    | Export user data (GDPR) | Data export initiated      | ☐   | ☐       | ☐      |
| 5    | Delete account          | Account deletion initiated | ☐   | ☐       | ☐      |

#### 12.6 Language & Localization

| Step | Action                 | Expected Result            | Web | Desktop | Mobile |
| ---- | ---------------------- | -------------------------- | --- | ------- | ------ |
| 1    | Change to Spanish      | UI updates to Spanish      | ☐   | ☐       | ☐      |
| 2    | Change to Arabic       | UI updates to Arabic (RTL) | ☐   | ☐       | ☐      |
| 3    | Change to Japanese     | UI updates to Japanese     | ☐   | ☐       | ☐      |
| 4    | Change to Chinese      | UI updates to Chinese      | ☐   | ☐       | ☐      |
| 5    | Change to Tagalog      | UI updates to Tagalog      | ☐   | ☐       | ☐      |
| 6    | Change back to English | UI updates to English      | ☐   | ☐       | ☐      |

---

### 13. Subscription & Payments (Stripe)

#### 13.1 View Subscription Plans

| Step | Action                        | Expected Result              | Web | Desktop | Mobile |
| ---- | ----------------------------- | ---------------------------- | --- | ------- | ------ |
| 1    | Navigate to subscription page | Plans comparison shown       | ☐   | ☐       | ☐      |
| 2    | View Free tier features       | Features listed              | ☐   | ☐       | ☐      |
| 3    | View Pro tier features        | Features listed with pricing | ☐   | ☐       | ☐      |
| 4    | View Scholar tier features    | Features listed with pricing | ☐   | ☐       | ☐      |
| 5    | View feature comparison table | All features compared        | ☐   | ☐       | ☐      |

#### 13.2 Upgrade to Pro

| Step | Action                         | Expected Result       | Web | Desktop | Mobile |
| ---- | ------------------------------ | --------------------- | --- | ------- | ------ |
| 1    | Click "Upgrade to Pro"         | Stripe checkout opens | ☐   | ☐       | ☐      |
| 2    | Enter test card (4242 4242...) | Card accepted         | ☐   | ☐       | ☐      |
| 3    | Complete payment               | Payment successful    | ☐   | ☐       | ☐      |
| 4    | Verify subscription active     | Pro features unlocked | ☐   | ☐       | ☐      |
| 5    | Check usage limits             | Pro limits shown      | ☐   | ☐       | ☐      |
| 6    | Receive confirmation email     | Email received        | ☐   | ☐       | ☐      |

#### 13.3 Manage Subscription

| Step | Action                           | Expected Result     | Web | Desktop | Mobile |
| ---- | -------------------------------- | ------------------- | --- | ------- | ------ |
| 1    | View subscription details        | Current plan shown  | ☐   | ☐       | ☐      |
| 2    | View billing history             | All invoices listed | ☐   | ☐       | ☐      |
| 3    | Download invoice                 | PDF downloaded      | ☐   | ☐       | ☐      |
| 4    | Update payment method            | Stripe portal opens | ☐   | ☐       | ☐      |
| 5    | Change plan (upgrade to Scholar) | Pro-rated upgrade   | ☐   | ☐       | ☐      |
| 6    | Change plan (downgrade to Free)  | Downgrade scheduled | ☐   | ☐       | ☐      |

#### 13.4 Cancel Subscription

| Step | Action                         | Expected Result                    | Web | Desktop | Mobile |
| ---- | ------------------------------ | ---------------------------------- | --- | ------- | ------ |
| 1    | Click "Cancel Subscription"    | Confirmation dialog shown          | ☐   | ☐       | ☐      |
| 2    | Confirm cancellation           | Subscription cancelled             | ☐   | ☐       | ☐      |
| 3    | Verify access until period end | Pro features remain until end date | ☐   | ☐       | ☐      |
| 4    | After period ends              | Downgrade to Free tier             | ☐   | ☐       | ☐      |
| 5    | Receive cancellation email     | Email received                     | ☐   | ☐       | ☐      |

#### 13.5 Usage Tracking

| Step | Action                               | Expected Result      | Web | Desktop | Mobile |
| ---- | ------------------------------------ | -------------------- | --- | ------- | ------ |
| 1    | View usage dashboard                 | Current usage shown  | ☐   | ☐       | ☐      |
| 2    | Check book limit (Free: 5)           | Count shown          | ☐   | ☐       | ☐      |
| 3    | Attempt to exceed limit              | Upgrade prompt shown | ☐   | ☐       | ☐      |
| 4    | Check AI interaction limit           | Count shown          | ☐   | ☐       | ☐      |
| 5    | Check TTS download limit (Pro: 5/mo) | Count shown          | ☐   | ☐       | ☐      |

---

### 14. Email Marketing

#### 14.1 Welcome Email

| Step | Action              | Expected Result                 | Web | Desktop | Mobile |
| ---- | ------------------- | ------------------------------- | --- | ------- | ------ |
| 1    | Sign up for account | Welcome email sent within 5 min | ☐   | ☐       | ☐      |
| 2    | Open email          | Email renders correctly         | ☐   | ☐       | ☐      |
| 3    | Click CTA links     | Links work correctly            | ☐   | ☐       | ☐      |
| 4    | Unsubscribe link    | Unsubscribe page opens          | ☐   | ☐       | ☐      |

#### 14.2 Engagement Emails

| Step | Action                 | Expected Result            | Web | Desktop | Mobile |
| ---- | ---------------------- | -------------------------- | --- | ------- | ------ |
| 1    | Import first book      | Congratulations email sent | ☐   | ☐       | ☐      |
| 2    | Achieve 7-day streak   | Streak email sent          | ☐   | ☐       | ☐      |
| 3    | Flashcards due         | Review reminder email sent | ☐   | ☐       | ☐      |
| 4    | Weekly reading summary | Summary email sent         | ☐   | ☐       | ☐      |
| 5    | Unlock achievement     | Achievement email sent     | ☐   | ☐       | ☐      |

#### 14.3 Email Preferences

| Step | Action                        | Expected Result                    | Web | Desktop | Mobile |
| ---- | ----------------------------- | ---------------------------------- | --- | ------- | ------ |
| 1    | Navigate to email preferences | All email types listed             | ☐   | ☐       | ☐      |
| 2    | Disable marketing emails      | Marketing emails stopped           | ☐   | ☐       | ☐      |
| 3    | Keep transactional emails     | Transactional emails continue      | ☐   | ☐       | ☐      |
| 4    | Set email frequency           | Frequency updated                  | ☐   | ☐       | ☐      |
| 5    | Unsubscribe from all          | All emails stopped except critical | ☐   | ☐       | ☐      |

---

## Cross-Platform Testing

### Synchronization Testing

#### Real-Time Sync

| Step | Action                           | Expected Result                     | Platforms    |
| ---- | -------------------------------- | ----------------------------------- | ------------ |
| 1    | Sign in on Web                   | Library shown                       | Web          |
| 2    | Sign in on Mobile (same account) | Same library shown                  | Mobile       |
| 3    | Add book on Web                  | Book appears on Mobile within 5 sec | Web + Mobile |
| 4    | Add book on Mobile               | Book appears on Web within 5 sec    | Mobile + Web |
| 5    | Start reading on Web (page 10)   | Position synced                     | Web          |
| 6    | Open same book on Mobile         | Opens to page 10                    | Mobile       |
| 7    | Continue on Mobile (page 20)     | Position updated                    | Mobile       |
| 8    | Check on Web                     | Shows page 20                       | Web          |
| 9    | Add highlight on Desktop         | Highlight syncs to all devices      | All          |
| 10   | Create flashcard on Mobile       | Card syncs to all devices           | All          |

#### Offline Sync

| Step | Action                           | Expected Result              | Platforms |
| ---- | -------------------------------- | ---------------------------- | --------- |
| 1    | Download book on Web             | Book cached locally          | Web       |
| 2    | Go offline                       | Offline mode indicator shown | Web       |
| 3    | Read book offline                | Reading works                | Web       |
| 4    | Add highlight offline            | Highlight saved locally      | Web       |
| 5    | Go back online                   | Sync starts automatically    | Web       |
| 6    | Check Mobile                     | Highlight appears on Mobile  | Mobile    |
| 7    | Make conflicting changes offline | Conflict resolution dialog   | All       |
| 8    | Resolve conflict                 | Changes merged correctly     | All       |

### Platform-Specific Features

#### Desktop-Only Features

| Step | Action                             | Expected Result               | Platform |
| ---- | ---------------------------------- | ----------------------------- | -------- |
| 1    | Use system tray icon               | Quick actions menu shown      | Desktop  |
| 2    | Minimize to tray                   | App hidden, tray icon remains | Desktop  |
| 3    | Click tray icon                    | App restored                  | Desktop  |
| 4    | Use keyboard shortcut (Cmd/Ctrl+N) | New action triggered          | Desktop  |
| 5    | Drag & drop file to app            | File imported                 | Desktop  |
| 6    | Auto-update check                  | Update prompt if available    | Desktop  |

#### Mobile-Only Features

| Step | Action                                | Expected Result             | Platform |
| ---- | ------------------------------------- | --------------------------- | -------- |
| 1    | Use biometric auth (Face ID/Touch ID) | Authentication successful   | Mobile   |
| 2    | Receive push notification             | Notification appears        | Mobile   |
| 3    | Tap notification                      | Opens relevant content      | Mobile   |
| 4    | Use camera to scan document           | Document imported           | Mobile   |
| 5    | Rotate device                         | Layout adjusts (responsive) | Mobile   |
| 6    | Use share sheet                       | System share dialog opens   | Mobile   |

---

## Integration Testing

### Clerk Authentication Integration

| Step | Action                         | Expected Result               |
| ---- | ------------------------------ | ----------------------------- | --- |
| 1    | Sign in with Google            | OAuth flow completes          | ☐   |
| 2    | Account linked                 | User profile created          | ☐   |
| 3    | Sign out and back in           | Session restored              | ☐   |
| 4    | Multi-factor auth (if enabled) | 2FA prompt shown              | ☐   |
| 5    | Session expiry                 | Re-auth required after expiry | ☐   |

### Stripe Payment Integration

| Step | Action                          | Expected Result        |
| ---- | ------------------------------- | ---------------------- | --- |
| 1    | Subscribe to Pro                | Stripe checkout works  | ☐   |
| 2    | Webhook: payment success        | Subscription activated | ☐   |
| 3    | Webhook: payment failure        | Retry logic triggered  | ☐   |
| 4    | Webhook: subscription cancelled | Downgrade scheduled    | ☐   |
| 5    | Webhook: invoice created        | Invoice saved          | ☐   |

### Cloudflare R2 Storage

| Step | Action                  | Expected Result            |
| ---- | ----------------------- | -------------------------- | --- |
| 1    | Upload large book       | File stored in R2          | ☐   |
| 2    | Request book download   | Signed URL generated       | ☐   |
| 3    | Download via signed URL | File downloads             | ☐   |
| 4    | URL expires             | Access denied after expiry | ☐   |
| 5    | Delete book             | File deleted from R2       | ☐   |

### Sentry Error Tracking

| Step | Action                  | Expected Result               |
| ---- | ----------------------- | ----------------------------- | --- |
| 1    | Trigger frontend error  | Error captured in Sentry      | ☐   |
| 2    | Trigger backend error   | Error captured in Sentry      | ☐   |
| 3    | Check error context     | User ID, request ID attached  | ☐   |
| 4    | Check sourcemaps        | Error shows original code     | ☐   |
| 5    | Alert on critical error | Email/Slack notification sent | ☐   |

### PostHog Analytics

| Step | Action                          | Expected Result                  |
| ---- | ------------------------------- | -------------------------------- | --- |
| 1    | Track "Book Imported" event     | Event captured                   | ☐   |
| 2    | Track "Reading Session Started" | Event captured                   | ☐   |
| 3    | Track "AI Feature Used"         | Event with properties captured   | ☐   |
| 4    | View funnel                     | Signup → First Book → First Read | ☐   |
| 5    | View retention                  | Retention cohorts shown          | ☐   |

---

## User Journey Testing

### New User Onboarding Journey

| Step | Action                   | Expected Result               |
| ---- | ------------------------ | ----------------------------- | --- |
| 1    | Land on homepage         | Clear value proposition shown | ☐   |
| 2    | Click "Sign Up"          | Registration form shown       | ☐   |
| 3    | Complete registration    | Account created               | ☐   |
| 4    | View onboarding tutorial | Step-by-step guide shown      | ☐   |
| 5    | Skip tutorial            | Proceed to library            | ☐   |
| 6    | Guided first book import | Help prompts shown            | ☐   |
| 7    | First book imported      | Celebration animation         | ☐   |
| 8    | Open book                | Reading interface tutorial    | ☐   |
| 9    | Complete onboarding      | Full access granted           | ☐   |

### Daily Reading Routine Journey

| Step | Action                | Expected Result               |
| ---- | --------------------- | ----------------------------- | --- |
| 1    | Sign in               | Dashboard shows today's goals | ☐   |
| 2    | View due flashcards   | Review prompt shown           | ☐   |
| 3    | Review 10 flashcards  | Progress updated              | ☐   |
| 4    | Continue reading book | Opens to last position        | ☐   |
| 5    | Read for 20 minutes   | Reading time tracked          | ☐   |
| 6    | Add 2 highlights      | Highlights saved              | ☐   |
| 7    | Ask AI 1 question     | Response received             | ☐   |
| 8    | Close app             | Progress auto-saved           | ☐   |
| 9    | Check activity feed   | Friend updates shown          | ☐   |

### Free to Pro Upgrade Journey

| Step | Action                   | Expected Result           |
| ---- | ------------------------ | ------------------------- | --- |
| 1    | Hit book limit (5 books) | Upgrade prompt shown      | ☐   |
| 2    | Click "Learn More"       | Feature comparison shown  | ☐   |
| 3    | Click "Upgrade to Pro"   | Pricing page shown        | ☐   |
| 4    | Select Pro plan          | Stripe checkout opens     | ☐   |
| 5    | Enter payment info       | Card validated            | ☐   |
| 6    | Complete payment         | Payment successful        | ☐   |
| 7    | Return to app            | Pro badge shown           | ☐   |
| 8    | Import 6th book          | No error, limit increased | ☐   |
| 9    | Check new features       | All Pro features unlocked | ☐   |

### Book Club Participation Journey

| Step | Action                        | Expected Result            |
| ---- | ----------------------------- | -------------------------- | --- |
| 1    | Browse book clubs             | Clubs listed               | ☐   |
| 2    | Join "Sci-Fi Lovers" club     | Membership confirmed       | ☐   |
| 3    | View current club book        | "Dune" reading in progress | ☐   |
| 4    | Add book to library           | Book imported              | ☐   |
| 5    | Start reading                 | Progress tracked           | ☐   |
| 6    | View club discussion calendar | Next discussion scheduled  | ☐   |
| 7    | Receive discussion reminder   | Email reminder received    | ☐   |
| 8    | Join discussion thread        | Thread opens               | ☐   |
| 9    | Post thoughts                 | Post appears in thread     | ☐   |
| 10   | Engage with other members     | Replies and likes work     | ☐   |

---

## Edge Case Testing

### Data Limits

| Scenario                         | Expected Result                       | Status |
| -------------------------------- | ------------------------------------- | ------ |
| Import 100+ books                | All imported, pagination works        | ☐      |
| Create 500+ flashcards           | All created, review works             | ☐      |
| Add 1000+ highlights in one book | All saved, list performs well         | ☐      |
| Upload max size file (50 MB)     | Upload succeeds                       | ☐      |
| Upload file 1 byte over limit    | Error message shown                   | ☐      |
| Paste 100,000 word text          | Text accepted or warning shown        | ☐      |
| Create 50+ collections           | All accessible, no performance issues | ☐      |

### Special Characters & Unicode

| Scenario                               | Expected Result                | Status |
| -------------------------------------- | ------------------------------ | ------ |
| Book title with emojis "📚 My Book"    | Displays correctly everywhere  | ☐      |
| Author name with accents "José García" | Displays correctly             | ☐      |
| Content in Arabic (RTL)                | Proper RTL rendering           | ☐      |
| Content in Japanese (CJK)              | Proper CJK rendering           | ☐      |
| Mixed LTR/RTL text                     | Bidirectional text handled     | ☐      |
| Special math symbols in content        | Symbols render correctly       | ☐      |
| Code snippets with syntax              | Monospace formatting preserved | ☐      |

### Network Conditions

| Scenario                             | Expected Result                       | Status |
| ------------------------------------ | ------------------------------------- | ------ |
| Upload book on slow connection       | Progress shown, timeout handled       | ☐      |
| Connection drops mid-upload          | Resume or retry offered               | ☐      |
| Load library on slow 3G              | Loading state shown, eventual success | ☐      |
| Sync data on intermittent connection | Retries automatically                 | ☐      |
| Complete offline session             | Changes queued for sync               | ☐      |
| Go online after offline session      | Queued changes sync                   | ☐      |

### Concurrent Actions

| Scenario                                    | Expected Result                        | Status |
| ------------------------------------------- | -------------------------------------- | ------ |
| Edit same book on 2 devices simultaneously  | Conflict resolution or last-write-wins | ☐      |
| Add highlight while AI is generating        | Both complete successfully             | ☐      |
| Delete book while reading on another device | Graceful handling, user notified       | ☐      |
| Multiple users in same book club            | No race conditions                     | ☐      |

### Boundary Conditions

| Scenario                            | Expected Result          | Status |
| ----------------------------------- | ------------------------ | ------ |
| Book with 0 pages                   | Handled gracefully       | ☐      |
| Book with 10,000+ pages             | Handles large pagination | ☐      |
| Flashcard review streak of 365 days | Displays correctly       | ☐      |
| Reading speed of 1000+ WPM          | Calculated accurately    | ☐      |
| User with 0 followers               | UI handles empty state   | ☐      |
| Forum thread with 500+ replies      | Pagination works         | ☐      |

### Error Recovery

| Scenario                 | Expected Result                         | Status |
| ------------------------ | --------------------------------------- | ------ |
| Server returns 500 error | User-friendly error shown, retry option | ☐      |
| Stripe payment fails     | Error message, retry option             | ☐      |
| AI API rate limit hit    | Queue or retry with backoff             | ☐      |
| R2 storage unavailable   | Error shown, local cache used           | ☐      |
| Database connection lost | Reconnect attempt, user notified        | ☐      |

---

## Performance Testing

### Page Load Times

| Page                       | Target | Actual | Status |
| -------------------------- | ------ | ------ | ------ |
| Homepage                   | < 2s   | \_\_\_ | ☐      |
| Library (50 books)         | < 3s   | \_\_\_ | ☐      |
| Reader (EPUB open)         | < 2s   | \_\_\_ | ☐      |
| Reader (PDF open)          | < 3s   | \_\_\_ | ☐      |
| Flashcard review           | < 1s   | \_\_\_ | ☐      |
| Forum thread (100 replies) | < 3s   | \_\_\_ | ☐      |

### API Response Times

| Endpoint                  | Target      | Actual | Status |
| ------------------------- | ----------- | ------ | ------ |
| GET /api/books            | < 500ms     | \_\_\_ | ☐      |
| POST /api/books (upload)  | < 5s (50MB) | \_\_\_ | ☐      |
| GET /api/reading-progress | < 200ms     | \_\_\_ | ☐      |
| POST /api/ai/explain      | < 3s        | \_\_\_ | ☐      |
| GET /api/flashcards/due   | < 300ms     | \_\_\_ | ☐      |

### Memory Usage

| Platform        | Idle     | Reading  | Review   | Status |
| --------------- | -------- | -------- | -------- | ------ |
| Web (Chrome)    | < 200 MB | < 400 MB | < 300 MB | ☐      |
| Desktop (macOS) | < 150 MB | < 300 MB | < 250 MB | ☐      |
| Mobile (iOS)    | < 100 MB | < 200 MB | < 150 MB | ☐      |

### Database Query Performance

| Query                     | Target  | Actual | Status |
| ------------------------- | ------- | ------ | ------ |
| Fetch user library        | < 100ms | \_\_\_ | ☐      |
| Full-text book search     | < 200ms | \_\_\_ | ☐      |
| SRS due cards calculation | < 150ms | \_\_\_ | ☐      |
| Analytics aggregation     | < 500ms | \_\_\_ | ☐      |

### Lighthouse Scores (Web)

| Metric         | Target | Actual | Status |
| -------------- | ------ | ------ | ------ |
| Performance    | > 90   | \_\_\_ | ☐      |
| Accessibility  | > 95   | \_\_\_ | ☐      |
| Best Practices | > 90   | \_\_\_ | ☐      |
| SEO            | > 90   | \_\_\_ | ☐      |

---

## Security Testing

### Authentication Security

| Test                   | Expected Result                     | Status |
| ---------------------- | ----------------------------------- | ------ |
| SQL injection in login | Prevented, error logged             | ☐      |
| XSS in user input      | Sanitized, script not executed      | ☐      |
| CSRF attack            | Token validation prevents attack    | ☐      |
| Brute force login      | Rate limiting kicks in              | ☐      |
| Password strength      | Weak passwords rejected             | ☐      |
| Session hijacking      | Token invalidated, re-auth required | ☐      |

### Data Security

| Test                           | Expected Result               | Status |
| ------------------------------ | ----------------------------- | ------ |
| Access other user's books      | 403 Forbidden                 | ☐      |
| Modify other user's highlights | 403 Forbidden                 | ☐      |
| View private profile           | 403 Forbidden or limited view | ☐      |
| SQL injection in search        | Prevented                     | ☐      |
| Path traversal in file upload  | Prevented                     | ☐      |
| Malicious file upload          | Rejected or quarantined       | ☐      |

### Payment Security

| Test                           | Expected Result                 | Status |
| ------------------------------ | ------------------------------- | ------ |
| Stripe keys exposed in client  | No secret keys in frontend      | ☐      |
| Webhook signature verification | Invalid signatures rejected     | ☐      |
| Payment manipulation           | Server-side validation prevents | ☐      |
| PCI compliance                 | No card data stored locally     | ☐      |

### Content Security

| Test                                 | Expected Result                   | Status |
| ------------------------------------ | --------------------------------- | ------ |
| Profanity in public forum post       | Filtered or rejected              | ☐      |
| Profanity in public curriculum title | Filtered or rejected              | ☐      |
| Profanity in private notes           | Not filtered (user's own content) | ☐      |
| Inappropriate image upload           | Rejected or flagged               | ☐      |

---

## Accessibility Testing

### Keyboard Navigation

| Feature                        | Expected Result              | Status |
| ------------------------------ | ---------------------------- | ------ |
| Navigate library with Tab      | Focus visible, logical order | ☐      |
| Open book with Enter           | Book opens                   | ☐      |
| Navigate pages with arrow keys | Pages turn                   | ☐      |
| Navigate forms with Tab        | All fields accessible        | ☐      |
| Submit form with Enter         | Form submits                 | ☐      |
| Close dialogs with Esc         | Dialog closes                | ☐      |
| Access all menu items          | Keyboard accessible          | ☐      |

### Screen Reader Support

| Feature              | Expected Result            | Status |
| -------------------- | -------------------------- | ------ |
| Page title announced | Accurate page title        | ☐      |
| Heading structure    | Proper H1-H6 hierarchy     | ☐      |
| Form labels          | All inputs labeled         | ☐      |
| Button purposes      | Descriptive button text    | ☐      |
| Image alt text       | All images have alt text   | ☐      |
| Link purposes        | Descriptive link text      | ☐      |
| Error messages       | Errors announced clearly   | ☐      |
| Dynamic content      | ARIA live regions work     | ☐      |
| Skip links           | Skip to main content works | ☐      |

### WCAG 2.2 AAA Compliance

| Criterion             | Expected Result        | Status |
| --------------------- | ---------------------- | ------ |
| Color contrast        | 7:1 minimum ratio      | ☐      |
| Text resize           | 200% zoom without loss | ☐      |
| Focus indicators      | Highly visible focus   | ☐      |
| No flashing content   | No seizure triggers    | ☐      |
| Consistent navigation | Navigation consistent  | ☐      |
| Heading markup        | Proper heading levels  | ☐      |
| Touch targets         | 44x44px minimum        | ☐      |

### Dyslexia Support

| Feature                   | Expected Result           | Status |
| ------------------------- | ------------------------- | ------ |
| OpenDyslexic font option  | Font available and works  | ☐      |
| Adjustable letter spacing | Spacing adjusts           | ☐      |
| Adjustable line spacing   | Spacing adjusts           | ☐      |
| Text-to-speech            | TTS reads content clearly | ☐      |
| High contrast mode        | Readable high contrast    | ☐      |

### Voice Commands (Accessibility)

| Command         | Expected Result     | Status |
| --------------- | ------------------- | ------ |
| "Go to library" | Navigate to library | ☐      |
| "Next page"     | Turn to next page   | ☐      |
| "Add bookmark"  | Bookmark added      | ☐      |
| "Read aloud"    | TTS starts          | ☐      |
| "Stop reading"  | TTS stops           | ☐      |

---

## Internationalization Testing

### Language Switching

| Language             | UI Translation         | RTL Layout | Status |
| -------------------- | ---------------------- | ---------- | ------ |
| English              | All strings translated | N/A        | ☐      |
| Spanish              | All strings translated | N/A        | ☐      |
| Arabic               | All strings translated | RTL works  | ☐      |
| Japanese             | All strings translated | N/A        | ☐      |
| Chinese (Simplified) | All strings translated | N/A        | ☐      |
| Tagalog              | All strings translated | N/A        | ☐      |

### Date/Time Localization

| Test              | Expected Result        | Status |
| ----------------- | ---------------------- | ------ |
| Date format (US)  | MM/DD/YYYY             | ☐      |
| Date format (EU)  | DD/MM/YYYY             | ☐      |
| Time format (12h) | 3:30 PM                | ☐      |
| Time format (24h) | 15:30                  | ☐      |
| Relative dates    | "2 days ago" localized | ☐      |

### Number Localization

| Test                   | Expected Result | Status |
| ---------------------- | --------------- | ------ |
| Decimal separator (US) | 1,234.56        | ☐      |
| Decimal separator (EU) | 1.234,56        | ☐      |
| Currency (USD)         | $19.99          | ☐      |
| Currency (EUR)         | 19,99 €         | ☐      |

### Content in Multiple Languages

| Test                   | Expected Result               | Status |
| ---------------------- | ----------------------------- | ------ |
| Read Spanish book      | Text displays correctly       | ☐      |
| Read Arabic book       | RTL rendering works           | ☐      |
| Read Japanese book     | CJK fonts load                | ☐      |
| Mixed language content | Proper bidirectional handling | ☐      |

---

## Regression Testing Checklist

### After Each Deployment

- [ ] User can sign in/out
- [ ] User can import a book
- [ ] User can read a book
- [ ] User can add highlights
- [ ] AI features work
- [ ] Flashcard review works
- [ ] Subscription payment works
- [ ] Email notifications sent
- [ ] Data syncs across devices
- [ ] No console errors
- [ ] No Sentry errors (critical)

### After Major Feature Release

- [ ] Run all core feature tests
- [ ] Run all integration tests
- [ ] Run all user journey tests
- [ ] Performance benchmarks pass
- [ ] Accessibility audit passes
- [ ] Security scan passes
- [ ] All platforms tested

### Before Production Release

- [ ] All automated tests pass
- [ ] All manual test cases pass
- [ ] Load testing completed
- [ ] Security audit completed
- [ ] Accessibility audit completed
- [ ] Cross-browser testing completed
- [ ] Cross-platform testing completed
- [ ] Backup and recovery tested
- [ ] Monitoring and alerts verified
- [ ] Documentation updated

---

## Test Execution Tracking

### Test Summary

| Category        | Total Tests | Passed     | Failed     | Blocked    | Not Run    |
| --------------- | ----------- | ---------- | ---------- | ---------- | ---------- |
| Core Features   | \_\_\_      | \_\_\_     | \_\_\_     | \_\_\_     | \_\_\_     |
| AI Features     | \_\_\_      | \_\_\_     | \_\_\_     | \_\_\_     | \_\_\_     |
| Social Features | \_\_\_      | \_\_\_     | \_\_\_     | \_\_\_     | \_\_\_     |
| Cross-Platform  | \_\_\_      | \_\_\_     | \_\_\_     | \_\_\_     | \_\_\_     |
| Integration     | \_\_\_      | \_\_\_     | \_\_\_     | \_\_\_     | \_\_\_     |
| User Journeys   | \_\_\_      | \_\_\_     | \_\_\_     | \_\_\_     | \_\_\_     |
| Edge Cases      | \_\_\_      | \_\_\_     | \_\_\_     | \_\_\_     | \_\_\_     |
| Performance     | \_\_\_      | \_\_\_     | \_\_\_     | \_\_\_     | \_\_\_     |
| Security        | \_\_\_      | \_\_\_     | \_\_\_     | \_\_\_     | \_\_\_     |
| Accessibility   | \_\_\_      | \_\_\_     | \_\_\_     | \_\_\_     | \_\_\_     |
| i18n            | \_\_\_      | \_\_\_     | \_\_\_     | \_\_\_     | \_\_\_     |
| **TOTAL**       | **\_\_\_**  | **\_\_\_** | **\_\_\_** | **\_\_\_** | **\_\_\_** |

### Bug Tracking

| Bug ID | Severity | Description | Steps to Reproduce | Status |
| ------ | -------- | ----------- | ------------------ | ------ |
|        |          |             |                    |        |

**Severity Levels:**

- **Critical**: Blocks core functionality, data loss, security vulnerability
- **High**: Major feature broken, significant impact
- **Medium**: Minor feature issue, workaround exists
- **Low**: Cosmetic issue, minor inconvenience

---

## Testing Notes & Observations

### General Observations

[Space for testers to note general observations, patterns, or concerns]

### Platform-Specific Issues

**Web:**

**Desktop:**

**Mobile (iOS):**

**Mobile (Android):**

### Recommended Improvements

[Space for testers to suggest improvements based on testing]

---

## Sign-Off

### Test Lead Approval

- **Name:** ******\_\_\_******
- **Date:** ******\_\_\_******
- **Signature:** ******\_\_\_******

### Product Owner Approval

- **Name:** ******\_\_\_******
- **Date:** ******\_\_\_******
- **Signature:** ******\_\_\_******

### Release Approval

- [ ] All critical tests passed
- [ ] All high-priority tests passed
- [ ] Known issues documented
- [ ] Mitigation plans in place
- [ ] Ready for production

**Approved By:** ******\_\_\_******
**Date:** ******\_\_\_******

---

**End of Manual Testing Plan**
