// ==========================
// STAFF STAGE NAVIGATION
// ==========================
function showStaffStage(stage) {
  [1, 2, 3].forEach(i => {
    document.getElementById(`sStage${i}`)?.classList.add('hidden');
    const ind = document.getElementById(`sInd${i}`);
    if (ind) {
      ind.style.background = i === stage ? '#dc2626' : '#d1d5db';
      ind.style.color = i === stage ? 'white' : '#374151';
    }
  });

  document.getElementById(`sStage${stage}`)?.classList.remove('hidden');

  const progressMap = { 1: '33%', 2: '66%', 3: '100%' };
  const bar = document.getElementById('staffProgressBar');
  if (bar) bar.style.width = progressMap[stage];
}

function showFeedback(message, type = 'error') {
  const div = document.getElementById('feedback');
  if (!div) return;
  div.textContent = message;
  div.className = type === 'success'
    ? 'bg-green-200 text-green-800 p-2 rounded-lg mb-2 text-sm'
    : 'bg-red-200 text-red-800 p-2 rounded-lg mb-2 text-sm';
  setTimeout(() => { div.textContent = ''; div.className = ''; }, 4000);
}

function shakeField(el) {
  if (!el) return;
  el.classList.add('invalid');
  el.animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }], { duration: 300 });
}

// ==========================
// NEXT BUTTON HANDLERS
// ==========================
window.staffNext = function(fromStage) {
  if (fromStage === 1) {
    const name = document.getElementById('sName');
    const staffId = document.getElementById('sStaffId');
    const password = document.getElementById('sPassword');
    let valid = true;

    [name, staffId, password].forEach(el => {
      if (!el.value.trim()) { shakeField(el); valid = false; }
    });

    if (!valid) return showFeedback('Please fill in all required fields');
    if (password.value.length !== 8) return showFeedback('Password must be exactly 8 characters');

    showStaffStage(2);
  }

  if (fromStage === 2) {
    const plates = document.querySelectorAll('[data-field="plate_number"]');
    let valid = true;

    plates.forEach(input => {
      const pattern = /^[A-Z]{3}-\d{4}$/;
      if (!pattern.test(input.value)) {
        shakeField(input);
        valid = false;
      }
    });

    if (plates.length === 0) return showFeedback('Please add at least one vehicle');
    if (!valid) return showFeedback('Plate numbers must be in format ABC-1234');

    showStaffStage(3);
  }
};

window.staffBack = function(fromStage) {
  showStaffStage(fromStage - 1);
};

// ==========================
// COLLECT FORM DATA
// ==========================
function collectVehicles() {
  const vehicleIds = [...document.querySelectorAll('[data-vehicle]')]
    .map(el => el.dataset.vehicle)
    .filter((v, i, arr) => arr.indexOf(v) === i); // unique

  return vehicleIds.map(id => ({
    plate_number: document.querySelector(`[data-vehicle="${id}"][data-field="plate_number"]`)?.value || '',
    make: document.querySelector(`[data-vehicle="${id}"][data-field="make"]`)?.value || '',
    color: document.querySelector(`[data-vehicle="${id}"][data-field="color"]`)?.value || '',
    drivers: []
  }));
}

function collectDrivers(vehicles) {
  const driverIds = [...document.querySelectorAll('[data-driver][data-field="driver_name"]')]
    .map(el => el.dataset.driver)
    .filter((v, i, arr) => arr.indexOf(v) === i);

  driverIds.forEach(id => {
    const name = document.querySelector(`[data-driver="${id}"][data-field="driver_name"]`)?.value || '';
    const license = document.querySelector(`[data-driver="${id}"][data-field="driver_license"]`)?.value || '';
    const checked = [...document.querySelectorAll(`[data-driver="${id}"][data-field="vehicle_check"]:checked`)];

    checked.forEach(checkbox => {
      const vehicleIndex = parseInt(checkbox.value);
      if (name && license && vehicles[vehicleIndex]) {
        vehicles[vehicleIndex].drivers.push({ driver_name: name, driver_license: license });
      }
    });
  });

  return vehicles;
}

// ==========================
// SUBMIT HANDLER
// ==========================
document.getElementById('staffRegistrationForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const loadingOverlay = document.getElementById('loadingOverlay');
  const successScreen = document.getElementById('successScreen');
  const successName = document.getElementById('successName');
  const successPlate = document.getElementById('successPlate');
  const successQR = document.getElementById('successQR');
  const downloadQRBtn = document.getElementById('downloadQRBtn');

  let vehicles = collectVehicles();
  vehicles = collectDrivers(vehicles);

  const payload = {
    name: document.getElementById('sName')?.value,
    staff_id: document.getElementById('sStaffId')?.value,
    password: document.getElementById('sPassword')?.value,
    phone: document.getElementById('sPhone')?.value,
    address: document.getElementById('sAddress')?.value,
    college: document.getElementById('sCollege')?.value,
    campus_status: document.getElementById('sCampusStatus')?.value === 'on',
    driver_license: document.getElementById('sDriverLicense')?.value,
    vehicles
  };

  try {
    loadingOverlay?.classList.remove('hidden');

    const res = await fetch('/api/register-staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      loadingOverlay?.classList.add('hidden');
      return showFeedback(data.error || 'Something went wrong', 'error');
    }

    const user = data.data;

    loadingOverlay?.classList.add('hidden');
    successScreen?.classList.remove('hidden');

    const allLicenses = vehicles.flatMap(v => v.drivers.map(d => d.driver_license));
    const totalDrivers = new Set(allLicenses).size;

    if (successName) successName.textContent = user.name;
    if (successPlate) successPlate.textContent = 'Staff Registration';

    const statsEl = document.getElementById('successStats');
    if (statsEl) {
      statsEl.textContent = `${vehicles.length} vehicle(s)  ·  ${totalDrivers} designated driver(s)`;
      statsEl.classList.remove('hidden');
    }

    // Generate QR with staff ID
    if (window.QRCode && successQR) {
      await QRCode.toCanvas(successQR, JSON.stringify({
        type: 'moventra_staff',
        id: user.id
      }), { width: 180 });
    }

    if (downloadQRBtn && successQR) {
      downloadQRBtn.onclick = () => {
        const link = document.createElement('a');
        link.download = `StaffQR_${user.id}.png`;
        link.href = successQR.toDataURL('image/png');
        link.click();
      };
    }

  } catch (err) {
    console.error(err);
    loadingOverlay?.classList.add('hidden');
    showFeedback('Server error. Please try again.', 'error');
  }
});

// ==========================
// CLOSE SUCCESS
// ==========================
document.getElementById('closeSuccess')?.addEventListener('click', () => {
  document.getElementById('successScreen')?.classList.add('hidden');
  document.getElementById('staffRegistrationForm')?.reset();
  document.getElementById('vehiclesList').innerHTML = '';
  document.getElementById('driversList').innerHTML = '';
  showStaffStage(1);
  // Re-add first vehicle slot
  if (typeof addVehicle === 'function') addVehicle();
});
