import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://ciganxsasqlvymlcqdmr.supabase.co"

const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZ2FueHNhc3FsdnltbGNxZG1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTg0NDcsImV4cCI6MjA5OTEzNDQ0N30.Al05MmBxZaVhZUAjFD0-mFUZK2S0ROtYed7r8ZbSY6c"

const supabase = createClient(
  supabaseUrl,
  supabaseKey
)

export { supabase }