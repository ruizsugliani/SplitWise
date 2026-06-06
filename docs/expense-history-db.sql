-- Expense history support for Release Plan v4.
-- Run/adapt this in Supabase if public.expense_history is not already aligned.

create table if not exists public.expense_history (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  movement_type text not null check (movement_type in ('debt', 'adjustment')),
  description text,
  amount numeric(12, 2),
  old_value numeric(12, 2),
  new_value numeric(12, 2),
  date timestamptz not null default now(),
  modified_by uuid references auth.users(id)
);

create index if not exists expense_history_expense_id_date_idx
  on public.expense_history (expense_id, date desc);

-- Insert to add near the end of create_expense_v4, after the new expense id exists.
-- Rename v_expense_id if the function uses a different local variable.
insert into public.expense_history (
  expense_id,
  movement_type,
  description,
  amount,
  old_value,
  new_value,
  date,
  modified_by
) values (
  v_expense_id,
  'debt',
  'Deuda inicial',
  p_value,
  0,
  p_value,
  now(),
  p_created_by
);

-- The existing update_expense_v4 insert should keep using:
-- movement_type = 'adjustment'
-- amount = p_value - previous_value
-- old_value = previous_value
-- new_value = p_value
-- date = now()
-- modified_by = p_modified_by
