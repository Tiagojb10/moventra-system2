// ==========================
// ELEMENTS
// ==========================
const menuBtn = document.getElementById('menuBtn');
const sideMenu = document.getElementById('sideMenu');
const overlay = document.getElementById('overlay');

const searchInput = document.getElementById('searchId');
const passwordInput = document.getElementById('userPassword');

const resultBox = document.getElementById('resultBox');
const resultName = document.getElementById('resultName');
const resultPlate = document.getElementById('resultPlate');
const resultQR = document.getElementById('resultQR');
const downloadBtn = document.getElementById('downloadQR');
const feedbackDiv = document.getElementById('feedback');

// 🔥 NEW BUTTON ELEMENTS
const searchBtn = document.getElementById('searchBtn');
const btnText = document.getElementById('btnText');
const btnLoader = document.getElementById('btnLoader');

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
// FEEDBACK
// ==========================
function showFeedback(message, type = 'error') {
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
// LOADING STATE
// ==========================
function setLoading(isLoading) {
  if (!searchBtn) return;

  if (isLoading) {
    searchBtn.disabled = true;
    searchBtn.classList.add("opacity-70");

    btnText?.classList.add("hidden");
    btnLoader?.classList.remove("hidden");
  } else {
    searchBtn.disabled = false;
    searchBtn.classList.remove("opacity-70");

    btnText?.classList.remove("hidden");
    btnLoader?.classList.add("hidden");
  }
}

// ==========================
// 🔐 SEARCH USER (SECURED)
// ==========================
async function searchUser() {
  const id = searchInput.value.trim();
  const password = passwordInput.value.trim();

  // reset UI
  feedbackDiv.textContent = '';
  resultBox.classList.add('hidden');
  resultBox.classList.remove('fade-in');
  downloadBtn.classList.add('hidden');

  // ✅ VALIDATION
  if (!id) {
    return showFeedback("Please enter an ID");
  }

  if (!password) {
    return showFeedback("Please enter password");
  }

  // 🔐 PASSWORD LENGTH CHECK (NEW FIX)
  if (password.length !== 8) {
    return showFeedback("Password must be exactly 8 characters");
  }

  try {
    setLoading(true);

    const res = await fetch(`/api/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: id,
        password: password
      })
    });

    const data = await res.json();

    if (!res.ok) {
      setLoading(false);
      return showFeedback(data.error || "Authentication failed");
    }

    resultName.textContent = data.data.name;

    const statsEl = document.getElementById('resultStats');
    if (data.data.is_staff) {
      resultPlate.textContent = 'Staff';
      if (statsEl) {
        statsEl.textContent = `${data.data.vehicle_count} vehicle(s)  ·  ${data.data.driver_count} designated driver(s)`;
        statsEl.classList.remove('hidden');
      }
    } else {
      resultPlate.textContent = "Plate: " + data.data.plate_number;
      if (statsEl) statsEl.classList.add('hidden');
    }

    const size = window.innerWidth < 500 ? 140 : 180;

    await QRCode.toCanvas(
      resultQR,
      JSON.stringify({
        type: 'moventra_user',
        id: data.data.id
      }),
      { width: size }
    );

    resultBox.classList.remove('hidden');

    setTimeout(() => {
      resultBox.classList.add('fade-in');
    }, 10);

    downloadBtn.classList.remove('hidden');

    downloadBtn.onclick = () => {
      const link = document.createElement('a');
      link.download = `QR_${data.data.id}.png`;
      link.href = resultQR.toDataURL('image/png');
      link.click();
    };

    showFeedback("QR generated successfully", "success");

  } catch (err) {
    console.error(err);
    showFeedback("Server error. Please try again.");
  } finally {
    setLoading(false);
  }
}

// ==========================
// EVENTS
// ==========================
window.searchUser = searchUser;

searchInput?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') searchUser();
});

passwordInput?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') searchUser();
});

// ==========================
// ICONS
// ==========================
setTimeout(() => {
  if (window.lucide) lucide.createIcons();
}, 100);