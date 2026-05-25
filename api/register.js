export const runtime = 'nodejs';

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Only POST requests are allowed' });
    }

    // ✅ FIX: define body FIRST
    const body = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    // 🔐 PASSWORD LENGTH CHECK (moved here)
    if (body.password.length !== 8) {
      return res.status(400).json({
        error: 'Password must be exactly 8 characters'
      });
    }

    // ✅ VALIDATION (UNCHANGED)
    if (
      !body.name ||
      !body.staff_student_id ||
      !body.role ||
      !body.plate_number ||
      !body.password
    ) {
      return res.status(400).json({
        error: 'Please fill in all required fields including password'
      });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // 🔐 HASH PASSWORD before storing — never save plain text
    const hashedPassword = await bcrypt.hash(body.password.trim(), SALT_ROUNDS);

    const { data, error } = await supabase
      .from('users')
      .insert([{
        name: body.name.trim(),
        staff_student_id: body.staff_student_id.trim(),
        role: body.role,

        phone: body.phone || null,
        address: body.address || null,
        college: body.college || null,
        campus_status: body.campus_status === true,
        driver_license: body.driver_license || null,

        plate_number: body.plate_number.trim(),
        make: body.make || null,
        color: body.color || null,

        password_field: hashedPassword,

        created_at: new Date()
      }])
      .select();

    if (error) {
      if (error.message.toLowerCase().includes('duplicate')) {
        return res.status(400).json({
          error: 'This ID or plate number is already registered'
        });
      }

      if (error.message.toLowerCase().includes('null value')) {
        return res.status(400).json({
          error: 'Some required data is missing'
        });
      }

      return res.status(500).json({
        error: 'Database error: ' + error.message
      });
    }

    return res.status(200).json({
      message: 'Registration successful',
      data
    });

  } catch (err) {
    return res.status(500).json({
      error: 'Server error: ' + err.message
    });
  }
}