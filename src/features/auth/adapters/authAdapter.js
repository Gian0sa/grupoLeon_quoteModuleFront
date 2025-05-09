export function adaptUsertoSession(user) {
    return {
        userName: user.email,
        clave: user.password,
    }
}