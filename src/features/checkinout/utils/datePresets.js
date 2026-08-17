export const getToday = () => {
    const today = new Date();
    const localDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    return localDate;
};

export const getYesterday = () => {
    const today = new Date();
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 0, 0, 0, 0);
    return yesterday;
};

export const getLastWeek = () => {
    const today = new Date();
    const lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7, 0, 0, 0, 0);
    return lastWeek;
};

export const getLastMonth = () => {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate(), 0, 0, 0, 0);
    return lastMonth;
};

export const getFirstDayOfMonth = () => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
};

export const getLastDayOfMonth = () => {
    const today = new Date();
    // day 0 del mes siguiente = último día del mes actual
    return new Date(today.getFullYear(), today.getMonth() + 1, 0, 0, 0, 0, 0);
};

export const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};