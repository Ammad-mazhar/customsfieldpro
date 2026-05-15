const express  = require('express')
const router   = express.Router()
const jwt      = require('jsonwebtoken')
const supabase = require('../utils/supabase')

const JWT_SECRET  = process.env.JWT_SECRET || 'your-secret-key-change-this'
const JWT_EXPIRES = '7d'

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  try {
    // Verify password via PostgreSQL crypt() function
    const { data, error } = await supabase
      .rpc('authenticate_user', { user_email: email, user_password: password })

    if (error || !data || data.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const user = data[0]

    // Fetch tenant_id separately — include it in the token so all routes can scope queries
    const { data: fullUser } = await supabase
      .from('users')
      .select('tenant_id, is_active, full_name')
      .eq('id', user.id)
      .single()

    if (fullUser?.is_active === false) {
      return res.status(401).json({ error: 'Account is inactive' })
    }

    const token = jwt.sign(
      {
        id:        user.id,
        email:     user.email,
        role:      user.role,
        tenant_id: fullUser?.tenant_id || null,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    )

    res.json({
      success: true,
      token,
      user: {
        id:        user.id,
        email:     user.email,
        role:      user.role,
        name:      fullUser?.full_name || user.full_name,
        tenant_id: fullUser?.tenant_id || null,
      },
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' })
})

// GET /api/auth/me — verify token and return current user
router.get('/me', async (req, res) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }

  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET)

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role, full_name, tenant_id, is_active')
      .eq('id', decoded.id)
      .single()

    if (error || !user) return res.status(401).json({ error: 'Invalid token' })
    if (user.is_active === false) return res.status(401).json({ error: 'Account is inactive' })

    res.json({
      success: true,
      user: {
        id:        user.id,
        email:     user.email,
        role:      user.role,
        name:      user.full_name,
        tenant_id: user.tenant_id,
      },
    })
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' })
  }
})

module.exports = router
