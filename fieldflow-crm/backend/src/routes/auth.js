const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    console.log(`🔐 Login attempt for: ${email}`);

    // Call PostgreSQL function to verify password
    const { data, error } = await supabase
      .rpc('authenticate_user', { 
        user_email: email, 
        user_password: password 
      });

    if (error) {
      console.error('Supabase RPC error:', error);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!data || data.length === 0) {
      console.log('❌ No user found or invalid password');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = data[0];
    console.log('✅ User authenticated:', user.email);

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key-change-this',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role, 
        name: user.full_name 
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// Get current user
router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');
    
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role, full_name')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.full_name
      }
    });
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;