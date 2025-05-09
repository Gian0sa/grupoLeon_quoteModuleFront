export function adaptUsertoSession(user) {
    return {
        UserName: user.email,
        clave: user.password,
    }
}