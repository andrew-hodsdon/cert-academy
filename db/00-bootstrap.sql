-- Conflux Academy: roles and database. Run as the Omni superuser (postgres).
--
-- Needs psql variables db, app_role and app_password. Send the password on stdin, never
-- as `-v app_password=...` (argv is visible in `ps`). See README.md, step 2.
--
-- CREATE DATABASE cannot run inside a transaction, so this file is not wrapped in one.
-- Every statement is idempotent so it can be replayed.

\set ON_ERROR_STOP on
\set owner_role :db '_owner'

-- Owner: NOLOGIN. It owns every object so the app role never holds DDL rights.
SELECT format('CREATE ROLE %I NOLOGIN', :'owner_role')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'owner_role') \gexec

-- App: the only login. DML on content tables; telemetry is append-only by trigger.
SELECT format('CREATE ROLE %I LOGIN', :'app_role')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_role') \gexec
ALTER ROLE :"app_role" WITH LOGIN PASSWORD :'app_password' CONNECTION LIMIT 40;

SELECT format('CREATE DATABASE %I OWNER %I ENCODING ''UTF8'' TEMPLATE template0', :'db', :'owner_role')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'db') \gexec

REVOKE ALL ON DATABASE :"db" FROM PUBLIC;
GRANT CONNECT, TEMPORARY ON DATABASE :"db" TO :"app_role";
