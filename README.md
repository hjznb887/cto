# StockAll

StockAll is a production-quality Windows desktop application for tracking global stock markets.

## Tech Stack
- **Framework:** Electron
- **Frontend:** React + TypeScript
- **Build Tool:** Vite
- **Storage:** SQLite (to be added)
- **Linting:** ESLint + Prettier

## Development Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run in Development Mode:**
   ```bash
   npm run electron:dev
   ```

3. **Build the Application:**
   ```bash
   npm run build
   ```

## Project Structure
- `src/main`: Electron main process
- `src/preload`: Electron preload scripts
- `src/renderer`: React frontend
- `dist`: Built assets

## Contribution Workflow
Follow the team's standard git workflow using feature branches and PRs.
