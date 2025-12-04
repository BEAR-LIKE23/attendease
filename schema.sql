-- Create a table for public profiles (optional, but good practice)
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role text check (role in ('teacher', 'student')) default 'student',
  student_id_number text, -- Only for students
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS) for profiles
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Create a table for Courses
create table public.courses (
  id uuid default gen_random_uuid() primary key,
  created_by uuid references auth.users not null, -- Teacher
  name text not null,
  code text not null, -- e.g. CS101
  enrollment_code text unique not null, -- Secret code for students to join
  description text,
  schedule text, -- e.g. "Mon/Wed 10:00 AM"
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.courses enable row level security;

create policy "Courses are viewable by everyone."
  on courses for select
  using ( true );

create policy "Teachers can insert courses."
  on courses for insert
  with check ( auth.uid() = created_by );

-- Create a table for Course Enrollments
create table public.enrollments (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses not null,
  student_uid uuid references auth.users not null,
  enrolled_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(course_id, student_uid)
);

alter table public.enrollments enable row level security;

create policy "Students can view their own enrollments."
  on enrollments for select
  using ( auth.uid() = student_uid );

create policy "Teachers can view enrollments for their courses."
  on enrollments for select
  using ( 
    exists (
      select 1 from courses
      where courses.id = enrollments.course_id
      and courses.created_by = auth.uid()
    )
  );

create policy "Students can enroll themselves."
  on enrollments for insert
  with check ( auth.uid() = student_uid );

-- Create a table for Class Sessions
create table public.sessions (
  id uuid default gen_random_uuid() primary key,
  created_by uuid references auth.users not null,
  course_id uuid references public.courses, -- Optional link to a course
  class_name text not null,
  topic text not null,
  code text not null unique,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Sessions
alter table public.sessions enable row level security;

create policy "Sessions are viewable by everyone (for students to check code)."
  on sessions for select
  using ( true );

create policy "Teachers can insert their own sessions."
  on sessions for insert
  with check ( auth.uid() = created_by );

create policy "Teachers can update their own sessions."
  on sessions for update
  using ( auth.uid() = created_by );

-- Create a table for Attendance Records
create table public.attendance (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.sessions not null,
  student_uid uuid references auth.users, -- Link to registered student account
  student_name text not null, -- Fallback or snapshot
  student_id text not null, -- Fallback or snapshot
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(session_id, student_id) -- Prevent duplicate check-ins by ID
);

-- RLS for Attendance
alter table public.attendance enable row level security;

create policy "Attendance is viewable by the session creator (Teacher)."
  on attendance for select
  using ( 
    exists (
      select 1 from sessions
      where sessions.id = attendance.session_id
      and sessions.created_by = auth.uid()
    )
  );

create policy "Students can view their own attendance."
  on attendance for select
  using ( auth.uid() = student_uid );

create policy "Students can insert attendance."
  on attendance for insert
  with check ( true ); 

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role, student_id_number)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    new.raw_user_meta_data->>'student_id_number'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
-- Note: If trigger already exists, drop it first or use create or replace logic if supported for triggers (postgres doesn't support create or replace trigger directly usually)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
