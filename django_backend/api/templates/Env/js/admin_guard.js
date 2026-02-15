const role = sessionStorage.getItem("role");

if (role !== "admin") {
    alert("คุณไม่มีสิทธิ์เข้าใช้งานหน้านี้");
    window.location.href = "../index.html";
}
