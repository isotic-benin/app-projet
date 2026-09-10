/**
 * Validation RIB / IBAN français et international
 * - RIB France : 23 caractères (5 banque + 5 guichet + 11 compte + 2 clé) – clé = 97 - (89*banque + 15*guichet + 3*compte) %97
 * - IBAN : mod 97 = 1 (ISO 13616)
 */

function normalize(str: string): string {
    return str.replace(/\s+/g, '').replace(/-/g, '').toUpperCase();
}

/** Validation IBAN Générique (mod 97) */
export function isValidIBAN(iban: string): boolean {
    const s = normalize(iban);
    // IBAN length 15-34, starts with 2 letters + 2 digits
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s)) return false;
    if (s.length < 15 || s.length > 34) return false;
    // Déplacer les 4 premiers caractères à la fin et convertir lettres -> chiffres
    const rearranged = s.slice(4) + s.slice(0, 4);
    let numeric = '';
    for (const ch of rearranged) {
        if (/[A-Z]/.test(ch)) numeric += (ch.charCodeAt(0) - 55).toString(); // A=10 ... Z=35
        else numeric += ch;
    }
    // Calcul mod97 itératif (évite BigInt overflow)
    let remainder = 0;
    for (let i = 0; i < numeric.length; i++) {
        remainder = (remainder * 10 + parseInt(numeric[i], 10)) % 97;
    }
    return remainder === 1;
}

/** Validation RIB français 23 chiffres */
export function isValidRIB(rib: string): boolean {
    const s = normalize(rib);
    if (!/^\d{23}$/.test(s)) return false;
    const banque = s.slice(0, 5);
    const guichet = s.slice(5, 10);
    const compte = s.slice(10, 21);
    const cleStr = s.slice(21, 23);
    const cle = parseInt(cleStr, 10);
    try {
        const b = BigInt(banque);
        const g = BigInt(guichet);
        const c = BigInt(compte);
        const ninetySeven = BigInt(97);
        const eightyNine = BigInt(89);
        const fifteen = BigInt(15);
        const three = BigInt(3);
        const computed = ninetySeven - ((eightyNine * b + fifteen * g + three * c) % ninetySeven);
        return computed === BigInt(cle) || (computed === ninetySeven && cle === 0);
    } catch {
        return false;
    }
}

/** Validation RIB étendu alphanumérique (lettres dans numéro de compte) */
export function isValidRIBExtended(rib: string): boolean {
    const s = normalize(rib);
    // RIB de 23 caractères alphanumériques (banque+guichet numériques, compte alphanum)
    if (s.length !== 23) return false;
    if (!/^\d{5}\d{5}[A-Z0-9]{11}\d{2}$/.test(s)) return false;
    // Si tout numérique -> validation classique
    if (/^\d{23}$/.test(s)) return isValidRIB(s);
    // Alphanumérique : convertir lettres du compte en chiffres selon table RIB (A=1 B=2 ... etc  avec mapping spécifique)
    // Table de conversion RIB :  A J ->1, B K S->2, C L T->3, D M U->4, E N V->5, F O W->6, G P X->7, H Q Y->8, I R Z->9
    const ribTable: Record<string, string> = {
        A: '1', B: '2', C: '3', D: '4', E: '5', F: '6', G: '7', H: '8', I: '9', J: '1', K: '2', L: '3', M: '4', N: '5', O: '6', P: '7', Q: '8', R: '9', S: '2', T: '3', U: '4', V: '5', W: '6', X: '7', Y: '8', Z: '9',
    };
    const comptePart = s.slice(10, 21);
    let compteNumeric = '';
    for (const ch of comptePart) {
        if (/[A-Z]/.test(ch)) compteNumeric += ribTable[ch] ?? ch;
        else compteNumeric += ch;
    }
    const banque = s.slice(0, 5);
    const guichet = s.slice(5, 10);
    const cle = s.slice(21, 23);
    const b = BigInt(banque);
    const g = BigInt(guichet);
    const c = BigInt(compteNumeric);
    const ninetySeven = BigInt(97);
    const eightyNine = BigInt(89);
    const fifteen = BigInt(15);
    const three = BigInt(3);
    const computed = ninetySeven - ((eightyNine * b + fifteen * g + three * c) % ninetySeven);
    const clePadded = computed.toString().padStart(2, '0');
    return clePadded === cle || (computed === ninetySeven && cle === '00');
}

/** Validation unifiée RIB ou IBAN */
export function isValidRibOrIban(value: string): { valid: boolean; type: 'IBAN' | 'RIB' | null; normalized: string; error?: string } {
    const s = normalize(value);
    if (!s) return { valid: false, type: null, normalized: s, error: 'Veuillez renseigner votre IBAN ou RIB.' };
    // Si commence par 2 lettres + 2 chiffres -> tenter IBAN
    if (/^[A-Z]{2}\d{2}/.test(s)) {
        if (s.length < 15) return { valid: false, type: null, normalized: s, error: 'IBAN trop court (15 caractères minimum).' };
        if (s.length > 34) return { valid: false, type: null, normalized: s, error: 'IBAN trop long (34 caractères maximum).' };
        if (!isValidIBAN(s)) return { valid: false, type: null, normalized: s, error: 'IBAN invalide — vérifiez les caractères et la clé de contrôle.' };
        // Cas France : doit faire 27 caractères
        if (s.startsWith('FR') && s.length !== 27) return { valid: false, type: null, normalized: s, error: 'Un IBAN français doit contenir 27 caractères (FR + 25 chiffres).' };
        return { valid: true, type: 'IBAN', normalized: s };
    }
    // Sinon tenter RIB
    // RIB français : 23 caractères
    if (/^[A-Z0-9]{23}$/.test(s)) {
        if (isValidRIB(s) || isValidRIBExtended(s)) return { valid: true, type: 'RIB', normalized: s };
        return { valid: false, type: null, normalized: s, error: 'RIB invalide — clé RIB incorrecte. Vérifiez les 23 caractères.' };
    }
    if (/^\d{10,23}$/.test(s)) {
        return { valid: false, type: null, normalized: s, error: 'RIB incomplet — un RIB français contient 23 caractères (ex: 30002 00550 0000157840Z 25). Saisissez votre IBAN complet de préférence.' };
    }
    // Format inconnu : essayer quand même IBAN generic
    if (isValidIBAN(s)) return { valid: true, type: 'IBAN', normalized: s };
    return { valid: false, type: null, normalized: s, error: 'Format invalide — saisissez un IBAN (ex: FR76 3000 2005 5000 0015 7840 Z25) ou un RIB à 23 caractères.' };
}

export function isValidBIC(bic: string): boolean {
    const s = normalize(bic);
    if (!s) return true; // optionnel
    return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(s);
}

export function formatIbanForDisplay(iban: string): string {
    const s = normalize(iban);
    return s.replace(/(.{4})/g, '$1 ').trim();
}
