-- Phase 1: shared enums, extensions, editorial helper columns pattern
create extension if not exists pg_trgm;

do $$ begin
  create type public.knowledge_state as enum ('known', 'estimated', 'disputed', 'unknown');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.lifecycle_status as enum (
    'identified', 'draft', 'in_review', 'approved', 'published', 'archived'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.time_precision as enum (
    'exact', 'year', 'range', 'generation_only', 'period_only', 'unknown'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.narrative_significance as enum (
    'primary', 'major', 'supporting', 'mentioned'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.relationship_family as enum (
    'teacher_student', 'parent_child', 'spouse', 'sibling', 'bar_plugta'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.name_kind as enum (
    'primary', 'alternate', 'alias', 'spelling_variant', 'title_honorific'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.evidence_stance as enum (
    'supports', 'contradicts', 'contextual'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.aggregate_type as enum (
    'person', 'place', 'period', 'episode', 'event', 'story', 'source_work', 'generation', 'political_rule', 'region'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.identity_status as enum (
    'resolved', 'unresolved', 'merge_review'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.time_range_kind as enum ('life', 'activity');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.chronology_band as enum (
    'older', 'middle', 'younger', 'custom', 'unresolved'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.chronology_constraint_kind as enum ('before', 'after');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.dispute_state as enum ('none', 'open', 'resolved');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.relationship_importance as enum ('primary', 'secondary', 'minor');
exception when duplicate_object then null;
end $$;

-- Convenience: editorial membership check (auth.uid only)
create or replace function public.is_editorial()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.has_capability('edit');
$$;

revoke all on function public.is_editorial() from public;
grant execute on function public.is_editorial() to authenticated;
