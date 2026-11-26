'use strict';

const db = require('../db/postgres');

/**
 * Converte um objeto Date em uma string no formato de fuso horário UTC (+00:00)
 * para garantir que as queries SQL do PostgreSQL funcionem de forma consistente
 * com o armazenamento em banco (que está em UTC).
 */
function toSafeSqlString(dateObj) {
    if (!dateObj) return null;
    const pad = (n) => n.toString().padStart(2, '0');
    return `${dateObj.getUTCFullYear()}-${pad(dateObj.getUTCMonth() + 1)}-${pad(dateObj.getUTCDate())} ${pad(dateObj.getUTCHours())}:${pad(dateObj.getUTCMinutes())}:${pad(dateObj.getUTCSeconds())}+00:00`;
}

function toBrazilTZString(dateObj) {
    return toSafeSqlString(dateObj);
}

/**
 * Faz o parse de uma string de data (ou objeto Date) garantindo que seja
 * tratado no fuso UTC nativo, sem deslocamentos dependentes do fuso local do servidor.
 */
function parseDateString(dateStr, defaultTimeSuffix = 'T00:00:00Z') {
    if (!dateStr) return null;
    
    let str = dateStr;
    if (typeof dateStr === 'object' && dateStr instanceof Date) {
        str = dateStr.toISOString();
    }
    
    // Se for string e tiver indicador de hora/T/espaço
    if (str.includes(' ') || str.includes('T')) {
        let normalized = str.replace(' ', 'T');
        const hasTimezone = /Z|[+-]\d{2}(?::?\d{2})?$/.test(normalized);
        if (!hasTimezone) {
            normalized += 'Z';
        }
        return new Date(normalized);
    }
    
    const cleanStr = str.split('T')[0].split(' ')[0];
    const parts = cleanStr.includes('-') ? cleanStr.split('-') : cleanStr.split('/');
    if (parts.length === 3) {
        let y, m, d;
        if (parts[0].length === 4) {
            y = parseInt(parts[0], 10);
            m = parseInt(parts[1], 10) - 1;
            d = parseInt(parts[2], 10);
        } else if (parts[2].length === 4) {
            y = parseInt(parts[2], 10);
            m = parseInt(parts[1], 10) - 1;
            d = parseInt(parts[0], 10);
        }
        if (y !== undefined) {
            const pad = (n) => n.toString().padStart(2, '0');
            const isoStr = `${y}-${pad(m + 1)}-${pad(d)}${defaultTimeSuffix}`;
            return new Date(isoStr);
        }
    }
    
    return new Date(str);
}

function getPeriodRange(period, startDate, endDate, anchorDate) {
    // Trata anchorDate de maneira segura em UTC
    const now = anchorDate ? parseDateString(anchorDate, 'T12:00:00Z') : new Date();
    let start = new Date(now);
    let end = new Date(now);

    switch (period) {
        case 'today':
        case 'hoje':
            start.setUTCHours(0, 0, 0, 0);
            end.setUTCHours(23, 59, 59, 999);
            break;
        case 'yesterday':
            start.setUTCDate(start.getUTCDate() - 1);
            start.setUTCHours(0, 0, 0, 0);
            end.setUTCDate(end.getUTCDate() - 1);
            end.setUTCHours(23, 59, 59, 999);
            break;
        case 'last7':
        case '7d':
            start.setUTCDate(start.getUTCDate() - 7);
            start.setUTCHours(0, 0, 0, 0);
            end.setUTCHours(23, 59, 59, 999);
            break;
        case 'thisMonth':
        case 'MES_ATUAL':
        case '1m':
            start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
            end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
            break;
        case 'lastMonth':
            start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0));
            end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
            break;
        case 'last12m':
        case '1y':
            start.setUTCFullYear(start.getUTCFullYear() - 1);
            start.setUTCHours(0, 0, 0, 0);
            end.setUTCHours(23, 59, 59, 999);
            break;
        case 'year':
        case 'thisYear':
        case 'currentYear':
            start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
            end = new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
            break;
        case 'custom':
            if (startDate && endDate) {
                const sDate = parseDateString(startDate, 'T00:00:00Z');
                const eDate = parseDateString(endDate, 'T23:59:59Z');
                if (sDate && !isNaN(sDate.getTime())) {
                    start = sDate;
                }
                if (eDate && !isNaN(eDate.getTime())) {
                    end = eDate;
                }
            } else {
                start.setUTCDate(start.getUTCDate() - 30);
                start.setUTCHours(0, 0, 0, 0);
                end.setUTCHours(23, 59, 59, 999);
            }
            break;
        case '15d':
            start.setUTCDate(start.getUTCDate() - 15);
            start.setUTCHours(0, 0, 0, 0);
            end.setUTCHours(23, 59, 59, 999);
            break;
        case '30d':
            start.setUTCDate(start.getUTCDate() - 30);
            start.setUTCHours(0, 0, 0, 0);
            end.setUTCHours(23, 59, 59, 999);
            break;
        case '3m':
            start.setUTCMonth(start.getUTCMonth() - 3);
            start.setUTCHours(0, 0, 0, 0);
            end.setUTCHours(23, 59, 59, 999);
            break;
        case '6m':
        case 'last6Months':
        case '6_MESES':
            start.setUTCMonth(start.getUTCMonth() - 6);
            start.setUTCHours(0, 0, 0, 0);
            end.setUTCHours(23, 59, 59, 999);
            break;
        case 'ytd':
            start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
            end.setUTCHours(23, 59, 59, 999);
            break;
        case 'all':
        case 'ALL':
        case 'todos':
        case 'TODOS':
            start = new Date(Date.UTC(1970, 0, 1, 0, 0, 0, 0));
            end.setUTCHours(23, 59, 59, 999);
            break;
        default:
            start.setUTCFullYear(start.getUTCFullYear() - 1);
            start.setUTCHours(0, 0, 0, 0);
            end.setUTCHours(23, 59, 59, 999);
            break;
    }

    return { 
        start: toSafeSqlString(start), 
        end: toSafeSqlString(end) 
    };
}

/**
 * Dado um período (strings no formato SQL seguro), calcula o período equivalente imediatamente anterior.
 * Se o período atual corresponder a um mês-calendário completo (dia 1 até o último dia do mês),
 * retorna o mês-calendário imediatamente anterior completo (evitando deslocamentos de 30 vs 31 dias).
 */
function getPreviousPeriodRange(startSqlStr, endSqlStr) {
    const startDateObj = parseDateString(startSqlStr, 'T00:00:00Z');
    const endDateObj = parseDateString(endSqlStr, 'T23:59:59Z');

    if (!startDateObj || !endDateObj) {
        return { prevStart: startSqlStr, prevEnd: endSqlStr };
    }

    const sYear = startDateObj.getUTCFullYear();
    const sMonth = startDateObj.getUTCMonth();
    const sDay = startDateObj.getUTCDate();

    const eYear = endDateObj.getUTCFullYear();
    const eMonth = endDateObj.getUTCMonth();
    const eDay = endDateObj.getUTCDate();
    const lastDayOfEndMonth = new Date(Date.UTC(eYear, eMonth + 1, 0)).getUTCDate();

    // Caso 1: Mês-calendário fechado completo (ex: thisMonth ou lastMonth)
    if (sYear === eYear && sMonth === eMonth && sDay === 1 && eDay === lastDayOfEndMonth) {
        const prevMonthStart = new Date(Date.UTC(sYear, sMonth - 1, 1, 0, 0, 0, 0));
        const prevMonthEnd = new Date(Date.UTC(sYear, sMonth, 0, 23, 59, 59, 999));
        return {
            prevStart: toSafeSqlString(prevMonthStart),
            prevEnd: toSafeSqlString(prevMonthEnd),
            prevStartObj: prevMonthStart,
            prevEndObj: prevMonthEnd
        };
    }

    // Caso 2: Ano-calendário fechado completo (01/01 a 31/12)
    if (sYear === eYear && sMonth === 0 && sDay === 1 && eMonth === 11 && eDay === 31) {
        const prevYearStart = new Date(Date.UTC(sYear - 1, 0, 1, 0, 0, 0, 0));
        const prevYearEnd = new Date(Date.UTC(sYear - 1, 11, 31, 23, 59, 59, 999));
        return {
            prevStart: toSafeSqlString(prevYearStart),
            prevEnd: toSafeSqlString(prevYearEnd),
            prevStartObj: prevYearStart,
            prevEndObj: prevYearEnd
        };
    }

    const diffTime = Math.abs(endDateObj.getTime() - startDateObj.getTime());
    const prevEndObj = new Date(startDateObj.getTime() - 1);
    const prevStartObj = new Date(prevEndObj.getTime() - diffTime);

    return {
        prevStart: toSafeSqlString(prevStartObj),
        prevEnd: toSafeSqlString(prevEndObj),
        prevStartObj,
        prevEndObj
    };
}

module.exports = {
    getPeriodRange,
    getPreviousPeriodRange,
    toBrazilTZString,
    toSafeSqlString,
    parseDateString
};
