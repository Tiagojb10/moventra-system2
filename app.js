// ==========================
// ELEMENTS
// ==========================
const stage1 = document.getElementById('stage1');
const stage2 = document.getElementById('stage2');
const nextStageBtn = document.getElementById('nextStage');
const prevStageBtn = document.getElementById('prevStage');
const feedbackDiv = document.getElementById('feedback');
const progressBar = document.getElementById('progressBar');
const form = document.getElementById('registrationForm');

const loadingOverlay = document.getElementById('loadingOverlay');
const successScreen = document.getElementById('successScreen');
const closeSuccess = document.getElementById('closeSuccess');

// 🆕 QR SUCCESS ELEMENTS
const successName = document.getElementById('successName');
const successPlate = document.getElementById('successPlate');
const successQR = document.getElementById('successQR');
const downloadQRBtn = document.getElementById('downloadQRBtn');

const menuBtn = document.getElementById('menuBtn');
const sideMenu = document.getElementById('sideMenu');
const overlay = document.getElementById('overlay');

const name = document.getElementById('name');
const staffId = document.getElementById('staffId');
const role = null; // students have a fixed role — no input field needed
const phone = document.getElementById('phone');
const address = document.getElementById('address');
const college = document.getElementById('college');
const campusStatus = document.getElementById('campusStatus');
const driverLicense = document.getElementById('driverLicense');
const password = document.getElementById('password');
const plateNumber = document.getElementById('plateNumber');
const make = document.getElementById('make');
const color = document.getElementById('color');

// ==========================
// HELPERS
// ==========================
function shakeField(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('shake', 'invalid');
  setTimeout(() => el.classList.remove('shake'), 300);
}

function showFeedback(message, type = 'success') {
  if (!feedbackDiv) return;

  feedbackDiv.textContent = message;
  feedbackDiv.className =
    type === 'success'
      ? 'bg-green-200 text-green-800 p-2 rounded-lg mb-2 text-sm'
      : 'bg-red-200 text-red-800 p-2 rounded-lg mb-2 text-sm';

  setTimeout(() => {
    feedbackDiv.textContent = '';
    feedbackDiv.className = '';
  }, 4000);
}

// ==========================
// VALIDATION
// ==========================
function validateField(inputId, checkId) {
  const input = document.getElementById(inputId);
  const check = document.getElementById(checkId);

  if (!input || !check) return;

  input.addEventListener('input', () => {
    if (input.value.trim() !== '') {
      input.classList.add('valid');
      input.classList.remove('invalid');
      check.style.opacity = '1';
    } else {
      input.classList.remove('valid');
      input.classList.add('invalid');
      check.style.opacity = '0';
    }
  });
}

validateField('name','nameCheck');
validateField('staffId','staffIdCheck');
validateField('phone','phoneCheck');

// ==========================
// 🇿🇼 PHONE FORMAT + VALIDATION
// ==========================
phone?.addEventListener('input', () => {
  let value = phone.value.replace(/\D/g, '');

  if (value.startsWith('07')) {
    value = value.slice(0, 10);

    let formatted = value;

    if (value.length > 3 && value.length <= 6) {
      formatted = value.slice(0,3) + ' ' + value.slice(3);
    } else if (value.length > 6) {
      formatted =
        value.slice(0,3) + ' ' +
        value.slice(3,6) + ' ' +
        value.slice(6,10);
    }

    phone.value = formatted;
  } else if (value.startsWith('263')) {
    value = value.slice(0, 12);

    let formatted = '+263';

    if (value.length > 3) formatted += ' ' + value.slice(3,5);
    if (value.length > 5) formatted += ' ' + value.slice(5,8);
    if (value.length > 8) formatted += ' ' + value.slice(8,12);

    phone.value = formatted.trim();
  }

  // ✅ VALIDATION (merged — no duplicate listener)
  const clean = phone.value.replace(/\D/g, '');
  markValid(phone, clean.length === 10 || clean.length === 12);
});

// ==========================
// 🚗 PLATE FORMAT
// ==========================
plateNumber?.addEventListener('input', () => {
  let value = plateNumber.value.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (value.length > 3) {
    value = value.slice(0, 3) + '-' + value.slice(3, 7);
  }

  plateNumber.value = value;
});

// ==========================
// 🪪 DRIVER LICENSE
// ==========================
driverLicense?.addEventListener('input', () => {
  let value = driverLicense.value.toUpperCase();
  value = value.replace(/[^A-Z0-9]/g, '');
  value = value.slice(0, 15);
  driverLicense.value = value;
});

// ==========================
// 🔥 REAL-TIME VALIDATION
// ==========================
function markValid(input, condition) {
  if (!input) return;

  if (condition) {
    input.classList.add('valid');
    input.classList.remove('invalid');
  } else {
    input.classList.remove('valid');
    input.classList.add('invalid');
  }
}

plateNumber?.addEventListener('input', () => {
  const pattern = /^[A-Z]{3}-\d{4}$/;
  markValid(plateNumber, pattern.test(plateNumber.value));
});

driverLicense?.addEventListener('input', () => {
  markValid(driverLicense, driverLicense.value.length >= 6);
});

// ==========================
// STAGE NAVIGATION
// ==========================
nextStageBtn?.addEventListener('click', () => {
  const fields = [name, staffId, college, driverLicense, campusStatus, password];
  let valid = true;

  fields.forEach(el => {
    if (!el || !el.value.trim()) {
      if (el) shakeField(el.id);
      valid = false;
    }
  });

  if (!valid) return showFeedback('Fill all required fields!', 'error');

  stage1.classList.add('hidden');
  stage2.classList.remove('hidden');
  progressBar.style.width = '100%';
});

prevStageBtn?.addEventListener('click', () => {
  stage2.classList.add('hidden');
  stage1.classList.remove('hidden');
  progressBar.style.width = '50%';
});

// ==========================
// 🚀 SUBMIT (UPDATED WITH QR)
// ==========================
form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!password.value || password.value.length !== 8) {
    return showFeedback('Password must be exactly 8 characters', 'error');
  }

  const fields = [name, staffId, college, driverLicense, campusStatus, plateNumber, make, color];
  let valid = true;

  fields.forEach(el => {
    if (!el || !el.value.trim()) {
      if (el) shakeField(el.id);
      valid = false;
    }
  });

  const platePattern = /^[A-Z]{3}-\d{4}$/;
  if (!platePattern.test(plateNumber.value)) {
    return showFeedback('Plate must be in format ABC-1234', 'error');
  }

  if (!valid) return showFeedback('Complete all fields!', 'error');

  try {
    loadingOverlay?.classList.remove('hidden');

    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.value,
        staff_student_id: staffId.value,
        role: 'student',
        phone: phone.value,
        address: address.value,
        college: college.value,
        campus_status: campusStatus.value === 'on',
        driver_license: driverLicense.value,
        plate_number: plateNumber.value,
        make: make.value,
        color: color.value,
        password: password.value
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Something went wrong");
    }

    const user = data.data[0];

    loadingOverlay?.classList.add('hidden');
    successScreen?.classList.remove('hidden');

    // ✅ SET USER INFO
    if (successName) successName.textContent = user.name;
    if (successPlate) successPlate.textContent = "Plate: " + user.plate_number;

    const statsEl = document.getElementById('successStats');
    if (statsEl) statsEl.classList.add('hidden');

    // ✅ GENERATE QR
    if (window.QRCode && successQR) {
      await QRCode.toCanvas(
        successQR,
        JSON.stringify({
          type: 'moventra_user',
          id: user.id
        }),
        { width: 180 }
      );
    }

    // ✅ ENABLE DOWNLOAD BUTTON
if (downloadQRBtn && successQR) {
  downloadQRBtn.onclick = () => {
    const link = document.createElement('a');

    link.download = `QR_${user.id}.png`;
    link.href = successQR.toDataURL('image/png');

    link.click();
  };
}

  } catch (err) {
    console.error(err);
    loadingOverlay?.classList.add('hidden');
    showFeedback(err.message, 'error');
  }
});

// ==========================
// SUCCESS CLOSE
// ==========================
closeSuccess?.addEventListener('click', () => {
  successScreen.classList.add('hidden');

  form.reset();

  stage2.classList.add('hidden');
  stage1.classList.remove('hidden');

  progressBar.style.width = '50%';
});

// ==========================
// MENU
// ==========================
menuBtn?.addEventListener('click', () => {
  sideMenu.classList.toggle('menu-open');
  overlay.classList.toggle('overlay-show');
});

overlay?.addEventListener('click', () => {
  sideMenu.classList.remove('menu-open');
  overlay.classList.remove('overlay-show');
});

// ==========================
// DROPDOWNS
// ==========================
document.querySelectorAll(".dropdown").forEach(dropdown => {
  const selected = dropdown.querySelector(".dropdown-selected span");
  const options = dropdown.querySelector(".dropdown-options");
  const hiddenInput = dropdown.nextElementSibling;

  dropdown.querySelector(".dropdown-selected").addEventListener("click", () => {
    dropdown.classList.toggle("open");
  });

  options.querySelectorAll("div").forEach(option => {
    option.addEventListener("click", () => {
      selected.textContent = option.textContent;
      hiddenInput.value = option.dataset.value;

      options.querySelectorAll("div").forEach(o => o.classList.remove("active"));
      option.classList.add("active");

      dropdown.classList.remove("open");
    });
  });
});

document.addEventListener("click", (e) => {
  document.querySelectorAll(".dropdown").forEach(d => {
    if (!d.contains(e.target)) d.classList.remove("open");
  });
});

// ==========================
// MOUSE BACKGROUND
// ==========================
document.addEventListener("mousemove", (e) => {
  const x = (e.clientX / window.innerWidth) * 100 + "%";
  const y = (e.clientY / window.innerHeight) * 100 + "%";

  document.body.style.setProperty("--x", x);
  document.body.style.setProperty("--y", y);
});