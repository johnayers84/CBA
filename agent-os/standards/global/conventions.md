## File Organization

### One Class/Struct Per File Rule
- **MANDATORY**: Every new struct or class MUST be created in its own separate file
- Files must be organized logically within the appropriate folder structure
- Never combine multiple types in a single file
- Every new class or struct object, or any major Type should be given its own file and placed in the folder structure as outlined below

## Project Folder Structure

Organize all code files according to this mandatory structure:

- **Infrastructure/** - Contains assets, plists, and configuration files that don't require frequent manipulation
- **Utilities/** - General utility code and helper functions
- **Services/** - Service classes and any general services
- **Models/** - Swift Data models and general data models
- **Views/** - All user interface view files (SwiftUI views, UIKit views, etc.)
- **ViewControllers/** (or ViewModels for MVVM) - Logic for the highest-level views and their subviews

## DRY Principle (Don't Repeat Yourself)

**CRITICAL - No Code Duplication:**
- Never write the same code multiple times across different views or files
- If the same pattern/code appears in multiple views, extract it into a reusable function
- Place extracted functions in the governing view controller/view model so all code is centralized in one location
- Changes should be made once and automatically affect all dependent components
- Avoid scenarios where the same change must be applied to multiple files independently

## View Logic Separation

**NO LOGIC IN VIEWS - This is non-negotiable:**
- Views should ONLY contain UI layout and presentation code
- All business logic and functionality MUST be placed in one of these locations:
  1. **ViewControllers/** or **ViewModels/** - For logic directly related to UI behavior and view management
  2. **Services/** or **Utilities/** - For functionality not directly tied to views
  3. **Models/** - For data-related logic
- The governing view controller/view model should contain all logic for its highest-level view AND all subviews
- This ensures all code for a feature lives in one centralized location
- Break up controllers/view models logically - don't create one giant controller for the entire project

## Code Reusability & Maintainability

- Design code so that changing one thing affects all related components automatically
- Extract common patterns into reusable functions/methods in the appropriate view controller/view model
- Centralize control logic to avoid scattered, duplicated code across views
- Think "change once, update everywhere" when writing any functionality

## General Development Conventions
- **Clear Documentation**: Maintain up-to-date README files with setup instructions, architecture overview, and contribution guidelines
- **Version Control Best Practices**: Use clear commit messages, feature branches, and meaningful pull/merge requests with descriptions
- **Dependency Management**: Keep dependencies up-to-date and minimal; document why major dependencies are used
- **Code Review Process**: Establish a consistent code review process with clear expectations for reviewers and authors
- **Testing Requirements**: Define what level of testing is required before merging (unit tests, integration tests, etc.)
- **Feature Flags**: Use feature flags for incomplete features rather than long-lived feature branches
- **Changelog Maintenance**: Keep a changelog or release notes to track significant changes and improvements

## UI Style Guide

**⚠️ MANDATORY UI PATTERNS - All new UI must follow this style:**

### Card-Based Layout System

All views should use a **card-based section layout** with the following structure:

1. **Section Cards** (`.sectionCard(accentColor:)` modifier):
   - White/light background cards on grouped background
   - 12pt corner radius
   - Subtle border with accent color opacity (0.2)
   - 16px horizontal padding, 12px vertical padding
   - 24px spacing between cards

2. **Card Headers** (`CardHeader` component):
   - Vertical accent bar (4px wide, 40px height) with gradient
   - SF Symbol icon in accent color
   - Title (subheadline, semibold) + Subtitle (caption, secondary)
   - Small status indicator dot (6px circle, accent color at 0.3 opacity)
   - Followed by `Divider()` before card content

3. **Interactive Elements Inside Cards**:
   - Mini vertical accent bar (3px wide, 30px height)
   - SF Symbol icon (24px frame)
   - Label/value text
   - Status indicator dot
   - Background: accent color at 0.05 opacity
   - Border: accent color at 0.2 opacity (or 0.4 when focused)
   - 8pt corner radius for nested elements

### UI Design Consistency (Card Color Consistency)

**⚠️ CRITICAL: Card Color Consistency Rule**

**For card-based UI designs, ALL subviews within a card MUST use the SAME accent color as the card header:**
- If a card header uses `.purple`, ALL subviews (buttons, rows, icons, accent bars, status indicators, backgrounds) within that card MUST use `.purple`
- If a card header uses `.gray`, ALL subviews within that card MUST use `.gray`
- NO mixing of colors within a single card (e.g., don't have purple, green, and orange subviews in a card with gray header)
- Destructive actions (Delete, Sign Out) should use the card's accent color, NOT red/orange
- Example: Settings card with gray header → all Filter Events, Auto-Sync, Offline Mode rows use gray
- Example: Privacy card with purple header → Privacy Policy, Delete Account, Clear All Local Data all use purple
- This rule applies to ALL color properties: accent bars, icon colors, status indicators, backgrounds, borders, and foreground styles

### Input Field Pattern

**CustomTextField/CustomSecureField style:**
```
[3px bar] [icon] [TextField] [status dot]
```
- Left accent bar: 3px × 30px
- Icon: 24px frame, accent color
- TextField: auto-expands
- Right status dot: 6px circle at 0.3 opacity
- Container: 12px horizontal padding, 10px vertical padding
- Background: accent color at 0.05 opacity with border at 0.2 opacity (0.4 when focused)

### Color System

**Accent Colors by Purpose:**
- `.blue` - Personal info, notifications, primary actions
- `.green` - Health/wellness tracking, success states
- `.orange` - Goals, warnings, targets
- `.indigo` - Export/data operations
- `Color.App.deepBlue` - CalDAV/sync operations (rgb: 0.0, 0.3, 0.65)

**Background Colors:**
- View background: `Color(.systemGroupedBackground)`
- Card background: Adaptive light/dark with contrast
- Secondary background: For nested elements

### Consistent Visual Elements

1. **Vertical Accent Bars**: Always 3-4px wide, various heights (24-40px)
2. **Status Indicators**: 6px circles at 0.3 opacity of accent color
3. **Corner Radius**: 12px for cards, 8-10px for nested elements
4. **Spacing**: 24px between sections, 12px between items, 8px within items
5. **Dividers**: Between header and content in each card

### Layout Pattern

```swift
VStack(spacing: 24) {  // Main container
    // Section 1
    VStack(spacing: 12) {
        CardHeader(icon:title:subtitle:accentColor:)
        Divider()
        // Content with nested components
    }
    .sectionCard(accentColor: .blue)

    // Section 2
    VStack(spacing: 12) {
        CardHeader(...)
        Divider()
        // Content
    }
    .sectionCard(accentColor: .green)
}
.padding()  // Overall padding
```

### Text Styling

- **Titles**: `.subheadline`, `.semibold`
- **Subtitles**: `.caption`, `.secondary`
- **Field Labels**: `.caption`, `.secondary`
- **Values**: `.caption` or `.subheadline`, `.semibold` or `.bold`, accent color
- **Body Text**: `.caption` for descriptions

### DO NOT Use

- ❌ Plain lists without card styling
- ❌ Flat layouts without visual hierarchy
- ❌ Inconsistent accent colors
- ❌ Random spacing values
- ❌ Missing status indicators
- ❌ Sections without headers
- ❌ Text fields without icons
