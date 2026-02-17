document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("signupForm");
    const fullNameInput = document.getElementById("fullName");
    const phoneInput = document.getElementById("phoneNumber");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");

    if (phoneInput) {
        phoneInput.addEventListener("input", () => {
            phoneInput.value = phoneInput.value.replace(/\D/g, "").slice(0, 10);
        });
    }

    if (form && fullNameInput && phoneInput && usernameInput && passwordInput) {
        form.addEventListener("submit", (event) => {
            const fullName = (fullNameInput.value || "").trim();
            const phone = (phoneInput.value || "").trim();
            const username = (usernameInput.value || "").trim();
            const password = (passwordInput.value || "").trim();

            if (!fullName || !phone || !username || !password) {
                event.preventDefault();
                window.alert("Please fill all required fields.");
                return;
            }

            if (!/^\d{10}$/.test(phone)) {
                event.preventDefault();
                window.alert("Phone number must be exactly 10 digits.");
                return;
            }

            if (password.length < 4) {
                event.preventDefault();
                window.alert("Password must be at least 4 characters.");
            }
        });
    }

    initSlider([
        "Image/GLS.jpg",
        "Image/Handa.jpg",
        "Image/GR86.jpg",
    ]);
});

function initSlider(images) {
    const slides = document.querySelectorAll(".slide");
    const dotsContainer = document.querySelector(".slider-dots");
    const content = document.querySelector(".slider-content");

    if (slides.length < 2 || !dotsContainer || !content || !images.length) {
        return;
    }

    let current = 0;
    let intervalId = null;

    images.forEach((src) => {
        const img = new Image();
        img.src = src;
    });

    images.forEach((_, index) => {
        const dot = document.createElement("span");
        dot.addEventListener("click", () => {
            current = index;
            showSlide(current);
            resetInterval();
        });
        dotsContainer.appendChild(dot);
    });

    function updateDots(index) {
        const dots = dotsContainer.querySelectorAll("span");
        dots.forEach((dot) => dot.classList.remove("active"));
        if (dots[index]) {
            dots[index].classList.add("active");
        }
    }

    function showSlide(index) {
        const activeSlide = slides[index % 2];
        const inactiveSlide = slides[(index + 1) % 2];

        activeSlide.style.backgroundImage = `url('${images[index]}')`;
        activeSlide.classList.add("active");
        inactiveSlide.classList.remove("active");

        updateDots(index);

        content.classList.remove("text-animate");
        window.setTimeout(() => {
            content.classList.add("text-animate");
        }, 300);
    }

    function nextSlide() {
        current = (current + 1) % images.length;
        showSlide(current);
    }

    function resetInterval() {
        if (intervalId) {
            window.clearInterval(intervalId);
        }
        intervalId = window.setInterval(nextSlide, 5000);
    }

    showSlide(current);
    intervalId = window.setInterval(nextSlide, 5000);
}

