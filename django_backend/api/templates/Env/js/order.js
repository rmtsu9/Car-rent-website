document.addEventListener("DOMContentLoaded", () => {
    const advanceButton = document.querySelector(".advance-stage-btn");

    if (!advanceButton) {
        return;
    }

    advanceButton.addEventListener("click", (event) => {
        const actionLabel = advanceButton.dataset.actionLabel || "Update order stage";
        const isFinalPayment = advanceButton.dataset.finalPayment === "true";

        let confirmMessage = `Confirm action: ${actionLabel}?`;
        if (isFinalPayment) {
            confirmMessage = "Confirm full payment now? This order will be moved to your History.";
        }

        if (!window.confirm(confirmMessage)) {
            event.preventDefault();
        }
    });
});
