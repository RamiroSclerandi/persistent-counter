# Persistent Counter with Automatic Reset

A web application built with **Next.js 15**, **TypeScript**, **Supabase**, and **Prisma ORM** that implements a global, persistent counter with an automatic reset mechanism based on inactivity, orchestrated by a decoupled mechanism using **Redis** and a background **Worker**.

## 🚀 Project description

This application demonstrates a robust architecture for handling scheduled tasks and server logic decoupling the backend from the frontend.

The project consists of:

1.  **An Interactive Frontend (Next.js):** Allows any user to view and increment the value of a counter.
    - The counter is displayed in real-time, and users can increment or decrement its value.
    - It does not go to negative values.
    - The counter is globally shared, meaning all users see the same value.
    - The frontend uses Next.js Server Components for initial data loading and Client Components for interactivity.
    - All mutations are handled via Next.js Server Actions, ensuring secure state changes.

2.  **A Database (Supabase/PostgreSQL):** Persistently stores the state of the counter.
    - The counter is stored in a single table with a record that contains the current value and the timestamp of the last update.
    - The app uses Supabase Realtime to automatically synchronize the counter value across all open tabs.

3. **Prisma ORM:** Is used for type-safe database access, ensuring reliable and efficient queries.
    - PrismaClient is instantiated as a singleton to prevent connection leaks and ensure consistent access to the database.

4.  **A Background Worker (Redis + Railway):** Monitors the counter and resets it automatically if it has not been updated in the last 20 minutes.
    - The worker uses Redis to set a key that expires after 20 minutes, indicating the counter has been reset.
    - It listens for expiration events on the Redis channel and triggers a reset notification to the backend.

5. **Server actions for reset logic:**  
   The reset logic is implemented in a route handler that is invoked by the background worker and resets it to zero if more than 20 minutes have passed since the last update.

This approach ensures that the reset occurs reliably in the backend, regardless of whether there are active users on the page or not.

## 📂 Project Structure

```
persistent-counter/
  src/
    app/
      globals.css
      page.tsx
      layout.tsx
      components/
        Counter.tsx
      actions/
        counter.ts
    lib/
      prisma.ts
  prisma/
    schema.prisma
  public/
  .env.sample
  package.json
  README.md
  .gitignore

persistent-counter-worker/
  index.js
  .env.example
  package.json
  README.md
```

## ✨ Architecture and Technical Decisions

The key to this project is the clear separation of responsibilities between the frontend and backend, leveraging modern frameworks and Supabase's native automation tools for reliability and scalability.

### 1. **Frontend:**

- **Server Components for Initial Data Loading:**  
  The core UI is built using Next.js 15's Server Components, which allow data fetching and rendering to happen on the server, resulting in fast initial loads and improved SEO. These components fetch the current counter value directly from the backend on every page request, ensuring that users always see the latest, persistent state.

- **Client Components for Interactivity:**  
  Interactive elements, such as the buttons to increment or decrement the counter, are implemented as Client Components. This enables real-time updates and responsive feedback to user actions, while maintaining a clean separation between static and interactive UI logic.

- **Server Actions for Secure State Changes:**  
  All mutations (increment and decrement operations) are handled via Next.js Server Actions. This ensures that any change to the counter is processed and validated on the backend, preventing unauthorized manipulations from the client side and guaranteeing data integrity.

- **Prisma ORM for Type-Safe Database Access:**  
  The frontend connects to the Supabase Postgres database using Prisma ORM. Prisma provides a robust, type-safe interface for querying and updating the database, reducing the risk of errors and improving developer productivity.

- **PrismaClient Singleton Pattern for Connection Management:**  
  To ensure consistent and persistent database access, a singleton pattern is implemented when instantiating `PrismaClient`. In development, Next.js hot-reloads modules frequently, which can unintentionally spawn multiple Prisma instances and exhaust database connections. By storing the PrismaClient instance globally, only a single instance is reused across all requests, preventing connection leaks and ensuring that data remains reliable. This approach is crucial for maintaining stability and optimal resource usage in both development and production environments.

### 2. **Database:**

- **PostgreSQL Database on Supabase:**  
  The foundation of the system is a single table in Supabase's hosted PostgreSQL database, which contains the persistent `Counter` record. This guarantees that the counter's value is globally shared and always available, regardless of user session or device.

- **Realtime update:**  
  The app uses Supabase Realtime to automatically synchronize the counter value across all open tabs.  
  When the counter is updated (either by user action, cron job, or edge function), the event is broadcast in real-time to all connected clients via the WebSocket channel provided by Supabase.  
  To achieve this:
  - The **Realtime option** was enabled on the `counter` table from the Supabase console.
  - A **Supabase client was used in the frontend**, it is created at `src/lib/supabaseClient.ts` using `@supabase/supabase-js`. The necessary environment variables (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`) must be configured in the local environment.
  - **All subscription logic is handled in the frontend**, using this client. The React component subscribes to table events and updates the counter in real-time when changes are detected.

- **Redis for reset logic:**  
    A Redis key is set to expire after 20 minutes, indicating that the counter has been reset.

- **A background worker running with Node.js:**  
    A background worker listens for expiration events on the Redis channel. When the key expires, it triggers a reset of the counter by calling a backend endpoint that is responsible for resetting the counter to zero.

  _This way, the counter is always in the correct value in both frontend and database._

- **Security Considerations:**
  A policy Row Level Security (RLS) was configured on the table to only allow SELECT public queries:
    ```sql
    ALTER TABLE public.counter ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Public read access" ON public.counter
    FOR SELECT
    USING (true);
    ```

---

This architecture is **efficient, scalable, and robust**:  
- The reset logic does not overload user requests or rely on frontend timers.
- Data persists reliably across sessions and users.
- Automated background tasks ensure the app remains fresh and correct over time, with minimal manual intervention.

---

## ⚙️ End-to-End Tutorial: Replicate the Project

Follow these steps to set up a fully functional copy of this project from scratch.

### Part 1: Supabase Setup (Backend)

1.  **Create a Project in Supabase:**
    *   Go to [supabase.com](https://supabase.com), sign up, and create a new project.
    *   Save the **database password** in a safe place. You will need it later.

2.  **Create the `Counter` Table:**
    *   In your project dashboard, go to `SQL Editor`.
    *   Create a new query and run the following script to create the table and its single record:

    ```sql
    -- 1. Create the Counter table
    CREATE TABLE public."Counter" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      value INT NOT NULL DEFAULT 0,
      last_updated TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- 2. Insert the initial counter record
    INSERT INTO public."Counter" (value) VALUES (0);
    ```

### Part 2: Whole project Setup (Next.js)

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/RamiroSclerandi/persistent-counter.git
    cd persistent-counter
    ```

2.  **Install Dependencies:**
    ```bash
    pnpm install
    ```

3.  **Configure Environment Variables:**
    *   Find the `.env.sample` file in the project root.
    *   Rename it to `.env`.
    *   Fill in the variables with your **Supabase project** credentials:
        *   `DATABASE_URL`: Found in `Project Settings` > `Database` > `Connection string` (URI). Use the password you saved.
        *   `DIRECT_URL`: Found in the same place.
        *   `SUPABASE_URL` and `SUPABASE_ANON_KEY`: Found in `Project Settings` > `API`.

4.  **Sync Prisma:**
    *   Make sure your `schema.prisma` matches the Supabase table. Then run:
    ```bash
    pnpm prisma generate
    ```

5.  **Run the App:**
    ```bash
    pnpm run dev
    ```
    Done! Open `http://localhost:3000` and you should see the counter working, connected to your own Supabase backend.

---
#### Important Note on Reset Logic:
You have to know that to have the reset logic working, you need to set up this project public on the internet either deploying it on a cloud service such as Vercel for example or use a tunneling service like ngrok (only to test it, not recommende for production).
This is needed for the background worker (next step) to be able to call the reset endpoint.

---

### Part 3: Background Worker Setup (Redis + Node.js Worker + Railway)

1.  **Create a Railway Project:**
    *   Go to [railway.app](https://railway.app), sign up, and create a new project.
    *   Choose the **Redis** template to create a Redis instance.
    *  Obtain the **Redis host**, **port**, and **password** from the Railway URL.

2.  **Set Up the Node.js Worker:**
    *  Choose GitHub as the deployment method.
    *  You must have a GitHub repository with the `persistent-counter-worker` code. [Here is the repository](https://github.com/RamiroSclerandi/persistent-counter-worker).

3. Configure the Environment Variables in Railway. 
    ```
    REDIS_HOST=<your_redis_host>
    REDIS_PORT=<your_redis_port>
    REDIS_PASSWORD=<your_redis_password>
    RESET_ENDPOINT_URL=https://your-backend-url.com/api/reset-counter
    RESET_SECRET=<your_reset_secret>
    COUNTER_KEY=contador_reset
    ```
    *   Replace `<your_redis_host>`, `<your_redis_port>`, and `<your_redis_password>` with the values from your Railway Redis instance previously configured.
    *   Set `RESET_ENDPOINT_URL` to the URL of your backend reset endpoint (e.g., `https://your-backend-url.com/api/reset-counter`).
    *   Set `RESET_SECRET` to a secret value that will be used to authenticate the reset request.

## 📜 License

MIT

## 📞 Contact

Developed by Ramiro Sclerandi.  
For questions or improvements, contact via GitHub.
