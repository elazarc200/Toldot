# Authorization — Phase 0

## Model

```text
auth.users.id
  → editorial_memberships (active)
      → editorial_roles
          → role_capabilities
              → editorial_capabilities
```

No `profiles` / `app_users` table.  
No direct per-user capability grants.  
No permanent `isAdmin` flag as the authz model.

## Capabilities

- `edit`
- `review`
- `approve`
- `publish`
- `rollback`
- `merge_entities`
- `manage_corpus`
- `manage_editorial_membership`

Seed role: `full_editor` (all capabilities).

## Database authority

`public.has_capability(capability text)`:

- Uses `auth.uid()` only — callers cannot choose the subject identity
- `SECURITY DEFINER` with fixed `search_path = pg_catalog, public`
- `EXECUTE` granted to `authenticated` only
- Reads memberships without exposing editable authz tables to ordinary users
- Avoids RLS recursion (no policies call back into themselves via user-table reads)

## Application helpers

```ts
await requireCapability("edit"); // no userId argument
await requireEditorialAccess();  // baseline: edit
```

Helpers obtain the verified session and call `rpc('has_capability')` on the **user-scoped** client. They are not the source of authority.

## Route behavior

| Actor | `/` | `/admin` |
|-------|-----|----------|
| Anonymous | allow | redirect to `/login` |
| Authenticated non-member | allow | redirect forbidden |
| Member with `edit` | allow | allow |

UI hiding is never sufficient alone.
