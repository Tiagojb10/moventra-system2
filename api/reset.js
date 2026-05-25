export const runtime = 'nodejs';

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST allowed' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { id, temp_password, new_password } = body;

    if (!id || !temp_password || !new_password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (new_password.length !== 8) {
      return res.status(400).json({ error: 'New password must be exactly 8 characters' });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    let userId = null;
    let userType = null;

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('staff_student_id', id.trim())
      .limit(1);

    if (userData && userData.length > 0) {
      userId = userData[0].id;
      userType = 'user';
    } else {
      const { data: staffData } = await supabase
        .from('staff')
        .select('id')
        .eq('staff_id', id.trim())
        .limit(1);

      if (staffData && staffData.length > 0) {
        userId = staffData[0].id;
        userType = 'staff';
      }
    }

    if (!userId) {
      return res.status(401).json({ error: 'Invalid ID or temp password' });
    }

    // Find the most recent approved reset request
    const { data: resetData } = await supabase
      .from('password_resets')
      .select('id, temp_password')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!resetData || resetData.length === 0) {
      return res.status(401).json({ error: 'No approved reset found. Please wait for admin approval.' });
    }

    if (resetData[0].temp_password !== temp_password) {
      return res.status(401).json({ error: 'Invalid ID or temp password' });
    }

    const hashedPassword = await bcrypt.hash(new_password.trim(), SALT_ROUNDS);

    const table = userType === 'user' ? 'users' : 'staff';
    await supabase.from(table).update({ password_field: hashedPassword }).eq('id', userId);

    await supabase.from('password_resets').update({ status: 'completed' }).eq('id', resetData[0].id);

    return res.status(200).json({ message: 'Password updated successfully' });

  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
