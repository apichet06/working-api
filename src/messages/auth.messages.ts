export const AuthMessages = {
    invalidPassword: "รหัสผ่านไม่ถูกต้อง!",
    passwordNotMatch: "รหัสผ่านเดิมไม่ถูกต้อง",
    resetPwdSuccess: "รีเซ็ตรหัสผ่านสำเร็จ",
    resign: "บัญชีผู้ใช้นี้ถูกปิดการใช้งานแล้ว!",
    emailNotVerified: "กรุณายืนยันอีเมลก่อนเข้าใช้งานระบบ",
    invalidToken: "Invalid token, โทเค็นไม่ถูกต้อง",
    expiredToken: "Token หมดอายุ กรุณาเข้าสู่ระบบใหม่",
    notToken: "Authentication token is missing, ไม่มีโทเค็นการตรวจสอบสิทธิ์",
    secret: "JWT_SECRET is not defined(ไม่ได้ถูกกำหนดไว้)",
} as const;
