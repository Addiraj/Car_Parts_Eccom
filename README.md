# Fine Land International - Car Parts E-commerce

A modern, full-stack e-commerce application tailored for the automotive parts industry. The platform allows users to browse a detailed catalog of car parts, manage their garages, request quotations, and checkout seamlessly. It also features a comprehensive Admin Dashboard for managing products, orders, customers, and AI prompts.

## Tech Stack

*   **Frontend Framework:** React, [TanStack Start](https://tanstack.com/router)
*   **Styling:** Tailwind CSS, shadcn/ui components
*   **Backend / Server:** Node.js, TanStack Server Functions
*   **Database:** PostgreSQL
*   **ORM:** Sequelize (for local DB management)
*   **Authentication:** Supabase Auth
*   **Payments:** Stripe
*   **AI Integrations:** OpenAI, Simli, D-ID (Avatars & Chat)

## Prerequisites

Before setting up the project, ensure you have the following installed on your machine:
*   [Node.js](https://nodejs.org/en/) (v18 or higher recommended)
*   [npm](https://www.npmjs.com/) (usually installed with Node)
*   [PostgreSQL](https://www.postgresql.org/) (Running locally or hosted)
*   [Git](https://git-scm.com/)

## Local Setup Instructions

Follow these steps to get the application running on your local machine:

### 1. Clone the Repository

```bash
git clone https://github.com/Addiraj/Car_Parts_Eccom.git
cd Car_Parts_Eccom
```

### 2. Environment Configuration

You must configure the environment variables for the application to connect to the database and third-party services.

1.  Copy the example environment file:
    ```bash
    cp .env.example .env
    ```
2.  Open the `.env` file and fill in your local PostgreSQL credentials:
    ```env
    DB_HOST=localhost
    DB_PORT=5432
    DB_USER=postgres
    DB_PASSWORD=your_postgres_password
    DB_NAME=finland_dubai_carparts
    ```
3.  Fill in the keys for Supabase, Stripe, and OpenAI as needed. *(Note: `SUPABASE_SERVICE_ROLE_KEY` can be any dummy string if you are strictly using local Sequelize for backend operations, but actual Supabase keys are needed if you use Supabase Auth).*

### 3. Install Dependencies

Install the necessary npm packages:

```bash
npm install
```

### 4. Database Setup

Ensure your local PostgreSQL server is running and the database specified in `DB_NAME` exists. The application uses Sequelize models mapped to an existing schema. 

If you have bulk data (like `orders.csv` and `order_items.csv`), you can import them using the provided utility scripts:

```bash
npx tsx scripts/import-orders.ts path/to/orders.csv path/to/order_items.csv
```

*Note: Ensure your database schema is properly synchronized or imported before running the app.*

### 5. Start the Development Server

Start the local development server:

```bash
npm run dev
```

The application will typically be accessible at [http://localhost:8080](http://localhost:8080) (or whichever port Vite assigns).

## Project Structure

*   `src/routes/`: Contains all the page components and Tanstack Router definitions.
*   `src/components/`: Reusable React components (UI elements, forms, layouts).
*   `src/lib/`: Core application logic, database connection setup (`db/`), pricing algorithms, and server functions.
*   `src/lib/db/generated_models/`: Sequelize models automatically generated to reflect the PostgreSQL schema.
*   `scripts/`: Utility scripts for importing data, testing connections, and database seeding.

## Scripts Overview

*   `npm run dev`: Starts the development server.
*   `npm run build`: Builds the application for production.
*   `npm start`: Runs the built application.
*   `npx tsx scripts/test-db.js`: A quick test to verify your PostgreSQL connection via Sequelize.

## Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add some amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

---
*Built with ❤️ for the automotive parts e-commerce ecosystem.*