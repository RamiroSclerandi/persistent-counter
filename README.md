# Persistent Counter with Automatic Reset

A web application built with **Next.js 15**, **TypeScript**, **Supabase**, and **Prisma ORM** that implements a global, persistent counter with an automatic reset mechanism based on inactivity, orchestrated by a **Cron Job** and a **Supabase Edge Function**.

## 🚀 Project description

This application demonstrates a robust architecture for handling scheduled tasks and server logic decoupled from the frontend. The project consists of:

1.  **An Interactive Frontend (Next.js):** Allows any user to view and increment the value of a counter.
2.  **A Database (Supabase/PostgreSQL):** Persistently stores the state of the counter.
3.  **A Scheduled Task (Cron Job):** A database job that runs every minute to invoke a server function.
4.  **Server Logic (Edge Function):** A function running on Deno that contains the logic to check if more than 20 minutes have passed since the last update and, if so, resets the counter to `0`.

This approach ensures that the reset occurs reliably in the backend, regardless of whether there are active users on the page.

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
```

## ✨ Architecture and Technical Decisions

The key to this project is the clear separation of responsibilities between the frontend and backend, leveraging modern frameworks and Supabase's native automation tools for reliability and scalability.

### 1. **Frontend (Next.js 15 on Vercel):**

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

### 2. **Backend (Supabase):**

- **PostgreSQL Database:**  
  The foundation of the system is a single table in Supabase's hosted PostgreSQL database, which contains the persistent `Counter` record. This guarantees that the counter's value is globally shared and always available, regardless of user session or device.

- **Edge Function (`reset-counter`):**  
  The automatic reset logic is encapsulated in a serverless Edge Function written in Deno/TypeScript. This function runs independently of the frontend, checking the timestamp of the last update. If more than 20 minutes of inactivity have passed, it resets the counter to zero. This ensures that stale data is purged automatically without requiring user interaction or scheduled API calls from the frontend.

- **Cron Job (`pg_cron` Extension):**  
  Supabase's `pg_cron` extension is used to schedule tasks within the database. Every minute, a cron job triggers the Edge Function by making an HTTP request via the `pg_net` extension. This job contains no business logic—it acts solely as a trigger—ensuring the reset logic is executed reliably and asynchronously in the background.

---

This architecture is **efficient, scalable, and robust**:  
- The reset logic does not overload user requests or rely on frontend timers.
- Data persists reliably across sessions and users.
- Automated background tasks ensure the app remains fresh and correct over time, with minimal manual intervention.

This design is **efficient and scalable**: the reset logic does not overload user requests, and the verification task runs asynchronously and constantly.

---

### Edge Function code (`reset-counter`)

This is the core logic that runs on Supabase servers every time the Cron Job invokes it. The code is as follows:

```typescript
import { createClient } from 'jsr:@supabase/supabase-js@^2';

Deno.serve(async (req)=>{
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Obtain the current counter
    const { data: counter, error: fetchError } = await supabaseClient
      .from('Counter')
      .select('id, value, last_updated')
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') { // No rows found
        console.log('Counter table is empty. No action needed.');
        return new Response('No counter found.', { status: 200 });
      }
      throw fetchError;
    }

    // 2. Calculate the time difference
    const now = new Date();
    const lastUpdated = new Date(counter.last_updated);
    const diffMinutes = (now.getTime() - lastUpdated.getTime()) / (1000 * 60);

    // 3. Reset logic
    if (diffMinutes > 20) {
      if (counter.value === 0) {
        console.log(`No reset needed: counter is already 0. Last updated ${diffMinutes.toFixed(2)}m ago.`);
        return new Response(JSON.stringify({ message: 'No reset needed, counter already zero.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      console.log(`Resetting counter. Last updated ${diffMinutes.toFixed(2)}m ago.`);
      const { error: updateError } = await supabaseClient
        .from('Counter')
        .update({ value: 0, last_updated: now.toISOString() })
        .eq('id', counter.id);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ message: 'Counter reset successfully.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    console.log(`No reset needed. Last updated ${diffMinutes.toFixed(2)}m ago.`);
    return new Response(JSON.stringify({ message: 'No reset needed.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('Error in Edge Function:', err);
    return new Response(err.message, { status: 500 });
  }
});
```

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

3.  **Enable Extensions for the Cron Job:**
    To allow Supabase to run scheduled tasks, you need to enable two extensions: cron for scheduling and pg_net for making HTTP calls.

    -- Recommended Method (via Dashboard):

      In your Supabase project menu, go to Database and then Extensions.
      In the search bar, type cron and click on the extension.
      Press "Enable extension". Supabase may ask you to also enable pg_net as a dependency; accept if prompted. If it did not do so automatically, search for the pg_net extension in the same section and enable it as well.

    -- Alternative Method (via SQL Editor):

    If you prefer using SQL, go to SQL Editor, create a new query, and run the following two lines, one by one:

    ```SQL
    CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
    CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
    ```

4.  **Create the Edge Function:**
    The Edge Function will contain the reset logic. Create it directly from the Dashboard.

    a) In the left menu, click the lightning icon (⚡) to go to Edge Functions.
    b) Click the "Create a new function" button.
    c) Name the function reset-counter and confirm.
    d) An online code editor will open. Delete the example content and paste the full Edge Function code found earlier in this README.
    e) Click "Save and Deploy" in the bottom right corner and wait for the process to finish.
    f) Once deployed, go to your function details to find its invocation URL. You will need it for the next step.


5.  **Create the Cron Job:**
    Now schedule the task that will call the Edge Function every minute.

    a) Go back to Database > Extensions.

    b) Find and click the cron extension you already enabled.

    c) In the cron configuration, there will be a tab called "Jobs". Click on it.

    d) Press "New job" to open the creation form:

      - Job name: reset-counter-job
      - Schedule: * * * * * (this means "run every minute").
      - Command: Paste the following SQL code here.
        ```SQL
        SELECT net.http_post(
          url:='URL_EDGE_FUNCTION',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer SUPABASE_SERVICE_ROLE_KEY"}'::jsonb
        )```

    e) Important! Before saving, replace the two placeholders in the code:

      - `URL_EDGE_FUNCTION`: Paste the URL obtained in the previous step.
      - `SUPABASE_SERVICE_ROLE_KEY`: Found in Project Settings > API.

    f) With the correct values, click "**Create**" to save and activate the job. It's now running! You can check its execution in the Edge Function logs.

### Part 2: Frontend Setup (Next.js)

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

## 📜 License

MIT

## 📞 Contact

Developed by Ramiro Sclerandi.  
For questions or improvements, contact via GitHub.
