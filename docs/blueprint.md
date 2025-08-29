# **App Name**: Robot Maestro

## Core Features:

- Secure Authentication: Secure login screen with username/password and session management. Data encryption for project uploads and user credentials.
- Project Upload and Validation: Upload Robot Framework projects (ZIP/folder), Excel (.xlsx), and CSV files with format and content validation.
- Dependency Checker: Auto-scan requirements.txt and Robot Framework imports with one-click 'Install Missing Libraries'. Display results in a color-coded notification panel.
- Execution Management: Support various execution modes including Smoke, Regression, Sanity, API tests, run by Tag, Suite, Single Test Case and Excel/CSV driven runs. Display progress bar and provide live execution logs and failure screenshots. Allows downloading logs after execution.
- AI-Powered Suggestion Tool: Leverage a generative AI model to analyze Robot Framework logs and trace root causes or offer resolutions of errors, and suggest performance improvements. AI model will decide, based on reasoning, if the Robot Framework has encountered a problem the model is capable of addressing.
- Results & Visualization: Show summary stats and interactive charts, like pie, bar, line and heatmap, supporting hover tooltips, zoom and filters.  Enable exporting results/charts to CSV, Excel, PDF, PNG.
- Excel Data Validation and Orchestration: Validate Excel/CSV input for missing data before execution, highlight any issues and allows users to correct inside the dashboard, ensuring data integrity. Block execution if issues remain.  Supports test orchestration and data driven test execution.

## Style Guidelines:

- Primary color: HSL 214, 74%, 48% (Hex: #3380E3) for a modern and reliable feel.
- Background color: HSL 214, 20%, 95% (Hex: #F0F4FB) for a light and clean interface.
- Accent color: HSL 184, 60%, 40% (Hex: #299892) for CTAs and interactive elements.
- Font pairing: 'Space Grotesk' (sans-serif) for headings and 'Inter' (sans-serif) for body text.
- Use modern, flat icons for navigation and status indicators (success, warning, error).
- Clean, responsive layout with clear sections for project management, execution control, and results visualization. Desktop and mobile friendly.
- Subtle animations and transitions to provide a smooth user experience, e.g., loading spinners, progress bar updates, chart animations.