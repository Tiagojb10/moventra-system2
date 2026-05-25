// ==========================
// MENU
// ==========================
const menuBtn = document.getElementById('menuBtn');
const sideMenu = document.getElementById('sideMenu');
const overlay = document.getElementById('overlay');

menuBtn?.addEventListener('click', () => {
  sideMenu.classList.toggle('menu-open');
  overlay.classList.toggle('overlay-show');
});

overlay?.addEventListener('click', () => {
  sideMenu.classList.remove('menu-open');
  overlay.classList.remove('overlay-show');
});

// ==========================
// FEEDBACK
// ==========================
function showFeedback(message, type = 'error') {
  const div = document.getElementById('feedback');
  if (!div) return;
  div.textContent = message;
  div.className = type === 'success'
    ? 'bg-green-200 text-green-800 p-2 rounded-lg mb-2 text-sm'
    : 'bg-red-200 text-red-800 p-2 rounded-lg mb-2 text-sm';
  setTimeout(() => { div.textContent = ''; div.className = ''; }, 5000);
}

// ==========================
// STEP 1 — SUBMIT REQUEST
// ==========================
window.submitRequest = async function () {
  const id = document.getElementById('requestId').value.trim();
  const btnText = document.getElementById('reqBtnText');
  const btnLoader = document.getElementById('reqBtnLoader');

  if (!id) return showFeedback('Please enter your ID');

  btnText.classList.add('hidden');
  btnLoader.classList.remove('hidden');

  try {
    const res = await fetch('/api/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });

    const data = await res.json();

    if (!res.ok) {
      return showFeedback(data.error || 'Something went wrong');
    }

    document.getElementById('requestSuccess').classList.remove('hidden');

  } catch (err) {
    showFeedback('Server error. Please try again.');
  } finally {
    btnText.classList.remove('hidden');
    btnLoader.classList.add('hidden');
  }
};

// ==========================
// STEP 2 — SET NEW PASSWORD
// ==========================
window.submitReset = async function () {
  const id = document.getElementById('resetId').value.trim();
  const tempPassword = document.getElementById('tempPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const btnText = document.getElementById('resetBtnText');
  const btnLoader = document.getElementById('resetBtnLoader');

  if (!id) return showFeedback('Please enter your ID');
  if (!tempPassword) return showFeedback('Please enter the temp password from the admin');
  if (!newPassword) return showFeedback('Please enter a new password');
  if (newPassword.length !== 8) return showFeedback('New password must be exactly 8 characters');
  if (newPassword !== confirmPassword) return showFeedback('Passwords do not match');

  btnText.classList.add('hidden');
  btnLoader.classList.remove('hidden');

  try {
    const res = await fetch('/api/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, temp_password: tempPassword, new_password: newPassword })
    });

    const data = await res.json();

    if (!res.ok) {
      return showFeedback(data.error || 'Something went wrong');
    }

    showFeedback('Password updated successfully! You can now log in.', 'success');
    document.getElementById('resetId').value = '';
    document.getElementById('tempPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';

  } catch (err) {
    showFeedback('Server error. Please try again.');
  } finally {
    btnText.classList.remove('hidden');
    btnLoader.classList.add('hidden');
  }
};
