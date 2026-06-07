'use strict';

const db = require('../db/postgres');

/**
 * Converte um qualificador de período do frontend em datas start/end para SQL.
 * Suporta: today, yesterday, last7, thisMonth, lastMonth, last12m, custom
 * e também os legados: hoje, 7d, 30d, 1m, 3m, 6m, 1y, ytd, all
 */
function toBrazilTZString(dateObj) {
    if (!dateObj) return null;
    const pad = (n) => n.toString().padStart(2, '0');
    return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:${pad(dateObj.getSeconds())}-03:00`;
}

function toSafeSqlString(dateObj) {
    if (!dateObj) return null;
    const pad = (n) => n.toString().padStart(2, '0');
    
    // Default to Brasilia time (-03:00 = -180 minutes)
    let offsetMinutes = -180;
    try {
        const store = db.dbContext.getStore();
        if (store && store.tzOffset !== undefined) {
            offsetMinutes = store.tzOffset;
        }
    } catch (e) {
        // ignore
    }
    
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absMinutes = Math.abs(offsetMinutes);
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;
    const tzStr = `${sign}${pad(hours)}:${pad(mins)}`;

    return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:${pad(dateObj.getSeconds())}${tzStr}`;
}

function parseDateString(dateStr) {
    if (!dateStr) return null;
    const cleanStr = dateStr.split('T')[0].split(' ')[0];
    const parts = cleanStr.includes('-') ? cleanStr.split('-') : cleanStr.split('/');
    if (parts.length === 3) {
        if (parts[0].length === 4) {
            // YYYY-MM-DD or YYYY/MM/DD
            return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        } else if (parts[2].length === 4) {
            // DD-MM-YYYY or DD/MM/YYYY
            return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        }
    }
    return new Date(dateStr);
}

function getPeriodRange(period, startDate, endDate, anchorDate) {
    const now = anchorDate ? new Date(anchorDate) : new Date();
    let start = new Date(now);
    let end = new Date(now);

    switch (period) {
        // Valores enviados pelo frontend React
        case 'today':
        case 'hoje':
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'yesterday':
            start.setDate(start.getDate() - 1);
            start.setHours(0, 0, 0, 0);
            end.setDate(end.getDate() - 1);
            end.setHours(23, 59, 59, 999);
            break;
        case 'last7':
        case '7d':
            start.setDate(start.getDate() - 7);
            break;
        case 'thisMonth':
        case '1m':
            start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
        case 'lastMonth':
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            break;
        case 'last12m':
        case '1y':
            start.setFullYear(start.getFullYear() - 1);
            break;
        case 'custom':
            if (startDate && endDate) {
                const sDate = parseDateString(startDate);
                const eDate = parseDateString(endDate);
                if (sDate && !isNaN(sDate.getTime())) {
                    start = sDate;
                    start.setHours(0, 0, 0, 0);
                }
                if (eDate && !isNaN(eDate.getTime())) {
                    end = eDate;
                    end.setHours(23, 59, 59, 999);
                }
            } else {
                // fallback
                start.setDate(start.getDate() - 30);
            }
            break;
        case '15d':
            start.setDate(start.getDate() - 15);
            break;
        case '30d':
            start.setDate(start.getDate() - 30);
            break;
        case '3m':
            start.setMonth(start.getMonth() - 3);
            break;
        case '6m':
            start.setMonth(start.getMonth() - 6);
            break;
        case 'ytd':
            start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
            break;
        case 'all':
            start = new Date(1970, 0, 1);
            break;
        default:
            // fallback: último ano para cobrir bases de teste antigas
            start.setFullYear(start.getFullYear() - 1);
            break;
    }

    return { 
        start: toSafeSqlString(start), 
        end: toSafeSqlString(end) 
    };
}

module.exports = {
    getPeriodRange,
    toBrazilTZString,
    toSafeSqlString,
    parseDateString
};
