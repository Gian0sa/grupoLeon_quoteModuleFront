export function adaptUsertoSession(user) {
  return {
    email: user.email,
    password: user.password,
    recaptchaToken: user.recaptchaToken,
  };
}


export function adaptUsertoRegister(user) {
    return {
        username: user.name,
        role: user.role,
        email: user.email,
        password: user.password,
    }
}

