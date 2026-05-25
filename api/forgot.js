export const runtime = 'nodejs';

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST allowed' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { id } = body;

    if (!id || !id.trim()) return res.status(400).json({ error: 'ID is required' });

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

    // Always return success to avoid revealing whether an ID exists
    if (!userId) {
      return res.status(200).json({ message: 'Reset request submitted' });
    }

    // Check for existing pending request — don't create duplicates
    const { data: existing } = await supabase
      .from('password_resets')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .limit(1);

    if (!existing || existing.length === 0) {
      await supabase.from('password_resets').insert([{
        user_id: userId,
        user_type: userType,
        status: 'pending',
        created_at: new Date()
      }]);
    }

    return res.status(200).json({ message: 'Reset request submitted' });

  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
