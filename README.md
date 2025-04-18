# Insurance Claims Processing - Frontend (React)

This project is the React frontend for the web-based Insurance Claim Processing application. It provides a user interface for claimants, reviewers (makers), and checkers (approvers) to manage insurance claims, leveraging a CodeIgniter backend API for data and authentication.

## Features

*   **Claim Submission:** Claimants can submit new claims with details and supporting documents.
*   **Claim Viewing:** Users can view claim details and history relevant to their role.
    *   Claimants: View their own claims.
    *   Reviewers: View claims assigned to them for review.
    *   Checkers: View all claims, manage assignments, and perform final actions.
*   **Role-Based Access Control:** Different sections and actions are accessible based on user roles (Claimant, Reviewer, Checker) authenticated via JWT.
*   **Claim Status Tracking:** Users can see the current status of claims (Pending, Under Review, Pending Approval, Approved, Denied).
*   **Review Workflow:** Reviewers can add comments, upload documents, and submit claims for final approval.
*   **Approval Workflow:** Checkers can assign pending claims, review submitted claims, add comments, and Approve/Deny claims.
*   **Dashboard:** Role-specific dashboards providing key statistics and overviews.
*   **Responsive Design:** Built with React Bootstrap and styled according to the provided template.

## Tech Stack

*   **Framework:** React (using Vite)
*   **UI Library:** React Bootstrap, Bootstrap 5
*   **Routing:** React Router DOM
*   **State Management:** Redux Toolkit
*   **API Client:** Axios
*   **Form Handling:** React Hook Form
*   **Charting (Admin):** Recharts
*   **Styling:** Bootstrap Icons, Custom CSS (from template `theme.min.css`)

## Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn
*   A running instance of the corresponding [Insurance Claims CodeIgniter Backend](link-to-your-backend-repo-if-applicable) properly configured.

## Backend API Configuration

This frontend application expects the CodeIgniter backend API to be running and accessible. You **must** configure the base URL of the API in the frontend project.

1.  **Locate/Create `.env` file:** In the root directory of this React project, create a file named `.env` if it doesn't already exist.
2.  **Set API Base URL:** Add the following line to the `.env` file, replacing the placeholder URL with the actual URL where your CodeIgniter API is served (including the `/api` path, if applicable, as defined in your CI routes):

    ```dotenv
    VITE_API_BASE_URL=http://localhost:8080/api
    ```
    *   **Example for `php spark serve` (default port):** `VITE_API_BASE_URL=http://localhost:8080/api`
    *   **Important:** Make sure this URL **does not** have a trailing slash (`/`).
    *   Make sure your CodeIgniter application's `app.baseURL` (in `.env` or `Config/App.php`) is also set correctly and that its CORS configuration (`Config/Cors.php` and `Config/Filters.php`) allows requests from your React development server's origin (usually `http://localhost:5173` by default).

## Project Setup & Installation

1.  **Clone the Repository (if applicable):**
    ```bash
    git clone <repository-url>
    cd <repository-folder-name>
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
    This will install React, Vite, Redux Toolkit, React Router, Axios, React Bootstrap, Bootstrap, Bootstrap Icons, React Hook Form, Recharts, React Router Bootstrap, and other necessary development dependencies.

3.  **Copy Template Assets:**
    *   Locate the `assets` folder provided with the original HTML/Bootstrap template.
    *   Copy this entire `assets` folder into the `public/` directory within your React project root. The final structure should be `public/assets/`.
    *   *(This step ensures that the `theme.min.css` file loaded in `src/main.jsx` can find its associated fonts, images, and vendor files using their original relative paths).*

4.  **Configure Environment Variables:**
    *   As described in the "Backend API Configuration" section above, create a `.env` file in the project root and set the `VITE_API_BASE_URL` variable.

## Running the Development Server

1.  **Start the Backend:** Make sure your CodeIgniter backend application is running (e.g., using `php spark serve` or through your local web server setup like Valet, Laragon, XAMPP, etc.).
2.  **Start the Frontend:** Open your terminal in the React project's root directory and run:
    ```bash
    npm run dev
    # or
    yarn dev
    ```
3.  **Access the Application:** Vite will output the local URL where the development server is running (typically `http://localhost:5173`). Open this URL in your web browser.

You should now be able to see the login page or the dashboard (if previously logged in and the token is still valid in localStorage).

## Building for Production

When ready to deploy:

1.  **Configure API URL:** Ensure the `VITE_API_BASE_URL` in your environment configuration (or directly in `.env.production` if you use that method) points to your **production** backend API URL.
2.  **Run Build Command:**
    ```bash
    npm run build
    # or
    yarn build
    ```
3.  **Deploy:** This creates an optimized production build in the `dist/` directory. Deploy the contents of this `dist/` directory to your web server or hosting platform. Configure your server to serve the `index.html` file for all client-side routes (common setup for Single Page Applications).

## Project Structure

```plaintext
insurance-claims-app/
├── public/
│   └── assets/             # Static assets (CSS, images, fonts from template)
│       ├── css/
│       ├── img/
│       ├── svg/
│       └── vendor/
│   └── favicon.ico         # Application favicon
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   └── ProtectedRoute.jsx # Handles route protection based on auth/role
│   │   ├── Charts/           # Reusable chart components (using Recharts)
│   │   │   ├── StatusPieChart.jsx
│   │   │   └── TypeBarChart.jsx
│   │   ├── Dashboard/        # Components specific to dashboard widgets
│   │   │   ├── ActiveClaimHighlight.jsx
│   │   │   └── DashboardStatCard.jsx
│   │   └── Layout/           # Main application layout components
│   │       ├── Footer.jsx
│   │       ├── Header.jsx
│   │       ├── Layout.jsx    # Orchestrates Header, Sidebar, Footer, Content
│   │       └── Sidebar.jsx
│   ├── pages/              # Page-level components mapping to routes
│   │   ├── AdminDashboardPage.jsx  # Obsolete? Replaced by AllClaimsPage or new dashboard
│   │   ├── AllClaimsPage.jsx       # Checker's main view with actions/charts
│   │   ├── ClaimDetailPage.jsx     # Shared view for claim details (adapts based on role)
│   │   ├── ClaimsHistoryPage.jsx   # Shared view for history lists (adapts based on role)
│   │   ├── ClaimStatusPage.jsx     # Claimant's status tracking page
│   │   ├── DashboardPage.jsx       # Role-based dashboard landing page
│   │   ├── ForbiddenPage.jsx       # Access Denied page (403)
│   │   ├── LoginPage.jsx         # Application login page
│   │   ├── ReviewClaimDetailPage.jsx # Reviewer's page for notes/docs/submit action
│   │   └── SubmitClaimPage.jsx     # Claimant's new claim submission form
│   ├── store/              # Redux Toolkit configuration
│   │   ├── slices/         # State slices (reducers, actions, thunks)
│   │   │   ├── authSlice.js
│   │   │   └── claimsSlice.js
│   │   └── store.js        # Redux store configuration
│   ├── App.jsx             # Main application component (routing setup)
│   ├── index.css           # Global base styles (minimal)
│   └── main.jsx            # Application entry point (renders App, Redux Provider)
├── .env                    # Environment variables (API URL) - **DO NOT COMMIT**
├── .env.example            # Example environment variables
├── .gitignore              # Git ignore rules
├── index.html              # Main HTML template used by Vite
├── package.json            # Project dependencies and scripts
├── package-lock.json       # Locked dependency versions
├── README.md               # This file
└── vite.config.js          # Vite build tool configuration
```


## Key Features Implemented

*   **Layout:** Consistent header, sidebar, and footer structure applied across authenticated routes.
*   **Authentication:** JWT login via API, token storage in localStorage, automatic header attachment using Axios defaults.
*   **Authorization:** `ProtectedRoute` component checks authentication and `allowedRoles`. Role-specific views and API calls.
*   **State Management:** Redux Toolkit (`authSlice`, `claimsSlice`) managing user session, claims data, API statuses, and errors. Async thunks handle API interactions.
*   **Claimant Workflow:** Submit new claim (with validation and file uploads), view own claims list, view claim details.
*   **Reviewer Workflow:** View assigned claims list, view claim details (including documents), add reviewer notes, upload reviewer documents, submit claim for approval.
*   **Checker Workflow:** View claims list (all or filtered), view any claim detail, assign pending claims (with reviewer selection modal), approve/deny claims pending approval (with optional denial reason).
*   **UI:** Components styled using React Bootstrap and classes from the template's theme. Loading spinners and dismissible alerts provide user feedback.

## Further Development / TODO

*   Implement user profile/settings pages.
*   Add document download functionality.
*   Implement pagination for long lists (Claims History, All Claims).
*   Refine Checker dashboard with more relevant stats/widgets.
*   Add more specific error handling or user feedback messages.
*   Implement token refresh logic if using short-lived JWTs.
*   Write unit and integration tests.
*   Enhance file upload validation (MIME types).
*   Optimize backend queries for performance.
*   Incorporate AI for claims processing
*   Add more robust error handling and logging.
*   Refine authentication adn role bases authorization with backend
*   Improve the UI UX of application
