# Persistent Counter con Reinicio Automático

Una aplicación web creada con **Next.js 15**, **TypeScript**, **Supabase** y **Prisma ORM** que implementa un contador global, persistente y con un mecanismo de reinicio automático basado en inactividad, orquestado por un **Cron Job** y una **Edge Function** de Supabase.

## 🚀 Descripción del Proyecto

Esta aplicación demuestra una arquitectura robusta para manejar tareas programadas y lógica de servidor desacoplada del frontend. El proyecto consiste en:

1.  **Un Frontend Interactivo (Next.js):** Permite a cualquier usuario ver e incrementar el valor de un contador.
2.  **Una Base de Datos (Supabase/PostgreSQL):** Almacena de forma persistente el estado del contador.
3.  **Una Tarea Programada (Cron Job):** Un trabajo en la base de datos que se ejecuta cada minuto para invocar una función de servidor.
4.  **Lógica de Servidor (Edge Function):** Una función que se ejecuta con Deno que contiene la lógica para verificar si han pasado más de 20 minutos desde la última actualización y, de ser así, reiniciar el contador a `0`.

Este enfoque garantiza que el reinicio ocurra de forma fiable en el backend, independientemente de si hay usuarios activos en la página.

## 📂 Estructura del Proyecto

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

## ✨ Arquitectura y Decisiones Técnicas

La clave de este proyecto es la separación de responsabilidades entre el frontend y el backend, utilizando las herramientas nativas de Supabase para la automatización.

1.  **Frontend (Next.js 15 en Vercel):**
    *   Construido con **Server Components** para la carga inicial de datos y **Client Components** para la interactividad.
    *   Usa **Server Actions** para modificar el contador, garantizando que las escrituras se validen en el servidor.
    *   Se conecta a la base de datos a través de **Prisma ORM** para obtener el valor actual del contador de forma segura y tipada.

2.  **Backend (Supabase):**
    *   **Base de Datos PostgreSQL:** El corazón del sistema, donde se guarda el único registro del `Counter`.
    *   **Edge Function (`reset-counter`):** Una función serverless escrita en Deno/TypeScript. Su única responsabilidad es leer el estado del contador, calcular el tiempo de inactividad y reiniciarlo si se cumple la condición (> 20 min).
    *   **Cron Job (`pg_cron`):** Se utiliza la extensión de PostgreSQL `pg_cron` para programar una tarea que se ejecuta cada minuto. Esta tarea no contiene lógica, simplemente realiza una petición HTTP (utilizando `pg_net`) para invocar la Edge Function, actuando como un disparador (trigger).

Este diseño es **eficiente y escalable**: la lógica de reinicio no sobrecarga las peticiones del usuario y la tarea de verificación se ejecuta de forma asíncrona y constante.

### Código de la Edge Function (`reset-counter`)

Esta es la lógica central que se ejecuta en los servidores de Supabase cada vez que el Cron Job la invoca.

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

## ⚙️ Tutorial End-to-End: Replicar el Proyecto

Sigue estos pasos para levantar una copia completamente funcional de este proyecto desde cero.

### Parte 1: Configuración de Supabase (Backend)

1.  **Crear un Proyecto en Supabase:**
    *   Ve a [supabase.com](https://supabase.com), regístrate y crea un nuevo proyecto.
    *   Guarda la **contraseña de la base de datos** en un lugar seguro. La necesitarás más adelante.

2.  **Crear la Tabla `Counter`:**
    *   En el dashboard de tu proyecto, ve a `SQL Editor`.
    *   Crea una nueva consulta y ejecuta el siguiente script para crear la tabla y su único registro:

    ```sql
    -- 1. Crear la tabla Counter
    CREATE TABLE public."Counter" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      value INT NOT NULL DEFAULT 0,
      last_updated TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- 2. Insertar el registro inicial del contador
    INSERT INTO public."Counter" (value) VALUES (0);
    ```

3.  **Activar Extensiones para el Cron Job:**
    Para que Supabase pueda ejecutar tareas programadas, necesitamos activar dos extensiones: cron para la programación y pg_net para realizar llamadas HTTP.

    -- Método Recomendado (vía Dashboard):

      En el menú de tu proyecto de Supabase, ve a Database y luego a Extensions.
      En la barra de búsqueda, escribe cron y haz clic en la extensión.
      Presiona "Enable extension". Supabase podría pedirte que también actives pg_net como dependencia; acepta si es el caso. Si no lo hizo automáticamente, busca la extensión pg_net en la misma sección y actívala también.

    -- Método Alternativo (vía SQL Editor):

    Si prefieres usar SQL, ve a SQL Editor, crea una nueva consulta y ejecuta las siguientes dos líneas, una por una:

    ```SQL
    CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
    CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
    ```

4.  **Crear la Edge Function:**
    La Edge Function contendrá la lógica de reinicio. La crearemos directamente desde el Dashboard.

    a) En el menú de la izquierda, haz clic en el ícono del rayo (⚡) para ir a Edge Functions.
    b) Haz clic en el botón "Create a new function".
    c) Nombra la función reset-counter y confírmala.
    d) Se abrirá un editor de código directamente en tu navegador. Borra el contenido de ejemplo y pega el código completo de la Edge Function que se encuentra más arriba en este README.
    e) Haz clic en "Save and Deploy" en la esquina inferior derecha y espera a que el proceso finalice.
    f) Una vez desplegada, ve a los detalles de tu función para encontrar su URL de invocación. La necesitarás para el siguiente paso.


5.  **Crear el Cron Job:**
    Ahora se programa la tarea que llamará a la Edge Function cada minuto.

    a) Volver a la sección Database > Extensions.

    b) Buscar y hacer click en la extensión cron que ya activaste.

    c) Dentro de la configuración de cron, habrá una pestaña llamada "Jobs". Hacer click en ella.

    d) Presionar "New job" para abrir el formulario de creación:

      - Job name: reset-counter-job
      - Schedule: * * * * * (esto significa "ejecutar cada minuto").
      - Command: Pega aquí el siguiente código SQL.
        ```SQL
        SELECT net.http_post(
          url:='URL_EDGE_FUNCTION',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer SUPABASE_SERVICE_ROLE_KEY"}'::jsonb
        )```

    e) ¡Importante! Antes de guardar, hay que reemplazar los dos placeholders en el código:

      - `URL_EDGE_FUNCTION`: Pegar la URL obtenida en el paso anterior.
      - `SUPABASE_SERVICE_ROLE_KEY`: Se obtiene en Project Settings > API.

    f) Con los valores correctos, hacer clic en "**Create**" para guardar y activar el job. ¡Ya está funcionando! Puedes verificar su ejecución en los logs de la Edge Function.

### Parte 2: Configuración del Frontend (Next.js)

1.  **Clonar el Repositorio:**
    ```bash
    git clone https://github.com/RamiroSclerandi/persistent-counter.git
    cd persistent-counter
    ```

2.  **Instalar Dependencias:**
    ```bash
    pnpm install
    ```

3.  **Configurar Variables de Entorno:**
    *   Busca el archivo `.env.sample` en la raíz del proyecto.
    *   Renómbralo a `.env`.
    *   Rellena las variables con las credenciales de **tu proyecto de Supabase**:
        *   `DATABASE_URL`: La encuentras en `Project Settings` > `Database` > `Connection string` (URI). Usa la contraseña que guardaste.
        *   `DIRECT_URL`: La encuentras en el mismo lugar.
        *   `SUPABASE_URL` y `SUPABASE_ANON_KEY`: Las encuentras en `Project Settings` > `API`.

4.  **Sincronizar Prisma:**
    *   Asegúrate de que tu `schema.prisma` coincida con la tabla de Supabase. Luego, ejecuta:
    ```bash
    pnpm prisma generate
    ```

5.  **Ejecutar la App:**
    ```bash
    pnpm run dev
    ```
    ¡Listo! Abre `http://localhost:3000` y deberías ver el contador funcionando, conectado a tu propio backend de Supabase.

## 📜 Licencia

MIT

## 📞 Contacto

Desarrollado por Ramiro Sclerandi.  
Para dudas o mejoras contacta por GitHub.
