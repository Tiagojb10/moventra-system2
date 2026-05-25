export const runtime = 'nodejs';

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Only POST requests are allowed' });
    }

    const body = typeof req.body === 'string'
      ? JSON.parse(req.body)
      : req.body;

    // ==========================
    // VALIDATION
    // ==========================
    if (!body.name || !body.staff_id || !body.password) {
      return res.status(400).json({ error: 'Please fill in all required fields' });
    }

    if (body.password.length !== 8) {
      return res.status(400).json({ error: 'Password must be exactly 8 characters' });
    }

    if (!body.vehicles || body.vehicles.length === 0) {
      return res.status(400).json({ error: 'Please add at least one vehicle' });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // ==========================
    // 1. HASH PASSWORD
    // ==========================
    const hashedPassword = await bcrypt.hash(body.password.trim(), SALT_ROUNDS);

    // ==========================
    // 2. INSERT STAFF MEMBER
    // ==========================
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .insert([{
        name: body.name.trim(),
        staff_id: body.staff_id.trim(),
        password_field: hashedPassword,
        phone: body.phone || null,
        address: body.address || null,
        college: body.college || null,
        campus_status: body.campus_status === true,
        driver_license: body.driver_license || null,
        created_at: new Date()
      }])
      .select()
      .single();

    if (staffError) {
      if (staffError.message.toLowerCase().includes('duplicate')) {
        return res.status(400).json({ error: 'This Staff ID is already registered' });
      }
      return res.status(500).json({ error: 'Database error: ' + staffError.message });
    }

    const staffId = staffData.id;

    // ==========================
    // 3. INSERT VEHICLES + DRIVERS
    // ==========================
    for (const vehicle of body.vehicles) {
      if (!vehicle.plate_number) continue;

      // Insert vehicle
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('staff_vehicles')
        .insert([{
          staff_id: staffId,
          plate_number: vehicle.plate_number.trim().toUpperCase(),
          make: vehicle.make || null,
          color: vehicle.color || null,
          created_at: new Date()
        }])
        .select()
        .single();

      if (vehicleError) {
        return res.status(500).json({ error: 'Vehicle error: ' + vehicleError.message });
      }

      const vehicleId = vehicleData.id;

      // Insert designated drivers for this vehicle
      if (vehicle.drivers && vehicle.drivers.length > 0) {
        const driversToInsert = vehicle.drivers
          .filter(d => d.driver_name && d.driver_license)
          .map(d => ({
            vehicle_id: vehicleId,
            staff_id: staffId,
            driver_name: d.driver_name.trim(),
            driver_license: d.driver_license.trim().toUpperCase(),
            created_at: new Date()
          }));

        if (driversToInsert.length > 0) {
          const { error: driverError } = await supabase
            .from('staff_drivers')
            .insert(driversToInsert);

          if (driverError) {
            return res.status(500).json({ error: 'Driver error: ' + driverError.message });
          }
        }
      }
    }

    // ==========================
    // 4. SUCCESS
    // ==========================
    return res.status(200).json({
      message: 'Staff registration successful',
      data: staffData
    });

  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
