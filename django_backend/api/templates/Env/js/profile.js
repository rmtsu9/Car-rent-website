(function () {
    const form = document.getElementById("profileForm");
    if (!form) {
        return;
    }

    const phoneInput = document.getElementById("phoneNumber");
    const currentPasswordInput = document.getElementById("currentPassword");
    const newPasswordInput = document.getElementById("newPassword");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const successBox = document.getElementById("successMessage");
    const errorBox = document.getElementById("errorMessage");
    const resetBtn = document.getElementById("resetBtn");

    let initialPhone = phoneInput.value;

    function getCookie(name) {
        const cookies = document.cookie ? document.cookie.split(";") : [];
        for (let i = 0; i < cookies.length; i += 1) {
            const cookie = cookies[i].trim();
            if (cookie.startsWith(`${name}=`)) {
                return decodeURIComponent(cookie.substring(name.length + 1));
            }
        }
        return "";
    }

    function hideMessages() {
        successBox.style.display = "none";
        errorBox.style.display = "none";
        successBox.textContent = "";
        errorBox.textContent = "";
    }

    function showError(message) {
        errorBox.textContent = `Error: ${message}`;
        errorBox.style.display = "block";
        successBox.style.display = "none";
    }

    function showSuccess(message) {
        successBox.textContent = `Success: ${message}`;
        successBox.style.display = "block";
        errorBox.style.display = "none";
    }

    async function postForm(url, payload) {
        const formData = new URLSearchParams(payload);
        const response = await fetch(url, {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
                "X-CSRFToken": getCookie("csrftoken"),
            },
            body: formData.toString(),
        });

        let data = {};
        try {
            data = await response.json();
        } catch (error) {
            data = { success: false, message: "Unexpected server response" };
        }

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Request failed");
        }

        return data;
    }

    function clearPasswordFields() {
        currentPasswordInput.value = "";
        newPasswordInput.value = "";
        confirmPasswordInput.value = "";
    }

    resetBtn.addEventListener("click", () => {
        phoneInput.value = initialPhone;
        clearPasswordFields();
        hideMessages();
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        hideMessages();

        const phoneNumber = phoneInput.value.trim();
        const currentPassword = currentPasswordInput.value;
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (!/^\d{10}$/.test(phoneNumber)) {
            showError("Phone number must be exactly 10 digits");
            return;
        }

        const hasPasswordInput = Boolean(currentPassword || newPassword || confirmPassword);
        if (hasPasswordInput) {
            if (!currentPassword || !newPassword || !confirmPassword) {
                showError("Please fill all password fields");
                return;
            }

            if (newPassword.length < 4) {
                showError("New password must be at least 4 characters");
                return;
            }

            if (newPassword !== confirmPassword) {
                showError("New password and confirm password do not match");
                return;
            }
        }

        try {
            await postForm(form.dataset.updatePhoneUrl, {
                phone_number: phoneNumber,
            });

            if (hasPasswordInput) {
                await postForm(form.dataset.changePasswordUrl, {
                    current_password: currentPassword,
                    new_password: newPassword,
                    confirm_password: confirmPassword,
                });
            }

            initialPhone = phoneNumber;
            clearPasswordFields();
            showSuccess(hasPasswordInput ? "Phone number and password updated" : "Phone number updated");
        } catch (error) {
            showError(error.message || "Failed to update profile");
        }
    });
})();
