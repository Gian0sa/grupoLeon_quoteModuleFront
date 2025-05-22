export const adaptTopProducts = (data) => {
    return data.map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
    }));
};

export const adaptPromotions = (data) => {
    return data.map(promotion => ({
        id: promotion.id,
        name: promotion.name,
        price: promotion.price,
    }));
};

export const adaptHistory = (data) => {
    return data.map(history => ({
        id: history.id,
        name: history.name,
        price: history.price,
    }));
};

export const adaptDraftQuotes = (data) => {
    return data.map(draftQuote => ({
        id: draftQuote.id,
        name: draftQuote.name,
    }));
};
