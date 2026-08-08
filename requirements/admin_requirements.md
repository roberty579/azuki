# Admin Requirements

## 8. Admin Page (Admin View)
- Spreadsheet-style dashboard/table tracking orders, containing at minimum:
  - Yarn type
  - Color
  - Thickness
  - Shipping status/details
  - Deadlines
  - Cost tracking (materials cost vs. price charged — implied by "tracks costs")
- Should tie back to commission form submissions (i.e., new form submissions populate/create new rows automatically)
- **Needs decision:** Should this be a custom-built table in the admin dashboard, or does it export/sync to an actual spreadsheet (Google Sheets integration)? Given the rest of the site already integrates Google Calendar, a Google Sheets sync may be the simplest and most flexible option.
