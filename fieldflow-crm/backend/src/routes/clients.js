const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Auth middleware - verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('🔐 Auth check:');
  console.log('  - Authorization header:', authHeader ? 'Present' : 'Missing');
  console.log('  - Token extracted:', token ? 'Yes' : 'No');

  if (!token) {
    console.log('  ❌ No token provided');
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    console.log('  - JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('  - JWT_SECRET length:', process.env.JWT_SECRET?.length || 0);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');
    
    console.log('  ✅ Token valid! User:', decoded.email);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('  ❌ Token verification failed:', error.message);
    console.error('  Error type:', error.name);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Create client
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('📝 Creating client for user:', req.user.email);
    console.log('📝 Client data:', req.body);
    
    const { data, error } = await supabase
      .from('clients')
      .insert([req.body])
      .select();

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }

    console.log('✅ Client created successfully:', data[0]);
    res.status(201).json({ success: true, data: data[0] });
  } catch (error) {
    console.error('❌ Error creating client:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all clients
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single client
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(404).json({ error: 'Client not found' });
  }
});

// Update client
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .update(req.body)
      .eq('id', req.params.id)
      .select();

    if (error) throw error;

    res.json({ success: true, data: data[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete client
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ success: true, message: 'Client deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;