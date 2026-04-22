'use strict';

/**
 * Converte um qualificador de período (ex: '7d', '1m', 'ytd')
 * em datas de início (start) e fim (end) no formato ISO ou Date para uso em SQL.
 */
function getPeriodRange(period) {
    const now = new Date();
    const end = new Date(now);
    let start = new Date(now);

    switch (period) {
        case 'hoje':
            start.setHours(0, 0, 0, 0);
            break;
        case '7d':
            start.setDate(start.getDate() - 7);
            break;
        case '15d':
            start.setDate(start.getDate() - 15);
            break;
        case '30d':
            start.setDate(start.getDate() - 30);
            break;
        case '1m':
            start.setMonth(start.getMonth() - 1);
            break;
        case '3m':
            start.setMonth(start.getMonth() - 3);
            break;
        case '6m':
            start.setMonth(start.getMonth() - 6);
            break;
        case '1y':
            start.setFullYear(start.getFullYear() - 1);
            break;
        case 'ytd':
            // start of current year
            start = new Date(now.getFullYear(), 0, 1);
            break;
        case 'all':
            start = new Date(1970, 0, 1);
            break;
        default:
            // fallback (30d)
            start.setDate(start.getDate() - 30);
            break;
    }

    return { start, end };
}

module.exports = {
    getPeriodRange
};
