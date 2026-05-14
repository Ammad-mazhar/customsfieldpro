require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function seedUsers() {
  const demoUsers = [
    { email: 'admin@fieldflow.com', password: 'admin123', role: 'admin', full_name: 'Admin User' },
    { email: 'moore@fieldflow.com', password: 'staff123', role: 'staff', full_name: 'Moore' },
    { email: 'torres@fieldflow.com', password: 'staff123', role: 'staff', full_name: 'Torres' },
    { email: 'singh@fieldflow.com', password: 'staff123', role: 'staff', full_name: 'Singh' }
  ];

  console.log('\n🌱 Seeding demo users to Supabase...\n');

  for (const user of demoUsers) {
    try {
      console.log(`🔐 Hashing password for ${user.email}...`);
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      console.log(`📝 Inserting ${user.email} into database...`);
      
      // Try with just 'password' column
      const { data, error } = await supabase
        .from('users')
        .insert({
          email: user.email,
          password: hashedPassword,  // Changed back to 'password'
          role: user.role,
          full_name: user.full_name
        })
        .select();

      if (error) {
        console.error(`❌ Error creating ${user.email}:`, error.message);
      } else {
        console.log(`✅ Created: ${user.email} (${user.role})`);
      }
    } catch (err) {
      console.error(`❌ Failed for ${user.email}:`, err.message);
    }
  }

  console.log('\n✅ Seeding complete!\n');
  process.exit(0);
}

seedUsers().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});