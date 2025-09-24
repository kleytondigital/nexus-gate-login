import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Check if admin user exists
    const { data: existingUsers, error: listError } = await supabaseClient.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      return new Response(
        JSON.stringify({ error: listError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const adminUser = existingUsers.users.find(user => user.email === 'admin@b2x.com.br')

    if (adminUser) {
      // User exists, confirm email and update if needed
      const { data: updatedUser, error: updateError } = await supabaseClient.auth.admin.updateUserById(
        adminUser.id,
        {
          email_confirm: true,
          user_metadata: {
            name: 'Administrador B2X'
          }
        }
      )

      if (updateError) {
        console.error('Error updating user:', updateError)
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log('Admin user email confirmed:', updatedUser.user?.email)

      return new Response(
        JSON.stringify({ 
          message: 'Admin user email confirmed successfully',
          email: 'admin@b2x.com.br',
          success: true,
          action: 'confirmed',
          user: {
            id: updatedUser.user?.id,
            email: updatedUser.user?.email
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      // User doesn't exist, create new one
      const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
        email: 'admin@b2x.com.br',
        password: '123456',
        email_confirm: true,
        user_metadata: {
          name: 'Administrador B2X'
        }
      })

      if (createError) {
        console.error('Error creating user:', createError)
        return new Response(
          JSON.stringify({ error: createError.message }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log('Admin user created successfully:', newUser.user?.email)

      return new Response(
        JSON.stringify({ 
          message: 'Admin user created successfully with confirmed email',
          email: 'admin@b2x.com.br',
          password: '123456',
          success: true,
          action: 'created',
          user: {
            id: newUser.user?.id,
            email: newUser.user?.email
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})