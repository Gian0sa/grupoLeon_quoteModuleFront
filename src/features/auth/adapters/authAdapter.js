export function adaptUsertoSession(user) {
    return {
        email: user.email,
        password: user.password,
    }
}