export const runtime = 'nodejs';

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

// ==========================
// 🔒 RATE LIMITER
// Max 5 attempts per IP per 15 minutes
// ==========================
const attempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function isRateLimited(ip) {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || now - record.windowStart > WINDOW_MS) {
    attempts.set(ip, { count: 1, windowStart: now });
    return false;
  }

  if (record.count >= MAX_ATTEMPTS) {
    return true;
  }

  record.count++;
  return false;
}

export default async function handler(req, res) {
  try {
    // ✅ ONLY POST ALLOWED NOW
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Only POST requests are allowed' });
    }

    // 🔒 RATE LIMIT CHECK
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    if (isRateLimited(ip)) {
      return res.status(429).json({
        error: 'Too many attempts. Please wait 15 minutes and try again.'
      });
    }

    // ✅ FIX: define body FIRST
    const body = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    const { id, password } = body;

    // 🔐 PASSWORD LENGTH CHECK (moved here)
    if (password.length !== 8) {
      return res.status(400).json({
        error: 'Invalid password format'
      });
    }

    // ✅ VALIDATION
    if (!id || !id.trim() || !password) {
      return res.status(400).json({
        error: 'ID and password are required'
      });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Search users table first
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, plate_number, password_field')
      .eq('staff_student_id', id.trim())
      .limit(1);

    if (userError) {
      return res.status(500).json({ error: 'Database error: ' + userError.message });
    }

    if (userData && userData.length > 0) {
      const passwordMatch = await bcrypt.compare(password, userData[0].password_field);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid ID or password' });
      }
      const { password_field, ...safeUser } = userData[0];
      return res.status(200).json({ message: 'User authenticated', data: safeUser });
    }

    // Fall back to staff table
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id, name, password_field')
      .eq('staff_id', id.trim())
      .limit(1);

    if (staffError) {
      return res.status(500).json({ error: 'Database error: ' + staffError.message });
    }

    if (!staffData || staffData.length === 0) {
      return res.status(401).json({ error: 'Invalid ID or password' });
    }

    const passwordMatch = await bcrypt.compare(password, staffData[0].password_field);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid ID or password' });
    }

    // Get vehicles and drivers for staff
    const { data: vehicleData } = await supabase
      .from('staff_vehicles')
      .select('id, plate_number')
      .eq('staff_id', staffData[0].id);

    const vehicleCount = vehicleData ? vehicleData.length : 0;
    const plate_number = vehicleCount > 0 ? vehicleData[0].plate_number : null;

    let driverCount = 0;
    if (vehicleCount > 0) {
      const { data: driverData } = await supabase
        .from('staff_drivers')
        .select('driver_license')
        .eq('staff_id', staffData[0].id);
      const unique = new Set(driverData?.map(d => d.driver_license) || []);
      driverCount = unique.size;
    }

    const { password_field, ...safeStaff } = staffData[0];
    return res.status(200).json({
      message: 'User authenticated',
      data: { ...safeStaff, plate_number, vehicle_count: vehicleCount, driver_count: driverCount, is_staff: true }
    });

  } catch (err) {
    return res.status(500).json({
      error: 'Server error: ' + err.message
    });
  }
}