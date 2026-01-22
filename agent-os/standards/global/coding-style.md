## Coding style best practices

- **Consistent Naming Conventions**: Establish and follow naming conventions for variables, functions, classes, and files across the codebase
- **Automated Formatting**: Maintain consistent code style (indenting, line breaks, etc.)
- **Meaningful Names**: Choose descriptive names that reveal intent; avoid abbreviations and single-letter variables except in narrow contexts
- **Small, Focused Functions**: Keep functions small and focused on a single task for better readability and testability
- **Consistent Indentation**: Use consistent indentation (spaces or tabs) and configure your editor/linter to enforce it
- **Remove Dead Code**: Delete unused code, commented-out blocks, and imports rather than leaving them as clutter
- **Backward compatability only when required:** Unless specifically instructed otherwise, assume you do not need to write additional code logic to handle backward compatability.
- **DRY Principle**: Avoid duplication by extracting common logic into reusable functions or modules

## MVVM Architecture (SwiftUI)

- **Separation of Concerns**: Keep Views free of business logic; Views should only handle presentation and layout
- **ViewModel Organization**: Each top-level view (tab, screen, or major feature) should have ONE corresponding ViewModel that manages all logic for that view and its subviews
- **Single Source of Truth**: Consolidate related functionality in the parent ViewModel rather than creating separate ViewModels for each subview component
- **View Responsibilities**: Views should only:
  - Display data passed from ViewModels
  - Handle user interactions by calling ViewModel methods
  - Manage layout and presentation styling
  - Bind to ViewModel @Published properties
- **ViewModel Responsibilities**: ViewModels should handle:
  - All business logic and calculations
  - Data transformation and formatting
  - Service coordination and API calls
  - State management for the view hierarchy
  - Validation and error handling
- **Avoid Logic Duplication**: If multiple subviews need the same calculation or data, implement it once in the parent ViewModel and pass the result down as parameters
- **Modal ViewModels**: Sheets and modals that represent independent workflows can have their own ViewModels, as they operate in a separate context from their parent
- **Example Structure**:
  ```
  DashboardTabView → DashboardViewModel (manages all dashboard logic)
    ├── SubComponentView1 (receives data from DashboardViewModel)
    ├── SubComponentView2 (receives data from DashboardViewModel)
    └── EditSheet → EditSheetViewModel (independent modal context)
  ```