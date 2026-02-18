document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");
    const identifierInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");

    if (form && identifierInput && passwordInput) {
        form.addEventListener("submit", (event) => {
            const identifier = (identifierInput.value || "").trim();
            const password = (passwordInput.value || "").trim();

            if (!identifier || !password) {
                event.preventDefault();
                window.alert("Please fill username or phone number and password.");
            }
        });
    }

    initSlider([
        "/static/Image/porsche.jpg",
        "/static/Image/GR86.jpg",
        "/static/Image/GLS.jpg",
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

