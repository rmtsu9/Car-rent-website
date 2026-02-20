document.addEventListener("DOMContentLoaded", () => {
    const moneyElements = document.querySelectorAll("[data-money]");
    moneyElements.forEach((element) => {
        const raw = Number(element.getAttribute("data-money") || 0);
        if (!Number.isFinite(raw)) {
            return;
        }

        element.textContent = `${raw.toLocaleString("en-US")} THB`;
    });
});
